"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, Landmark, Mail, ShieldPlus, UserPlus, KeyRound, Sparkles } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    email: "",
    password: "",
    annual_visitors: "",
  });
  const [orgs, setOrgs] = useState([]);
  const [orgsLoading, setOrgsLoading] = useState(true);
  const [orgsError, setOrgsError] = useState("");
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [orgNameOther, setOrgNameOther] = useState("");
  const [siteSelection, setSiteSelection] = useState("");
  const [siteNameNew, setSiteNameNew] = useState("");

  const selectedOrg =
    selectedOrgId && selectedOrgId !== "other"
      ? orgs.find((org) => String(org.id) === String(selectedOrgId))
      : null;
  const availableSites = selectedOrg?.sites || [];
  const orgsEmpty = !orgsLoading && (!orgs || orgs.length === 0);
  const siteSelectDisabled = !selectedOrg || !availableSites.length;
  const showSiteNameField = siteSelectDisabled || siteSelection === "new";

  useEffect(() => {
    let active = true;

    async function loadOrganizations() {
      setOrgsLoading(true);
      setOrgsError("");
      try {
        const res = await fetch("/api/organizations");
        const data = await res.json();

        if (!res.ok || !data?.success) {
          throw new Error(data?.message || "Unable to load organizations");
        }
        if (!active) return;
        setOrgs(data.data || []);
      } catch (err) {
        if (!active) return;
        setOrgsError(err.message || "Failed to load organizations");
      } finally {
        if (active) {
          setOrgsLoading(false);
        }
      }
    }

    loadOrganizations();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setSiteSelection("");
    setSiteNameNew("");
  }, [selectedOrgId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const trimmedOrg = orgNameOther.trim();
    const trimmedSite = siteNameNew.trim();
    const isNewOrg = !selectedOrgId || selectedOrgId === "other";
    const isNewSite = showSiteNameField;

    if (!form.email || !form.password) {
      setError("Email and password are required");
      return;
    }
    if (isNewOrg && !trimmedOrg) {
      setError("Add an organization name or pick one from the list.");
      return;
    }
    if (!isNewOrg && !selectedOrgId) {
      setError("Select an organization.");
      return;
    }
    if (isNewSite && !trimmedSite) {
      setError("Add a site name for this organization.");
      return;
    }
    if (!isNewSite && !siteSelection) {
      setError("Select a site for this organization.");
      return;
    }

    setLoading(true);

    try {
      const body = {
        email: form.email,
        password: form.password,
      };

      if (form.annual_visitors) {
        body.annual_visitors = Number(form.annual_visitors);
      }
      if (isNewOrg) {
        body.org_name = trimmedOrg;
      } else {
        body.org_id = Number(selectedOrgId);
      }
      if (isNewSite) {
        body.site_name = trimmedSite;
      } else {
        body.site_id = Number(siteSelection);
      }

      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "Unable to sign up");
      }

      localStorage.setItem("epocheye_token", data.token);
      localStorage.setItem("epocheye_user", JSON.stringify(data.user));
      if (data?.user?.org_id) {
        localStorage.setItem("epocheye_org_id", String(data.user.org_id));
      }
      if (data?.site?.id) {
        localStorage.setItem("epocheye_site_id", String(data.site.id));
      }

      const nextPath = data?.site?.id ? `/dashboard/analytics?siteId=${data.site.id}` : "/dashboard/analytics";
      router.push(nextPath);
    } catch (err) {
      setError(err.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-linear-to-br from-black via-neutral-950 to-black text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_25%_30%,rgba(196,247,60,0.06),transparent_28%),radial-gradient(circle_at_75%_15%,rgba(120,119,198,0.08),transparent_32%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),transparent_32%),linear-gradient(225deg,rgba(255,255,255,0.05),transparent_38%)]" />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-5xl items-center justify-center px-4 py-12">
        <div className="grid w-full gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-linear-to-b from-white/10 via-white/5 to-black/40 p-10 shadow-[0_30px_120px_rgba(0,0,0,0.45)] backdrop-blur-xl">
            <div className="pointer-events-none absolute -left-32 -top-32 size-64 rounded-full bg-emerald-500/15 blur-3xl" />
            <div className="pointer-events-none absolute -right-24 -bottom-24 size-64 rounded-full bg-indigo-400/15 blur-3xl" />
            <div className="pointer-events-none absolute inset-x-6 top-6 h-12 rounded-2xl border border-white/10" />

            <div className="flex items-center gap-3 text-sm text-emerald-200">
              <Landmark className="size-5" /> Create ASI / Tourism Operator Account
            </div>
            <h1 className="mt-4 text-3xl font-semibold text-white">Join the secure portal</h1>
            <p className="mt-2 text-sm text-zinc-400">
              Provision access for site managers, command center staff, and heritage partners.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <label className="block space-y-2 text-sm">
                <span className="text-zinc-300">Work email</span>
                <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/40 px-4 py-3 focus-within:border-emerald-400/60">
                  <Mail className="size-5 text-emerald-300" />
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                    className="w-full bg-transparent text-white outline-none placeholder:text-zinc-500"
                    placeholder="name@asi.gov.in"
                    required
                  />
                </div>
              </label>

              <label className="block space-y-2 text-sm">
                <span className="text-zinc-300">Create password</span>
                <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/40 px-4 py-3 focus-within:border-emerald-400/60">
                  <KeyRound className="size-5 text-emerald-300" />
                  <input
                    type="password"
                    name="password"
                    value={form.password}
                    onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                    className="w-full bg-transparent text-white outline-none placeholder:text-zinc-500"
                    placeholder="••••••"
                    required
                  />
                </div>
              </label>

              <label className="block space-y-2 text-sm">
                <span className="text-zinc-300">Organization</span>
                <div className="rounded-xl border border-white/10 bg-black/40 p-3">
                  <div className="flex items-center gap-3 rounded-lg border border-white/5 bg-black/20 px-4 py-3 focus-within:border-emerald-400/60">
                    <ShieldPlus className="size-5 text-emerald-300" />
                    <select
                      value={selectedOrgId}
                      onChange={(e) => {
                        setSelectedOrgId(e.target.value);
                        if (e.target.value !== "other") {
                          setOrgNameOther("");
                        }
                      }}
                      className="w-full bg-transparent text-white outline-none placeholder:text-zinc-500"
                    >
                      <option value="" disabled className="bg-black text-white">Select organization from database</option>
                      {orgs.map((org) => (
                        <option key={org.id} value={org.id} className="bg-black text-white">
                          {org.name}
                        </option>
                      ))}
                      <option value="other" className="bg-black text-white">Other (add manually)</option>
                    </select>
                  </div>
                  {orgsLoading && (
                    <p className="px-1 pt-2 text-xs text-zinc-400">Loading organizations...</p>
                  )}
                  {orgsError && (
                    <p className="px-1 pt-2 text-xs text-red-300">{orgsError}</p>
                  )}
                  {orgsEmpty && !orgsError && !orgsLoading && (
                    <p className="px-1 pt-2 text-xs text-zinc-400">No organizations in the database yet. Add yours below.</p>
                  )}
                  {(selectedOrgId === "other" || !selectedOrgId || orgsEmpty) && (
                    <div className="mt-3 flex items-center gap-3 rounded-lg border border-white/10 bg-black/40 px-4 py-3 focus-within:border-emerald-400/60">
                      <ShieldPlus className="size-5 text-emerald-300" />
                      <input
                        type="text"
                        name="org_name"
                        value={orgNameOther}
                        onChange={(e) => setOrgNameOther(e.target.value)}
                        className="w-full bg-transparent text-white outline-none placeholder:text-zinc-500"
                        placeholder="Type a new organization name"
                      />
                    </div>
                  )}
                </div>
              </label>

              <label className="block space-y-2 text-sm">
                <span className="text-zinc-300">Site</span>
                <div className="rounded-xl border border-white/10 bg-black/40 p-3">
                  <div className="flex items-center gap-3 rounded-lg border border-white/5 bg-black/20 px-4 py-3 focus-within:border-emerald-400/60">
                    <ShieldPlus className="size-5 text-emerald-300" />
                    <select
                      value={siteSelectDisabled ? "" : siteSelection}
                      onChange={(e) => setSiteSelection(e.target.value)}
                      disabled={siteSelectDisabled}
                      className="w-full bg-transparent text-white outline-none placeholder:text-zinc-500 disabled:text-zinc-600"
                    >
                      <option value="" disabled className="bg-black text-white">Select a site</option>
                      {availableSites.map((site) => (
                        <option key={site.id} value={site.id} className="bg-black text-white">
                          {site.name}
                        </option>
                      ))}
                      <option value="new" className="bg-black text-white">Create a new site</option>
                    </select>
                  </div>
                  {selectedOrg && siteSelectDisabled && (
                    <p className="px-1 pt-2 text-xs text-zinc-400">No sites found for this organization. Add one below.</p>
                  )}
                  {!selectedOrg && !orgsLoading && (
                    <p className="px-1 pt-2 text-xs text-zinc-400">Select an organization to see its sites.</p>
                  )}
                  {showSiteNameField && (
                    <div className="mt-3 flex items-center gap-3 rounded-lg border border-white/10 bg-black/40 px-4 py-3 focus-within:border-emerald-400/60">
                      <ShieldPlus className="size-5 text-emerald-300" />
                      <input
                        type="text"
                        name="site_name"
                        value={siteNameNew}
                        onChange={(e) => setSiteNameNew(e.target.value)}
                        className="w-full bg-transparent text-white outline-none placeholder:text-zinc-500"
                        placeholder="Add a new site for this organization"
                      />
                    </div>
                  )}
                </div>
              </label>

              <label className="block space-y-2 text-sm">
                <span className="text-zinc-300">Annual visitors (optional)</span>
                <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/40 px-4 py-3 focus-within:border-emerald-400/60">
                  <ShieldPlus className="size-5 text-emerald-300" />
                  <input
                    type="number"
                    min="0"
                    name="annual_visitors"
                    value={form.annual_visitors}
                    onChange={(e) => setForm((prev) => ({ ...prev, annual_visitors: e.target.value }))}
                    className="w-full bg-transparent text-white outline-none placeholder:text-zinc-500"
                    placeholder="500000"
                  />
                </div>
              </label>

              <label className="block space-y-2 text-sm">
                <span className="text-zinc-300">Referral code (optional)</span>
                <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/40 px-4 py-3 focus-within:border-emerald-400/60">
                  <UserPlus className="size-5 text-emerald-300" />
                  <input
                    type="text"
                    name="referral"
                    className="w-full bg-transparent text-white outline-none placeholder:text-zinc-500"
                    placeholder="ASI-PILOT-2025"
                  />
                </div>
              </label>

              <div className="flex items-center justify-between text-sm text-zinc-400">
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-white/20 bg-white/10" />
                  I agree to the terms for operators
                </label>
                <Link href="/login" className="text-emerald-300 hover:text-emerald-200">Already have access?</Link>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="group flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 text-black font-semibold shadow-[0_12px_40px_rgba(52,211,153,0.35)] transition hover:bg-emerald-300 disabled:opacity-60 disabled:cursor-not-allowed">
                {loading ? "Creating account..." : "Create account"}
                <ArrowRight className="size-4 transition group-hover:translate-x-1" />
              </button>

              {error && (
                <div className="rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-100">
                  {error}
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>Designed for Archaeological Survey of India & partners.</span>
                <span className="flex items-center gap-1 text-emerald-200"><Sparkles className="size-4" />Beta</span>
              </div>
            </form>
          </div>

          <div className="relative flex flex-col justify-center gap-6 rounded-3xl border border-white/10 bg-linear-to-b from-white/5 via-white/5 to-black/60 p-8 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl">
            <div className="pointer-events-none absolute -top-12 right-10 h-28 w-28 rounded-full bg-emerald-400/25 blur-3xl" />
            <div className="flex items-center gap-3 text-zinc-300">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200">
                <UserPlus className="size-6" />
              </div>
              <div>
                <p className="text-sm text-emerald-200">Fast-track approvals</p>
                <p className="text-lg font-semibold text-white">Under 24 hours</p>
                <p className="text-sm text-zinc-400">Operator verification SLA</p>
              </div>
            </div>

            <div className="space-y-3 text-sm text-zinc-200">
              <p className="text-lg font-semibold text-white">Purpose-built for ASI</p>
              <p className="text-zinc-400">
                Add zones, staff rosters, and visitor thresholds once live. The UI here stays mock-friendly until your backend is ready.
              </p>
              <ul className="space-y-2 text-zinc-300">
                <li className="flex items-center gap-2"><ShieldPlus className="size-4 text-emerald-300" /> Role-based access for field teams</li>
                <li className="flex items-center gap-2"><ShieldPlus className="size-4 text-emerald-300" /> Regional collections under one org</li>
                <li className="flex items-center gap-2"><ShieldPlus className="size-4 text-emerald-300" /> Ready for SSO / MFA integration</li>
              </ul>
            </div>

            <div className="flex flex-col gap-3">
              <Link href="/login" className="group inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:border-emerald-300/60">
                Back to login
                <ArrowRight className="size-4 transition group-hover:translate-x-1" />
              </Link>
              <Link href="/" className="text-center text-xs text-zinc-400 underline decoration-dotted decoration-emerald-300/70 underline-offset-4">
                Back to Epocheye home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
