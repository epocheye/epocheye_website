"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import StatusBadge from "@/components/admin/StatusBadge";

export default function AdminCreatorDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [creator, setCreator] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState(null);

  const [commissionRate, setCommissionRate] = useState("");
  const [customerDiscount, setCustomerDiscount] = useState("");
  const [status, setStatus] = useState("active");

  useEffect(() => {
    fetch(`/api/admin/creators/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setCreator(d.data);
          setCommissionRate(String(d.data.commission_rate));
          setCustomerDiscount(String(d.data.customer_discount));
          setStatus(d.data.status);
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setFlash(null);

    const res = await fetch(`/api/admin/creators/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        commission_rate: Number(commissionRate),
        customer_discount: Number(customerDiscount),
        status,
      }),
    });

    const data = await res.json();
    if (data.success) {
      setCreator(data.data);
      setFlash({ type: "success", msg: "Creator updated successfully" });
    } else {
      setFlash({ type: "error", msg: data.error || "Update failed" });
    }
    setSaving(false);
    setTimeout(() => setFlash(null), 4000);
  }

  if (loading) {
    return (
      <div className="p-4 md:p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-5 w-32 bg-white/5 rounded" />
          <div className="h-48 bg-white/5 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!creator) {
    return (
      <div className="p-4 md:p-8">
        <p className="text-white/40">Creator not found.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-2xl">
      <button
        onClick={() => router.push("/admin/creators")}
        className="flex items-center gap-2 text-xs text-white/35 hover:text-white/60 mb-6 transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to creators
      </button>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-white">{creator.name}</h1>
          <p className="text-xs text-white/35 mt-0.5">{creator.email}</p>
        </div>
        <StatusBadge status={creator.status} />
      </div>

      {/* Read-only info */}
      <div className="bg-[#0d0d0d] border border-white/5 rounded-xl p-5 mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-xs text-white/30 mb-1">Promo code</p>
          <p className="font-mono text-white/70">{creator.promo_code ?? "—"}</p>
        </div>
        <div>
          <p className="text-xs text-white/30 mb-1">Currency</p>
          <p className="text-white/70">{creator.currency ?? "INR"}</p>
        </div>
        <div>
          <p className="text-xs text-white/30 mb-1">UPI ID</p>
          <p className="text-white/70">{creator.upi_id ?? <span className="text-white/25">Not set</span>}</p>
        </div>
        <div>
          <p className="text-xs text-white/30 mb-1">Joined</p>
          <p className="text-white/70">{new Date(creator.created_at).toLocaleDateString()}</p>
        </div>
      </div>

      {/* Editable settings */}
      <form onSubmit={handleSave} className="bg-[#0d0d0d] border border-white/5 rounded-xl p-5 space-y-5">
        <h2 className="text-sm font-medium text-white">Edit settings</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-white/40 mb-1.5">
              Commission rate (%) <span className="text-white/25">— creator earns this</span>
            </label>
            <input
              type="number"
              min="5"
              max="20"
              step="0.5"
              value={commissionRate}
              onChange={(e) => setCommissionRate(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs text-white/40 mb-1.5">
              Customer discount (%) <span className="text-white/25">— customer saves this</span>
            </label>
            <input
              type="number"
              min="0"
              max="30"
              step="0.5"
              value={customerDiscount}
              onChange={(e) => setCustomerDiscount(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30 transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-white/40 mb-1.5">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30 transition-colors">
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>

        {flash && (
          <p className={`text-xs px-3 py-2 rounded-lg border ${
            flash.type === "success"
              ? "bg-green-400/10 text-green-400 border-green-400/20"
              : "bg-red-400/10 text-red-400 border-red-400/20"
          }`}>
            {flash.msg}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2 bg-white text-black rounded-lg text-sm font-medium hover:bg-white/90 disabled:opacity-50 transition-all duration-200">
          {saving ? "Saving…" : "Save changes"}
        </button>
      </form>
    </div>
  );
}
