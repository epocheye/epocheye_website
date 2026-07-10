"use client";

import { useEffect, useState, startTransition } from "react";

// Admin activate/deactivate for heritage sites. Disabling flips a single flag
// (recognition_enabled) so the site goes fully offline — recognition, AR, and
// all listings stop serving it — without deleting any data. Re-enabling restores
// exact prior behaviour. Disabled sites are still listed here so they can be
// switched back on.
export default function SitesAdminPage() {
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState({}); // slug -> true while toggling

  async function load(q = "") {
    startTransition(() => setLoading(true));
    setError(null);
    try {
      const res = await fetch(`/api/admin/sites?q=${encodeURIComponent(q.trim())}`);
      const json = await res.json();
      if (json.success) {
        startTransition(() => setSites(json.data?.sites || []));
      } else {
        setError(json.error || "Failed to load sites");
      }
    } catch (err) {
      setError(err?.message || "Network error");
    } finally {
      startTransition(() => setLoading(false));
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function toggle(slug, nextEnabled) {
    // Optimistic: flip immediately, revert if the request fails.
    setPending((p) => ({ ...p, [slug]: true }));
    setError(null);
    setSites((list) =>
      list.map((s) => (s.slug === slug ? { ...s, recognition_enabled: nextEnabled } : s))
    );
    try {
      const res = await fetch(`/api/admin/sites/${encodeURIComponent(slug)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: nextEnabled }),
      });
      const json = await res.json();
      if (!json.success) {
        // revert
        setSites((list) =>
          list.map((s) => (s.slug === slug ? { ...s, recognition_enabled: !nextEnabled } : s))
        );
        setError(json.error || "Update failed");
      }
    } catch (err) {
      setSites((list) =>
        list.map((s) => (s.slug === slug ? { ...s, recognition_enabled: !nextEnabled } : s))
      );
      setError(err?.message || "Network error");
    } finally {
      setPending((p) => {
        const next = { ...p };
        delete next[slug];
        return next;
      });
    }
  }

  const activeCount = sites.filter((s) => s.recognition_enabled).length;
  const disabledCount = sites.length - activeCount;

  return (
    <div className="min-h-screen bg-[#080808] text-white px-5 py-8 md:px-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-6">
          <h1 className="text-xl font-medium">Sites</h1>
          <p className="text-sm text-white/40 mt-1">
            Activate or deactivate a heritage site. Deactivating takes it fully offline
            (recognition, AR, and all listings) without deleting any data — reactivating
            restores it exactly.
          </p>
        </header>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            load(query);
          }}
          className="flex items-center gap-2 mb-4">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name…"
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm placeholder-white/30 focus:outline-none focus:border-white/25"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-lg text-sm border border-white/15 text-white/70 hover:text-white hover:border-white/30 transition-colors">
            Search
          </button>
        </form>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        {!loading && sites.length > 0 && (
          <p className="text-xs text-white/30 mb-3">
            {sites.length} sites · {activeCount} active · {disabledCount} disabled
          </p>
        )}

        <div className="rounded-xl border border-white/5 bg-[#0d0d0d] divide-y divide-white/5">
          {loading ? (
            <div className="px-4 py-8 text-sm text-white/40">Loading…</div>
          ) : sites.length === 0 ? (
            <div className="px-4 py-8 text-sm text-white/40">No sites found.</div>
          ) : (
            sites.map((s) => {
              const enabled = !!s.recognition_enabled;
              const busy = !!pending[s.slug];
              return (
                <div key={s.slug} className="flex items-center gap-4 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{s.name}</p>
                    <p className="text-xs text-white/30 truncate">
                      {[s.city, s.state].filter(Boolean).join(", ") || "—"}
                      <span className="mx-1.5 text-white/15">·</span>
                      <span className="font-mono">{s.slug}</span>
                      <span className="mx-1.5 text-white/15">·</span>
                      {s.status}
                    </p>
                  </div>

                  <span
                    className={`text-xs shrink-0 ${
                      enabled ? "text-emerald-400/80" : "text-white/30"
                    }`}>
                    {enabled ? "Active" : "Disabled"}
                  </span>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={enabled}
                    aria-label={`${enabled ? "Deactivate" : "Activate"} ${s.name}`}
                    disabled={busy}
                    onClick={() => toggle(s.slug, !enabled)}
                    className={`relative shrink-0 w-11 h-6 rounded-full transition-colors duration-150 disabled:opacity-40 ${
                      enabled ? "bg-emerald-500/70" : "bg-white/15"
                    }`}>
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform duration-150 ${
                        enabled ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
