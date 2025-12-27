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

const stddev = (values = []) => {
  if (!values.length) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
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
  const days = Number(req.query.days || 30);
  if (!siteId || Number.isNaN(Number(siteId)) || Number.isNaN(days) || days <= 0) {
    return res.status(400).json({ success: false, message: 'Invalid siteId or days' });
  }

  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - 89);
  const from = fromDate.toISOString().slice(0, 10);

  try {
    const { data, error } = await supabaseAdmin
      .from('visitor_analytics')
      .select('date, domestic, foreign')
      .eq('site_id', siteId)
      .gte('date', from)
      .order('date', { ascending: false });

    if (error) throw error;

    const byDay = new Map();
    (data || []).forEach((row) => {
      const total = (row.domestic || 0) + (row.foreign || 0);
      const dow = new Date(row.date).getDay();
      const list = byDay.get(dow) || [];
      list.push(total);
      byDay.set(dow, list);
    });

    const results = [];
    const base = new Date();

    for (let i = 1; i <= days; i += 1) {
      const date = new Date(base);
      date.setDate(base.getDate() + i);
      const dow = date.getDay();
      const samples = byDay.get(dow) || [];
      const mean = samples.length ? samples.reduce((s, v) => s + v, 0) / samples.length : 0;
      const deviation = stddev(samples);
      const upper = mean + 1.5 * deviation;
      const lower = Math.max(0, mean - 1.5 * deviation);
      const confidence_score = Number(Math.min(samples.length / 10, 1).toFixed(2));

      results.push({
        date: date.toISOString().slice(0, 10),
        predicted: Math.round(mean),
        upper_bound: Math.round(upper),
        lower_bound: Math.round(lower),
        confidence_score,
      });
    }

    return res.status(200).json({ success: true, data: results });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error?.message });
  }
}
