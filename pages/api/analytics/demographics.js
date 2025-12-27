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

    if (error) throw error;

    const domestic = data?.domestic || 0;
    const foreign = data?.foreign_visitors || 0;

    return res.status(200).json({
      success: true,
      data: {
        domestic_vs_foreign: { domestic, foreign },
        group_types: {
          solo: data?.solo_travelers || 0,
          family: data?.family_groups || 0,
          school: data?.school_groups || 0,
          tour: data?.tour_groups || 0,
        },
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error?.message });
  }
}
