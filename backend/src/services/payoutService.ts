import { supabase } from "../lib/supabase";
import { createUpiPayout } from "../lib/razorpay";
import { PayoutRequest } from "../types";

interface AdminSettings {
  min_payout_inr: number;
  default_commission_rate: number;
  razorpay_payouts_enabled: boolean;
  conversion_confirm_days: number;
}

export async function getAdminSettings(): Promise<AdminSettings> {
  const { data } = await supabase
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

export async function getAvailableBalance(creatorId: string): Promise<number> {
  const settings = await getAdminSettings();
  const cutoff = new Date(
    Date.now() - settings.conversion_confirm_days * 24 * 60 * 60 * 1000
  ).toISOString();

  const { data: confirmedData } = await supabase
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

  const { data: payoutData } = await supabase
    .from("payout_requests")
    .select("amount")
    .eq("creator_id", creatorId)
    .in("status", ["pending", "processing", "completed"]);

  const requested = (payoutData ?? []).reduce((sum, r) => sum + Number(r.amount), 0);

  return parseFloat(Math.max(0, confirmed - requested).toFixed(2));
}

export async function requestPayout(params: {
  creatorId: string;
  upiId: string;
  creatorName: string;
}): Promise<PayoutRequest> {
  const settings = await getAdminSettings();
  const available = await getAvailableBalance(params.creatorId);

  if (available < settings.min_payout_inr) {
    throw new Error(
      `Minimum payout is ₹${settings.min_payout_inr}. Your available balance is ₹${available.toFixed(2)}.`
    );
  }

  const status = settings.razorpay_payouts_enabled ? "processing" : "pending";

  const { data: pr, error: prError } = await supabase
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
    return pr as PayoutRequest;
  }

  // Initiate Razorpay payout — amount is already in INR, convert to paise
  try {
    const amountPaise = Math.round(available * 100);
    const rzpPayout = await createUpiPayout({
      upiId: params.upiId,
      amountPaise,
      creatorName: params.creatorName,
      referenceId: pr.id,
      notes: { creator_id: params.creatorId, payout_request_id: pr.id },
    });

    await supabase
      .from("payout_requests")
      .update({ razorpay_payout_id: rzpPayout.id })
      .eq("id", pr.id);

    return { ...pr, razorpay_payout_id: rzpPayout.id } as PayoutRequest;
  } catch (err) {
    await supabase
      .from("payout_requests")
      .update({ status: "failed" })
      .eq("id", pr.id);
    throw err;
  }
}

export async function listPayouts(creatorId: string): Promise<PayoutRequest[]> {
  const { data, error } = await supabase
    .from("payout_requests")
    .select("*")
    .eq("creator_id", creatorId)
    .order("requested_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as PayoutRequest[];
}

export async function listAllPayouts(): Promise<(PayoutRequest & { creator_name: string; creator_email: string })[]> {
  const { data, error } = await supabase
    .from("payout_requests")
    .select("*, creators(name, email)")
    .order("requested_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((r: any) => ({
    ...r,
    creator_name: r.creators?.name ?? "",
    creator_email: r.creators?.email ?? "",
  }));
}

export async function updatePayoutStatus(
  id: string,
  status: "pending" | "processing" | "completed" | "failed"
): Promise<void> {
  const updates: Record<string, unknown> = { status };
  if (status === "completed" || status === "failed") {
    updates.processed_at = new Date().toISOString();
  }
  await supabase.from("payout_requests").update(updates).eq("id", id);
}
