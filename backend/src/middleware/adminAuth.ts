import { Request, Response, NextFunction } from "express";
import { timingSafeEqual } from "node:crypto";

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const adminKey = req.headers["x-admin-key"];
  const expectedKey = process.env.ADMIN_API_KEY;

  if (!expectedKey) {
    res.status(500).json({ success: false, error: "Admin key not configured" });
    return;
  }

  if (typeof adminKey !== "string" || !safeEqual(adminKey, expectedKey)) {
    res.status(403).json({ success: false, error: "Forbidden" });
    return;
  }

  next();
}
