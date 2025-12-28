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

const requiredString = (value) => typeof value === 'string' && value.trim().length > 0;

async function assertSiteAccess(siteId, orgId) {
  const { data: siteRow, error } = await supabaseAdmin
    .from('sites')
    .select('id, org_id')
    .eq('id', siteId)
    .maybeSingle();

  if (error) throw error;
  if (!siteRow) return { ok: false, status: 404, message: 'Site not found' };
  if (siteRow.org_id !== orgId) return { ok: false, status: 403, message: 'Not authorized for this site' };
  return { ok: true };
}

export default async function handler(req, res) {
  const method = req.method;
  if (!['GET', 'POST'].includes(method)) {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    await runMiddleware(req, res, verifyToken);
  } catch (err) {
    return; // verifyToken already responded
  }

  const orgId = req?.user?.org_id;
  if (!orgId) {
    return res.status(401).json({ success: false, message: 'Missing org context' });
  }

  if (method === 'GET') {
    const siteId = Number(req.query.siteId);
    if (!siteId || Number.isNaN(siteId)) {
      return res.status(400).json({ success: false, message: 'siteId is required' });
    }

    try {
      const access = await assertSiteAccess(siteId, orgId);
      if (!access.ok) {
        return res.status(access.status).json({ success: false, message: access.message });
      }

      const { data, error } = await supabaseAdmin
        .from('staff')
        .select('id, site_id, name, role, shift_start, shift_end, is_active, location')
        .eq('site_id', siteId)
        .order('name', { ascending: true });

      if (error) throw error;

      return res.status(200).json({ success: true, data: data || [] });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Server error', error: error?.message });
    }
  }

  if (method === 'POST') {
    const { site_id, name, role, shift_start, shift_end, location, is_active } = req.body || {};
    const siteId = Number(site_id);
    if (!siteId || Number.isNaN(siteId)) {
      return res.status(400).json({ success: false, message: 'site_id is required' });
    }
    if (!requiredString(name)) {
      return res.status(400).json({ success: false, message: 'name is required' });
    }
    if (!requiredString(role)) {
      return res.status(400).json({ success: false, message: 'role is required' });
    }

    try {
      const access = await assertSiteAccess(siteId, orgId);
      if (!access.ok) {
        return res.status(access.status).json({ success: false, message: access.message });
      }

      const payload = {
        site_id: siteId,
        name: name.trim(),
        role: role.trim(),
        shift_start: shift_start || null,
        shift_end: shift_end || null,
        location: location?.trim?.() || null,
        is_active: is_active !== false,
      };

      const { data, error } = await supabaseAdmin
        .from('staff')
        .insert(payload)
        .select('id, site_id, name, role, shift_start, shift_end, is_active, location')
        .single();

      if (error) throw error;

      return res.status(200).json({ success: true, data });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Server error', error: error?.message });
    }
  }
}
