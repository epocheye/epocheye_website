import "server-only";

import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const COOKIE_NAME = "admin_token";
const TOKEN_MAX_AGE_SEC = 8 * 60 * 60; // 8 hours

function getSecret() {
  const secret = process.env.ADMIN_JWT_SECRET;
  if (!secret) throw new Error("ADMIN_JWT_SECRET is not configured");
  return secret;
}

/** Sign a short-lived admin JWT and return it as a string. */
export function signAdminJWT(adminId, email) {
  return jwt.sign({ sub: adminId, email, iss: "epocheye-admin" }, getSecret(), {
    expiresIn: TOKEN_MAX_AGE_SEC,
  });
}

/**
 * Verify the admin JWT from the request cookie.
 * Returns { ok: true, payload } or { ok: false, status, message }.
 */
export async function verifyAdminJWT() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) {
    return { ok: false, status: 401, message: "Not authenticated" };
  }

  try {
    const payload = jwt.verify(token, getSecret(), { issuer: "epocheye-admin" });
    return { ok: true, payload };
  } catch {
    return { ok: false, status: 401, message: "Invalid or expired session" };
  }
}

/**
 * Verify the admin JWT from the request headers (for API routes using request object).
 * Reads the cookie from request.headers directly.
 */
export function verifyAdminJWTFromRequest(request) {
  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  const token = match ? match[1] : null;

  if (!token) {
    return { ok: false, status: 401, message: "Not authenticated" };
  }

  try {
    const payload = jwt.verify(token, getSecret(), { issuer: "epocheye-admin" });
    return { ok: true, payload };
  } catch {
    return { ok: false, status: 401, message: "Invalid or expired session" };
  }
}

/** Hash a plain-text password with bcrypt. */
export async function hashAdminPassword(plain) {
  return bcrypt.hash(plain, 10);
}

/** Verify a plain-text password against a bcrypt hash. */
export async function verifyAdminPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

/** Build the Set-Cookie header value for the admin token. */
export function makeAdminCookie(token) {
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${TOKEN_MAX_AGE_SEC}${
    process.env.NODE_ENV === "production" ? "; Secure" : ""
  }`;
}

/** Build a cookie that clears the admin session. */
export function clearAdminCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`;
}
