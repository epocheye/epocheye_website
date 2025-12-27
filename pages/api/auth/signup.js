import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { supabaseAdmin } from '../../../lib/supabaseClient';

const JWT_SECRET = process.env.JWT_SECRET;
const emailRegex = /^[\w-.]+@[\w-]+\.[A-Za-z]{2,}$/;

/**
 * @param {import('next').NextApiRequest} req
 * @param {import('next').NextApiResponse} res
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { email, password, org_name, site_name, annual_visitors } = req.body || {};

  if (!email || !password || !org_name || !site_name) {
    return res.status(400).json({ success: false, message: 'Missing required fields' });
  }
  if (!emailRegex.test(email)) {
    return res.status(400).json({ success: false, message: 'Invalid email format' });
  }
  if (typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
  }

  try {
    const existing = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existing.data) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    const { data: orgData, error: orgError } = await supabaseAdmin
      .from('organizations')
      .insert({ name: org_name })
      .select('id')
      .single();

    if (orgError) {
      throw orgError;
    }

    const sitePayload = { org_id: orgData.id, name: site_name };
    if (annual_visitors !== undefined) {
      sitePayload.annual_visitors = annual_visitors;
    }

    const { data: siteData, error: siteError } = await supabaseAdmin
      .from('sites')
      .insert(sitePayload)
      .select('id')
      .single();

    if (siteError) {
      throw siteError;
    }

    const password_hash = await bcrypt.hash(password, 12);

    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .insert({ email, password_hash, org_id: orgData.id })
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
      user: { id: userData.id, email: userData.email, org_id: userData.org_id },
      site: { id: siteData.id },
    });
  } catch (error) {
    if (error?.code === '23505') {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }
    return res.status(500).json({ success: false, message: 'Server error', error: error?.message });
  }
}
