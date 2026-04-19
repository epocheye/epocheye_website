"use client";

import { useCallback, useEffect, useState } from "react";

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors ${
        checked ? "bg-white border-white" : "bg-white/5 border-white/10"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full transition-transform ${
          checked ? "translate-x-6 bg-black" : "translate-x-1 bg-white/60"
        }`}
      />
    </button>
  );
}

export default function AdminPremiumPage() {
  const [form, setForm] = useState({
    name: "",
    description: "",
    price_inr: 0,
    validity_days: 30,
    enabled: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const loadConfig = useCallback(async () => {
    const res = await fetch("/api/admin/premium/config");
    const json = await res.json();
    if (json.success && json.data) {
      setForm({
        name: json.data.name || "",
        description: json.data.description || "",
        price_inr: Number(json.data.price_inr ?? 0),
        validity_days: Number(json.data.validity_days ?? 30),
        enabled: !!json.data.enabled,
      });
    } else if (!json.success) {
      setMessage({ type: "error", text: json.error || "Failed to load config" });
    }
  }, []);

  useEffect(() => {
    loadConfig().finally(() => setLoading(false));
  }, [loadConfig]);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/premium/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          price_inr: Number(form.price_inr),
          validity_days: Number(form.validity_days),
          enabled: form.enabled,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setMessage({ type: "error", text: json.error || "Failed to save" });
      } else {
        setMessage({ type: "success", text: "Premium config saved. Mobile will see the update within 60s." });
        await loadConfig();
      }
    } catch {
      setMessage({ type: "error", text: "Network error — please try again" });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-8 md:p-12 max-w-3xl">
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
    <div className="p-8 md:p-12 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-white">Epocheye Premium</h1>
        <p className="text-white/35 text-sm mt-1">
          Subscription pricing and metadata shown to users in the app. Mobile fetches this from{" "}
          <code className="text-white/50">/api/v1/premium/config</code> and caches for ~60s.
        </p>
      </div>

      <form onSubmit={handleSave}>
        <div className="bg-[#0d0d0d] border border-white/5 rounded-xl divide-y divide-white/5">
          <div className="px-5 pt-5 pb-3">
            <p className="text-xs font-medium text-white/35 uppercase tracking-widest">Plan details</p>
          </div>

          <div className="p-5">
            <label className="block text-xs font-medium text-white/40 uppercase tracking-widest mb-1.5">Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Epocheye Premium"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/30 transition-colors"
            />
          </div>

          <div className="p-5">
            <label className="block text-xs font-medium text-white/40 uppercase tracking-widest mb-1.5">Description</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Unlimited AR reconstructions, premium heritage content, and priority access."
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/30 transition-colors"
            />
          </div>

          <div className="p-5 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-white/40 uppercase tracking-widest mb-1.5">
                Price (INR)
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={form.price_inr}
                onChange={(e) => setForm((f) => ({ ...f, price_inr: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-white/30 transition-colors"
              />
              <p className="text-xs text-white/25 mt-1.5">Charged once per validity window. 0 = disables checkout.</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-white/40 uppercase tracking-widest mb-1.5">
                Validity (days)
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={form.validity_days}
                onChange={(e) => setForm((f) => ({ ...f, validity_days: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-white/30 transition-colors"
              />
            </div>
          </div>

          <div className="p-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-white font-medium">Plan enabled</p>
              <p className="text-xs text-white/25 mt-0.5">
                When off, the app hides the upgrade CTA and checkout returns 503.
              </p>
            </div>
            <Toggle checked={form.enabled} onChange={(v) => setForm((f) => ({ ...f, enabled: v }))} />
          </div>
        </div>

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
          {saving ? "Saving\u2026" : "Save premium config"}
        </button>
      </form>
    </div>
  );
}
