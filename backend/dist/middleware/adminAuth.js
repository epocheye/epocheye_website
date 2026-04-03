"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAdmin = requireAdmin;
function requireAdmin(req, res, next) {
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
//# sourceMappingURL=adminAuth.js.map