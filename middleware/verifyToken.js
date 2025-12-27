import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Express-style middleware for Next.js API routes.
 * Extracts Bearer token, verifies it, and attaches decoded payload to req.user.
 */
export function verifyToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const [, token] = authHeader.split(' ');

    if (!token) {
      res.status(401).json({ success: false, message: 'Authorization token missing' });
      return next(new Error('Unauthorized'));
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (err) {
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
    return next(err);
  }
}

export default verifyToken;
