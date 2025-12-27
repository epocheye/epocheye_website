import { supabaseAdmin } from '../../../lib/supabaseClient';
import { get as cacheGet, set as cacheSet } from '../../../lib/cache';
import verifyToken from '../../../middleware/verifyToken';

const FIVE_MINUTES_AGO = () => new Date(Date.now() - 5 * 60 * 1000).toISOString();
const TODAY = () => new Date().toISOString().slice(0, 10);

function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
}

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
    return; // verifyToken already handled the response
  }

  const siteId = req.query.siteId;
  if (!siteId || Number.isNaN(Number(siteId))) {
    return res.status(400).json({ success: false, message: 'Invalid siteId' });
  }

  const cacheKey = `dashboard:stats:${siteId}`;
  const cached = cacheGet(cacheKey);
  if (cached) {
    return res.status(200).json({ success: true, data: cached, cached: true });
  }

  try {
    const { data: crowdData, error: crowdError } = await supabaseAdmin
      .from('crowd_data')
      .select('count')
      .eq('site_id', siteId)
      .gte('timestamp', FIVE_MINUTES_AGO());

    if (crowdError) throw crowdError;

    const current_visitors = (crowdData || []).reduce((sum, row) => sum + (row.count || 0), 0);

    const today = TODAY();
    const { data: analyticsToday, error: analyticsError } = await supabaseAdmin
      .from('visitor_analytics')
      .select('avg_stay_minutes, domestic, foreign_visitors')
      .eq('site_id', siteId)
      .eq('date', today)
      .maybeSingle();

    if (analyticsError && analyticsError.code !== 'PGRST116') throw analyticsError;

    const avg_stay_minutes = analyticsToday?.avg_stay_minutes || 0;
    const domestic = analyticsToday?.domestic || 0;
    const foreign_visitors = analyticsToday?.foreign_visitors || 0;
    const foreign_percentage =
      domestic + foreign_visitors === 0 ? 0 : (foreign_visitors / (domestic + foreign_visitors)) * 100;

    const { data: staffData, error: staffError } = await supabaseAdmin
      .from('staff')
      .select('is_active')
      .eq('site_id', siteId);

    if (staffError) throw staffError;

    const total_staff = staffData?.length || 0;
    const current_active_staff = (staffData || []).filter((s) => s.is_active !== false).length;
    const staff_utilization = total_staff === 0 ? 0 : (current_active_staff / total_staff) * 100;

    const data = { current_visitors, avg_stay_minutes, foreign_percentage, staff_utilization };
    cacheSet(cacheKey, data, 60_000);

    return res.status(200).json({ success: true, data });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error?.message });
  }
}
