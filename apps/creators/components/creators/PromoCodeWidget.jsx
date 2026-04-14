"use client";

import { useEffect, useState } from "react";
import { Copy, Check, ExternalLink, Download, QrCode } from "lucide-react";

const MAIN_SITE_ORIGIN = (process.env.NEXT_PUBLIC_MAIN_SITE_ORIGIN || "https://epocheye.com").replace(/\/$/, "");

export default function PromoCodeWidget({ code }) {
  const [codeCopied, setCodeCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [showQr, setShowQr] = useState(false);

  const referralLink = `${MAIN_SITE_ORIGIN}/r/${code}`;
  const referralLinkLabel = referralLink.replace(/^https?:\/\//, "");

  // Generate QR code on client side only
  useEffect(() => {
    if (!code) return;
    let cancelled = false;
    import("qrcode").then((QRCode) => {
      QRCode.toDataURL(referralLink, {
        width: 300,
        margin: 2,
        color: { dark: "#ffffff", light: "#0d0d0d" },
      }).then((url) => {
        if (!cancelled) setQrDataUrl(url);
      });
    });
    return () => { cancelled = true; };
  }, [code, referralLink]);

  const copy = async (text, setFn) => {
    await navigator.clipboard.writeText(text);
    setFn(true);
    setTimeout(() => setFn(false), 2000);
  };

  const downloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `epocheye-${code}-qr.png`;
    a.click();
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
          <ExternalLink className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate max-w-[180px] font-mono">
            {linkCopied ? "Link copied!" : referralLinkLabel}
          </span>
          {linkCopied ? (
            <Check className="w-3.5 h-3.5 text-green-400 shrink-0" />
          ) : (
            <Copy className="w-3.5 h-3.5 shrink-0" />
          )}
        </button>
      </div>

      {/* QR code section */}
      <div className="mt-5 pt-5 border-t border-white/5">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowQr((v) => !v)}
            className="flex items-center gap-2 text-xs text-white/40 hover:text-white/70 transition-colors duration-200">
            <QrCode className="w-3.5 h-3.5" />
            {showQr ? "Hide QR code" : "Show QR code"}
          </button>

          {showQr && qrDataUrl && (
            <button
              onClick={downloadQr}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-white/15 rounded-lg text-xs text-white/50 hover:text-white hover:border-white/30 transition-all duration-200">
              <Download className="w-3.5 h-3.5" />
              Download PNG
            </button>
          )}
        </div>

        {showQr && (
          <div className="mt-4 flex justify-start">
            {qrDataUrl ? (
              <div className="p-3 bg-[#0d0d0d] border border-white/10 rounded-xl inline-block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrDataUrl}
                  alt={`QR code for ${code}`}
                  width={160}
                  height={160}
                  className="rounded-lg"
                />
                <p className="text-[10px] text-white/25 text-center mt-2 font-mono">
                  {code}
                </p>
              </div>
            ) : (
              <div className="w-40 h-40 bg-white/5 rounded-xl animate-pulse" />
            )}
          </div>
        )}
      </div>

      <p className="text-xs text-white/25 mt-4">
        Share your code or link. Customers get a discount; you earn commission on every purchase.
      </p>
    </div>
  );
}
