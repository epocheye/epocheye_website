"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAdminSettings = getAdminSettings;
exports.getAvailableBalance = getAvailableBalance;
exports.requestPayout = requestPayout;
exports.listPayouts = listPayouts;
exports.listAllPayouts = listAllPayouts;
exports.updatePayoutStatus = updatePayoutStatus;
const supabase_1 = require("../lib/supabase");
const razorpay_1 = require("../lib/razorpay");
async function getAdminSettings() {
    const { data } = await supabase_1.supabase
        .from("admin_settings")
        .select("*")
        .eq("id", 1)
        .single();
    return {
        min_payout_inr: Number(data?.min_payout_inr ?? 500),
        default_commission_rate: Number(data?.default_commission_rate ?? 10),
        razorpay_payouts_enabled: data?.razorpay_payouts_enabled !== false,
        conversion_confirm_days: Number(data?.conversion_confirm_days ?? 7),
    };
}
async function getAvailableBalance(creatorId) {
    const settings = await getAdminSettings();
    const cutoff = new Date(Date.now() - settings.conversion_confirm_days * 24 * 60 * 60 * 1000).toISOString();
    const { data: confirmedData } = await supabase_1.supabase
        .from("referral_conversions")
        .select("commission_amount, status, converted_at")
        .eq("creator_id", creatorId);
    const confirmed = (confirmedData ?? []).reduce((sum, r) => {
        const isConfirmed = r.status === "confirmed";
        const isAutoConfirmed = r.status === "pending" && r.converted_at <= cutoff;
        if (isConfirmed || isAutoConfirmed) {
            return sum + Number(r.commission_amount);
        }
        return sum;
    }, 0);
    const { data: payoutData } = await supabase_1.supabase
        .from("payout_requests")
        .select("amount")
        .eq("creator_id", creatorId)
        .in("status", ["pending", "processing", "completed"]);
    const requested = (payoutData ?? []).reduce((sum, r) => sum + Number(r.amount), 0);
    return parseFloat(Math.max(0, confirmed - requested).toFixed(2));
}
async function requestPayout(params) {
    const settings = await getAdminSettings();
    const available = await getAvailableBalance(params.creatorId);
    if (available < settings.min_payout_inr) {
        throw new Error(`Minimum payout is ₹${settings.min_payout_inr}. Your available balance is ₹${available.toFixed(2)}.`);
    }
    const status = settings.razorpay_payouts_enabled ? "processing" : "pending";
    const { data: pr, error: prError } = await supabase_1.supabase
        .from("payout_requests")
        .insert({
        creator_id: params.creatorId,
        amount: available,
        currency: "INR",
        status,
        upi_id: params.upiId,
    })
        .select()
        .single();
    if (prError || !pr) {
        throw new Error(prError?.message ?? "Failed to create payout request");
    }
    if (!settings.razorpay_payouts_enabled) {
        return pr;
    }
    // Initiate Razorpay payout — amount is already in INR, convert to paise
    try {
        const amountPaise = Math.round(available * 100);
        const rzpPayout = await (0, razorpay_1.createUpiPayout)({
            upiId: params.upiId,
            amountPaise,
            creatorName: params.creatorName,
            referenceId: pr.id,
            notes: { creator_id: params.creatorId, payout_request_id: pr.id },
        });
        await supabase_1.supabase
            .from("payout_requests")
            .update({ razorpay_payout_id: rzpPayout.id })
            .eq("id", pr.id);
        return { ...pr, razorpay_payout_id: rzpPayout.id };
    }
    catch (err) {
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