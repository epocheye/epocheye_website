"use client";

import { useEffect, useState } from "react";

export default function AdminSettingsPage() {
  const [form, setForm] = useState({
    min_payout_inr: "",
    default_commission_rate: "",
    razorpay_payouts_enabled: true,
    conversion_confirm_days: "",
    product_name: "",
    product_description: "",
    product_price_inr: "",
    product_validity_days: "",
    product_enabled: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null); // { type: "success" | "error", text }

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setForm({
            min_payout_inr: String(json.data.min_payout_inr),
            default_commission_rate: String(json.data.default_commission_rate),
            razorpay_payouts_enabled: json.data.razorpay_payouts_enabled,
            conversion_confirm_days: String(json.data.conversion_confirm_days),
            product_name: String(json.data.product_name ?? ""),
            product_description: String(json.data.product_description ?? ""),
            product_price_inr: String(json.data.product_price_inr ?? ""),
            product_validity_days: String(json.data.product_validity_days ?? ""),
            product_enabled: json.data.product_enabled !== false,
          });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          min_payout_inr: Number(form.min_payout_inr),
          default_commission_rate: Number(form.default_commission_rate),
          razorpay_payouts_enabled: form.razorpay_payouts_enabled,
          conversion_confirm_days: Number(form.conversion_confirm_days),
          product_name: form.product_name,
          product_description: form.product_description,
          product_price_inr: Number(form.product_price_inr),
          product_validity_days: Number(form.product_validity_days),
          product_enabled: form.product_enabled,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setMessage({ type: "error", text: json.error || "Failed to save settings" });
      } else {
        setMessage({ type: "success", text: "Settings saved." });
      }
    } catch {
      setMessage({ type: "error", text: "Network error — please try again" });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8 md:p-12 max-w-2xl">
        <div className="h-8 w-40 bg-white/5 rounded animate-pulse mb-8" />
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-white/3 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 md:p-12 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-white">Settings</h1>
        <p className="text-white/35 text-sm mt-1">Payment and payout configuration.</p>
      </div>

      <form onSubmit={handleSave}>
        <div className="bg-[#0d0d0d] border border-white/5 rounded-xl divide-y divide-white/5">

          {/* Min payout */}
          <div className="p-5">
            <label className="block text-xs font-medium text-white/40 uppercase tracking-widest mb-1.5">
              Minimum Payout (₹)
            </label>
            <input
              type="number"
              min="0"
              step="1"
              value={form.min_payout_inr}
              onChange={(e) => setForm((f) => ({ ...f, min_payout_inr: e.target.value }))}
              required
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/30 transition-colors"
              placeholder="500"
            />
            <p className="text-xs text-white/25 mt-1.5">
              Creators cannot request a payout below this amount.
            </p>
          </div>

          {/* Default commission rate */}
          <div className="p-5">
            <label className="block text-xs font-medium text-white/40 uppercase tracking-widest mb-1.5">
              Default Commission Rate (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={form.default_commission_rate}
              onChange={(e) => setForm((f) => ({ ...f, default_commission_rate: e.target.value }))}
              required
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/30 transition-colors"
              placeholder="10"
            />
            <p className="text-xs text-white/25 mt-1.5">
              Applied to new creators by default. Existing creator rates are not affected.
            </p>
          </div>

          {/* Conversion auto-confirm days */}
          <div className="p-5">
            <label className="block text-xs font-medium text-white/40 uppercase tracking-widest mb-1.5">
              Conversion Auto-Confirm (days)
            </label>
            <input
              type="number"
              min="0"
              step="1"
              value={form.conversion_confirm_days}
              onChange={(e) => setForm((f) => ({ ...f, conversion_confirm_days: e.target.value }))}
              required
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/30 transition-colors"
              placeholder="7"
            />
            <p className="text-xs text-white/25 mt-1.5">
              Pending conversions older than this many days count toward a creator&apos;s available balance. Set to 0 to count all pending conversions immediately.
            </p>
          </div>

          {/* Razorpay toggle */}
          <div className="p-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-white font-medium">Razorpay Payouts</p>
              <p className="text-xs text-white/25 mt-0.5">
                When off, payout requests are created as pending and no Razorpay call is made.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, razorpay_payouts_enabled: !f.razorpay_payouts_enabled }))}
              className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none shrink-0 ${
                form.razorpay_payouts_enabled ? "bg-white" : "bg-white/15"
              }`}
              aria-pressed={form.razorpay_payouts_enabled}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full shadow transition-transform duration-200 ${
                  form.razorpay_payouts_enabled
                    ? "bg-black translate-x-5"
                    : "bg-white/50 translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Product card */}
        <div className="mt-6 bg-[#0d0d0d] border border-white/5 rounded-xl divide-y divide-white/5">
          <div className="px-5 pt-5 pb-3">
            <p className="text-xs font-medium text-white/35 uppercase tracking-widest">
              Epocheye Premium Product
            </p>
            <p className="text-xs text-white/25 mt-1">
              Shown to customers in the mobile app purchase screen.
            </p>
          </div>

          {/* Product name */}
          <div className="p-5">
            <label className="block text-xs font-medium text-white/40 uppercase tracking-widest mb-1.5">
              Name
            </label>
            <input
              type="text"
              value={form.product_name}
              onChange={(e) => setForm((f) => ({ ...f, product_name: e.target.value }))}
              required
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/30 transition-colors"
              placeholder="Epocheye Premium"
            />
          </div>

          {/* Description */}
          <div className="p-5">
            <label className="block text-xs font-medium text-white/40 uppercase tracking-widest mb-1.5">
              Description
            </label>
            <textarea
              rows={3}
              value={form.product_description}
              onChange={(e) => setForm((f) => ({ ...f, product_description: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/30 transition-colors resize-none"
              placeholder="Unlock all premium tours and features."
            />
          </div>

          {/* Price */}
          <div className="p-5">
            <label className="block text-xs font-medium text-white/40 uppercase tracking-widest mb-1.5">
              Price (₹)
            </label>
            <input
              type="number"
              min="0"
              step="1"
              value={form.product_price_inr}
              onChange={(e) => setForm((f) => ({ ...f, product_price_inr: e.target.value }))}
              required
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/30 transition-colors"
              placeholder="499"
            />
            <p className="text-xs text-white/25 mt-1.5">
              Customers pay this amount (before any coupon discount).
            </p>
          </div>

          {/* Validity */}
          <div className="p-5">
            <label className="block text-xs font-medium text-white/40 uppercase tracking-widest mb-1.5">
              Validity (days)
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={form.product_validity_days}
              onChange={(e) => setForm((f) => ({ ...f, product_validity_days: e.target.value }))}
              required
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/30 transition-colors"
              placeholder="30"
            />
            <p className="text-xs text-white/25 mt-1.5">
              How many days the pass is active after purchase.
            </p>
          </div>

          {/* Enabled toggle */}
          <div className="p-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-white font-medium">Product Enabled</p>
              <p className="text-xs text-white/25 mt-0.5">
                When off, the purchase screen shows &quot;Currently unavailable&quot; and the home banner is hidden.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, product_enabled: !f.product_enabled }))}
              className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none shrink-0 ${
                form.product_enabled ? "bg-white" : "bg-white/15"
              }`}
              aria-pressed={form.product_enabled}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full shadow transition-transform duration-200 ${
                  form.product_enabled
                    ? "bg-black translate-x-5"
                    : "bg-white/50 translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Feedback */}
        {message && (
          <p
            className={`mt-4 text-sm px-4 py-2.5 rounded-lg border ${
              message.type === "success"
                ? "text-green-400 bg-green-400/10 border-green-400/20"
                : "text-red-400 bg-red-400/10 border-red-400/20"
            }`}
          >
            {message.text}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="mt-5 px-6 py-2.5 bg-white text-black text-sm font-semibold rounded-lg hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
        >
          {saving ? "Saving…" : "Save settings"}
        </button>
      </form>
    </div>
  );
}
