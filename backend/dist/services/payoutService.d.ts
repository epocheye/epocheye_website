import { PayoutRequest } from "../types";
interface AdminSettings {
    min_payout_inr: number;
    default_commission_rate: number;
    razorpay_payouts_enabled: boolean;
    conversion_confirm_days: number;
}
export declare function getAdminSettings(): Promise<AdminSettings>;
export declare function getAvailableBalance(creatorId: string): Promise<number>;
export declare function requestPayout(params: {
    creatorId: string;
    upiId: string;
    creatorName: string;
}): Promise<PayoutRequest>;
export declare function listPayouts(creatorId: string): Promise<PayoutRequest[]>;
export declare function listAllPayouts(): Promise<(PayoutRequest & {
    creator_name: string;
    creator_email: string;
})[]>;
export declare function updatePayoutStatus(id: string, status: "pending" | "processing" | "completed" | "failed"): Promise<void>;
export {};
//# sourceMappingURL=payoutService.d.ts.map