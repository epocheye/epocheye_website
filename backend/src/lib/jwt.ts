import jwt from "jsonwebtoken";
import { CreatorJwtPayload } from "../types";

const ACCESS_SECRET = process.env.CREATOR_JWT_SECRET!;
const REFRESH_SECRET = process.env.CREATOR_JWT_REFRESH_SECRET!;
const ISSUER = "epocheye-creators";

export function signAccessToken(payload: Omit<CreatorJwtPayload, "iss">): string {
  return jwt.sign({ ...payload, iss: ISSUER }, ACCESS_SECRET, {
    expiresIn: "15m",
  });
}

export function signRefreshToken(creatorId: string): string {
  return jwt.sign({ sub: creatorId, iss: ISSUER }, REFRESH_SECRET, {
    expiresIn: "30d",
  });
}

export function verifyAccessToken(token: string): CreatorJwtPayload {
  return jwt.verify(token, ACCESS_SECRET, {
    issuer: ISSUER,
  }) as CreatorJwtPayload;
}

export function verifyRefreshToken(token: string): { sub: string } {
  return jwt.verify(token, REFRESH_SECRET, {
    issuer: ISSUER,
  }) as { sub: string };
}
