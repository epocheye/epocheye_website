import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * @param {import('next').NextApiRequest} req
 * @param {import('next').NextApiResponse} res
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization || '';
  const [, token] = authHeader.split(' ');

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authorization token missing' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const { id, email, org_id, role } = decoded;
    const newToken = jwt.sign({ id, email, org_id, role }, JWT_SECRET, { expiresIn: '30d' });

    return res.status(200).json({ success: true, token: newToken });
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}
