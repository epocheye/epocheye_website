import verifyToken from '../../../middleware/verifyToken';
import { supabaseAdmin } from '../../../lib/supabaseClient';

function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) return reject(result);
      return resolve(result);
    });
  });
}

const HOURS = Array.from({ length: 13 }, (_, i) => 9 + i); // 09 through 21
const parseTimeToMinutes = (timeStr) => {
  if (!timeStr) return null;
  const [h, m] = timeStr.split(':').map((v) => Number(v));
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
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
  const date = req.query.date;
  if (!siteId || Number.isNaN(Number(siteId)) || !date) {
    return res.status(400).json({ success: false, message: 'Invalid siteId or date' });
  }

  const targetDate = new Date(date);
  if (Number.isNaN(targetDate.getTime())) {
    return res.status(400).json({ success: false, message: 'Invalid date format' });
  }

  const dayOfWeek = targetDate.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const holidayMultiplier = isWeekend ? 1.3 : 1;

  const historyFrom = new Date(targetDate);
  historyFrom.setDate(historyFrom.getDate() - 7 * 12);
  const from = historyFrom.toISOString().slice(0, 10);

  try {
    const { data: history, error: historyError } = await supabaseAdmin
      .from('visitor_analytics')
      .select('date, domestic, foreign_visitors')
      .eq('site_id', siteId)
      .gte('date', from)
      .lte('date', date);

    if (historyError) throw historyError;

    const filtered = (history || []).filter((row) => new Date(row.date).getDay() === dayOfWeek);
    const totals = filtered.map((row) => (row.domestic || 0) + (row.foreign_visitors || 0));
    const dailyAverage = totals.length ? totals.reduce((s, v) => s + v, 0) / totals.length : 0;
    const perHourBase = dailyAverage / HOURS.length;

    const { data: staffRows, error: staffError } = await supabaseAdmin
      .from('staff')
      .select('id, shift_start, shift_end, is_active')
      .eq('site_id', siteId);
    if (staffError) throw staffError;

    const hourly = HOURS.map((hour) => {
      const expected_visitors = perHourBase * holidayMultiplier;
      const recommended_staff = Math.max(1, Math.ceil(expected_visitors / 50));
      const hourStart = hour * 60;
      const hourEnd = hourStart + 60;
      const current_staff = (staffRows || []).filter((row) => {
        if (row.is_active === false) return false;
        const start = parseTimeToMinutes(row.shift_start);
        const end = parseTimeToMinutes(row.shift_end);
        if (start === null || end === null) return false;
        return start <= hourStart && end >= hourEnd;
      }).length;

      const status = current_staff === recommended_staff
        ? 'optimal'
        : current_staff > recommended_staff
          ? 'overstaffed'
          : 'understaffed';
      const hourly_savings = (current_staff - recommended_staff) * 500;

      return {
        time: `${hour.toString().padStart(2, '0')}:00`,
        expected_visitors: Math.round(expected_visitors),
        current_staff,
        recommended_staff,
        status,
        hourly_savings,
      };
    });

    const monthly_savings = hourly.reduce((sum, h) => sum + h.hourly_savings, 0) * 30;
    const total_hours_reduced = hourly
      .filter((h) => h.status === 'overstaffed')
      .reduce((sum, h) => sum + (h.current_staff - h.recommended_staff), 0);
    const recommendedTotal = hourly.reduce((sum, h) => sum + h.recommended_staff, 0);
    const optimization_percentage = recommendedTotal
      ? (Math.max(total_hours_reduced, 0) / recommendedTotal) * 100
      : 0;

    return res.status(200).json({
      success: true,
      data: {
        hourly,
        summary: {
          monthly_savings,
          total_hours_reduced,
          optimization_percentage,
        },
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error?.message });
  }
}
