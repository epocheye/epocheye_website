"use client";

import { useCallback, useEffect, useState } from "react";

const PROVIDERS = [
  { value: "catalog", label: "Catalog (admin-uploaded GLBs + Gemini recognition)" },
  { value: "mock", label: "Mock (zero cost, dev only)" },
  { value: "sagemaker", label: "AWS SageMaker (legacy)" },
  { value: "vertex", label: "GCP Vertex AI" },
];

const JOB_STATUSES = ["", "succeeded", "failed", "cached", "pending"];

function formatDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function StatusBadge({ status }) {
  const color =
    status === "succeeded"
      ? "text-green-400 bg-green-400/10 border-green-400/20"
      : status === "failed"
        ? "text-red-400 bg-red-400/10 border-red-400/20"
        : status === "cached"
          ? "text-white/60 bg-white/5 border-white/10"
          : "text-amber-400 bg-amber-400/10 border-amber-400/20";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${color}`}>
      {status}
    </span>
  );
}

export default function AdminArPage() {
  const [form, setForm] = useState({
    provider: "mock",
    enabled: true,
    maintenance_mode: false,
    free_daily_quota: 3,
    premium_daily_quota: 20,
    sagemaker_endpoint: "",
    vertex_endpoint: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const [jobs, setJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [jobFilter, setJobFilter] = useState({ status: "", monument: "", limit: 50 });

  const [stats, setStats] = useState(null);

  const [cacheForm, setCacheForm] = useState({ monument_id: "", object_label: "" });
  const [cacheMessage, setCacheMessage] = useState(null);
  const [cacheBusy, setCacheBusy] = useState(false);

  const loadConfig = useCallback(async () => {
    const res = await fetch("/api/admin/ar/config");
    const json = await res.json();
    if (json.success && json.data) {
      setForm({
        provider: json.data.provider || "mock",
        enabled: !!json.data.enabled,
        maintenance_mode: !!json.data.maintenance_mode,
        free_daily_quota: Number(json.data.free_daily_quota ?? 3),
        premium_daily_quota: Number(json.data.premium_daily_quota ?? 20),
        sagemaker_endpoint: json.data.sagemaker_endpoint || "",
        vertex_endpoint: json.data.vertex_endpoint || "",
      });
    }
  }, []);

  const loadStats = useCallback(async () => {
    const res = await fetch("/api/admin/ar/stats");
    const json = await res.json();
    if (json.success) setStats(json.data);
  }, []);

  const loadJobs = useCallback(async () => {
    setJobsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", String(jobFilter.limit));
      if (jobFilter.status) params.set("status", jobFilter.status);
      if (jobFilter.monument) params.set("monument", jobFilter.monument);
      const res = await fetch(`/api/admin/ar/jobs?${params.toString()}`);
      const json = await res.json();
      if (json.success) setJobs(json.data?.jobs || json.data || []);
    } finally {
      setJobsLoading(false);
    }
  }, [jobFilter]);

  useEffect(() => {
    Promise.all([loadConfig(), loadStats(), loadJobs()]).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/ar/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: form.provider,
          enabled: form.enabled,
          maintenance_mode: form.maintenance_mode,
          free_daily_quota: Number(form.free_daily_quota),
          premium_daily_quota: Number(form.premium_daily_quota),
          sagemaker_endpoint: form.sagemaker_endpoint,
          vertex_endpoint: form.vertex_endpoint,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setMessage({ type: "error", text: json.error || "Failed to save" });
      } else {
        setMessage({ type: "success", text: "AR config saved." });
        await loadConfig();
      }
    } catch {
      setMessage({ type: "error", text: "Network error — please try again" });
    } finally {
      setSaving(false);
    }
  }

  async function handleInvalidate(e) {
    e.preventDefault();
    if (!cacheForm.monument_id || !cacheForm.object_label) return;
    setCacheBusy(true);
    setCacheMessage(null);
    try {
      const res = await fetch(
        `/api/admin/ar/reconstructions/${encodeURIComponent(cacheForm.monument_id)}/${encodeURIComponent(cacheForm.object_label)}`,
        { method: "DELETE" }
      );
      const json = await res.json();
      if (!res.ok || !json.success) {
        setCacheMessage({ type: "error", text: json.error || "Failed to invalidate" });
      } else {
        setCacheMessage({ type: "success", text: "Cached reconstruction removed." });
        setCacheForm({ monument_id: "", object_label: "" });
        await loadJobs();
      }
    } catch {
      setCacheMessage({ type: "error", text: "Network error — please try again" });
    } finally {
      setCacheBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="p-4 md:p-12 max-w-5xl">
        <div className="h-8 w-40 bg-white/5 rounded animate-pulse mb-8" />
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-white/3 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-12 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-white">AR Reconstruction</h1>
        <p className="text-white/35 text-sm mt-1">
          Runtime provider, quota, and maintenance controls. Mobile app syncs this on launch and every 60s.
        </p>
      </div>

      {/* SAM 3D deploy runbook */}
      <SamDeployCard currentProvider={form.provider} endpointName={form.sagemaker_endpoint} />

      {/* Live endpoint state + force-stop (only relevant when provider is SageMaker). */}
      {form.provider === "sagemaker" ? <SamEndpointLiveCard /> : null}

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <StatCard label="24h success rate" value={stats?.success_rate_24h != null ? `${Math.round(stats.success_rate_24h * 100)}%` : "—"} />
        <StatCard label="24h jobs" value={stats?.total_24h ?? "—"} />
        <StatCard label="Cached (30d)" value={stats?.cached_30d ?? "—"} />
        <StatCard label="Est. cost (30d)" value={stats?.estimated_cost_usd_30d != null ? `$${Number(stats.estimated_cost_usd_30d).toFixed(2)}` : "$0.00"} />
      </div>

      {/* Config form */}
      <form onSubmit={handleSave}>
        <div className="bg-[#0d0d0d] border border-white/5 rounded-xl divide-y divide-white/5">
          <div className="px-5 pt-5 pb-3">
            <p className="text-xs font-medium text-white/35 uppercase tracking-widest">Provider & Availability</p>
          </div>

          <div className="p-5">
            <label className="block text-xs font-medium text-white/40 uppercase tracking-widest mb-1.5">Provider</label>
            <select
              value={form.provider}
              onChange={(e) => setForm((f) => ({ ...f, provider: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-white/30 transition-colors"
            >
              {PROVIDERS.map((p) => (
                <option key={p.value} value={p.value} className="bg-[#0d0d0d]">
                  {p.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-white/25 mt-1.5">
              Mock returns curated Cloudinary GLBs at zero cost. SageMaker / Vertex require their endpoint fields below.
            </p>
          </div>

          <div className="p-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-white font-medium">AR enabled</p>
              <p className="text-xs text-white/25 mt-0.5">When off, all reconstruction calls return 503 and the app hides the Lens CTA.</p>
            </div>
            <Toggle checked={form.enabled} onChange={(v) => setForm((f) => ({ ...f, enabled: v }))} />
          </div>

          <div className="p-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-white font-medium">Maintenance mode</p>
              <p className="text-xs text-white/25 mt-0.5">New reconstructions blocked; cached results still served.</p>
            </div>
            <Toggle checked={form.maintenance_mode} onChange={(v) => setForm((f) => ({ ...f, maintenance_mode: v }))} />
          </div>
        </div>

        <div className="bg-[#0d0d0d] border border-white/5 rounded-xl divide-y divide-white/5 mt-5">
          <div className="px-5 pt-5 pb-3">
            <p className="text-xs font-medium text-white/35 uppercase tracking-widest">Daily quotas</p>
          </div>
          <div className="p-5 grid grid-cols-2 gap-4">
            <NumberField label="Free tier" value={form.free_daily_quota} onChange={(v) => setForm((f) => ({ ...f, free_daily_quota: v }))} />
            <NumberField label="Premium tier" value={form.premium_daily_quota} onChange={(v) => setForm((f) => ({ ...f, premium_daily_quota: v }))} />
          </div>
        </div>

        <div className="bg-[#0d0d0d] border border-white/5 rounded-xl divide-y divide-white/5 mt-5">
          <div className="px-5 pt-5 pb-3">
            <p className="text-xs font-medium text-white/35 uppercase tracking-widest">Paid provider endpoints</p>
            <p className="text-xs text-white/25 mt-1">Only read when provider is set to the matching value. Leave blank on mock.</p>
          </div>
          <div className="p-5">
            <label className="block text-xs font-medium text-white/40 uppercase tracking-widest mb-1.5">SageMaker endpoint</label>
            <input
              type="text"
              value={form.sagemaker_endpoint}
              onChange={(e) => setForm((f) => ({ ...f, sagemaker_endpoint: e.target.value }))}
              placeholder="sam3d-async-prod"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/30 transition-colors"
            />
          </div>
          <div className="p-5">
            <label className="block text-xs font-medium text-white/40 uppercase tracking-widest mb-1.5">Vertex endpoint</label>
            <input
              type="text"
              value={form.vertex_endpoint}
              onChange={(e) => setForm((f) => ({ ...f, vertex_endpoint: e.target.value }))}
              placeholder="projects/.../locations/asia-south1/endpoints/..."
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/30 transition-colors"
            />
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
          {saving ? "Saving\u2026" : "Save AR config"}
        </button>
      </form>

      {/* Cache invalidation */}
      <div className="mt-10 bg-[#0d0d0d] border border-white/5 rounded-xl">
        <div className="px-5 pt-5 pb-3">
          <p className="text-xs font-medium text-white/35 uppercase tracking-widest">Invalidate cached reconstruction</p>
          <p className="text-xs text-white/25 mt-1">Next request regenerates via the current provider.</p>
        </div>
        <form onSubmit={handleInvalidate} className="p-5 grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-white/40 uppercase tracking-widest mb-1.5">Monument ID</label>
            <input
              type="text"
              value={cacheForm.monument_id}
              onChange={(e) => setCacheForm((f) => ({ ...f, monument_id: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/30 transition-colors"
              placeholder="uuid"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-white/40 uppercase tracking-widest mb-1.5">Object label</label>
            <input
              type="text"
              value={cacheForm.object_label}
              onChange={(e) => setCacheForm((f) => ({ ...f, object_label: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/30 transition-colors"
              placeholder="charioteer"
            />
          </div>
          <button
            type="submit"
            disabled={cacheBusy || !cacheForm.monument_id || !cacheForm.object_label}
            className="px-5 py-2.5 bg-red-500/10 border border-red-500/30 text-red-300 text-sm font-medium rounded-lg hover:bg-red-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {cacheBusy ? "Removing\u2026" : "Invalidate"}
          </button>
        </form>
        {cacheMessage && (
          <p
            className={`mx-5 mb-5 text-sm px-4 py-2.5 rounded-lg border ${
              cacheMessage.type === "success"
                ? "text-green-400 bg-green-400/10 border-green-400/20"
                : "text-red-400 bg-red-400/10 border-red-400/20"
            }`}
          >
            {cacheMessage.text}
          </p>
        )}
      </div>

      {/* Jobs log */}
      <div className="mt-10 bg-[#0d0d0d] border border-white/5 rounded-xl">
        <div className="px-5 pt-5 pb-3 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-xs font-medium text-white/35 uppercase tracking-widest">Reconstruction jobs</p>
            <p className="text-xs text-white/25 mt-1">Most recent {jobFilter.limit} jobs.</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={jobFilter.status}
              onChange={(e) => setJobFilter((f) => ({ ...f, status: e.target.value }))}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-white/30"
            >
              {JOB_STATUSES.map((s) => (
                <option key={s || "all"} value={s} className="bg-[#0d0d0d]">
                  {s || "All statuses"}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={jobFilter.monument}
              onChange={(e) => setJobFilter((f) => ({ ...f, monument: e.target.value }))}
              placeholder="Monument ID filter"
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-white/30"
            />
            <button
              type="button"
              onClick={loadJobs}
              className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white/70 hover:bg-white/10 hover:text-white transition-colors"
            >
              {jobsLoading ? "\u2026" : "Refresh"}
            </button>
          </div>
        </div>
        <div className="overflow-x-auto border-t border-white/5">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-white/40 text-[10px] uppercase tracking-widest">
                <th className="text-left px-5 py-3 font-medium">Created</th>
                <th className="text-left px-3 py-3 font-medium">Status</th>
                <th className="text-left px-3 py-3 font-medium">Provider</th>
                <th className="text-left px-3 py-3 font-medium">Monument</th>
                <th className="text-left px-3 py-3 font-medium">Object</th>
                <th className="text-right px-5 py-3 font-medium">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {jobs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-white/30">
                    {jobsLoading ? "Loading\u2026" : "No jobs yet."}
                  </td>
                </tr>
              ) : (
                jobs.map((job) => (
                  <tr key={job.id} className="text-white/70 hover:bg-white/3">
                    <td className="px-5 py-3">{formatDate(job.created_at)}</td>
                    <td className="px-3 py-3"><StatusBadge status={job.status} /></td>
                    <td className="px-3 py-3">{job.provider}</td>
                    <td className="px-3 py-3 font-mono text-[10px] text-white/50">{job.monument_id?.slice(0, 8)}…</td>
                    <td className="px-3 py-3">{job.object_label}</td>
                    <td className="px-5 py-3 text-right">{job.duration_ms != null ? `${job.duration_ms} ms` : "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <CuratePanel />
        <CatalogBrowser />
        <AnchorsPanel />
        <UnknownScansPanel />
      </div>
    </div>
  );
}

async function uploadAssetFile(file, kind) {
  const fd = new FormData();
  fd.set("file", file);
  fd.set("kind", kind);
  const res = await fetch("/api/admin/ar/upload-asset", { method: "POST", body: fd });
  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error || "Upload failed");
  }
  return json.data?.url || "";
}

function CuratePanel() {
  const [form, setForm] = useState({
    monument_id: "",
    object_label: "",
    glb_url: "",
    thumbnail_url: "",
    knowledge_text: "",
  });
  const [referenceUrls, setReferenceUrls] = useState([]); // string[]
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(null); // 'glb' | 'thumb' | 'ref' | null
  const [result, setResult] = useState(null);

  async function handleFile(kind, file, slotIndex) {
    if (!file) return;
    setUploading(kind);
    setResult(null);
    try {
      const url = await uploadAssetFile(file, kind === "glb" ? "glb" : "image");
      if (kind === "glb") setForm((f) => ({ ...f, glb_url: url }));
      else if (kind === "thumb") setForm((f) => ({ ...f, thumbnail_url: url }));
      else if (kind === "ref") {
        setReferenceUrls((arr) => {
          const next = [...arr];
          if (typeof slotIndex === "number") next[slotIndex] = url;
          else next.push(url);
          return next.filter(Boolean).slice(0, 5);
        });
      }
    } catch (err) {
      setResult({ ok: false, text: err?.message || "Upload failed" });
    } finally {
      setUploading(null);
    }
  }

  async function submit(e) {
    e.preventDefault();
    if (!form.glb_url) {
      setResult({ ok: false, text: "Upload a GLB first" });
      return;
    }
    if (referenceUrls.length === 0) {
      setResult({ ok: false, text: "Upload at least one reference image" });
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/ar/curate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          monument_id: form.monument_id,
          object_label: form.object_label,
          glb_url: form.glb_url,
          thumbnail_url: form.thumbnail_url || undefined,
          reference_image_urls: referenceUrls,
          knowledge_text: form.knowledge_text || undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setResult({ ok: true, count: json.data?.reference_images, glb: json.data?.glb_url });
        setForm((f) => ({ ...f, object_label: "", glb_url: "", thumbnail_url: "", knowledge_text: "" }));
        setReferenceUrls([]);
      } else {
        setResult({ ok: false, text: json.error || "Curation failed" });
      }
    } catch (err) {
      setResult({ ok: false, text: err?.message || "Network error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-[#0d0d0d] border border-white/5 rounded-2xl p-6 mb-6">
      <h2 className="text-base font-semibold text-white mb-1">Catalog Curation</h2>
      <p className="text-xs text-white/35 mb-5">
        Upload a curated GLB and 1-5 reference photos. The server stores the GLB on Cloudinary, computes a
        perceptual hash for each reference image, and the next visitor scan that matches an anchor near
        the object will render this GLB in AR.
      </p>

      <form onSubmit={submit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-white/40 uppercase tracking-widest mb-1.5">Monument ID</label>
            <input
              type="text"
              required
              value={form.monument_id}
              onChange={(e) => setForm((f) => ({ ...f, monument_id: e.target.value.trim() }))}
              placeholder="konark"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30"
            />
          </div>
          <div>
            <label className="block text-xs text-white/40 uppercase tracking-widest mb-1.5">Object label</label>
            <input
              type="text"
              required
              value={form.object_label}
              onChange={(e) => setForm((f) => ({ ...f, object_label: e.target.value.trim() }))}
              placeholder="sun_wheel_chariot_north"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-white/40 uppercase tracking-widest mb-1.5">GLB file (.glb)</label>
          <input
            type="file"
            accept=".glb,.gltf,model/gltf-binary"
            onChange={(e) => handleFile("glb", e.target.files?.[0])}
            disabled={uploading !== null}
            className="block w-full text-xs text-white/70 file:mr-3 file:px-3 file:py-1.5 file:rounded file:border-0 file:bg-white file:text-black file:text-xs file:font-medium"
          />
          {form.glb_url ? (
            <p className="mt-1 text-[10px] text-green-400 break-all">Uploaded: {form.glb_url}</p>
          ) : (
            <p className="mt-1 text-[10px] text-white/30">{uploading === "glb" ? "Uploading…" : "No GLB selected"}</p>
          )}
        </div>

        <div>
          <label className="block text-xs text-white/40 uppercase tracking-widest mb-1.5">Thumbnail (optional)</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleFile("thumb", e.target.files?.[0])}
            disabled={uploading !== null}
            className="block w-full text-xs text-white/70 file:mr-3 file:px-3 file:py-1.5 file:rounded file:border-0 file:bg-white/10 file:text-white file:text-xs file:font-medium"
          />
          {form.thumbnail_url && (
            <p className="mt-1 text-[10px] text-green-400 break-all">Uploaded: {form.thumbnail_url}</p>
          )}
        </div>

        <div>
          <label className="block text-xs text-white/40 uppercase tracking-widest mb-1.5">
            Reference photos ({referenceUrls.length}/5) — first one is primary
          </label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={async (e) => {
              const files = Array.from(e.target.files || []).slice(0, 5 - referenceUrls.length);
              for (const f of files) {
                // sequential to avoid hammering Cloudinary
                await handleFile("ref", f);
              }
              e.target.value = "";
            }}
            disabled={uploading !== null || referenceUrls.length >= 5}
            className="block w-full text-xs text-white/70 file:mr-3 file:px-3 file:py-1.5 file:rounded file:border-0 file:bg-white/10 file:text-white file:text-xs file:font-medium"
          />
          {referenceUrls.length > 0 && (
            <ul className="mt-2 space-y-1">
              {referenceUrls.map((u, i) => (
                <li key={u} className="flex items-center gap-2 text-[10px] text-white/60">
                  <span className={i === 0 ? "text-amber-400" : "text-white/30"}>{i === 0 ? "★ primary" : `#${i + 1}`}</span>
                  <span className="truncate">{u}</span>
                  <button
                    type="button"
                    className="ml-auto text-white/30 hover:text-red-400"
                    onClick={() =>
                      setReferenceUrls((arr) => arr.filter((_, j) => j !== i))
                    }
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <label className="block text-xs text-white/40 uppercase tracking-widest mb-1.5">Knowledge text (optional)</label>
          <textarea
            rows={3}
            value={form.knowledge_text}
            onChange={(e) => setForm((f) => ({ ...f, knowledge_text: e.target.value }))}
            placeholder="One paragraph about this object — shown to visitors in AR."
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30"
          />
        </div>

        <button
          type="submit"
          disabled={busy || uploading !== null}
          className="px-4 py-2 bg-white text-black text-sm font-medium rounded-lg disabled:opacity-40 transition-opacity"
        >
          {busy ? "Saving…" : "Save catalog entry"}
        </button>

        {result && (
          <p className={`text-xs ${result.ok ? "text-green-400" : "text-red-400"}`}>
            {result.ok
              ? `Saved with ${result.count} reference image${result.count === 1 ? "" : "s"}.`
              : result.text}
          </p>
        )}
      </form>
    </div>
  );
}

