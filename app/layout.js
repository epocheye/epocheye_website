import { Geist, Geist_Mono, Montserrat_Alternates } from "next/font/google";
import "./globals.css";

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
  title: "Epocheye | Turn Your Phone Into an AR Time Machine",
  description: "Experience heritage sites like never before. Point your camera, watch history rebuild in AR, and discover personalized stories. Join the waitlist.",
  keywords: "AR tourism, heritage travel app, interactive museum, augmented reality monuments, smart travel guide",
  openGraph: {
    title: "Epocheye | Turn Your Phone Into an AR Time Machine",
    description: "Experience heritage sites like never before. Point your camera, watch history rebuild in AR, and discover personalized stories. Join the waitlist.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Epocheye | Turn Your Phone Into an AR Time Machine",
    description: "Experience heritage sites like never before. Point your camera, watch history rebuild in AR, and discover personalized stories. Join the waitlist.",
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
