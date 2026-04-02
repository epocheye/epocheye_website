"use client";

import { motion } from "motion/react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Instagram, Youtube, TrendingUp, DollarSign, BarChart2, Code2 } from "lucide-react";

const STEPS = [
  {
    number: "01",
    title: "Sign up",
    body: "Create your creator account in under two minutes. No approval needed.",
  },
  {
    number: "02",
    title: "Get your code",
    body: "Receive a unique promo code tied to your identity. Share it anywhere.",
  },
  {
    number: "03",
    title: "Earn commission",
    body: "Every Epocheye signup using your code earns you 5–20% of their subscription.",
  },
];

const EARNINGS_EXAMPLES = [
  { signups: "10", low: "$0.30", high: "$1.20" },
  { signups: "50", low: "$1.50", high: "$6.00" },
  { signups: "200", low: "$6.00", high: "$24.00" },
  { signups: "1,000", low: "$30", high: "$120" },
];

const PLATFORMS = [
  { icon: Instagram, label: "Instagram" },
  { icon: Youtube, label: "YouTube" },
  {
    icon: ({ className }) => (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.82a8.18 8.18 0 004.78 1.52V6.89a4.85 4.85 0 01-1.01-.2z" />
      </svg>
    ),
    label: "TikTok",
  },
  { icon: BarChart2, label: "Blog / Article" },
];

const FADE_UP = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