function CatalogBrowser() {
  const [filter, setFilter] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const url = filter
        ? `/api/admin/ar/catalog?monument_id=${encodeURIComponent(filter)}`
        : "/api/admin/ar/catalog";
      const res = await fetch(url);
      const json = await res.json();
      setItems(json?.data?.catalog || []);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete(id) {
    if (!confirm("Remove this curated GLB? The metadata row stays.")) return;
    const res = await fetch(`/api/admin/ar/catalog/${encodeURIComponent(id)}`, { method: "DELETE" });
    const json = await res.json();
    if (json.success) load();
    else alert(json.error || "Delete failed");
  }

  return (
    <div className="bg-[#0d0d0d] border border-white/5 rounded-2xl p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-white">Curated Catalog</h2>
          <p className="text-xs text-white/35">Objects with an uploaded GLB. These render in AR.</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value.trim())}
            placeholder="Filter by monument ID"
            className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white"
          />
          <button
            type="button"
            onClick={load}
            className="text-xs text-white/60 border border-white/10 rounded px-2 py-1 hover:bg-white/5"
          >
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-xs text-white/40">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-xs text-white/40">No catalog entries yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-white/40">
                <th className="py-2 pr-4">Monument</th>
                <th className="py-2 pr-4">Object</th>
                <th className="py-2 pr-4">Refs</th>
                <th className="py-2 pr-4">GLB</th>
                <th className="py-2 pr-4">Generated</th>
                <th className="py-2 pr-4"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} className="border-t border-white/5">
                  <td className="py-2 pr-4 text-white/80">{it.monument_id}</td>
                  <td className="py-2 pr-4 text-white/80">{it.object_name}</td>
                  <td className="py-2 pr-4 text-white/60">{it.reference_images}</td>
                  <td className="py-2 pr-4">
                    <a href={it.glb_url} target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline truncate max-w-[260px] inline-block">
                      {it.glb_url.replace(/^https?:\/\//, "")}
                    </a>
                  </td>
                  <td className="py-2 pr-4 text-white/40">{formatDate(it.generated_at)}</td>
                  <td className="py-2 pr-4">
                    <button
                      type="button"
                      onClick={() => handleDelete(it.id)}
                      className="text-red-400 hover:text-red-300"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AnchorsPanel() {
  const [filter, setFilter] = useState("");
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    monument_id: "",
    object_label: "",
    anchor_mode: "geospatial",
    lat: "",
    lng: "",
    altitude: "",
    heading_deg: "",
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter) params.set("monument_id", filter);
      const res = await fetch(`/api/admin/ar/anchors?${params.toString()}`);
      const json = await res.json();
      if (json.success) setList(json.data?.anchors || []);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/ar/anchors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (json.success) {
        setMsg({ ok: true, text: "Anchor saved" });
        setForm((f) => ({ ...f, object_label: "", lat: "", lng: "", altitude: "", heading_deg: "" }));
        load();
      } else {
        setMsg({ ok: false, text: json.error || "Save failed" });
      }
    } catch (err) {
      setMsg({ ok: false, text: err?.message || "Network error" });
    } finally {
      setBusy(false);
    }
  }

  async function remove(id) {
    if (!confirm("Delete this anchor?")) return;
    try {
      const res = await fetch(`/api/admin/ar/anchors/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) load();
      else alert(json.error || "Delete failed");
    } catch (err) {
      alert(err?.message || "Network error");
    }
  }

  return (
    <div className="bg-[#0d0d0d] border border-white/5 rounded-2xl p-6 mb-6">
      <h2 className="text-base font-semibold text-white mb-1">AR Anchors</h2>
      <p className="text-xs text-white/35 mb-5">
        Geo-anchors place curated GLBs at known lat/lng on-site. Use the mobile dev tool for capture; this form is
        for tweaks and overrides.
      </p>

      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <input
          type="text"
          required
          placeholder="monument_id"
          value={form.monument_id}
          onChange={(e) => setForm((f) => ({ ...f, monument_id: e.target.value.trim() }))}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30"
        />
        <input
          type="text"
          required
          placeholder="object_label"
          value={form.object_label}
          onChange={(e) => setForm((f) => ({ ...f, object_label: e.target.value.trim() }))}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30"
        />
        <select
          value={form.anchor_mode}
          onChange={(e) => setForm((f) => ({ ...f, anchor_mode: e.target.value }))}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30 appearance-none">
          <option value="geospatial" className="bg-[#0d0d0d]">Geospatial</option>
          <option value="compass" className="bg-[#0d0d0d]">Compass</option>
        </select>
        <input
          type="number" step="any" required placeholder="lat" value={form.lat}
          onChange={(e) => setForm((f) => ({ ...f, lat: e.target.value }))}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30"
        />
        <input
          type="number" step="any" required placeholder="lng" value={form.lng}
          onChange={(e) => setForm((f) => ({ ...f, lng: e.target.value }))}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30"
        />
        <input
          type="number" step="any" placeholder="altitude (m)" value={form.altitude}
          onChange={(e) => setForm((f) => ({ ...f, altitude: e.target.value }))}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30"
        />
        <input
          type="number" step="any" placeholder="heading° (0=N)" value={form.heading_deg}
          onChange={(e) => setForm((f) => ({ ...f, heading_deg: e.target.value }))}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30 col-span-1"
        />
        <button
          type="submit"
          disabled={busy}
          className="md:col-span-2 px-4 py-2 bg-white text-black text-sm font-medium rounded-lg disabled:opacity-40 transition-opacity">
          {busy ? "Saving…" : "Save anchor"}
        </button>
        {msg && (
          <p className={`md:col-span-3 text-xs ${msg.ok ? "text-green-400" : "text-red-400"}`}>{msg.text}</p>
        )}
      </form>

      <div className="flex items-center gap-3 mb-3">
        <input
          type="text"
          placeholder="Filter by monument_id"
          value={filter}
          onChange={(e) => setFilter(e.target.value.trim())}
          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30"
        />
        <button onClick={load} className="text-xs px-3 py-2 rounded-lg border border-white/10 text-white/70 hover:bg-white/5">
          {loading ? "Loading…" : "Reload"}
        </button>
      </div>

      <div className="border border-white/5 rounded-xl overflow-hidden">
        <table className="w-full text-xs">
          <thead className="text-white/40 bg-white/[0.02] border-b border-white/5">
            <tr>
              <th className="text-left px-3 py-2 font-medium">Monument</th>
              <th className="text-left px-3 py-2 font-medium">Object</th>
              <th className="text-left px-3 py-2 font-medium">Source</th>
              <th className="text-left px-3 py-2 font-medium">Mode</th>
              <th className="text-left px-3 py-2 font-medium">Lat / Lng</th>
              <th className="text-left px-3 py-2 font-medium">Alt</th>
              <th className="text-left px-3 py-2 font-medium">Heading</th>
              <th className="text-right px-3 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {list.length === 0 ? (
              <tr><td colSpan={8} className="px-3 py-6 text-center text-white/30">No anchors yet.</td></tr>
            ) : list.map((a) => (
              <tr key={a.id} className="text-white/70 hover:bg-white/3">
                <td className="px-3 py-2">{a.monument_id}</td>
                <td className="px-3 py-2">{a.object_label}</td>
                <td className="px-3 py-2">
                  <span className={
                    (a.source === 'gemini_runtime')
                      ? 'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] border text-amber-400 bg-amber-400/10 border-amber-400/20'
                      : 'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] border text-white/60 bg-white/5 border-white/10'
                  }>
                    {a.source || 'admin'}
                    {a.confidence != null && a.confidence < 1.0 ? ` · ${(a.confidence * 100).toFixed(0)}%` : null}
                  </span>
                </td>
                <td className="px-3 py-2">{a.anchor_mode}</td>
                <td className="px-3 py-2 font-mono text-[10px]">
                  {a.lat != null ? `${a.lat.toFixed(5)}, ${a.lng?.toFixed(5)}` : "—"}
                </td>
                <td className="px-3 py-2">{a.altitude != null ? `${a.altitude.toFixed(1)} m` : "—"}</td>
                <td className="px-3 py-2">{a.heading_deg != null ? `${a.heading_deg.toFixed(0)}°` : "—"}</td>
                <td className="px-3 py-2 text-right">
                  <button onClick={() => remove(a.id)} className="text-[10px] text-red-400 hover:text-red-300">delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UnknownScansPanel() {
  const [statusFilter, setStatusFilter] = useState("active");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/ar/unknown-scans?status=${encodeURIComponent(statusFilter)}`);
      const json = await res.json();
      setItems(json?.data?.unknown_scans || []);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  async function action(id, kind) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/ar/unknown-scans/${encodeURIComponent(id)}?action=${kind}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!json.success) {
        alert(json.error || "Action failed");
        return;
      }
      load();
    } finally {
      setBusyId(null);
    }
  }

  async function linkAction(id) {
    const assetId = window.prompt("Paste asset_id (monument_objects.id) to link this scan to:");
    if (!assetId) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/ar/unknown-scans/${encodeURIComponent(id)}?action=link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asset_id: assetId.trim() }),
      });
      const json = await res.json();
      if (!json.success) {
        alert(json.error || "Link failed");
        return;
      }
      load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="bg-[#0d0d0d] border border-white/5 rounded-2xl p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-white">Unknown Scans</h2>
          <p className="text-xs text-white/35">
            Visitor-submitted objects we couldn&apos;t identify. Queue for Meshy auto-fill, link to an existing asset, or reject.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white"
          >
            <option value="active">Active (pending + queued)</option>
            <option value="pending">Pending</option>
            <option value="queued">Queued</option>
            <option value="generated">Generated</option>
            <option value="rejected">Rejected</option>
          </select>
          <button
            type="button"
            onClick={load}
            className="text-xs text-white/60 border border-white/10 rounded px-2 py-1 hover:bg-white/5"
          >
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-xs text-white/40">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-xs text-white/40">No unknown scans in this view.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((it) => (
            <div key={it.id} className="border border-white/5 rounded-xl overflow-hidden bg-black/40">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={it.image_url} alt={it.suggested_label || "unknown"} className="w-full h-44 object-cover" />
              <div className="p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm text-white/80 truncate" title={it.suggested_label || "(no label)"}>
                    {it.suggested_label || <span className="text-white/30 italic">no label</span>}
                  </p>
                  <span className="text-[10px] text-white/40 shrink-0">★ {it.upvotes}</span>
                </div>
                <p className="text-[10px] text-white/40">
                  {it.monument_id} · {it.status}
                </p>
                <div className="flex items-center gap-2 pt-2">
                  {it.status === "pending" && (
                    <button
                      type="button"
                      disabled={busyId === it.id}
                      onClick={() => action(it.id, "queue-meshy")}
                      className="flex-1 px-2 py-1.5 text-[11px] rounded bg-white text-black font-medium disabled:opacity-40"
                    >
                      Queue Meshy
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={busyId === it.id}
                    onClick={() => linkAction(it.id)}
                    className="flex-1 px-2 py-1.5 text-[11px] rounded border border-white/15 text-white/80 hover:bg-white/5 disabled:opacity-40"
                  >
                    Link
                  </button>
                  {it.status !== "rejected" && (
                    <button
                      type="button"
                      disabled={busyId === it.id}
                      onClick={() => action(it.id, "reject")}
                      className="px-2 py-1.5 text-[11px] rounded text-red-400 hover:text-red-300 disabled:opacity-40"
                    >
                      Reject
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none shrink-0 ${
        checked ? "bg-white" : "bg-white/15"
      }`}
      aria-pressed={checked}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full shadow transition-transform duration-200 ${
          checked ? "bg-black translate-x-5" : "bg-white/50 translate-x-0"
        }`}
      />
    </button>
  );
}

function NumberField({ label, value, onChange }) {
  return (
    <div>
      <label className="block text-xs font-medium text-white/40 uppercase tracking-widest mb-1.5">{label}</label>
      <input
        type="number"
        min="0"
        step="1"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-white/30 transition-colors"
      />
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="bg-[#0d0d0d] border border-white/5 rounded-xl px-4 py-3">
      <p className="text-[10px] font-medium text-white/30 uppercase tracking-widest">{label}</p>
      <p className="text-lg font-semibold text-white mt-1">{value}</p>
    </div>
  );
}

function SamDeployCard({ currentProvider, endpointName }) {
  const providerReady = currentProvider === "sagemaker" && endpointName?.trim();
  const steps = [
    {
      title: "Request GPU quota",
      body: "AWS Service Quotas → ap-south-1 → Amazon SageMaker → `ml.g4dn.xlarge for endpoint usage`. Approval takes 1–3 business days. This is the blocking step.",
      check: "Approved quota ≥ 1",
    },
    {
      title: "Build + push image",
      body: "From `epocheye_backend`, run `python scripts/create_sam3d_infra.py` then `bash scripts/build_and_push_sam3d.sh`. Expect ~15–20 min on first push.",
      check: "ECR repo `epocheye-sam3d` has `:latest` image",
    },
    {
      title: "Create async endpoint",
      body: "Run `python scripts/create_sagemaker_endpoint.py`. Wait ~8 min until the endpoint status is `InService`.",
      check: "SageMaker endpoint shows `InService`",
    },
    {
      title: "Flip provider in this form",
      body: "Set Provider = AWS SageMaker, SageMaker endpoint = `epocheye-sam3d`, then Save. A Lens scan should produce a real GLB in ~20s.",
      check: providerReady ? "Live — scan should work" : "Pending — flip provider + endpoint below",
    },
  ];

  return (
    <div className="bg-[#0d0d0d] border border-white/5 rounded-xl p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs font-medium text-white/35 uppercase tracking-widest">Deploy SAM 3D</p>
          <p className="text-sm text-white/60 mt-1">
            One-time setup to move AR off mock and onto real Meta SAM 3D reconstructions.
          </p>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full border ${providerReady ? "text-green-400 bg-green-400/10 border-green-400/20" : "text-amber-400 bg-amber-400/10 border-amber-400/20"}`}>
          {providerReady ? "Live" : "Not configured"}
        </span>
      </div>
      <ol className="space-y-3">
        {steps.map((s, i) => (
          <li key={s.title} className="flex gap-3">
            <span className="w-6 h-6 shrink-0 rounded-full bg-white/5 border border-white/10 text-white/60 text-xs font-mono flex items-center justify-center">
              {i + 1}
            </span>
            <div className="flex-1">
              <p className="text-sm text-white">{s.title}</p>
              <p className="text-xs text-white/45 mt-0.5">{s.body}</p>
              <p className="text-xs text-white/30 mt-1 italic">Done when: {s.check}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="text-xs text-white/25 mt-4">
        Cost ceiling: async endpoint scales to 0 when idle. Each inference is ~$0.003. Expected dev spend ~$1–5/month.
      </p>
    </div>
  );
}

const SAM_STATUS_COLORS = {
  in_service: "text-green-400 bg-green-400/10 border-green-400/20",
  creating: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  updating: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  rolling_back: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  deleting: "text-white/50 bg-white/5 border-white/10",
  stopped: "text-white/50 bg-white/5 border-white/10",
  failed: "text-red-400 bg-red-400/10 border-red-400/20",
};

function SamEndpointLiveCard() {
  const [state, setState] = useState(null);
  const [err, setErr] = useState(null);
  const [stopping, setStopping] = useState(false);
  const [stopMsg, setStopMsg] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/ar/sagemaker/status", { cache: "no-store" });
      const json = await res.json();
      if (!json.success) {
        setErr(json.error || "Failed to load status");
        return;
      }
      setErr(null);
      setState(json.data);
    } catch (e) {
      setErr(e?.message || "Network error");
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, [load]);

  async function handleForceStop() {
    if (!confirm("Force-stop the SAM 3D endpoint now? Any in-flight reconstructions will fail.")) return;
    setStopping(true);
    setStopMsg(null);
    try {
      const res = await fetch("/api/admin/ar/sagemaker/stop", { method: "POST" });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setStopMsg({ type: "error", text: json.error || "Failed to stop" });
      } else {
        setStopMsg({ type: "success", text: "Delete requested — status will flip to `deleting` on next tick." });
        await load();
      }
    } catch {
      setStopMsg({ type: "error", text: "Network error — please try again" });
    } finally {
      setStopping(false);
    }
  }

  const status = state?.status || "unknown";
  const statusColor = SAM_STATUS_COLORS[status] || "text-white/50 bg-white/5 border-white/10";
  const canForceStop = status === "in_service" || status === "creating" || status === "updating";

  return (
    <div className="bg-[#0d0d0d] border border-white/5 rounded-xl p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs font-medium text-white/35 uppercase tracking-widest">Live endpoint state</p>
          <p className="text-sm text-white/60 mt-1">
            Endpoint auto-starts on first scan and auto-stops after {state?.idle_timeout_minutes ?? 15} min idle. Force stop only to kill a hung endpoint.
          </p>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full border ${statusColor}`}>
          {status.replace("_", " ")}
        </span>
      </div>

      {err ? (
        <p className="text-xs text-red-400 mb-3">{err}</p>
      ) : null}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <StatCard label="AWS raw" value={state?.aws_raw_status ?? "—"} />
        <StatCard label="Last active" value={formatDate(state?.last_active_at)} />
        <StatCard label="Warmup started" value={formatDate(state?.warmup_started_at)} />
        <StatCard label="Last shutdown" value={formatDate(state?.last_shutdown_at)} />
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <StatCard label="Pending jobs (1h)" value={state?.pending_jobs ?? 0} />
        <StatCard label="Processing jobs (1h)" value={state?.processing_jobs ?? 0} />
      </div>

      {state?.failure_reason ? (
        <p className="text-xs text-red-400 mb-3">Failure reason: {state.failure_reason}</p>
      ) : null}

      <div className="flex items-center justify-between gap-4 pt-2 border-t border-white/5">
        <p className="text-xs text-white/30">
          Endpoint: <span className="font-mono text-white/50">{state?.endpoint_name ?? "—"}</span>
        </p>
        <button
          type="button"
          onClick={handleForceStop}
          disabled={!canForceStop || stopping}
          className="text-xs px-3 py-1.5 rounded-lg border border-red-400/30 text-red-400 bg-red-400/5 hover:bg-red-400/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {stopping ? "Stopping…" : "Force stop now"}
        </button>
      </div>

      {stopMsg ? (
        <p className={`text-xs mt-3 ${stopMsg.type === "error" ? "text-red-400" : "text-green-400"}`}>
          {stopMsg.text}
        </p>
      ) : null}
    </div>
  );
}
