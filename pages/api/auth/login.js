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

  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required' });
  }
  if (!emailRegex.test(email)) {
    return res.status(400).json({ success: false, message: 'Invalid email format' });
  }

  try {
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, email, password_hash, org_id, role')
      .eq('email', email)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, org_id: user.org_id, role: user.role },
      JWT_SECRET,
      { expiresIn: '30d' },
    );

    return res.status(200).json({
      success: true,
      token,
      user: { id: user.id, email: user.email, org_id: user.org_id, role: user.role },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error?.message });
  }
}
