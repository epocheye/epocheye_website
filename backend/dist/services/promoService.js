"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPromoCode = createPromoCode;
exports.getPromoCodeByCreator = getPromoCodeByCreator;
exports.getPromoCodeByCode = getPromoCodeByCode;
exports.recordClick = recordClick;
exports.recordConversion = recordConversion;
const supabase_1 = require("../lib/supabase");
/** Generate a promo code like SAMBIT2391 */
function generateCode(name) {
    const base = name
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .slice(0, 6)
        .padEnd(3, "X");
    const suffix = String(Math.floor(1000 + Math.random() * 9000));
    return base + suffix;
}
async function createPromoCode(creatorId, name) {
    let code;
    let attempts = 0;
    // Retry until we get a unique code
    while (true) {
        code = generateCode(name);
        const { data } = await supabase_1.supabase
            .from("promo_codes")
            .select("id")
            .eq("code", code)
            .single();
        if (!data)
            break; // code is unique
        attempts++;
        if (attempts > 10)
            throw new Error("Could not generate unique promo code");
    }
    const { data, error } = await supabase_1.supabase
        .from("promo_codes")
        .insert({ creator_id: creatorId, code: code })
        .select()
        .single();
    if (error || !data)
        throw new Error(error?.message ?? "Failed to create promo code");
    return data;
}
async function getPromoCodeByCreator(creatorId) {
    const { data } = await supabase_1.supabase
        .from("promo_codes")
        .select("*")
        .eq("creator_id", creatorId)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
    return data;
}
async function getPromoCodeByCode(code) {
    const { data } = await supabase_1.supabase
        .from("promo_codes")
        .select("*")
        .eq("code", code.toUpperCase())
        .eq("is_active", true)
        .single();
    return data;
}
async function recordClick(params) {
    await supabase_1.supabase.from("referral_clicks").insert({
        code: params.code.toUpperCase(),
        creator_id: params.creatorId,
        ip_address: params.ipAddress ?? null,
        user_agent: params.userAgent ?? null,
    });
}
async function recordConversion(params) {
    const commissionAmount = parseFloat(((params.planAmount * params.commissionRate) / 100).toFixed(2));
    const discountAmount = parseFloat(((params.planAmount * params.customerDiscountRate) / 100).toFixed(2));
    await supabase_1.supabase.from("referral_conversions").insert({
        code: params.code.toUpperCase(),
        creator_id: params.creatorId,
        customer_id: params.customerId,
        plan_amount: params.planAmount,
        commission_amount: commissionAmount,
        discount_amount: discountAmount,
        currency: params.currency ?? "USD",
        status: "pending",
    });
}
//# sourceMappingURL=promoService.js.map