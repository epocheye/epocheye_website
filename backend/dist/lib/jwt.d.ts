import { CreatorJwtPayload } from "../types";
export declare function signAccessToken(payload: Omit<CreatorJwtPayload, "iss">): string;
export declare function signRefreshToken(creatorId: string): string;
export declare function verifyAccessToken(token: string): CreatorJwtPayload;
export declare function verifyRefreshToken(token: string): {
    sub: string;
};
//# sourceMappingURL=jwt.d.ts.map