import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { supabaseAdmin } from '../../../lib/supabaseClient';

const JWT_SECRET = process.env.JWT_SECRET;
const emailRegex = /^[\w-.]+@[\w-]+\.[A-Za-z]{2,}$/;

/**
 * Handles signup with organization + site selection.
 * - Organizations and sites are resolved from DB (no mock data).
 * - If an org/site already exists, reuse it; otherwise create it.
 * - Sites are unique per org during signup; duplicates are rejected.
 * @param {import('next').NextApiRequest} req
 * @param {import('next').NextApiResponse} res
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { email, password, org_id, org_name, site_id, site_name, annual_visitors } = req.body || {};

  const orgId = org_id ? Number(org_id) : null;
  const siteId = site_id ? Number(site_id) : null;
  const normalizedOrgName = org_name ? String(org_name).trim() : '';
  const normalizedSiteName = site_name ? String(site_name).trim() : '';
  const annualVisitorsValue =
    annual_visitors === undefined || annual_visitors === null || annual_visitors === ''
      ? undefined
      : Number(annual_visitors);

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Missing email or password' });
  }
  if (!orgId && !normalizedOrgName) {
    return res.status(400).json({ success: false, message: 'Organization is required' });
  }
  if (!siteId && !normalizedSiteName) {
    return res.status(400).json({ success: false, message: 'Site is required' });
  }
  if (!emailRegex.test(email)) {
    return res.status(400).json({ success: false, message: 'Invalid email format' });
  }
  if (typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
  }
  if (orgId && Number.isNaN(orgId)) {
    return res.status(400).json({ success: false, message: 'Invalid organization selection' });
  }
  if (siteId && Number.isNaN(siteId)) {
    return res.status(400).json({ success: false, message: 'Invalid site selection' });
  }
  if (annualVisitorsValue !== undefined && Number.isNaN(annualVisitorsValue)) {
    return res.status(400).json({ success: false, message: 'Annual visitors must be a number' });
  }

  try {
    const existingUser = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existingUser.data) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    // Resolve or create organization
    let resolvedOrgId = null;
    if (orgId) {
      const { data: orgRow, error: orgLookupError } = await supabaseAdmin
        .from('organizations')
        .select('id')
        .eq('id', orgId)
        .maybeSingle();

      if (orgLookupError) {
        throw orgLookupError;
      }
      if (!orgRow) {
        return res.status(400).json({ success: false, message: 'Organization not found' });
      }
      resolvedOrgId = orgRow.id;
    } else {
      const { data: existingOrg, error: orgLookupError } = await supabaseAdmin
        .from('organizations')
        .select('id')
        .ilike('name', normalizedOrgName)
        .maybeSingle();

      if (orgLookupError && orgLookupError.code !== 'PGRST116') {
        throw orgLookupError;
      }

      if (existingOrg) {
        resolvedOrgId = existingOrg.id;
      } else {
        const { data: newOrg, error: orgError } = await supabaseAdmin
          .from('organizations')
          .insert({ name: normalizedOrgName })
          .select('id')
          .single();

        if (orgError) {
          throw orgError;
        }
        resolvedOrgId = newOrg.id;
      }
    }

    // Resolve or create site under the organization
    let resolvedSiteId = null;
    if (siteId) {
      const { data: siteRow, error: siteLookupError } = await supabaseAdmin
        .from('sites')
        .select('id, org_id')
        .eq('id', siteId)
        .maybeSingle();

      if (siteLookupError) {
        throw siteLookupError;
      }
      if (!siteRow) {
        return res.status(400).json({ success: false, message: 'Site not found' });
      }
      if (siteRow.org_id !== resolvedOrgId) {
        return res.status(400).json({ success: false, message: 'Selected site is not part of the organization' });
      }
      resolvedSiteId = siteRow.id;
    } else {
      const { data: existingSite, error: siteLookupError } = await supabaseAdmin
        .from('sites')
        .select('id')
        .eq('org_id', resolvedOrgId)
        .ilike('name', normalizedSiteName)
        .maybeSingle();

      if (siteLookupError && siteLookupError.code !== 'PGRST116') {
        throw siteLookupError;
      }

      if (existingSite) {
        resolvedSiteId = existingSite.id;
      } else {
        const sitePayload = { org_id: resolvedOrgId, name: normalizedSiteName };
        if (annualVisitorsValue !== undefined) {
          sitePayload.annual_visitors = annualVisitorsValue;
        }

        const { data: siteData, error: siteError } = await supabaseAdmin
          .from('sites')
          .insert(sitePayload)
          .select('id')
          .single();

        if (siteError) {
          if (siteError.code === '23505') {
            return res.status(409).json({ success: false, message: 'Site already exists for this organization' });
          }
          throw siteError;
        }
        resolvedSiteId = siteData.id;
      }
    }

    const password_hash = await bcrypt.hash(password, 12);

    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .insert({ email, password_hash, org_id: resolvedOrgId })
      .select('id, email, org_id, role')
      .single();

    if (userError) {
      throw userError;
    }

    const token = jwt.sign(
      { id: userData.id, email: userData.email, org_id: userData.org_id, role: userData.role },
      JWT_SECRET,
      { expiresIn: '30d' },
    );

    return res.status(200).json({
      success: true,
      token,
      user: { id: userData.id, email: userData.email, org_id: userData.org_id, role: userData.role },
      site: { id: resolvedSiteId },
    });
  } catch (error) {
    if (error?.code === '23505') {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }
    return res.status(500).json({ success: false, message: 'Server error', error: error?.message });
  }
}
