import type { Metadata, Viewport } from "next";
import {
  Anton, Bebas_Neue, Bungee, Gotu, Hind, Kalam, Modak, Montserrat,
  Mukta, Noto_Sans_Devanagari, Orbitron, Oswald, Pacifico, Poppins,
  Press_Start_2P, Rajdhani, Rozha_One, Silkscreen, Teko, VT323, Yatra_One,
} from "next/font/google";
import "./globals.css";
import PwaManager from "@/components/pwa/PwaManager";
import { StudioSettingsProvider } from "@/context/StudioSettingsContext";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://pixleled-studio.vercel.app";

// Self-hosted at build time; the PWA caches these files for offline use.
const notoDevanagari = Noto_Sans_Devanagari({
  subsets: ["devanagari", "latin"], weight: ["400", "700", "900"], variable: "--font-noto-sans-devanagari", display: "swap",
});
const teko = Teko({ subsets: ["devanagari", "latin"], weight: ["400", "700"], variable: "--font-teko", display: "swap" });
const mukta = Mukta({ subsets: ["devanagari", "latin"], weight: ["400", "700"], variable: "--font-mukta", display: "swap" });
const hind = Hind({ subsets: ["devanagari", "latin"], weight: ["400", "700"], variable: "--font-hind", display: "swap" });
const poppins = Poppins({ subsets: ["devanagari", "latin"], weight: ["400", "700", "900"], variable: "--font-poppins", display: "swap" });
const gotu = Gotu({ subsets: ["devanagari", "latin"], weight: "400", variable: "--font-gotu", display: "swap" });
const rajdhani = Rajdhani({ subsets: ["devanagari", "latin"], weight: ["400", "700"], variable: "--font-rajdhani", display: "swap" });
const rozhaOne = Rozha_One({ subsets: ["latin"], weight: "400", variable: "--font-rozha-one", display: "swap" });
const yatraOne = Yatra_One({ subsets: ["latin"], weight: "400", variable: "--font-yatra-one", display: "swap" });
const kalam = Kalam({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-kalam", display: "swap" });
const modak = Modak({ subsets: ["latin"], weight: "400", variable: "--font-modak", display: "swap" });
const pacifico = Pacifico({ subsets: ["latin"], weight: "400", variable: "--font-pacifico", display: "swap" });
const pressStart = Press_Start_2P({ subsets: ["latin"], weight: "400", variable: "--font-press-start-2p", display: "swap" });
const silkscreen = Silkscreen({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-silkscreen", display: "swap" });
const vt323 = VT323({ subsets: ["latin"], weight: "400", variable: "--font-vt323", display: "swap" });
const orbitron = Orbitron({ subsets: ["latin"], weight: ["400", "700", "900"], variable: "--font-orbitron", display: "swap" });
const bungee = Bungee({ subsets: ["latin"], weight: "400", variable: "--font-bungee", display: "swap" });
const anton = Anton({ subsets: ["latin"], weight: "400", variable: "--font-anton", display: "swap" });
const bebasNeue = Bebas_Neue({ subsets: ["latin"], weight: "400", variable: "--font-bebas-neue", display: "swap" });
const oswald = Oswald({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-oswald", display: "swap" });
const montserrat = Montserrat({ subsets: ["latin"], weight: ["400", "700", "900"], variable: "--font-montserrat", display: "swap" });

const fontVariables = [
  notoDevanagari, teko, mukta, hind, poppins, gotu, rajdhani, rozhaOne, yatraOne, kalam,
  modak, pacifico, pressStart, silkscreen, vt323, orbitron, bungee, anton, bebasNeue,
  oswald, montserrat,
].map((font) => font.variable).join(" ");

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "PixleLED Studio by Jambh Electricals — Online Pixel LED Toran & Matrix Animator",
    template: "%s | PixleLED Studio by Jambh Electricals",
  },
  description:
    "Browser-based Pixel LED Toran & Matrix studio by Jambh Electricals. Stack math effects, text, characters and dots/lines, then export LEDEdit-ready uncompressed AVI files offline.",
  applicationName: "PixleLED Studio",
  authors: [{ name: "Jambh Electricals", url: "https://www.jambh.in" }],
  creator: "Jambh Electricals",
  publisher: "Jambh Electricals",
  category: "Design & Engineering Software",
  keywords: [
    "PixleLED Studio",
    "Jambh Electricals",
    "Pixel LED software online",
    "LEDEdit AVI export",
    "Pixel LED Toran design",
    "Hindi LED text",
    "Dots and lines LED patterns",
    "Character video LED animation",
    "LED matrix text scroller",
    "offline Pixel LED animator",
  ],
  alternates: { canonical: "/" },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    siteName: "PixleLED Studio by Jambh Electricals",
    title: "PixleLED Studio by Jambh Electricals — Pro Pixel LED Toran & Matrix Studio",
    description:
      "Create layered Pixel LED animations, Devanagari text, characters and dots/lines, and export uncompressed AVI for LEDEdit right in your browser.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "PixleLED Studio by Jambh Electricals Interface" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "PixleLED Studio by Jambh Electricals",
    description: "Browser-based Pixel LED Toran & Matrix Animator with math shaders, text, layers and offline AVI export.",
    images: ["/og-image.png"],
  },
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "PixleLED Studio" },
  formatDetection: { telephone: false, address: false, email: false },
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#09090b",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "PixleLED Studio",
  operatingSystem: "Any (Web / PWA)",
  applicationCategory: "MultimediaApplication",
  offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
  creator: { "@type": "Organization", name: "Jambh Electricals", url: "https://www.jambh.in" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={fontVariables}>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </head>
      <body>
        <StudioSettingsProvider>
          {children}
          <PwaManager />
        </StudioSettingsProvider>
      </body>
    </html>
  );
}
