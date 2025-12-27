import { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';
import { supabaseAdmin } from '../../../lib/supabaseClient';

export const config = {
  api: {
    bodyParser: false,
  },
};

const JWT_SECRET = process.env.JWT_SECRET;
const activeClients = new Set(); // ws instances
const lastDensities = new Map(); // siteId -> zoneId -> density

const FIVE_MINUTES_AGO = () => new Date(Date.now() - 5 * 60 * 1000).toISOString();

async function fetchZoneSnapshot(siteId) {
  const { data: zones, error: zoneError } = await supabaseAdmin
    .from('zones')
    .select('id, name, max_capacity')
    .eq('site_id', siteId);
  if (zoneError) throw zoneError;

  const { data: crowd, error: crowdError } = await supabaseAdmin
    .from('crowd_data')
    .select('zone_id, count, timestamp')
    .eq('site_id', siteId)
    .gte('timestamp', FIVE_MINUTES_AGO());
  if (crowdError) throw crowdError;

  const latestByZone = new Map();
  (crowd || []).forEach((row) => {
    const existing = latestByZone.get(row.zone_id);
    if (!existing || new Date(row.timestamp) > new Date(existing.timestamp)) {
      latestByZone.set(row.zone_id, row);
    }
  });

  return (zones || []).map((zone) => {
    const latest = latestByZone.get(zone.id);
    const current_count = latest?.count || 0;
    const density_percentage = zone.max_capacity ? (current_count / zone.max_capacity) * 100 : 0;
    return {
      zone_id: zone.id,
      zone_name: zone.name,
      current_count,
      max_capacity: zone.max_capacity,
      density_percentage,
    };
  });
}

async function broadcastUpdates(wss) {
  const siteIds = Array.from(activeClients)
    .map((ws) => ws.subscription?.siteId)
    .filter(Boolean);
  const uniqueSiteIds = [...new Set(siteIds)];

  for (const siteId of uniqueSiteIds) {
    try {
      const zones = await fetchZoneSnapshot(siteId);

      activeClients.forEach((client) => {
        if (client.readyState === 1 && client.subscription?.siteId === siteId) {
          client.send(
            JSON.stringify({ type: 'zone_update', data: zones, timestamp: new Date().toISOString() }),
          );
        }
      });

      zones.forEach((zone) => {
        const density = zone.density_percentage;
        if (density > 90) {
          activeClients.forEach((client) => {
            if (client.readyState === 1 && client.subscription?.siteId === siteId) {
              client.send(
                JSON.stringify({
                  type: 'alert',
                  zone_id: zone.zone_id,
                  message: `${zone.zone_name} above 90% capacity`,
                }),
              );
            }
          });
        }

        const siteMap = lastDensities.get(siteId) || new Map();
        const prev = siteMap.get(zone.zone_id) || 0;
        if (prev > 0 && density - prev > 30) {
          activeClients.forEach((client) => {
            if (client.readyState === 1 && client.subscription?.siteId === siteId) {
              client.send(
                JSON.stringify({
                  type: 'alert',
                  zone_id: zone.zone_id,
                  message: `${zone.zone_name} surge detected`,
                }),
              );
            }
          });
        }
        siteMap.set(zone.zone_id, density);
        lastDensities.set(siteId, siteMap);
      });
    } catch (error) {
      // Fail silently per site
    }
  }
}

function authenticate(req) {
  try {
    const url = new URL(req.url, 'http://localhost');
    const token = url.searchParams.get('token');
    if (!token) throw new Error('Missing token');
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

function initWss(server) {
  if (server.wss) return server.wss;

  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (req, socket, head) => {
    const { url } = req;
    if (!url || !url.startsWith('/api/live/stream')) {
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req);
    });
  });

  wss.on('connection', (ws, req) => {
    const decoded = authenticate(req);
    if (!decoded) {
      ws.send(JSON.stringify({ type: 'error', message: 'Unauthorized' }));
      ws.close(401, 'Unauthorized');
      return;
    }

    ws.user = { id: decoded.id, orgId: decoded.org_id };
    ws.subscription = null;
    activeClients.add(ws);

    ws.on('message', (message) => {
      try {
        const payload = JSON.parse(message.toString());
        if (payload.action === 'subscribe' && payload.siteId) {
          ws.subscription = { siteId: payload.siteId };
          ws.send(JSON.stringify({ type: 'subscribed', siteId: payload.siteId }));
        }
        if (payload.action === 'unsubscribe') {
          ws.subscription = null;
          ws.send(JSON.stringify({ type: 'unsubscribed' }));
        }
      } catch (error) {
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON payload' }));
      }
    });

    ws.on('close', () => {
      activeClients.delete(ws);
    });
  });

  setInterval(() => broadcastUpdates(wss), 10_000).unref();

  server.wss = wss;
  return wss;
}

export default function handler(req, res) {
  if (!res.socket.server) {
    res.status(500).end();
    return;
  }

  initWss(res.socket.server);
  res.end();
}
