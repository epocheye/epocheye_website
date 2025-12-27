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

const coversHour = (row, hourStartMinutes, hourEndMinutes) => {
  if (row.is_active === false) return false;
  const [hs, ms] = (row.shift_start || '').split(':').map(Number);
  const [he, me] = (row.shift_end || '').split(':').map(Number);
  if ([hs, ms, he, me].some((v) => Number.isNaN(v))) return false;
  const start = hs * 60 + ms;
  const end = he * 60 + me;
  return start <= hourStartMinutes && end >= hourEndMinutes;
};

/**
 * @param {import('next').NextApiRequest} req
 * @param {import('next').NextApiResponse} res
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    await runMiddleware(req, res, verifyToken);
  } catch (err) {
    return;
  }

  const userRole = req.user?.role;
  if (!['admin', 'manager'].includes(userRole)) {
    return res.status(403).json({ success: false, message: 'Insufficient permissions' });
  }

  const { siteId, date, recommendations } = req.body || {};
  if (!siteId || Number.isNaN(Number(siteId)) || !date || !Array.isArray(recommendations)) {
    return res.status(400).json({ success: false, message: 'Invalid payload' });
  }

  try {
    const { data: staffRows, error: staffError } = await supabaseAdmin
      .from('staff')
      .select('id, shift_start, shift_end, is_active')
      .eq('site_id', siteId);
    if (staffError) throw staffError;

    let changes = 0;

    for (const rec of recommendations) {
      const [hourStr] = (rec.time || '').split(':');
      const hour = Number(hourStr);
      if (Number.isNaN(hour)) continue;
      const startMinutes = hour * 60;
      const endMinutes = startMinutes + 60;

      const covering = (staffRows || []).filter((row) => coversHour(row, startMinutes, endMinutes));
      const current = covering.length;
      const target = Math.max(Number(rec.recommended_staff) || 0, 0);

      if (current > target) {
        const toDeactivate = covering.slice(0, current - target).map((c) => c.id);
        if (toDeactivate.length) {
          const { error } = await supabaseAdmin
            .from('staff')
            .update({ is_active: false })
            .in('id', toDeactivate);
          if (error) throw error;
          changes += toDeactivate.length;
        }
      } else if (target > current) {
        const toAdd = target - current;
        const inserts = Array.from({ length: toAdd }).map((_, idx) => ({
          site_id: siteId,
          name: `Auto-schedule ${rec.time}-${idx + 1}`,
          role: 'temp',
          shift_start: `${hour.toString().padStart(2, '0')}:00`,
          shift_end: `${(hour + 1).toString().padStart(2, '0')}:00`,
          is_active: true,
        }));
        const { error } = await supabaseAdmin.from('staff').insert(inserts);
        if (error) throw error;
        changes += inserts.length;
      }
    }

    return res.status(200).json({ success: true, message: 'Staff schedule updated', changes_applied: changes });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error?.message });
  }
}
