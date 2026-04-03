"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAvailableBalance = getAvailableBalance;
exports.requestPayout = requestPayout;
exports.listPayouts = listPayouts;
exports.listAllPayouts = listAllPayouts;
exports.updatePayoutStatus = updatePayoutStatus;
const supabase_1 = require("../lib/supabase");
const razorpay_1 = require("../lib/razorpay");
const MIN_PAYOUT_USD = 10;
// Approximate USD to INR conversion — in production, fetch live rate
const USD_TO_INR = 83;
async function getAvailableBalance(creatorId) {
    const { data: confirmedData } = await supabase_1.supabase
        .from("referral_conversions")
        .select("commission_amount")
        .eq("creator_id", creatorId)
        .eq("status", "confirmed");
    const confirmed = (confirmedData ?? []).reduce((sum, r) => sum + Number(r.commission_amount), 0);
    const { data: payoutData } = await supabase_1.supabase
        .from("payout_requests")
        .select("amount")
        .eq("creator_id", creatorId)
        .in("status", ["pending", "processing", "completed"]);
    const requested = (payoutData ?? []).reduce((sum, r) => sum + Number(r.amount), 0);
    return parseFloat(Math.max(0, confirmed - requested).toFixed(2));
}
async function requestPayout(params) {
    const available = await getAvailableBalance(params.creatorId);
    if (available < MIN_PAYOUT_USD) {
        throw new Error(`Minimum payout is $${MIN_PAYOUT_USD}. Your available balance is $${available.toFixed(2)}.`);
    }
    // Insert payout request first
    const { data: pr, error: prError } = await supabase_1.supabase
        .from("payout_requests")
        .insert({
        creator_id: params.creatorId,
        amount: available,
        currency: "USD",
        status: "processing",
        upi_id: params.upiId,
    })
        .select()
        .single();
    if (prError || !pr) {
        throw new Error(prError?.message ?? "Failed to create payout request");
    }
    // Initiate Razorpay payout (INR conversion)
    try {
        const amountInr = Math.round(available * USD_TO_INR * 100); // paise
        const rzpPayout = await (0, razorpay_1.createUpiPayout)({
            upiId: params.upiId,
            amountPaise: amountInr,
            creatorName: params.creatorName,
            referenceId: pr.id,
            notes: { creator_id: params.creatorId, payout_request_id: pr.id },
        });
        // Update with Razorpay ID
        await supabase_1.supabase
            .from("payout_requests")
            .update({ razorpay_payout_id: rzpPayout.id })
            .eq("id", pr.id);
        return { ...pr, razorpay_payout_id: rzpPayout.id };
    }
    catch (err) {
        // If Razorpay fails, mark payout as failed
        await supabase_1.supabase
            .from("payout_requests")
            .update({ status: "failed" })
            .eq("id", pr.id);
        throw err;
    }
}
async function listPayouts(creatorId) {
    const { data, error } = await supabase_1.supabase
        .from("payout_requests")
        .select("*")
        .eq("creator_id", creatorId)
        .order("requested_at", { ascending: false });
    if (error)
        throw new Error(error.message);
    return (data ?? []);
}
async function listAllPayouts() {
    const { data, error } = await supabase_1.supabase
        .from("payout_requests")
        .select("*, creators(name, email)")
        .order("requested_at", { ascending: false });
    if (error)
        throw new Error(error.message);
    return (data ?? []).map((r) => ({
        ...r,
        creator_name: r.creators?.name ?? "",
        creator_email: r.creators?.email ?? "",
    }));
}
async function updatePayoutStatus(id, status) {
    const updates = { status };
    if (status === "completed" || status === "failed") {
        updates.processed_at = new Date().toISOString();
    }
    await supabase_1.supabase.from("payout_requests").update(updates).eq("id", id);
}
//# sourceMappingURL=payoutService.js.map