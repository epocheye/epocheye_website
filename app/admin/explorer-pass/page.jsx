"use client";

import { useEffect, useState, startTransition } from "react";

const EMPTY_OVERRIDE = {
  place_id: "",
  place_name: "",
  price_paise: "",
  access_hours: "",
  notes: "",
};

export default function ExplorerPassAdminPage() {
  const [tab, setTab] = useState("overrides");
  const [tiers, setTiers] = useState([]);
  const [overrides, setOverrides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(EMPTY_OVERRIDE);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function loadAll() {
    startTransition(() => setLoading(true));
    try {
      const [tierRes, overrideRes] = await Promise.all([
        fetch("/api/admin/explorer-pass"),
        fetch("/api/admin/explorer-pass/overrides"),
      ]);
      const tierJson = await tierRes.json();
      const overrideJson = await overrideRes.json();
      if (tierJson.success) {
        startTransition(() => setTiers(tierJson.data?.tiers || tierJson.data || []));
      }
      if (overrideJson.success) {
        startTransition(() =>
          setOverrides(overrideJson.data?.overrides || overrideJson.data || [])
        );
      }
    } finally {
      startTransition(() => setLoading(false));
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function saveOverride(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const placeId = editing.place_id.trim();
      if (!placeId) {
        setError("place_id is required");
        return;
      }
      const payload = {
        place_name: editing.place_name.trim(),
        price_paise: editing.price_paise === "" ? null : Number(editing.price_paise),
        access_hours: editing.access_hours === "" ? null : Number(editing.access_hours),
        notes: editing.notes,
      };
      const res = await fetch(
        `/api/admin/explorer-pass/overrides/${encodeURIComponent(placeId)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const json = await res.json();
      if (!json.success) {
        setError(json.error || "Save failed");
        return;
      }
      setEditing(EMPTY_OVERRIDE);
      await loadAll();
    } finally {
      setBusy(false);
    }
  }

  async function removeOverride(placeId) {
    if (!confirm(`Remove override for ${placeId}? It will revert to tier pricing.`)) return;
    const res = await fetch(`/api/admin/explorer-pass/overrides/${encodeURIComponent(placeId)}`, {
      method: "DELETE",
    });
    const json = await res.json();
    if (!json.success) {
      alert(json.error || "Delete failed");
      return;
    }
    await loadAll();
  }

  return (
    <div className="min-h-screen bg-[#080808] text-white">
      <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">
        <div>
          <h1 className="text-2xl font-medium">Explorer Pass</h1>
          <p className="text-white/50 text-sm mt-1">
            Tier defaults apply by place count; per-place overrides take precedence.
          </p>
        </div>

        <div className="flex gap-2 border-b border-white/10">
          {[
            { id: "overrides", label: "Per-place overrides" },
            { id: "tiers", label: "Tier defaults" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-sm border-b-2 -mb-px transition ${
                tab === t.id
                  ? "border-white text-white"
                  : "border-transparent text-white/50 hover:text-white/80"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "overrides" && (
          <div className="space-y-6">
            <form
              onSubmit={saveOverride}
              className="rounded-xl border border-white/10 bg-[#0d0d0d] p-6 space-y-4"
            >
              <h2 className="text-sm uppercase tracking-wider text-white/50">
                Add / update override
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="space-y-1 block">
                  <span className="text-xs uppercase tracking-wider text-white/40">
                    Place ID (Geoapify or monument UUID)
                  </span>
                  <input
                    required
                    value={editing.place_id}
                    onChange={(e) => setEditing({ ...editing, place_id: e.target.value })}
                    placeholder="51a1f2e5…"
                    className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-white/30 font-mono"
                  />
                </label>
                <label className="space-y-1 block">
                  <span className="text-xs uppercase tracking-wider text-white/40">Place name</span>
                  <input
                    required
                    value={editing.place_name}
                    onChange={(e) => setEditing({ ...editing, place_name: e.target.value })}
                    placeholder="Taj Mahal"
                    className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-white/30"
                  />
                </label>
                <label className="space-y-1 block">
                  <span className="text-xs uppercase tracking-wider text-white/40">
                    Price (paise, blank = tier default)
                  </span>
                  <input
                    type="number"
                    min="0"
                    value={editing.price_paise}
                    onChange={(e) => setEditing({ ...editing, price_paise: e.target.value })}
                    placeholder="19900"
                    className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-white/30"
                  />
                </label>
                <label className="space-y-1 block">
                  <span className="text-xs uppercase tracking-wider text-white/40">
                    Access hours (blank = tier default)
                  </span>
                  <input
                    type="number"
                    min="1"
                    value={editing.access_hours}
                    onChange={(e) => setEditing({ ...editing, access_hours: e.target.value })}
                    placeholder="48"
                    className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-white/30"
                  />
                </label>
              </div>
              <label className="space-y-1 block">
                <span className="text-xs uppercase tracking-wider text-white/40">Notes</span>
                <input
                  value={editing.notes}
                  onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                  placeholder="Premium monument — higher peak-season pricing"
                  className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-white/30"
                />
              </label>
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setEditing(EMPTY_OVERRIDE)}
                  className="text-xs text-white/50 hover:text-white/80"
                >
                  Clear
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="px-4 py-2 text-sm rounded-md border border-white/20 hover:bg-white/5 disabled:opacity-50"
                >
                  {busy ? "Saving…" : "Save override"}
                </button>
              </div>
              {error && <div className="text-sm text-rose-300">{error}</div>}
            </form>

            <section className="rounded-xl border border-white/10 bg-[#0d0d0d]">
              <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                <h2 className="text-lg">Active overrides</h2>
                <button
                  onClick={loadAll}
                  className="text-xs text-white/50 hover:text-white/80"
                >
                  Refresh
                </button>
              </div>
              <div className="divide-y divide-white/5">
                {loading && <div className="px-6 py-8 text-sm text-white/40">Loading…</div>}
                {!loading && overrides.length === 0 && (
                  <div className="px-6 py-8 text-sm text-white/40">
                    No overrides. All places use tier defaults.
                  </div>
                )}
                {overrides.map((o) => (
                  <div key={o.place_id} className="px-6 py-4 flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{o.place_name}</div>
                      <div className="text-xs text-white/40 font-mono truncate">
                        {o.place_id}
                      </div>
                      <div className="text-xs text-white/60 mt-1 space-x-3">
                        <span>
                          ₹{o.price_paise != null ? (o.price_paise / 100).toFixed(2) : "—"}
                        </span>
                        <span>{o.access_hours != null ? `${o.access_hours}h` : "—"}</span>
                      </div>
                      {o.notes && (
                        <div className="text-xs text-white/50 mt-1 italic">{o.notes}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() =>
                          setEditing({
                            place_id: o.place_id,
                            place_name: o.place_name || "",
                            price_paise: o.price_paise ?? "",
                            access_hours: o.access_hours ?? "",
                            notes: o.notes || "",
                          })
                        }
                        className="text-xs px-2 py-1 rounded border border-white/15 hover:bg-white/5"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => removeOverride(o.place_id)}
                        className="text-xs px-2 py-1 rounded border border-rose-500/30 text-rose-300 hover:bg-rose-500/10"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {tab === "tiers" && (
          <section className="rounded-xl border border-white/10 bg-[#0d0d0d] p-6">
            <p className="text-sm text-white/50 mb-4">
              Tier defaults are read-only here. Edit via the existing tier admin or backend.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-white/40 text-xs uppercase">
                  <tr>
                    <th className="text-left py-2">Places</th>
                    <th className="text-left py-2">Price / place</th>
                    <th className="text-left py-2">Access (single)</th>
                    <th className="text-left py-2">Access (multi)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {tiers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-white/40">
                        No tiers loaded.
                      </td>
                    </tr>
                  ) : (
                    tiers.map((t) => (
                      <tr key={t.id || `${t.min_places}-${t.max_places}`}>
                        <td className="py-2">
                          {t.min_places}
                          {t.max_places ? `–${t.max_places}` : "+"}
                        </td>
                        <td className="py-2">₹{(t.price_per_place_paise / 100).toFixed(2)}</td>
                        <td className="py-2">{t.access_hours_single}h</td>
                        <td className="py-2">{t.access_hours_multi}h</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
