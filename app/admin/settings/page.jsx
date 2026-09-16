"use client";

import { useEffect, useState } from "react";

const DEFAULT_TIER = {
  min_places: 1,
  max_places: null,
  price_per_place_paise: 4900,
  label: "",
  access_hours_single: 24,
  access_hours_multi: 72,
  sort_order: 1,
  is_active: true,
};

export default function AdminSettingsPage() {
  const [form, setForm] = useState({
    min_payout_inr: "",
    default_commission_rate: "",
    razorpay_payouts_enabled: true,
    conversion_confirm_days: "",
  });
  const [offer, setOffer] = useState({
    offer_enabled: true,
    offer_claimed: "",
    offer_total: "",
    offer_promo_code: "",
  });
  const [savingOffer, setSavingOffer] = useState(false);
  const [offerMessage, setOfferMessage] = useState(null);
  const [tiers, setTiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingTiers, setSavingTiers] = useState(false);
  const [message, setMessage] = useState(null);
  const [tierMessage, setTierMessage] = useState(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/settings").then((r) => r.json()),
      fetch("/api/admin/explorer-pass").then((r) => r.json()),
    ])
      .then(([settingsJson, tiersJson]) => {
        if (settingsJson.success) {
          setForm({
            min_payout_inr: String(settingsJson.data.min_payout_inr),
            default_commission_rate: String(settingsJson.data.default_commission_rate),
            razorpay_payouts_enabled: settingsJson.data.razorpay_payouts_enabled,
            conversion_confirm_days: String(settingsJson.data.conversion_confirm_days),
          });
          setOffer({
            offer_enabled: settingsJson.data.offer_enabled,
            offer_claimed: String(settingsJson.data.offer_claimed),
            offer_total: String(settingsJson.data.offer_total),
            offer_promo_code: settingsJson.data.offer_promo_code || "",
          });
        }
        if (tiersJson.success && tiersJson.data?.tiers) {
          setTiers(
            tiersJson.data.tiers.map((t) => ({
              id: t.id,
              min_places: t.min_places,
              max_places: t.max_places,
              price_per_place_paise: t.price_per_place_paise,
              label: t.label || "",
              access_hours_single: t.access_hours_single || 24,
              access_hours_multi: t.access_hours_multi || 72,
              sort_order: t.sort_order || 0,
              is_active: t.is_active !== false,
            }))
          );
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

  async function handleSaveOffer(e) {
    e.preventDefault();
    setSavingOffer(true);
    setOfferMessage(null);

    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          offer_enabled: offer.offer_enabled,
          offer_claimed: Number(offer.offer_claimed),
          offer_total: Number(offer.offer_total),
          offer_promo_code: offer.offer_promo_code,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setOfferMessage({ type: "error", text: json.error || "Failed to save offer" });
      } else {
        setOffer({
          offer_enabled: json.data.offer_enabled,
          offer_claimed: String(json.data.offer_claimed),
          offer_total: String(json.data.offer_total),
          offer_promo_code: json.data.offer_promo_code || "",
        });
        setOfferMessage({ type: "success", text: "Offer saved. The website updates within a minute." });
      }
    } catch {
      setOfferMessage({ type: "error", text: "Network error — please try again" });
    } finally {
      setSavingOffer(false);
    }
  }

  async function handleSaveTiers(e) {
    e.preventDefault();
    setSavingTiers(true);
    setTierMessage(null);

    try {
      const res = await fetch("/api/admin/explorer-pass", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tiers: tiers.map((t, i) => ({
            id: t.id || undefined,
            min_places: Number(t.min_places),
            max_places: t.max_places ? Number(t.max_places) : null,
            price_per_place_paise: Number(t.price_per_place_paise),
            label: t.label,
            access_hours_single: Number(t.access_hours_single),
            access_hours_multi: Number(t.access_hours_multi),
            sort_order: i + 1,
            is_active: t.is_active,
          })),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setTierMessage({ type: "error", text: json.error || json.data?.error || "Failed to save tiers" });
      } else {
        setTierMessage({ type: "success", text: "Explorer Pass tiers saved." });
        if (json.data?.tiers) {
          setTiers(json.data.tiers.map((t) => ({
            id: t.id,
            min_places: t.min_places,
            max_places: t.max_places,
            price_per_place_paise: t.price_per_place_paise,
            label: t.label || "",
            access_hours_single: t.access_hours_single || 24,
            access_hours_multi: t.access_hours_multi || 72,
            sort_order: t.sort_order || 0,
            is_active: t.is_active !== false,
          })));
        }
      }
    } catch {
      setTierMessage({ type: "error", text: "Network error — please try again" });
    } finally {
      setSavingTiers(false);
    }
  }

  function updateTier(index, field, value) {
    setTiers((prev) =>
      prev.map((t, i) => (i === index ? { ...t, [field]: value } : t))
    );
  }

  function addTier() {
    setTiers((prev) => [
      ...prev,
      { ...DEFAULT_TIER, sort_order: prev.length + 1, min_places: (prev[prev.length - 1]?.max_places || 0) + 1 },
    ]);
  }

  function removeTier(index) {
    setTiers((prev) => prev.filter((_, i) => i !== index));
  }

  if (loading) {
    return (
      <div className="p-4 md:p-12 max-w-2xl">
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
    <div className="p-4 md:p-12 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-white">Settings</h1>
        <p className="text-white/35 text-sm mt-1">Payment, payout, and Explorer Pass configuration.</p>
      </div>

      {/* Payment & Payout Settings */}
      <form onSubmit={handleSave}>
        <div className="bg-[#0d0d0d] border border-white/5 rounded-xl divide-y divide-white/5">
          <div className="px-5 pt-5 pb-3">
            <p className="text-xs font-medium text-white/35 uppercase tracking-widest">Payment & Payouts</p>
          </div>

          <div className="p-5">
            <label className="block text-xs font-medium text-white/40 uppercase tracking-widest mb-1.5">
              Minimum Payout (&#8377;)
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
          </div>

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
          </div>

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
          </div>

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
          {saving ? "Saving\u2026" : "Save settings"}
        </button>
      </form>

      {/* Bangalore launch offer (landing page section) */}
      <form onSubmit={handleSaveOffer} className="mt-10">
        <div className="bg-[#0d0d0d] border border-white/5 rounded-xl divide-y divide-white/5">
          <div className="px-5 pt-5 pb-3">
            <p className="text-xs font-medium text-white/35 uppercase tracking-widest">Bangalore Launch Offer</p>
            <p className="text-xs text-white/25 mt-1">
              Controls the &ldquo;first 500 free&rdquo; section under the hero. The promo code must also exist in the app backend.
            </p>
          </div>

          <div className="p-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-white font-medium">Show on website</p>
              <p className="text-xs text-white/25 mt-0.5">When off, the section is hidden from the landing page.</p>
            </div>
            <button
              type="button"
              onClick={() => setOffer((o) => ({ ...o, offer_enabled: !o.offer_enabled }))}
              className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none shrink-0 ${
                offer.offer_enabled ? "bg-white" : "bg-white/15"
              }`}
              aria-pressed={offer.offer_enabled}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full shadow transition-transform duration-200 ${
                  offer.offer_enabled ? "bg-black translate-x-5" : "bg-white/50 translate-x-0"
                }`}
              />
            </button>
          </div>

          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-white/40 uppercase tracking-widest mb-1.5">
                Spots claimed
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={offer.offer_claimed}
                  onChange={(e) => setOffer((o) => ({ ...o, offer_claimed: e.target.value }))}
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/30 transition-colors"
                  placeholder="120"
                />
                <button
                  type="button"
                  onClick={() =>
                    setOffer((o) => ({
                      ...o,
                      offer_claimed: String(Math.min(Number(o.offer_claimed || 0) + 10, Number(o.offer_total || 0))),
                    }))
                  }
                  className="px-3 rounded-lg border border-white/10 text-xs text-white/70 hover:bg-white/5 transition-colors shrink-0"
                >
                  +10
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-white/40 uppercase tracking-widest mb-1.5">
                Total spots
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={offer.offer_total}
                onChange={(e) => setOffer((o) => ({ ...o, offer_total: e.target.value }))}
                required
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/30 transition-colors"
                placeholder="500"
              />
            </div>
          </div>

          <div className="p-5">
            <label className="block text-xs font-medium text-white/40 uppercase tracking-widest mb-1.5">
              Promo code
            </label>
            <input
              type="text"
              maxLength={32}
              value={offer.offer_promo_code}
              onChange={(e) => setOffer((o) => ({ ...o, offer_promo_code: e.target.value.toUpperCase() }))}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white font-mono tracking-widest placeholder-white/20 focus:outline-none focus:border-white/30 transition-colors"
              placeholder="BLR500"
            />
            <p className="text-xs text-white/25 mt-1.5">Leave empty to hide the code box on the website.</p>
          </div>
        </div>

        {offerMessage && (
          <p
            className={`mt-4 text-sm px-4 py-2.5 rounded-lg border ${
              offerMessage.type === "success"
                ? "text-green-400 bg-green-400/10 border-green-400/20"
                : "text-red-400 bg-red-400/10 border-red-400/20"
            }`}
          >
            {offerMessage.text}
          </p>
        )}

        <button
          type="submit"
          disabled={savingOffer}
          className="mt-5 px-6 py-2.5 bg-white text-black text-sm font-semibold rounded-lg hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
        >
          {savingOffer ? "Saving…" : "Save offer"}
        </button>
      </form>

      {/* Explorer Pass Pricing Tiers */}
      <form onSubmit={handleSaveTiers} className="mt-10">
        <div className="bg-[#0d0d0d] border border-white/5 rounded-xl">
          <div className="px-5 pt-5 pb-3">
            <p className="text-xs font-medium text-white/35 uppercase tracking-widest">Explorer Pass Pricing</p>
            <p className="text-xs text-white/25 mt-1">
              Define tiered pricing. Price per place decreases as the user selects more places.
            </p>
          </div>

          {/* Access duration */}
          <div className="px-5 py-4 border-t border-white/5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-white/40 uppercase tracking-widest mb-1.5">
                  Single Place Access (hours)
                </label>
                <input
                  type="number"
                  min="1"
                  value={tiers[0]?.access_hours_single ?? 24}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setTiers((prev) => prev.map((t) => ({ ...t, access_hours_single: v })));
                  }}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/30 transition-colors"
                />
                <p className="text-xs text-white/25 mt-1">Access duration when user buys 1 place.</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-white/40 uppercase tracking-widest mb-1.5">
                  Multi-Place Access (hours)
                </label>
                <input
                  type="number"
                  min="1"
                  value={tiers[0]?.access_hours_multi ?? 72}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setTiers((prev) => prev.map((t) => ({ ...t, access_hours_multi: v })));
                  }}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/30 transition-colors"
                />
                <p className="text-xs text-white/25 mt-1">Access duration when user buys 2+ places.</p>
              </div>
            </div>
          </div>

          {/* Tier rows */}
          <div className="divide-y divide-white/5 border-t border-white/5">
            {tiers.map((tier, i) => (
              <div key={tier.id || `new-${i}`} className="px-5 py-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-white/50">Tier {i + 1}</span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => updateTier(i, "is_active", !tier.is_active)}
                      className={`relative w-9 h-5 rounded-full transition-colors duration-200 focus:outline-none shrink-0 ${
                        tier.is_active ? "bg-white" : "bg-white/15"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full shadow transition-transform duration-200 ${
                          tier.is_active ? "bg-black translate-x-4" : "bg-white/50 translate-x-0"
                        }`}
                      />
                    </button>
                    {tiers.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeTier(i)}
                        className="text-xs text-red-400/70 hover:text-red-400 transition-colors"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div>
                    <label className="block text-[10px] font-medium text-white/30 uppercase tracking-widest mb-1">
                      Label
                    </label>
                    <input
                      type="text"
                      value={tier.label}
                      onChange={(e) => updateTier(i, "label", e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30 transition-colors"
                      placeholder="e.g. Explorer Bundle"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-white/30 uppercase tracking-widest mb-1">
                      Min Places
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={tier.min_places}
                      onChange={(e) => updateTier(i, "min_places", Number(e.target.value))}
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-white/30 uppercase tracking-widest mb-1">
                      Max Places
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={tier.max_places ?? ""}
                      onChange={(e) => updateTier(i, "max_places", e.target.value ? Number(e.target.value) : null)}
                      placeholder="No limit"
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/15 focus:outline-none focus:border-white/30 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-white/30 uppercase tracking-widest mb-1">
                      Price/Place (paise)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={tier.price_per_place_paise}
                      onChange={(e) => updateTier(i, "price_per_place_paise", Number(e.target.value))}
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30 transition-colors"
                    />
                    <p className="text-[10px] text-white/20 mt-0.5">
                      &#8377;{(tier.price_per_place_paise / 100).toFixed(0)}/place
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="px-5 py-4 border-t border-white/5">
            <button
              type="button"
              onClick={addTier}
              className="text-xs text-white/40 hover:text-white/70 transition-colors"
            >
              + Add tier
            </button>
          </div>
        </div>

        {tierMessage && (
          <p
            className={`mt-4 text-sm px-4 py-2.5 rounded-lg border ${
              tierMessage.type === "success"
                ? "text-green-400 bg-green-400/10 border-green-400/20"
                : "text-red-400 bg-red-400/10 border-red-400/20"
            }`}
          >
            {tierMessage.text}
          </p>
        )}

        <button
          type="submit"
          disabled={savingTiers}
          className="mt-5 px-6 py-2.5 bg-white text-black text-sm font-semibold rounded-lg hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
        >
          {savingTiers ? "Saving\u2026" : "Save Explorer Pass tiers"}
        </button>
      </form>
    </div>
  );
}
