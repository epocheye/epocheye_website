import { Request, Response, NextFunction } from "express";

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const adminKey = req.headers["x-admin-key"];
  const expectedKey = process.env.ADMIN_API_KEY;

  if (!expectedKey) {
    res.status(500).json({ success: false, error: "Admin key not configured" });
    return;
  }

  if (!adminKey || adminKey !== expectedKey) {
    res.status(403).json({ success: false, error: "Forbidden" });
    return;
  }

  next();
}
