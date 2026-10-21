"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

// The banner body (and the motion library it imports) loads only on pages that show it.
// /virtual and /journeys have their own chrome and copy rules, so they never load it.
const AnnouncementBannerBody = dynamic(() => import("./AnnouncementBannerBody"), { ssr: false });

function isStandalonePage(pathname) {
  if (pathname?.startsWith("/virtual") || pathname?.startsWith("/journeys")) return true;
  return typeof window !== "undefined" && window.location.hostname.startsWith("virtual.");
}

export default function AnnouncementBanner() {
  const pathname = usePathname();
  if (isStandalonePage(pathname)) return null;
  return <AnnouncementBannerBody />;
}
