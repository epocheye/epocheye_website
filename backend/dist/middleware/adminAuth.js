"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAdmin = requireAdmin;
const node_crypto_1 = require("node:crypto");
function safeEqual(a, b) {
    const ab = Buffer.from(a);
    const bb = Buffer.from(b);
    if (ab.length !== bb.length)
        return false;
    return (0, node_crypto_1.timingSafeEqual)(ab, bb);
}
function requireAdmin(req, res, next) {
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
//# sourceMappingURL=adminAuth.js.map