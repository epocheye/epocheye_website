import { supabaseAdmin } from '../../../lib/supabaseClient';

/**
 * Lists organizations and their sites so the signup UI can stay DB-backed.
 * Supports optional filtering by orgId via query params.
 * @param {import('next').NextApiRequest} req
 * @param {import('next').NextApiResponse} res
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const orgIdParam = req.query.orgId;
  const orgId = orgIdParam ? Number(orgIdParam) : null;

  if (orgIdParam && Number.isNaN(orgId)) {
    return res.status(400).json({ success: false, message: 'Invalid orgId' });
  }

  try {
    let query = supabaseAdmin
      .from('organizations')
      .select('id,name,sites(id,name)')
      .order('name', { ascending: true })
      .order('name', { foreignTable: 'sites', ascending: true });

    if (orgId) {
      query = query.eq('id', orgId);
    }

    const { data, error } = await query;
    if (error) {
      throw error;
    }

    return res.status(200).json({ success: true, data: data || [] });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error?.message });
  }
}