export default function CreatorsLandingPage() {
  return (
    <main className="bg-black min-h-screen font-montserrat text-white overflow-x-hidden">
      {/* ─── Navbar ────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 py-5 border-b border-white/5 bg-black/80 backdrop-blur-md">
        <Link href="/" className="text-lg font-bold tracking-wider text-white hover:text-white/80 transition-colors">
          Epocheye
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/creators/login"
            className="text-sm text-white/60 hover:text-white transition-colors px-4 py-2">
            Sign in
          </Link>
          <Link
            href="/creators/signup"
            className="text-sm font-semibold tracking-wider uppercase border border-white/25 text-white rounded-full px-5 py-2 hover:bg-white hover:text-black transition-all duration-300">
            Join Program
          </Link>
        </div>
      </nav>

      {/* ─── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 pt-24 pb-20 overflow-hidden">
        {/* Ambient glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden="true"
          style={{
            background:
              "radial-gradient(ellipse 70% 50% at 50% 40%, rgba(255,255,255,0.04) 0%, transparent 70%)",
          }}
        />

        <motion.div
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.15 } } }}
          className="relative z-10 max-w-4xl mx-auto">
          <motion.p
            variants={FADE_UP}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="text-xs font-semibold tracking-[0.25em] uppercase text-white/40 mb-6">
            Epocheye Creator Program
          </motion.p>

          <motion.h1
            variants={FADE_UP}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl leading-[1.05] tracking-tight">
            <span className="font-light text-white/90">Create content.</span>
            <br />
            <span className="font-bold text-white">Earn real money.</span>
          </motion.h1>

          <motion.p
            variants={FADE_UP}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="mt-8 text-lg md:text-xl text-white/50 max-w-xl mx-auto leading-relaxed">
            Promote Epocheye to your audience using your unique promo code. Every signup earns
            you a commission — no content restrictions, no approval required.
          </motion.p>

          <motion.div
            variants={FADE_UP}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="mt-12 flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/creators/signup"
              className="group flex items-center gap-3 px-8 py-4 border border-white/30 rounded-full text-sm font-semibold tracking-wider uppercase text-white hover:bg-white hover:text-black transition-all duration-400">
              Become a Creator
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
            </Link>
            <Link
              href="/creators/login"
              className="text-sm text-white/40 hover:text-white/70 transition-colors underline-offset-4 hover:underline">
              Already a creator? Sign in
            </Link>
          </motion.div>
        </motion.div>

        {/* Scroll line */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2">
          <div className="w-px h-12 bg-gradient-to-b from-transparent via-white/20 to-transparent" />
        </div>
      </section>

      {/* ─── How it works ──────────────────────────────────────────────────── */}
      <section className="py-32 px-6 md:px-12 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}>
          <p className="text-xs font-semibold tracking-[0.25em] uppercase text-white/30 mb-3">
            How it works
          </p>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-light leading-tight mb-20">
            Three steps to <span className="font-bold">start earning</span>
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-px bg-white/5">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.7, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="bg-black p-10 flex flex-col gap-6 hover:bg-white/[0.02] transition-colors duration-300">
              <span className="text-5xl font-bold text-white/8 leading-none">{step.number}</span>
              <div>
                <h3 className="text-xl font-semibold text-white mb-3">{step.title}</h3>
                <p className="text-white/50 leading-relaxed">{step.body}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ─── Earnings ──────────────────────────────────────────────────────── */}
      <section className="py-32 px-6 md:px-12 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="mb-16">
            <p className="text-xs font-semibold tracking-[0.25em] uppercase text-white/30 mb-3">
              Your potential
            </p>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-light leading-tight">
              Commission ranges <span className="font-bold">5% to 20%</span>
            </h2>
            <p className="mt-4 text-white/40 max-w-lg">
              Based on Epocheye&apos;s $2–4/month subscription. Bring more signups, unlock a
              higher commission tier.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-white/5">
            {EARNINGS_EXAMPLES.map((ex, i) => (
              <motion.div
                key={ex.signups}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.6, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                className="bg-black p-8 hover:bg-white/[0.02] transition-colors duration-300">
                <p className="text-3xl font-bold text-white mb-1">{ex.signups}</p>
                <p className="text-xs text-white/30 uppercase tracking-wider mb-4">signups</p>
                <p className="text-lg font-light text-white/70">
                  {ex.low}–{ex.high}
                </p>
                <p className="text-xs text-white/30 mt-1">per month</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Platform freedom ──────────────────────────────────────────────── */}
      <section className="py-32 px-6 md:px-12 border-t border-white/5">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}>
            <p className="text-xs font-semibold tracking-[0.25em] uppercase text-white/30 mb-3">
              No content rules
            </p>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-light leading-tight mb-6">
              Any platform.
              <br />
              <span className="font-bold">Any format.</span>
            </h2>
            <p className="text-white/50 leading-relaxed max-w-md">
              Instagram reels, YouTube reviews, TikTok tours, blog posts, Twitter threads — if it
              reaches an audience, it works. We track by promo code, not platform.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="grid grid-cols-2 gap-px bg-white/5">
            {PLATFORMS.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="bg-black p-8 flex flex-col items-start gap-3 hover:bg-white/[0.02] transition-colors duration-300">
                <Icon className="w-5 h-5 text-white/40" />
                <span className="text-sm font-medium text-white/70">{label}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── Dashboard preview ─────────────────────────────────────────────── */}
      <section className="py-32 px-6 md:px-12 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="mb-16 text-center">
            <p className="text-xs font-semibold tracking-[0.25em] uppercase text-white/30 mb-3">
              Your dashboard
            </p>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-light">
              Track every click, <span className="font-bold">every rupee</span>
            </h2>
          </motion.div>

          {/* Mock dashboard card */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
            className="rounded-2xl border border-white/8 bg-white/[0.02] overflow-hidden">
            {/* Mock top bar */}
            <div className="border-b border-white/5 px-8 py-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-white/20" />
                <span className="text-sm text-white/40 font-mono">epocheye.app/creators/dashboard</span>
              </div>
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-white/10" />
                <div className="w-3 h-3 rounded-full bg-white/10" />
                <div className="w-3 h-3 rounded-full bg-white/10" />
              </div>
            </div>

            {/* Mock stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/5 m-px">
              {[
                { label: "Total Clicks", value: "2,847" },
                { label: "Conversions", value: "194" },
                { label: "Lifetime Earnings", value: "$58.20" },
                { label: "Available Balance", value: "$23.40" },
              ].map((stat) => (
                <div key={stat.label} className="bg-[#080808] px-8 py-7">
                  <p className="text-xs text-white/30 uppercase tracking-wider mb-2">{stat.label}</p>
                  <p className="text-2xl font-semibold text-white">{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Mock promo code */}
            <div className="px-8 py-7 border-t border-white/5 flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="text-xs text-white/30 uppercase tracking-wider mb-2">Your promo code</p>
                <p className="text-2xl font-mono font-bold tracking-widest text-white">
                  SAMBIT2391
                </p>
              </div>
              <div className="flex items-center gap-2 px-5 py-2.5 border border-white/15 rounded-full text-sm text-white/50">
                Copy code
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── CTA ───────────────────────────────────────────────────────────── */}
      <section className="py-40 px-6 border-t border-white/5 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-2xl mx-auto">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-light leading-tight mb-8">
            Ready to <span className="font-bold">start earning?</span>
          </h2>
          <p className="text-white/40 mb-12 text-lg">
            Join the program, get your code, and go. It takes two minutes.
          </p>
          <Link
            href="/creators/signup"
            className="group inline-flex items-center gap-3 px-10 py-4 border border-white/30 rounded-full text-sm font-semibold tracking-wider uppercase text-white hover:bg-white hover:text-black transition-all duration-400">
            Get Started Free
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
          </Link>
        </motion.div>
      </section>

      {/* ─── Footer ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 px-6 md:px-12 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
        <Link href="/" className="text-white/40 text-sm hover:text-white/70 transition-colors">
          ← Back to Epocheye
        </Link>
        <p className="text-white/20 text-xs">© {new Date().getFullYear()} Epocheye. All rights reserved.</p>
        <div className="flex gap-6 text-sm text-white/30">
          <Link href="/creators/login" className="hover:text-white/60 transition-colors">Creator Login</Link>
          <Link href="/creators/signup" className="hover:text-white/60 transition-colors">Sign Up</Link>
        </div>
      </footer>
    </main>
  );
}
