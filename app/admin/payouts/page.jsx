"use client";

import { useCallback, useEffect, useState } from "react";
import StatusBadge from "@/components/admin/StatusBadge";

export default function AdminPayoutsPage() {
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [actionId, setActionId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const fetchPayouts = useCallback(() => {
    fetch("/api/admin/payouts")
      .then((r) => r.json())
      .then((d) => { if (d.success) setPayouts(d.data); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchPayouts(); }, [fetchPayouts]);

  async function updateStatus(id, status) {
    setActionId(id);
    await fetch(`/api/admin/payouts/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchPayouts();
    setActionId(null);
  }

  function copyUpi(upiId, payoutId) {
    navigator.clipboard.writeText(upiId).then(() => {
      setCopiedId(payoutId);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }

  const filtered = filter === "all" ? payouts : payouts.filter((p) => p.status === filter);
  const currencySymbol = (currency) => (currency === "INR" ? "₹" : "$");

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-lg font-semibold text-white">Payouts</h1>
        <div className="flex gap-1.5">
          {["all", "pending", "processing", "completed", "failed"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                filter === f ? "bg-white/10 text-white" : "text-white/35 hover:text-white/60"
              }`}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Manual payout instructions */}
      <p className="text-xs text-white/30 mb-6">
        Payouts are processed manually. Click <span className="text-white/50">Approve</span> to
        mark a request as in-progress, send the amount to the creator's UPI ID, then click{" "}
        <span className="text-white/50">Mark paid</span> once the transfer is done.
      </p>

      <div className="bg-[#0d0d0d] border border-white/5 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 flex justify-center">
            <div className="animate-pulse h-4 w-32 bg-white/10 rounded" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="px-5 py-8 text-sm text-white/30 text-center">No payouts found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="px-5 py-3 text-left text-xs text-white/35 font-medium">Creator</th>
                  <th className="px-5 py-3 text-right text-xs text-white/35 font-medium">Amount</th>
                  <th className="px-5 py-3 text-left text-xs text-white/35 font-medium">UPI ID</th>
                  <th className="px-5 py-3 text-center text-xs text-white/35 font-medium">Status</th>
                  <th className="px-5 py-3 text-right text-xs text-white/35 font-medium">Requested</th>
                  <th className="px-5 py-3 text-right text-xs text-white/35 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-b border-white/3 hover:bg-white/2 transition-colors">
                    <td className="px-5 py-3">
                      <p className="text-white/80 font-medium">{p.creator_name ?? "—"}</p>
                      <p className="text-white/30 text-xs">{p.creator_email}</p>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className="text-white font-semibold">
                        {currencySymbol(p.currency)}{Number(p.amount).toFixed(2)}
                      </span>
                      <span className="text-white/30 text-xs ml-1">{p.currency}</span>
                    </td>
                    <td className="px-5 py-3">
                      {p.upi_id ? (
                        <div className="flex items-center gap-2">
                          <span className="text-white/60 text-xs font-mono">{p.upi_id}</span>
                          <button
                            onClick={() => copyUpi(p.upi_id, p.id)}
                            className="text-[10px] px-1.5 py-0.5 rounded border border-white/10 text-white/30 hover:text-white/60 hover:border-white/20 transition-colors">
                            {copiedId === p.id ? "✓" : "copy"}
                          </button>
                        </div>
                      ) : (
                        <span className="text-white/20 text-xs">no UPI ID</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="px-5 py-3 text-right text-white/30 text-xs">
                      {new Date(p.requested_at).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {p.status === "pending" && (
                        <div className="flex justify-end gap-2">
                          <button
                            disabled={actionId === p.id}
                            onClick={() => updateStatus(p.id, "processing")}
                            className="px-2.5 py-1 text-xs border border-green-500/30 text-green-400 rounded-md hover:bg-green-500/10 disabled:opacity-40 transition-colors">
                            Approve
                          </button>
                          <button
                            disabled={actionId === p.id}
                            onClick={() => updateStatus(p.id, "failed")}
                            className="px-2.5 py-1 text-xs border border-red-500/20 text-red-400 rounded-md hover:bg-red-500/10 disabled:opacity-40 transition-colors">
                            Reject
                          </button>
                        </div>
                      )}
                      {p.status === "processing" && (
                        <button
                          disabled={actionId === p.id}
                          onClick={() => updateStatus(p.id, "completed")}
                          className="px-2.5 py-1 text-xs border border-amber-500/30 text-amber-400 rounded-md hover:bg-amber-500/10 disabled:opacity-40 transition-colors">
                          Mark paid
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
