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

async function assertStaffAccess(staffId, orgId) {
  const { data: staffRow, error } = await supabaseAdmin
    .from('staff')
    .select('id, site_id')
    .eq('id', staffId)
    .maybeSingle();

  if (error) throw error;
  if (!staffRow) return { ok: false, status: 404, message: 'Staff member not found' };

  const { data: siteRow, error: siteError } = await supabaseAdmin
    .from('sites')
    .select('id, org_id')
    .eq('id', staffRow.site_id)
    .maybeSingle();

  if (siteError) throw siteError;
  if (!siteRow) return { ok: false, status: 404, message: 'Site not found' };
  if (siteRow.org_id !== orgId) return { ok: false, status: 403, message: 'Not authorized for this staff record' };

  return { ok: true, staffRow, siteRow };
}

async function assertSiteAccess(siteId, orgId) {
  const { data: siteRow, error } = await supabaseAdmin
    .from('sites')
    .select('id, org_id')
    .eq('id', siteId)
    .maybeSingle();
  if (error) throw error;
  if (!siteRow) return { ok: false, status: 404, message: 'Target site not found' };
  if (siteRow.org_id !== orgId) return { ok: false, status: 403, message: 'Not authorized for target site' };
  return { ok: true };
}

export default async function handler(req, res) {
  const method = req.method;
  if (!['PATCH', 'DELETE'].includes(method)) {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    await runMiddleware(req, res, verifyToken);
  } catch (err) {
    return; // verifyToken already handled response
  }

  const orgId = req?.user?.org_id;
  if (!orgId) {
    return res.status(401).json({ success: false, message: 'Missing org context' });
  }

  const staffId = Number(req.query.id);
  if (!staffId || Number.isNaN(staffId)) {
    return res.status(400).json({ success: false, message: 'Invalid staff id' });
  }

  if (method === 'PATCH') {
    const { name, role, shift_start, shift_end, location, is_active, site_id } = req.body || {};

    const update = {};
    if (typeof name === 'string') update.name = name.trim();
    if (typeof role === 'string') update.role = role.trim();
    if (shift_start !== undefined) update.shift_start = shift_start || null;
    if (shift_end !== undefined) update.shift_end = shift_end || null;
    if (location !== undefined) update.location = location?.trim?.() || null;
    if (is_active !== undefined) update.is_active = !!is_active;
    const targetSiteId = site_id !== undefined ? Number(site_id) : null;

    if (Object.keys(update).length === 0 && site_id === undefined) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }

    try {
      const access = await assertStaffAccess(staffId, orgId);
      if (!access.ok) {
        return res.status(access.status).json({ success: false, message: access.message });
      }

      if (site_id !== undefined) {
        if (!targetSiteId || Number.isNaN(targetSiteId)) {
          return res.status(400).json({ success: false, message: 'Invalid target site' });
        }
        const siteAccess = await assertSiteAccess(targetSiteId, orgId);
        if (!siteAccess.ok) {
          return res.status(siteAccess.status).json({ success: false, message: siteAccess.message });
        }
        update.site_id = targetSiteId;
      }

      const { data, error } = await supabaseAdmin
        .from('staff')
        .update(update)
        .eq('id', staffId)
        .select('id, site_id, name, role, shift_start, shift_end, is_active, location')
        .single();

      if (error) throw error;
      return res.status(200).json({ success: true, data });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Server error', error: error?.message });
    }
  }

  if (method === 'DELETE') {
    try {
      const access = await assertStaffAccess(staffId, orgId);
      if (!access.ok) {
        return res.status(access.status).json({ success: false, message: access.message });
      }

      const { error } = await supabaseAdmin.from('staff').delete().eq('id', staffId);
      if (error) throw error;

      return res.status(200).json({ success: true });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Server error', error: error?.message });
    }
  }
}
