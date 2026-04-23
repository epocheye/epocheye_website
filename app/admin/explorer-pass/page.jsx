"use client";

import { useEffect, useState, startTransition } from "react";

const EMPTY_CONFIG = {
  default_price_paise: 29900,
  single_access_hours: 12,
  pass_default_hours: 24,
  pass_max_hours: 72,
  extension_24h_paise: 14900,
  extension_48h_paise: 24900,
};

const EMPTY_PLACE = {
  place_id: "",
  place_name: "",
  price_paise: "",
  place_type: "",
  lat: null,
  lng: null,
  notes: "",
};

export default function ExplorerPassAdminPage() {
  const [tab, setTab] = useState("config");
  const [config, setConfig] = useState(EMPTY_CONFIG);
  const [configDirty, setConfigDirty] = useState(false);
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  // Search + editor
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [editing, setEditing] = useState(EMPTY_PLACE);

  async function loadAll() {
    startTransition(() => setLoading(true));
    try {
      const [cfgRes, placesRes] = await Promise.all([
        fetch("/api/admin/explorer-pass/config"),
        fetch("/api/admin/explorer-pass/places"),
      ]);
      const cfgJson = await cfgRes.json();
      const placesJson = await placesRes.json();
      if (cfgJson.success && cfgJson.data) {
        startTransition(() => {
          setConfig({ ...EMPTY_CONFIG, ...cfgJson.data });
          setConfigDirty(false);
        });
      }
      if (placesJson.success) {
        startTransition(() =>
          setPlaces(placesJson.data?.places || placesJson.data || [])
        );
      }
    } finally {
      startTransition(() => setLoading(false));
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  async function saveConfig(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const payload = {
        default_price_paise: Number(config.default_price_paise),
        single_access_hours: Number(config.single_access_hours),
        pass_default_hours: Number(config.pass_default_hours),
        pass_max_hours: Number(config.pass_max_hours),
        extension_24h_paise: Number(config.extension_24h_paise),
        extension_48h_paise: Number(config.extension_48h_paise),
      };
      const res = await fetch("/api/admin/explorer-pass/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error || "Save failed");
        return;
      }
      setConfigDirty(false);
    } finally {
      setBusy(false);
    }
  }

  async function runSearch(e) {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchResults([]);
    try {
      const res = await fetch(
        `/api/admin/places/search?q=${encodeURIComponent(searchQuery.trim())}`
      );
      const json = await res.json();
      if (json.success) {
        setSearchResults(json.data?.results || []);
      } else {
        setError(json.error || "Search failed");
      }
    } finally {
      setSearching(false);
    }
  }

  function loadResultIntoEditor(r) {
    setEditing({
      place_id: r.place_id,
      place_name: r.name,
      price_paise: "",
      place_type: r.place_type || "",
      lat: r.lat ?? null,
      lng: r.lng ?? null,
      notes: r.formatted || "",
    });
  }

  async function savePlace(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const payload = {
        place_id: editing.place_id.trim(),
        place_name: editing.place_name.trim(),
        price_paise:
          editing.price_paise === "" || editing.price_paise == null
            ? null
            : Number(editing.price_paise),
        place_type: editing.place_type || null,
        lat: editing.lat,
        lng: editing.lng,
        notes: editing.notes,
      };
      if (!payload.place_id || !payload.place_name) {
        setError("place_id and place_name are required");
        return;
      }
      const res = await fetch("/api/admin/explorer-pass/places", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error || "Save failed");
        return;
      }
      setEditing(EMPTY_PLACE);
      setSearchResults([]);
      setSearchQuery("");
      await loadAll();
    } finally {
      setBusy(false);
    }
  }

  async function removePlace(placeId) {
    if (!confirm(`Remove pricing for ${placeId}? It will revert to the default.`))
      return;
    const res = await fetch(
      `/api/admin/explorer-pass/places/${encodeURIComponent(placeId)}`,
      { method: "DELETE" }
    );
    const json = await res.json();
    if (!json.success) {
      alert(json.error || "Delete failed");
      return;
    }
    await loadAll();
  }

  function updateConfigField(field, val) {
    setConfig((c) => ({ ...c, [field]: val }));
    setConfigDirty(true);
  }

  return (
    <div className="min-h-screen bg-[#080808] text-white">
      <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">
        <div>
          <h1 className="text-2xl font-medium">Explorer Pass</h1>
          <p className="text-white/50 text-sm mt-1">
            Per-place pricing with admin-set defaults. Single-place buys get a fixed
            short-access window; custom passes are user-extendable up to the cap.
          </p>
        </div>

        <div className="flex gap-2 border-b border-white/10">
          {[
            { id: "config", label: "Pricing config" },
            { id: "places", label: "Per-place pricing" },
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

        {tab === "config" && (
          <form
            onSubmit={saveConfig}
            className="rounded-xl border border-white/10 bg-[#0d0d0d] p-6 space-y-5"
          >
            <h2 className="text-sm uppercase tracking-wider text-white/50">
              Global defaults
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <NumField
                label="Default price per place (paise)"
                value={config.default_price_paise}
                onChange={(v) => updateConfigField("default_price_paise", v)}
                hint={`₹${(config.default_price_paise / 100).toFixed(2)}`}
              />
              <NumField
                label="Single place access (hours)"
                value={config.single_access_hours}
                onChange={(v) => updateConfigField("single_access_hours", v)}
                hint="Fixed duration for a one-off place purchase"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <NumField
                label="Pass default duration (hours)"
                value={config.pass_default_hours}
                onChange={(v) => updateConfigField("pass_default_hours", v)}
                hint="Custom Explorer Pass default — user can extend"
              />
              <NumField
                label="Pass max duration (hours)"
                value={config.pass_max_hours}
                onChange={(v) => updateConfigField("pass_max_hours", v)}
                hint="Upper cap on extension"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <NumField
                label="+24h extension fee (paise)"
                value={config.extension_24h_paise}
                onChange={(v) => updateConfigField("extension_24h_paise", v)}
                hint={`₹${(config.extension_24h_paise / 100).toFixed(2)}`}
              />
              <NumField
                label="+48h extension fee (paise)"
                value={config.extension_48h_paise}
                onChange={(v) => updateConfigField("extension_48h_paise", v)}
                hint={`₹${(config.extension_48h_paise / 100).toFixed(2)}`}
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-white/40">
                {loading
                  ? "Loading…"
                  : configDirty
                  ? "Unsaved changes"
                  : "All saved"}
              </span>
              <button
                type="submit"
                disabled={busy || !configDirty}
                className="px-4 py-2 text-sm rounded-md border border-white/20 hover:bg-white/5 disabled:opacity-40"
              >
                {busy ? "Saving…" : "Save config"}
              </button>
            </div>
            {error && <div className="text-sm text-rose-300">{error}</div>}
          </form>
        )}

        {tab === "places" && (
          <div className="space-y-6">
            {/* Search */}
            <form
              onSubmit={runSearch}
              className="rounded-xl border border-white/10 bg-[#0d0d0d] p-6 space-y-4"
            >
              <h2 className="text-sm uppercase tracking-wider text-white/50">
                Search a place
              </h2>
              <div className="flex gap-2">
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Taj Mahal, Konark Sun Temple, Hampi ruins…"
                  className="flex-1 bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-white/30"
                />
                <button
                  type="submit"
                  disabled={searching || !searchQuery.trim()}
                  className="px-4 py-2 text-sm rounded-md border border-white/20 hover:bg-white/5 disabled:opacity-40"
                >
                  {searching ? "Searching…" : "Search"}
                </button>
              </div>

              {searchResults.length > 0 && (
                <div className="divide-y divide-white/5 border border-white/5 rounded-md">
                  {searchResults.map((r) => (
                    <button
                      type="button"
                      key={r.place_id}
                      onClick={() => loadResultIntoEditor(r)}
                      className="w-full text-left px-4 py-3 hover:bg-white/[0.03] flex items-center justify-between gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">{r.name || "Unnamed"}</div>
                        <div className="text-xs text-white/40 truncate">{r.formatted}</div>
                      </div>
                      <span className="text-xs text-white/30">Edit →</span>
                    </button>
                  ))}
                </div>
              )}
            </form>

            {/* Editor */}
            <form
              onSubmit={savePlace}
              className="rounded-xl border border-white/10 bg-[#0d0d0d] p-6 space-y-4"
            >
              <h2 className="text-sm uppercase tracking-wider text-white/50">
                Set per-place price
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field
                  label="Place ID"
                  mono
                  value={editing.place_id}
                  onChange={(v) => setEditing({ ...editing, place_id: v })}
                  placeholder="51a1f2e5…"
                />
                <Field
                  label="Place name"
                  value={editing.place_name}
                  onChange={(v) => setEditing({ ...editing, place_name: v })}
                  placeholder="Taj Mahal"
                />
                <Field
                  label="Price (paise)"
                  type="number"
                  min="0"
                  value={editing.price_paise}
                  onChange={(v) => setEditing({ ...editing, price_paise: v })}
                  placeholder="49900"
                  hint={
                    editing.price_paise
                      ? `₹${(Number(editing.price_paise) / 100).toFixed(2)}`
                      : "Leave blank to use the global default"
                  }
                />
                <Field
                  label="Place type (optional)"
                  value={editing.place_type}
                  onChange={(v) => setEditing({ ...editing, place_type: v })}
                  placeholder="monument, temple, fort…"
                />
              </div>
              <Field
                label="Notes"
                value={editing.notes}
                onChange={(v) => setEditing({ ...editing, notes: v })}
                placeholder="Premium monument — higher peak-season pricing"
              />

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setEditing(EMPTY_PLACE)}
                  className="text-xs text-white/50 hover:text-white/80"
                >
                  Clear
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="px-4 py-2 text-sm rounded-md border border-white/20 hover:bg-white/5 disabled:opacity-50"
                >
                  {busy ? "Saving…" : "Save place"}
                </button>
              </div>
              {error && <div className="text-sm text-rose-300">{error}</div>}
            </form>

            {/* Existing prices */}
            <section className="rounded-xl border border-white/10 bg-[#0d0d0d]">
              <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                <h2 className="text-lg">Priced places</h2>
                <button
                  onClick={loadAll}
                  className="text-xs text-white/50 hover:text-white/80"
                >
                  Refresh
                </button>
              </div>
              <div className="divide-y divide-white/5">
                {loading && <div className="px-6 py-8 text-sm text-white/40">Loading…</div>}
                {!loading && places.length === 0 && (
                  <div className="px-6 py-8 text-sm text-white/40">
                    No places priced yet. Every place falls back to the global default.
                  </div>
                )}
                {places.map((p) => (
                  <div key={p.place_id} className="px-6 py-4 flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{p.place_name}</div>
                      <div className="text-xs text-white/40 font-mono truncate">
                        {p.place_id}
                      </div>
                      <div className="text-xs text-white/60 mt-1 space-x-3">
                        <span>
                          ₹{p.price_paise != null ? (p.price_paise / 100).toFixed(2) : "default"}
                        </span>
                        {p.place_type && <span className="text-white/40">· {p.place_type}</span>}
                      </div>
                      {p.notes && (
                        <div className="text-xs text-white/50 mt-1 italic">{p.notes}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() =>
                          setEditing({
                            place_id: p.place_id,
                            place_name: p.place_name || "",
                            price_paise: p.price_paise ?? "",
                            place_type: p.place_type || "",
                            lat: p.lat ?? null,
                            lng: p.lng ?? null,
                            notes: p.notes || "",
                          })
                        }
                        className="text-xs px-2 py-1 rounded border border-white/15 hover:bg-white/5"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => removePlace(p.place_id)}
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
      </div>
    </div>
  );
}

function NumField({ label, value, onChange, hint }) {
  return (
    <label className="space-y-1 block">
      <span className="text-xs uppercase tracking-wider text-white/40">{label}</span>
      <input
        type="number"
        min="0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-white/30"
      />
      {hint && <span className="text-xs text-white/40">{hint}</span>}
    </label>
  );
}

function Field({ label, value, onChange, mono, hint, ...rest }) {
  return (
    <label className="space-y-1 block">
      <span className="text-xs uppercase tracking-wider text-white/40">{label}</span>
      <input
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-white/30 ${mono ? "font-mono" : ""}`}
        {...rest}
      />
      {hint && <span className="text-xs text-white/40">{hint}</span>}
    </label>
  );
}
