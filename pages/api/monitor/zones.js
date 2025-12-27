import { supabaseAdmin } from '../../../lib/supabaseClient';
import verifyToken from '../../../middleware/verifyToken';

const FIVE_MINUTES_AGO = () => new Date(Date.now() - 5 * 60 * 1000).toISOString();

function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) return reject(result);
      return resolve(result);
    });
  });
}

const statusFor = (density) => {
  if (density > 85) return 'high';
  if (density >= 60) return 'medium';
  return 'low';
};

/**
 * @param {import('next').NextApiRequest} req
 * @param {import('next').NextApiResponse} res
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    await runMiddleware(req, res, verifyToken);
  } catch (err) {
    return;
  }

  const siteId = req.query.siteId;
  if (!siteId || Number.isNaN(Number(siteId))) {
    return res.status(400).json({ success: false, message: 'Invalid siteId' });
  }

  try {
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

    const payload = (zones || []).map((zone) => {
      const latest = latestByZone.get(zone.id);
      const current_count = latest?.count || 0;
      const density_percentage = zone.max_capacity
        ? (current_count / zone.max_capacity) * 100
        : 0;
      return {
        zone_id: zone.id,
        zone_name: zone.name,
        current_count,
        max_capacity: zone.max_capacity,
        density_percentage,
        status: statusFor(density_percentage),
      };
    });

    return res.status(200).json({ success: true, data: payload });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error?.message });
  }
}
