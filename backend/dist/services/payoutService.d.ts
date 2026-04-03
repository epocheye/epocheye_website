import { PayoutRequest } from "../types";
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
//# sourceMappingURL=payoutService.d.ts.map