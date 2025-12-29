import { supabaseAdmin } from '../../../lib/supabaseClient';
import verifyToken from '../../../middleware/verifyToken';

function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) return reject(result);
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
    return;
  }

  const siteId = req.query.siteId;
  const date = req.query.date;
  if (!siteId || Number.isNaN(Number(siteId)) || !date) {
    return res.status(400).json({ success: false, message: 'Invalid siteId or date' });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('visitor_analytics')
      .select('domestic, foreign_visitors, solo_travelers, family_groups, school_groups, tour_groups')
      .eq('site_id', siteId)
      .eq('date', date)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') throw error;

    let domestic = data?.domestic || 0;
    let foreign = data?.foreign_visitors || 0;
    let solo = data?.solo_travelers || 0;
    let family = data?.family_groups || 0;
    let school = data?.school_groups || 0;
    let tour = data?.tour_groups || 0;

    if (!data) {
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      const start = `${date} 00:00:00`;
      const end = `${nextDate.toISOString().slice(0, 10)} 00:00:00`;

      const { data: crowdRows, error: crowdError } = await supabaseAdmin
        .from('crowd_data')
        .select('count')
        .eq('site_id', siteId)
        .gte('timestamp', start)
        .lt('timestamp', end);

      if (crowdError) throw crowdError;

      const total = (crowdRows || []).reduce((sum, row) => sum + (row.count || 0), 0);
      domestic = Math.round(total * 0.72);
      foreign = Math.max(0, total - domestic);
      solo = Math.round(total * 0.25);
      family = Math.round(total * 0.35);
      school = Math.round(total * 0.15);
      tour = Math.max(0, total - solo - family - school);
    }

    return res.status(200).json({
      success: true,
      data: {
        domestic_vs_foreign: { domestic, foreign },
        group_types: { solo, family, school, tour },
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error?.message });
  }
}
