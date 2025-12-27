"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Landmark, Lock, Mail, ShieldCheck, Sparkles } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", remember: true });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, password: form.password }),
      });

      const data = await res.json();

      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "Unable to sign in");
      }

      if (form.remember) {
        localStorage.setItem("epocheye_token", data.token);
        localStorage.setItem("epocheye_user", JSON.stringify(data.user));
      }

      router.push("/dashboard/analytics");
    } catch (err) {
      setError(err.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-linear-to-br from-black via-neutral-950 to-black text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(196,247,60,0.06),transparent_30%),radial-gradient(circle_at_80%_10%,rgba(120,119,198,0.08),transparent_30%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.06),transparent_30%),linear-gradient(240deg,rgba(255,255,255,0.05),transparent_35%)]" />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-5xl items-center justify-center px-4 py-12">
        <div className="grid w-full gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-linear-to-b from-white/10 via-white/5 to-black/40 p-10 shadow-[0_30px_120px_rgba(0,0,0,0.45)] backdrop-blur-xl">
            <div className="pointer-events-none absolute -left-32 -top-32 size-64 rounded-full bg-emerald-500/15 blur-3xl" />
            <div className="pointer-events-none absolute -right-24 -bottom-24 size-64 rounded-full bg-amber-400/15 blur-3xl" />
            <div className="pointer-events-none absolute inset-x-6 top-6 h-12 rounded-2xl border border-white/10" />

            <div className="flex items-center gap-3 text-sm text-emerald-200">
              <Landmark className="size-5" /> Tourism Operator / ASI Portal
            </div>
            <h1 className="mt-4 text-3xl font-semibold text-white">Secure Login</h1>
            <p className="mt-2 text-sm text-zinc-400">
              Access real-time heritage operations, visitor analytics, and staff controls.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <label className="block space-y-2 text-sm">
                <span className="text-zinc-300">Email address</span>
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
                <span className="text-zinc-300">Password</span>
                <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/40 px-4 py-3 focus-within:border-emerald-400/60">
                  <Lock className="size-5 text-emerald-300" />
                  <input
                    type="password"
                    name="password"
                    value={form.password}
                    onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                    className="w-full bg-transparent text-white outline-none placeholder:text-zinc-500"
                    placeholder="••••"
                    required
                  />
                </div>
              </label>

              <div className="flex items-center justify-between text-sm text-zinc-400">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.remember}
                    onChange={(e) => setForm((prev) => ({ ...prev, remember: e.target.checked }))}
                    className="h-4 w-4 rounded border-white/20 bg-white/10"
                  />
                  Keep me signed in (secure devices)
                </label>
                <Link href="#" className="text-emerald-300 hover:text-emerald-200">Need help?</Link>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="group flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 text-black font-semibold shadow-[0_12px_40px_rgba(52,211,153,0.35)] transition hover:bg-emerald-300 disabled:opacity-60 disabled:cursor-not-allowed">
                {loading ? "Signing in..." : "Log in"}
                <ArrowRight className="size-4 transition group-hover:translate-x-1" />
              </button>

              {error && (
                <div className="rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-100">
                  {error}
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>Trusted access for ASI & tourism partners.</span>
                <span className="flex items-center gap-1 text-emerald-200"><Sparkles className="size-4" />Live beta</span>
              </div>
            </form>
          </div>

          <div className="relative flex flex-col justify-center gap-6 rounded-3xl border border-white/10 bg-linear-to-b from-white/5 via-white/5 to-black/60 p-8 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl">
            <div className="pointer-events-none absolute -top-14 right-10 h-28 w-28 rounded-full bg-emerald-400/20 blur-3xl" />
            <div className="flex items-center gap-3 text-zinc-300">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200">
                <ShieldCheck className="size-6" />
              </div>
              <div>
                <p className="text-sm text-emerald-200">Secure access</p>
                <p className="text-lg font-semibold text-white">JWT-protected dashboards</p>
                <p className="text-sm text-zinc-400">Connects to Supabase-backed auth</p>
              </div>
            </div>

            <div className="space-y-3 text-sm text-zinc-200">
              <p className="text-lg font-semibold text-white">Single portal for operators</p>
              <p className="text-zinc-400">
                Streamlined access for Archaeological Survey of India teams, tourism boards, and site operators.
                Switch to sign-up if you need a fresh operator profile.
              </p>
              <ul className="space-y-2 text-zinc-300">
                <li className="flex items-center gap-2"><ShieldCheck className="size-4 text-emerald-300" /> SSO-ready guardrails</li>
                <li className="flex items-center gap-2"><ShieldCheck className="size-4 text-emerald-300" /> Device-level trust signals</li>
                <li className="flex items-center gap-2"><ShieldCheck className="size-4 text-emerald-300" /> Encrypted session storage</li>
              </ul>
            </div>

            <div className="flex flex-col gap-3">
              <Link href="/signup" className="group inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:border-emerald-300/60">
                Create operator account
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
