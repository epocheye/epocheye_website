import { supabase } from "../lib/supabase";
import { PromoCode } from "../types";

/** Generate a promo code like SAMBIT2391 */
function generateCode(name: string): string {
  const base = name
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6)
    .padEnd(3, "X");
  const suffix = String(Math.floor(1000 + Math.random() * 9000));
  return base + suffix;
}

export async function createPromoCode(creatorId: string, name: string): Promise<PromoCode> {
  let code: string;
  let attempts = 0;

  // Retry until we get a unique code
  while (true) {
    code = generateCode(name);
    const { data } = await supabase
      .from("promo_codes")
      .select("id")
      .eq("code", code)
      .single();

    if (!data) break; // code is unique
    attempts++;
    if (attempts > 10) throw new Error("Could not generate unique promo code");
  }

  const { data, error } = await supabase
    .from("promo_codes")
    .insert({ creator_id: creatorId, code: code! })
    .select()
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to create promo code");
  return data as PromoCode;
}

export async function getPromoCodeByCreator(creatorId: string): Promise<PromoCode | null> {
  const { data } = await supabase
    .from("promo_codes")
    .select("*")
    .eq("creator_id", creatorId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  return data as PromoCode | null;
}

export async function getPromoCodeByCode(code: string): Promise<PromoCode | null> {
  const { data } = await supabase
    .from("promo_codes")
    .select("*")
    .eq("code", code.toUpperCase())
    .eq("is_active", true)
    .single();

  return data as PromoCode | null;
}

export async function recordClick(params: {
  code: string;
  creatorId: string | null;
  ipAddress?: string;
  userAgent?: string;
}): Promise<void> {
  await supabase.from("referral_clicks").insert({
    code: params.code.toUpperCase(),
    creator_id: params.creatorId,
    ip_address: params.ipAddress ?? null,
    user_agent: params.userAgent ?? null,
  });
}

export async function recordConversion(params: {
  code: string;
  creatorId: string;
  customerId: string;
  planAmount: number;
  commissionRate: number;
  customerDiscountRate: number;
  currency?: string;
}): Promise<void> {
  const commissionAmount = parseFloat(
    ((params.planAmount * params.commissionRate) / 100).toFixed(2)
  );
  const discountAmount = parseFloat(
    ((params.planAmount * params.customerDiscountRate) / 100).toFixed(2)
  );

  await supabase.from("referral_conversions").insert({
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
