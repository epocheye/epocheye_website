import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('Missing JWT_SECRET environment variable');
}

/**
 * Generate a signed JWT for the provided payload.
 * @param {object} payload
 * @returns {string}
 */
export function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
}

/**
 * Verify a token and return decoded payload.
 * @param {string} token
 * @returns {object}
 */
export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

/**
 * Extract user data from a token.
 * @param {string} token
 * @returns {{ userId: number, email: string, orgId: number, role?: string }}
 */
export function getUserFromToken(token) {
  const decoded = verifyToken(token);
  return {
    userId: decoded.id,
    email: decoded.email,
    orgId: decoded.org_id,
    role: decoded.role,
  };
}
