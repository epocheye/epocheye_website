"use client";

import { useState } from "react";
import { Copy, Check, ExternalLink } from "lucide-react";

export default function PromoCodeWidget({ code }) {
  const [codeCopied, setCodeCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const referralLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/r/${code}`
      : `https://epocheye.app/r/${code}`;

  const copy = async (text, setFn) => {
    await navigator.clipboard.writeText(text);
    setFn(true);
    setTimeout(() => setFn(false), 2000);
  };

  if (!code) {
    return (
      <div className="bg-[#0d0d0d] border border-white/5 rounded-xl p-6 animate-pulse">
        <div className="h-3 w-24 bg-white/5 rounded mb-4" />
        <div className="h-8 w-48 bg-white/5 rounded" />
      </div>
    );
  }

  return (
    <div className="bg-[#0d0d0d] border border-white/5 rounded-xl p-6">
      <p className="text-xs font-medium text-white/35 uppercase tracking-widest mb-4">
        Your Promo Code
      </p>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        {/* Code display */}
        <div className="flex items-center gap-4 flex-1">
          <span className="text-3xl font-mono font-bold tracking-widest text-white">
            {code}
          </span>
          <button
            onClick={() => copy(code, setCodeCopied)}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-white/15 rounded-lg text-xs text-white/50 hover:text-white hover:border-white/30 transition-all duration-200"
            aria-label="Copy promo code">
            {codeCopied ? (
              <Check className="w-3.5 h-3.5 text-green-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            {codeCopied ? "Copied!" : "Copy code"}
          </button>
        </div>

        {/* Referral link */}
        <button
          onClick={() => copy(referralLink, setLinkCopied)}
          className="flex items-center gap-2 px-4 py-2 border border-white/10 rounded-lg text-xs text-white/40 hover:text-white/70 hover:border-white/25 transition-all duration-200 max-w-full overflow-hidden"
          aria-label="Copy referral link">
          <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="truncate max-w-[180px] font-mono">
            {linkCopied ? "Link copied!" : `epocheye.app/r/${code}`}
          </span>
          {linkCopied ? (
            <Check className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
          ) : (
            <Copy className="w-3.5 h-3.5 flex-shrink-0" />
          )}
        </button>
      </div>

      <p className="text-xs text-white/25 mt-4">
        Share your code or link. Customers get a discount; you earn commission on every signup.
      </p>
    </div>
  );
}
