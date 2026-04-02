"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Loader2, CheckCircle, Eye, EyeOff } from "lucide-react";
import { creatorFetch, getCreatorData } from "@/lib/creatorAuthService";

const API = process.env.NEXT_PUBLIC_CREATOR_API_URL || "http://localhost:3001";

const NICHES = [
  "Heritage & History",
  "Travel & Tourism",
  "Lifestyle",
  "Tech & Gadgets",
  "Culture & Art",
  "Food & Cuisine",
  "Photography",
  "Other",
];

export default function SettingsPage() {
  const stored = getCreatorData();
  const [profile, setProfile] = useState({
    name: stored?.name ?? "",
    instagram_url: stored?.instagram_url ?? "",
    youtube_url: stored?.youtube_url ?? "",
    tiktok_url: stored?.tiktok_url ?? "",
    twitter_url: stored?.twitter_url ?? "",
    niche: stored?.niche ?? "",
  });
  const [upiId, setUpiId] = useState(stored?.upi_id ?? "");
  const [pwForm, setPwForm] = useState({ current_password: "", new_password: "" });
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  const [profileLoading, setProfileLoading] = useState(false);
  const [upiLoading, setUpiLoading] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [profileMsg, setProfileMsg] = useState(null);
  const [upiMsg, setUpiMsg] = useState(null);
  const [pwMsg, setPwMsg] = useState(null);

  const set = (k) => (e) => setProfile((f) => ({ ...f, [k]: e.target.value }));

  const flash = (setFn, msg, isError = false) => {
    setFn({ text: msg, error: isError });
    setTimeout(() => setFn(null), 3000);
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    setProfileLoading(true);
    try {
      const res = await creatorFetch(`${API}/api/creator/me`, {
        method: "PUT",
        body: JSON.stringify(profile),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      // Update localStorage cache
      const current = JSON.parse(localStorage.getItem("creator_data") || "{}");
      localStorage.setItem("creator_data", JSON.stringify({ ...current, ...json.data }));
      flash(setProfileMsg, "Profile saved");
    } catch (err) {
      flash(setProfileMsg, err.message, true);
    } finally {
      setProfileLoading(false);
    }
  };

  const saveUpi = async (e) => {
    e.preventDefault();
    setUpiLoading(true);
    try {
      const res = await creatorFetch(`${API}/api/creator/me/payment`, {
        method: "PUT",
        body: JSON.stringify({ upi_id: upiId }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      const current = JSON.parse(localStorage.getItem("creator_data") || "{}");
      localStorage.setItem("creator_data", JSON.stringify({ ...current, upi_id: upiId }));
      flash(setUpiMsg, "UPI ID saved");
    } catch (err) {
      flash(setUpiMsg, err.message, true);
    } finally {
      setUpiLoading(false);
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    setPwLoading(true);
    try {
      const res = await creatorFetch(`${API}/api/creator/me/password`, {
        method: "PUT",
        body: JSON.stringify(pwForm),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setPwForm({ current_password: "", new_password: "" });
      flash(setPwMsg, "Password updated");
    } catch (err) {
      flash(setPwMsg, err.message, true);
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-2xl space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-white">Settings</h1>
        <p className="text-white/35 text-sm mt-1">Manage your profile, payment details, and password</p>
      </div>

      {/* Profile */}
      <Section title="Profile">
        <form onSubmit={saveProfile} className="space-y-4">
          <Field label="Full Name">
            <input
              type="text"
              value={profile.name}
              onChange={set("name")}
              className={inputCx}
            />
          </Field>
          <Field label="Instagram URL">
            <input
              type="url"
              value={profile.instagram_url}
              onChange={set("instagram_url")}
              placeholder="https://instagram.com/..."
              className={inputCx}
            />
          </Field>
          <Field label="YouTube URL">
            <input
              type="url"
              value={profile.youtube_url}
              onChange={set("youtube_url")}
              placeholder="https://youtube.com/@..."
              className={inputCx}
            />
          </Field>
          <Field label="TikTok URL">
            <input
              type="url"
              value={profile.tiktok_url}
              onChange={set("tiktok_url")}
              placeholder="https://tiktok.com/@..."
              className={inputCx}
            />
          </Field>
          <Field label="Twitter / X URL">
            <input
              type="url"
              value={profile.twitter_url}
              onChange={set("twitter_url")}
              placeholder="https://twitter.com/..."
              className={inputCx}
            />
          </Field>
          <Field label="Content Niche">
            <select
              value={profile.niche}
              onChange={set("niche")}
              className={`${inputCx} appearance-none`}>
              <option value="" className="bg-black">Select niche…</option>
              {NICHES.map((n) => (
                <option key={n} value={n} className="bg-black">{n}</option>
              ))}
            </select>
          </Field>

          <div className="flex items-center gap-4 pt-2">
            <SaveButton loading={profileLoading} />
            <Feedback msg={profileMsg} />
          </div>
        </form>
      </Section>

      {/* UPI / Payment */}
      <Section title="Payment Details">
        <p className="text-xs text-white/30 mb-4">
          Your UPI ID is used for Razorpay payouts. It will only be used when you request a withdrawal.
        </p>
        <form onSubmit={saveUpi} className="space-y-4">
          <Field label="UPI ID">
            <input
              type="text"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              placeholder="yourname@upi"
              className={inputCx}
            />
          </Field>
          <div className="flex items-center gap-4">
            <SaveButton loading={upiLoading} />
            <Feedback msg={upiMsg} />
          </div>
        </form>
      </Section>

      {/* Change password */}
      <Section title="Change Password">
        <form onSubmit={savePassword} className="space-y-4">
          <Field label="Current Password">
            <div className="relative">
              <input
                type={showCurrentPw ? "text" : "password"}
                value={pwForm.current_password}
                onChange={(e) => setPwForm((f) => ({ ...f, current_password: e.target.value }))}
                placeholder="••••••••"
                required
                className={`${inputCx} pr-11`}
              />
              <button
                type="button"
                onClick={() => setShowCurrentPw(!showCurrentPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/50">
                {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </Field>
          <Field label="New Password">
            <div className="relative">
              <input
                type={showNewPw ? "text" : "password"}
                value={pwForm.new_password}
                onChange={(e) => setPwForm((f) => ({ ...f, new_password: e.target.value }))}
                placeholder="Min. 8 characters"
                required
                minLength={8}
                className={`${inputCx} pr-11`}
              />
              <button
                type="button"
                onClick={() => setShowNewPw(!showNewPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/50">
                {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </Field>
          <div className="flex items-center gap-4">
            <SaveButton loading={pwLoading} label="Update Password" />
            <Feedback msg={pwMsg} />
          </div>
        </form>
      </Section>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="bg-[#0d0d0d] border border-white/5 rounded-xl p-6">
      <h2 className="text-sm font-semibold text-white mb-5">{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="space-y-2">
      <label className="block text-xs font-medium text-white/40 tracking-widest uppercase">{label}</label>
      {children}
    </div>
  );
}

function SaveButton({ loading, label = "Save Changes" }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="flex items-center gap-2 px-5 py-2.5 bg-white text-black text-sm font-semibold rounded-full hover:bg-white/90 transition-all disabled:opacity-50">
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
      {loading ? "Saving…" : label}
    </button>
  );
}

function Feedback({ msg }) {
  if (!msg) return null;
  return (
    <p className={`text-xs font-medium ${msg.error ? "text-red-400" : "text-green-400"}`}>
      {msg.text}
    </p>
  );
}

const inputCx =
  "w-full bg-white/[0.03] border border-white/8 rounded-xl py-3 px-4 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-white/20 transition-all duration-200";
