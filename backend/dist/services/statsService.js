"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStatsOverview = getStatsOverview;
exports.getStatsTimeline = getStatsTimeline;
const supabase_1 = require("../lib/supabase");
async function getStatsOverview(creatorId) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    // Total clicks
    const { count: totalClicks } = await supabase_1.supabase
        .from("referral_clicks")
        .select("*", { count: "exact", head: true })
        .eq("creator_id", creatorId);
    // Total conversions
    const { count: totalConversions } = await supabase_1.supabase
        .from("referral_conversions")
        .select("*", { count: "exact", head: true })
        .eq("creator_id", creatorId);
    // Earnings breakdown
    const { data: earningsData } = await supabase_1.supabase
        .from("referral_conversions")
        .select("commission_amount, status")
        .eq("creator_id", creatorId);
    let lifetimeEarnings = 0;
    let pendingEarnings = 0;
    let paidEarnings = 0;
    for (const row of earningsData ?? []) {
        const amount = Number(row.commission_amount);
        lifetimeEarnings += amount;
        if (row.status === "pending" || row.status === "confirmed") {
            pendingEarnings += amount;
        }
        else if (row.status === "paid") {
            paidEarnings += amount;
        }
    }
    // Subtract payout amounts already requested (pending/processing/completed)
    const { data: payoutData } = await supabase_1.supabase
        .from("payout_requests")
        .select("amount, status")
        .eq("creator_id", creatorId)
        .in("status", ["pending", "processing", "completed"]);
    const totalRequestedPayouts = (payoutData ?? []).reduce((sum, r) => sum + Number(r.amount), 0);
    // Available = confirmed conversions - requested payouts
    const { data: confirmedData } = await supabase_1.supabase
        .from("referral_conversions")
        .select("commission_amount")
        .eq("creator_id", creatorId)
        .eq("status", "confirmed");
    const confirmedEarnings = (confirmedData ?? []).reduce((sum, r) => sum + Number(r.commission_amount), 0);
    const availableBalance = Math.max(0, confirmedEarnings - totalRequestedPayouts);
    // Current month clicks
    const { count: monthClicks } = await supabase_1.supabase
        .from("referral_clicks")
        .select("*", { count: "exact", head: true })
        .eq("creator_id", creatorId)
        .gte("clicked_at", monthStart);
    // Current month conversions
    const { count: monthConversions } = await supabase_1.supabase
        .from("referral_conversions")
        .select("*", { count: "exact", head: true })
        .eq("creator_id", creatorId)
        .gte("converted_at", monthStart);
    const tc = totalConversions ?? 0;
    const tk = totalClicks ?? 0;
    return {
        total_clicks: tk,
        total_conversions: tc,
        conversion_rate: tk > 0 ? parseFloat(((tc / tk) * 100).toFixed(1)) : 0,
        lifetime_earnings: parseFloat(lifetimeEarnings.toFixed(2)),
        pending_earnings: parseFloat(pendingEarnings.toFixed(2)),
        paid_earnings: parseFloat(paidEarnings.toFixed(2)),
        available_balance: parseFloat(availableBalance.toFixed(2)),
        current_month_clicks: monthClicks ?? 0,
        current_month_conversions: monthConversions ?? 0,
    };
}
async function getStatsTimeline(creatorId, days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceIso = since.toISOString();
    const [clicksRes, conversionsRes] = await Promise.all([
        supabase_1.supabase
            .from("referral_clicks")
            .select("clicked_at")
            .eq("creator_id", creatorId)
            .gte("clicked_at", sinceIso),
        supabase_1.supabase
            .from("referral_conversions")
            .select("converted_at")
            .eq("creator_id", creatorId)
            .gte("converted_at", sinceIso),
    ]);
    // Build a map of date → { clicks, conversions }
    const map = new Map();
    for (let i = 0; i < days; i++) {
        const d = new Date();
        d.setDate(d.getDate() - (days - 1 - i));
        const key = d.toISOString().split("T")[0];
        map.set(key, { clicks: 0, conversions: 0 });
    }
    for (const row of clicksRes.data ?? []) {
        const key = row.clicked_at.split("T")[0];
        const entry = map.get(key);
        if (entry)
            entry.clicks++;
    }
    for (const row of conversionsRes.data ?? []) {
        const key = row.converted_at.split("T")[0];
        const entry = map.get(key);
        if (entry)
            entry.conversions++;
    }
    return Array.from(map.entries()).map(([date, v]) => ({
        date,
        clicks: v.clicks,
        conversions: v.conversions,
    }));
}
//# sourceMappingURL=statsService.js.map