import {
  Geist,
  Geist_Mono,
  Montserrat_Alternates,
  Instrument_Sans,
  Instrument_Serif,
} from "next/font/google";
import "./globals.css";

const getMetadataBase = () => {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (!raw) return new URL("http://localhost:3000");
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
  metadataBase: getMetadataBase(),
  title: "Epocheye - Historical Intelligence for the Physical World",
  description:
    "See historical monuments in their original glory through your smartphone using Augmented Reality",
  keywords:
    "Historical Intelligence for the Physical World, AR heritage tourism, historical site AR app, UNESCO World Heritage AR, India heritage tourism, historical reconstruction AR, augmented reality monuments, cultural heritage AR experience, virtual heritage tours, historical landmarks AR",
  openGraph: {
    title: "Epocheye - Bringing the Experience to Heritage Tourism",
    description:
      "See historical monuments in their original glory through your smartphone using Augmented Reality",
    type: "website",
    images: [
      {
        url: "/1.png",
        width: 1200,
        height: 630,
        alt: "Epocheye heritage tourism experience",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Epocheye - Bringing the Experience to Heritage Tourism",
    description:
      "See historical monuments in their original glory through your smartphone using Augmented Reality",
    images: ["/1.png"],
  },
  icons: {
    icon: [
      { url: "/logo-black.png", media: "(prefers-color-scheme: light)" },
      // { url: "/logo-white.png", media: "(prefers-color-scheme: dark)" },
    ],
  },
};

import Script from "next/script";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* Preconnect to external domains for faster loading */}
        <link rel="preconnect" href="https://tally.so" />
        <link rel="dns-prefetch" href="https://tally.so" />
        {/* Preload critical heritage images for PowerStatement section */}
        <link rel="preload" href="/img1.webp" as="image" type="image/webp" />
        <link rel="preload" href="/img2.webp" as="image" type="image/webp" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${montserratAlternates.variable} ${instrumentSans.variable} ${instrumentSerif.variable} antialiased`}
      >
        {children}
        {/* Load Tally script with strategy for better performance */}
        <Script 
          src="https://tally.so/widgets/embed.js" 
          strategy="lazyOnload"
        />
      </body>
    </html>
  );
}
