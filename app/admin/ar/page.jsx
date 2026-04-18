"use client";

import { useCallback, useEffect, useState } from "react";

const PROVIDERS = [
  { value: "mock", label: "Mock (zero cost)" },
  { value: "sagemaker", label: "AWS SageMaker" },
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
      <div className="p-8 md:p-12 max-w-5xl">
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
    <div className="p-8 md:p-12 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-white">AR Reconstruction</h1>
        <p className="text-white/35 text-sm mt-1">
          Runtime provider, quota, and maintenance controls. Mobile app syncs this on launch and every 60s.
        </p>
      </div>

      {/* SAM 3D deploy runbook */}
      <SamDeployCard currentProvider={form.provider} endpointName={form.sagemaker_endpoint} />

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
      </div>
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
