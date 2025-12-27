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
      .from('visitor_analytics')
      .select('date, domestic, foreign_visitors')
      .eq('site_id', siteId)
      .gte('date', from)
      .order('date', { ascending: true });

    if (error) throw error;

    const series = (data || []).map((row) => ({
      date: row.date,
      total: (row.domestic || 0) + (row.foreign_visitors || 0),
      domestic: row.domestic || 0,
      foreign: row.foreign_visitors || 0,
    }));

    return res.status(200).json({ success: true, data: series });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error?.message });
  }
}
