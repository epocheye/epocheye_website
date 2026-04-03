import { Creator, CreatorPublicProfile } from "../types";
export declare function toPublicProfile(c: Creator): CreatorPublicProfile;
export declare function findCreatorByEmail(email: string): Promise<Creator | null>;
export declare function findCreatorById(id: string): Promise<Creator | null>;
export declare function createCreator(params: {
    name: string;
    email: string;
    passwordHash: string;
    instagramUrl?: string;
    youtubeUrl?: string;
    tiktokUrl?: string;
    twitterUrl?: string;
    niche?: string;
}): Promise<Creator>;
export declare function updateCreator(id: string, fields: Partial<{
    name: string;
    instagram_url: string | null;
    youtube_url: string | null;
    tiktok_url: string | null;
    twitter_url: string | null;
    niche: string | null;
    upi_id: string | null;
    commission_rate: number;
    customer_discount: number;
    status: string;
}>): Promise<Creator>;
export declare function listAllCreators(): Promise<Creator[]>;
//# sourceMappingURL=creatorService.d.ts.map