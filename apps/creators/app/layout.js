import { ClerkProvider } from "@clerk/nextjs";
import {
  Geist,
  Geist_Mono,
  Instrument_Sans,
  Instrument_Serif,
  Montserrat_Alternates,
} from "next/font/google";
import { Analytics } from "@vercel/analytics/next";

import "./globals.css";
import { CREATORS_URL, LEGAL_NAME, MAIN_SITE_URL, SOCIAL_PROFILES } from "@/lib/site";

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

export const metadata = {
  metadataBase: new URL(CREATORS_URL),
  // Children without their own canonical inherit "/": only /terms is indexable besides
  // the landing page, and it sets its own. Private routes are noindex.
  alternates: { canonical: "/" },
  title: "Creator Program - Epocheye",
  description:
    "Join the Epocheye Creator Program. Make content, share your promo code, and earn commissions.",
  openGraph: {
    type: "website",
    siteName: "Epocheye",
    title: "Creator Program - Epocheye",
    description: "Turn your audience into income with Epocheye.",
    url: CREATORS_URL,
  },
  twitter: {
    card: "summary",
    site: "@epocheyeinc",
    title: "Creator Program - Epocheye",
    description: "Turn your audience into income with Epocheye.",
  },
};

// Same @id as the Organization on www.epocheye.com, so engines merge the two.
const ORGANIZATION = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${MAIN_SITE_URL}/#organization`,
  name: "Epocheye",
  legalName: LEGAL_NAME,
  url: MAIN_SITE_URL,
  sameAs: Object.values(SOCIAL_PROFILES),
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${montserratAlternates.variable} ${instrumentSans.variable} ${instrumentSerif.variable} antialiased`}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(ORGANIZATION).replace(/</g, "\\u003c"),
          }}
        />
        <ClerkProvider>
          {children}
          <Analytics />
        </ClerkProvider>
      </body>
    </html>
  );
}