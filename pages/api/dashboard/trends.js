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
  const days = Number(req.query.days || 7);
  if (!siteId || Number.isNaN(Number(siteId)) || Number.isNaN(days) || days <= 0) {
    return res.status(400).json({ success: false, message: 'Invalid siteId or days' });
  }

  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - (days - 1));
  const from = fromDate.toISOString().slice(0, 10);

  try {
    const { data, error } = await supabaseAdmin
      .from('crowd_data')
      .select('timestamp, count')
      .eq('site_id', siteId)
      .gte('timestamp', `${from} 00:00:00`)
      .order('timestamp', { ascending: true });

    if (error) throw error;

    const totalsByDate = new Map();
    (data || []).forEach((row) => {
      const dateKey = row.timestamp.slice(0, 10);
      const current = totalsByDate.get(dateKey) || 0;
      totalsByDate.set(dateKey, current + (row.count || 0));
    });

    const series = [];
    for (let i = 0; i < days; i += 1) {
      const d = new Date(fromDate);
      d.setDate(fromDate.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      const total = totalsByDate.get(key) || 0;
      const domestic = Math.round(total * 0.72);
      const foreign = Math.max(0, total - domestic);
      series.push({ date: key, total, domestic, foreign });
    }

    return res.status(200).json({ success: true, data: series });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error?.message });
  }
}
