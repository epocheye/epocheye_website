import { Geist, Geist_Mono, Montserrat_Alternates } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const montserratAlternates = Montserrat_Alternates({
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-montserrat-alternates",
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

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <script async src="https://tally.so/widgets/embed.js"></script>
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${montserratAlternates.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
