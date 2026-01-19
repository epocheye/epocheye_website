import { Geist, Geist_Mono, Montserrat_Alternates } from "next/font/google";
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

export const metadata = {
  metadataBase: getMetadataBase(),
  title: "Epocheye - Turn Your Phone Into an AR Time Machine | Heritage Tourism Reimagined",
  description:
    "Experience India's UNESCO World Heritage Sites through AR time travel. Point your phone and watch history unfold. 10 destinations launching March 2026. Join 5,000+ early adopters.",
  keywords:
    "AR heritage tourism, historical site AR app, UNESCO World Heritage AR, India heritage tourism, time travel app, historical reconstruction AR, smart tourism India",
  openGraph: {
    title: "Epocheye - AR Time Travel for Heritage Sites",
    description:
      "See historical monuments in their original glory through your smartphone. Launching March 2026 with 10 UNESCO sites in India.",
    type: "website",
    images: [
      {
        url: "/1.png",
        width: 1200,
        height: 630,
        alt: "Epocheye AR time travel demo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Epocheye - AR Time Travel for Heritage Sites",
    description:
      "See historical monuments in their original glory through your smartphone. Launching March 2026 with 10 UNESCO sites in India.",
    images: ["/1.png"],
  },
  icons: {
    icon: [
      { url: "/logo-black.png", media: "(prefers-color-scheme: light)" },
      { url: "/logo-white.png", media: "(prefers-color-scheme: dark)" },
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
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${montserratAlternates.variable} antialiased`}
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
