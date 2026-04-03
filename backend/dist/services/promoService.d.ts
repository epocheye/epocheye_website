import { PromoCode } from "../types";
export declare function createPromoCode(creatorId: string, name: string): Promise<PromoCode>;
export declare function getPromoCodeByCreator(creatorId: string): Promise<PromoCode | null>;
export declare function getPromoCodeByCode(code: string): Promise<PromoCode | null>;
export declare function recordClick(params: {
    code: string;
    creatorId: string | null;
    ipAddress?: string;
    userAgent?: string;
}): Promise<void>;
export declare function recordConversion(params: {
    code: string;
    creatorId: string;
    customerId: string;
    planAmount: number;
    commissionRate: number;
    customerDiscountRate: number;
    currency?: string;
}): Promise<void>;
//# sourceMappingURL=promoService.d.ts.map