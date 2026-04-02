import { supabase } from "../lib/supabase";
import { createUpiPayout } from "../lib/razorpay";
import { PayoutRequest } from "../types";

const MIN_PAYOUT_USD = 10;
// Approximate USD to INR conversion — in production, fetch live rate
const USD_TO_INR = 83;

export async function getAvailableBalance(creatorId: string): Promise<number> {
  const { data: confirmedData } = await supabase
    .from("referral_conversions")
    .select("commission_amount")
    .eq("creator_id", creatorId)
    .eq("status", "confirmed");

  const confirmed = (confirmedData ?? []).reduce(
    (sum, r) => sum + Number(r.commission_amount),
    0
  );

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
  const available = await getAvailableBalance(params.creatorId);

  if (available < MIN_PAYOUT_USD) {
    throw new Error(
      `Minimum payout is $${MIN_PAYOUT_USD}. Your available balance is $${available.toFixed(2)}.`
    );
  }

  // Insert payout request first
  const { data: pr, error: prError } = await supabase
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
    const rzpPayout = await createUpiPayout({
      upiId: params.upiId,
      amountPaise: amountInr,
      creatorName: params.creatorName,
      referenceId: pr.id,
      notes: { creator_id: params.creatorId, payout_request_id: pr.id },
    });

    // Update with Razorpay ID
    await supabase
      .from("payout_requests")
      .update({ razorpay_payout_id: rzpPayout.id })
      .eq("id", pr.id);

    return { ...pr, razorpay_payout_id: rzpPayout.id } as PayoutRequest;
  } catch (err) {
    // If Razorpay fails, mark payout as failed
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
