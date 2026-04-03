import Razorpay from "razorpay";
export declare function getRazorpay(): Razorpay;
/**
 * Initiate a UPI payout via Razorpay Payouts API.
 * amount is in USD cents (Razorpay expects paise for INR, but we store USD).
 * For now we pass through the amount as-is; convert currency before calling.
 */
export declare function createUpiPayout(params: {
    upiId: string;
    amountPaise: number;
    creatorName: string;
    referenceId: string;
    notes?: Record<string, string>;
}): Promise<{
    id: string;
    status: string;
}>;
//# sourceMappingURL=razorpay.d.ts.map