import { WebSocketServer } from 'ws';
import { verifyToken } from '../../lib/jwtHelper';
import { supabaseAdmin } from '../../lib/supabaseClient';

export const config = {
  api: {
    bodyParser: false,
  },
};

const clients = new Map(); // ws -> { userId, siteId }
const densityHistory = new Map(); // siteId -> zoneId -> density
const FIVE_MINUTES_AGO = () => new Date(Date.now() - 5 * 60 * 1000).toISOString();

async function fetchZones(siteId) {
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

async function broadcast(wss) {
  const siteIds = new Set();
  clients.forEach((meta) => {
    if (meta.siteId) siteIds.add(meta.siteId);
  });

  for (const siteId of siteIds) {
    try {
      const zones = await fetchZones(siteId);
      clients.forEach((meta, ws) => {
        if (ws.readyState === 1 && meta.siteId === siteId) {
          ws.send(
            JSON.stringify({
              type: 'zone_update',
              timestamp: new Date().toISOString(),
              data: zones,
            }),
          );
        }
      });

      zones.forEach((zone) => {
        const density = zone.density_percentage;
        if (density > 90) {
          clients.forEach((meta, ws) => {
            if (ws.readyState === 1 && meta.siteId === siteId) {
              ws.send(
                JSON.stringify({
                  type: 'critical_alert',
                  zone_id: zone.zone_id,
                  zone_name: zone.zone_name,
                  current_count: zone.current_count,
                  max_capacity: zone.max_capacity,
                  message: 'Overcrowding detected',
                }),
              );
            }
          });
        }

        const siteMap = densityHistory.get(siteId) || new Map();
        const previous = siteMap.get(zone.zone_id) || 0;
        if (previous > 0 && density - previous > 30) {
          clients.forEach((meta, ws) => {
            if (ws.readyState === 1 && meta.siteId === siteId) {
              ws.send(
                JSON.stringify({
                  type: 'surge_alert',
                  zone_id: zone.zone_id,
                  message: 'Sudden visitor surge',
                }),
              );
            }
          });
        }
        siteMap.set(zone.zone_id, density);
        densityHistory.set(siteId, siteMap);
      });
    } catch (error) {
      // Skip failed site
    }
  }
}

function initWss(server) {
  if (server.socketWss) return server.socketWss;

  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (req, socket, head) => {
    const { url } = req;
    if (!url || !url.startsWith('/api/socket')) return;
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req);
    });
  });

  wss.on('connection', (ws, req) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      const token = url.searchParams.get('token');
      const decoded = verifyToken(token);
      clients.set(ws, { userId: decoded.id, siteId: null });
      ws.send(JSON.stringify({ type: 'connected', userId: decoded.id }));
    } catch (error) {
      ws.send(JSON.stringify({ type: 'error', message: 'Unauthorized' }));
      ws.close(401, 'Unauthorized');
      return;
    }

    ws.on('message', (msg) => {
      try {
        const payload = JSON.parse(msg.toString());
        if (payload.action === 'subscribe') {
          const meta = clients.get(ws) || {};
          meta.siteId = payload.siteId;
          clients.set(ws, meta);
          ws.send(JSON.stringify({ type: 'subscribed', siteId: payload.siteId }));
        }
        if (payload.action === 'unsubscribe') {
          const meta = clients.get(ws) || {};
          meta.siteId = null;
          clients.set(ws, meta);
          ws.send(JSON.stringify({ type: 'unsubscribed' }));
        }
      } catch (error) {
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
      }
    });

    ws.on('close', () => {
      clients.delete(ws);
    });
  });

  setInterval(() => broadcast(wss), 10_000).unref();

  server.socketWss = wss;
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
