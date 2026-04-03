"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.signAccessToken = signAccessToken;
exports.signRefreshToken = signRefreshToken;
exports.verifyAccessToken = verifyAccessToken;
exports.verifyRefreshToken = verifyRefreshToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const ACCESS_SECRET = process.env.CREATOR_JWT_SECRET;
const REFRESH_SECRET = process.env.CREATOR_JWT_REFRESH_SECRET;
const ISSUER = "epocheye-creators";
function signAccessToken(payload) {
    return jsonwebtoken_1.default.sign({ ...payload, iss: ISSUER }, ACCESS_SECRET, {
        expiresIn: "15m",
    });
}
function signRefreshToken(creatorId) {
    return jsonwebtoken_1.default.sign({ sub: creatorId, iss: ISSUER }, REFRESH_SECRET, {
        expiresIn: "30d",
    });
}
function verifyAccessToken(token) {
    return jsonwebtoken_1.default.verify(token, ACCESS_SECRET, {
        issuer: ISSUER,
    });
}
function verifyRefreshToken(token) {
    return jsonwebtoken_1.default.verify(token, REFRESH_SECRET, {
        issuer: ISSUER,
    });
}
//# sourceMappingURL=jwt.js.map