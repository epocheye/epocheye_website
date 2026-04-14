import {
  Geist,
  Geist_Mono,
  Instrument_Sans,
  Instrument_Serif,
  Montserrat_Alternates,
} from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";

import "./globals.css";

const getMetadataBase = () => {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || "https://creators.epocheye.com";
  try {
    return new URL(raw);
  } catch {
    return new URL(`https://${raw}`);
  }
};

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
  metadataBase: getMetadataBase(),
  title: "Creator Program - Epocheye",
  description:
    "Join the Epocheye Creator Program. Make content, share your promo code, and earn commissions.",
  openGraph: {
    title: "Creator Program - Epocheye",
    description: "Turn your audience into income with Epocheye.",
    url: "https://creators.epocheye.com",
  },
};

const clerkPublishableKey =
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || process.env.CLERK_PUBLISHABLE_KEY;

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${montserratAlternates.variable} ${instrumentSans.variable} ${instrumentSerif.variable} antialiased`}
      >
        <ClerkProvider publishableKey={clerkPublishableKey}>{children}</ClerkProvider>
      </body>
    </html>
  );
}
