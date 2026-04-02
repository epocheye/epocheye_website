"use client";

import { useEffect, useState } from "react";
import { creatorFetch, getCreatorData } from "@/lib/creatorAuthService";
import PayoutSection from "@/components/creators/PayoutSection";

const API = process.env.NEXT_PUBLIC_CREATOR_API_URL || "http://localhost:3001";

export default function PayoutsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const creator = getCreatorData();

  async function load() {
    try {
      const res = await creatorFetch(`${API}/api/creator/payouts`);
      const json = await res.json();
      if (json.success) setData(json.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="p-6 md:p-10 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-white">Payouts</h1>
        <p className="text-white/35 text-sm mt-1">
          Withdraw your earnings via UPI. Minimum payout is $10.
        </p>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="h-40 bg-white/[0.03] rounded-xl animate-pulse" />
          <div className="h-64 bg-white/[0.03] rounded-xl animate-pulse" />
        </div>
      ) : (
        <PayoutSection
          available={data?.available_balance}
          payouts={data?.payouts}
          upiId={creator?.upi_id}
          onPayoutRequested={load}
        />
      )}
    </div>
  );
}
