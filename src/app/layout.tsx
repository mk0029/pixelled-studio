import type { Metadata, Viewport } from "next";
import "./globals.css";
import PwaManager from "@/components/pwa/PwaManager";
import { StudioSettingsProvider } from "@/context/StudioSettingsContext";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://pixleled-studio.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "PixleLED Studio by Jambh Electricals — Online Pixel LED Toran & Matrix Animator",
    template: "%s | PixleLED Studio by Jambh Electricals",
  },
  description:
    "Free browser-based Pixel LED Toran & Matrix programming studio by Jambh Electricals. Design 100+ math & logical animations, multi-layer scrolling text, T-1000S / T-8000A / K-1000C / WLED controller wiring maps, and export .led, .bin & .avi files offline.",
  applicationName: "PixleLED Studio",
  authors: [{ name: "Jambh Electricals", url: "https://www.jambh.in" }],
  creator: "Jambh Electricals",
  publisher: "Jambh Electricals",
  category: "Design & Engineering Software",
  keywords: [
    "PixleLED Studio",
    "Jambh Electricals",
    "Pixel LED software online",
    "LEDEdit online alternative",
    "Pixel LED Toran design",
    "T-1000S animation maker",
    "T-8000A wiring layout",
    "K-1000C LED controller",
    "WS2811 matrix generator",
    "UCS1903 pixel pattern",
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
      "Create 100+ math & logical Pixel LED animations, custom multi-layer text marquees, and hardware-accurate T-1000S / T-8000A / WLED wiring exports right in your browser.",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "PixleLED Studio by Jambh Electricals Interface" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "PixleLED Studio by Jambh Electricals",
    description: "Browser-based Pixel LED Toran & Matrix Animator with 100+ math shaders, multi-layer text, and offline .led/.bin/.avi export.",
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
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
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
