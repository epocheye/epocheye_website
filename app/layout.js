import {
  Geist,
  Geist_Mono,
  Montserrat_Alternates,
  Instrument_Sans,
  Instrument_Serif,
} from "next/font/google";
import "./globals.css";
import { ONE_LINER, SITE_NAME, SITE_URL } from "@/lib/site";
import { organization, website } from "@/lib/seo/schema";
import JsonLd from "@/components/seo/JsonLd";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

// Optimize font loading - only load weights actually used
const montserratAlternates = Montserrat_Alternates({
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal"],
  subsets: ["latin"],
  variable: "--font-montserrat-alternates",
  display: "swap",
  preload: true,
});

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-instrument-sans",
  preload: true,
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
  variable: "--font-instrument-serif",
  preload: true,
});

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0A0A0A' }
  ],
}

export const metadata = {
  // Hard-coded canonical host: www.epocheye.com (apex and epocheye.app redirect here).
  metadataBase: new URL(SITE_URL),
  title: "Epocheye (Epoch Eye): monuments as the record describes them",
  description: ONE_LINER,
  applicationName: SITE_NAME,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: "Epocheye (Epoch Eye): monuments as the record describes them",
    description: ONE_LINER,
  },
  twitter: {
    card: "summary_large_image",
    site: "@epocheyeinc",
    title: "Epocheye (Epoch Eye): monuments as the record describes them",
    description: ONE_LINER,
  },
  icons: {
    icon: [
      { url: "/logo-black.png", media: "(prefers-color-scheme: light)" },
      // { url: "/logo-white.png", media: "(prefers-color-scheme: dark)" },
    ],
  },
};

import Script from "next/script";
import AnnouncementBanner from "@/components/layout/AnnouncementBanner";
import { Analytics } from "@vercel/analytics/next";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${montserratAlternates.variable} ${instrumentSans.variable} ${instrumentSerif.variable} antialiased`}
      >
        <JsonLd data={[organization(), website()]} />
        <AnnouncementBanner />
        {children}
        <Script 
          src="https://tally.so/widgets/embed.js" 
          strategy="lazyOnload"
        />
        <Analytics />
      </body>
    </html>
  );
}
