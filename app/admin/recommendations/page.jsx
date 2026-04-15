"use client";

import { useCallback, useEffect, useState } from "react";

const FIELDS = [
  { key: "region_weight", label: "Region weight", hint: "Points added when monument state matches user's onboarding regions.", step: "0.1" },
  { key: "zone_weight", label: "Zone weight", hint: "Points added when user has recent zone activity matching the monument.", step: "0.1" },
  { key: "distance_weight", label: "Distance weight", hint: "Max points for a monument right on top of the user (decays with distance).", step: "0.1" },
  { key: "distance_decay_km", label: "Distance decay (km)", hint: "e^(-dist/decay). Larger = slower falloff. Must be positive.", step: "1" },
  { key: "baseline", label: "Baseline", hint: "Floor score all monuments start with. Keeps new-user results non-empty.", step: "0.1" },
];

const DEFAULT_FORM = {
  region_weight: 3.0,
  zone_weight: 2.0,
  distance_weight: 1.5,
  distance_decay_km: 100.0,
  baseline: 0.5,
};

function formatDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function AdminRecommendationsPage() {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [top, setTop] = useState([]);
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const loadConfig = useCallback(async () => {
    const res = await fetch("/api/admin/recommendations/config");
    const json = await res.json();
    if (json.success && json.data) {
      const d = json.data;
      setForm({
        region_weight: Number(d.region_weight ?? DEFAULT_FORM.region_weight),
        zone_weight: Number(d.zone_weight ?? DEFAULT_FORM.zone_weight),
        distance_weight: Number(d.distance_weight ?? DEFAULT_FORM.distance_weight),
        distance_decay_km: Number(d.distance_decay_km ?? DEFAULT_FORM.distance_decay_km),
        baseline: Number(d.baseline ?? DEFAULT_FORM.baseline),
      });
      setUpdatedAt(d.updated_at || null);
    }
  }, []);

  const loadTop = useCallback(async (d) => {
    const res = await fetch(`/api/admin/recommendations/top?limit=20&days=${d}`);
    const json = await res.json();
    if (json.success) setTop(json.data?.entries || []);
  }, []);

  useEffect(() => {
    Promise.all([loadConfig(), loadTop(days)]).finally(() => setLoading(false));
  }, [loadConfig, loadTop, days]);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    if (form.distance_decay_km <= 0) {
      setMessage({ type: "error", text: "distance_decay_km must be positive" });
      setSaving(false);
      return;
    }
    for (const f of FIELDS) {
      if (form[f.key] < 0) {
        setMessage({ type: "error", text: `${f.label} must be non-negative` });
        setSaving(false);
        return;
      }
    }

    try {
      const res = await fetch("/api/admin/recommendations/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setMessage({ type: "error", text: json.error || "Save failed" });
      } else {
        setMessage({ type: "success", text: "Weights saved. Takes effect within 60s." });
        if (json.data?.updated_at) setUpdatedAt(json.data.updated_at);
      }
    } catch {
      setMessage({ type: "error", text: "Network error" });
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    setForm(DEFAULT_FORM);
  }

  if (loading) {
    return (
      <div className="p-8 md:p-12 max-w-5xl">
        <div className="h-8 w-40 bg-white/5 rounded animate-pulse mb-8" />
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-white/3 rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 md:p-12 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-white">Recommendations Scoring</h1>
        <p className="text-white/35 text-sm mt-1">
          Weights for the <code>/api/v1/recommendations</code> ranker. Last updated {formatDate(updatedAt)}.
        </p>
      </div>

      <form onSubmit={handleSave}>
        <div className="bg-[#0d0d0d] border border-white/5 rounded-xl divide-y divide-white/5">
          <div className="px-5 pt-5 pb-3 flex items-center justify-between">
            <p className="text-xs font-medium text-white/35 uppercase tracking-widest">Weights</p>
            <button
              type="button"
              onClick={handleReset}
              className="text-xs text-white/40 hover:text-white/70 transition-colors"
            >
              Reset to defaults
            </button>
          </div>
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
            {FIELDS.map((f) => (
              <WeightField
                key={f.key}
                label={f.label}
                hint={f.hint}
                step={f.step}
                value={form[f.key]}
                onChange={(v) => setForm((prev) => ({ ...prev, [f.key]: v }))}
              />
            ))}
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
          {saving ? "Saving\u2026" : "Save weights"}
        </button>
      </form>

      <div className="mt-10 bg-[#0d0d0d] border border-white/5 rounded-xl">
        <div className="px-5 pt-5 pb-3 flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-xs font-medium text-white/35 uppercase tracking-widest">Top recommended monuments</p>
            <p className="text-xs text-white/25 mt-1">Inferred from usage_events (place_view + recommendation_click).</p>
          </div>
          <div className="flex items-center gap-2">
            {[1, 7, 30].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDays(d)}
                className={`px-3 py-1 text-xs rounded border transition-colors ${
                  days === d
                    ? "bg-white text-black border-white"
                    : "bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10"
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto border-t border-white/5">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-white/40 text-[10px] uppercase tracking-widest">
                <th className="text-left px-5 py-3 font-medium">#</th>
                <th className="text-left px-3 py-3 font-medium">Monument</th>
                <th className="text-left px-3 py-3 font-medium">ID</th>
                <th className="text-right px-5 py-3 font-medium">Views</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {top.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-white/30">
                    No activity in the last {days} day{days === 1 ? "" : "s"}.
                  </td>
                </tr>
              ) : (
                top.map((row, i) => (
                  <tr key={row.monument_id || row.name} className="text-white/70 hover:bg-white/3">
                    <td className="px-5 py-3 text-white/40">{i + 1}</td>
                    <td className="px-3 py-3 text-white">{row.name}</td>
                    <td className="px-3 py-3 font-mono text-[10px] text-white/40">
                      {row.monument_id ? `${row.monument_id.slice(0, 8)}…` : "—"}
                    </td>
                    <td className="px-5 py-3 text-right font-mono text-white/60">{row.views}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function WeightField({ label, hint, step, value, onChange }) {
  return (
    <div>
      <label className="block text-xs font-medium text-white/40 uppercase tracking-widest mb-1.5">{label}</label>
      <input
        type="number"
        min="0"
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-white/30 transition-colors"
      />
      <p className="text-[11px] text-white/25 mt-1.5 leading-relaxed">{hint}</p>
    </div>
  );
}
