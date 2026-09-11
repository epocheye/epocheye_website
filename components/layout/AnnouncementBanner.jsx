"use client";

import { startTransition, useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";

const DISMISS_KEY = "announcement-dismissed:epocheye-cst-mou";
const POST_HREF = "/blog/epocheye-caribbean-steelpan-tours-mou";

export default function AnnouncementBanner() {
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    startTransition(() => {
      try {
        if (localStorage.getItem(DISMISS_KEY) !== "1") {
          setVisible(true);
        }
      } catch {
        setVisible(true);
      }
      setReady(true);
    });
  }, []);

  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // localStorage unavailable — dismissal just won't persist
    }
  };

  if (!ready) return null;

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-[60] w-full border-b border-white/10 bg-[#0a0a0a]"
        >
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5 sm:px-6">
            <span
              className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: "#D4AF37" }}
              aria-hidden="true"
            />
            <p className="font-instrument-sans flex-1 text-[11px] leading-snug text-white/70 sm:text-xs">
              We&rsquo;ve signed an MoU with Caribbean SteelPan Tours (Jamaica) to pilot live
              cultural AR experiences.{" "}
              <Link
                href={POST_HREF}
                className="font-semibold text-white underline decoration-white/30 hover:decoration-white"
              >
                Read the announcement →
              </Link>
            </p>
            <button
              type="button"
              onClick={dismiss}
              aria-label="Dismiss announcement"
              className="shrink-0 text-white/40 transition-colors hover:text-white/80"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path
                  d="M1 1L13 13M13 1L1 13"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
