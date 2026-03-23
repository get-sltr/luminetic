import type { Metadata } from "next";
import { Orbitron, Outfit } from "next/font/google";
import Script from "next/script";
import AmbientHud from "@/components/AmbientHud";
import "./globals.css";

const orbitron = Orbitron({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-orbitron",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Luminetic — AI App Store Submission Intelligence",
    template: "%s | Luminetic",
  },
  description:
    "Upload your .ipa and get AI-powered App Store review analysis. Three AI models scan your code, check Apple guidelines, and generate Maestro & Detox tests. Pass App Store review on the first try.",
  metadataBase: new URL("https://luminetic.io"),
  icons: {
    icon: "/favicon.svg",
  },
  keywords: [
    "app store review",
    "app store ai",
    "app store submission",
    "app store rejection",
    "app store guidelines",
    "app store code check",
    "code check ai",
    "ios app review",
    "ios app testing",
    "app store optimization",
    "ipa analysis",
    "ipa testing",
    "app store pre-flight",
    "app review automation",
    "apple app review",
    "apple guidelines checker",
    "maestro testing",
    "detox testing",
    "mobile app testing ai",
    "app submission tool",
    "ai code review",
    "ai app analysis",
    "app store readiness",
    "ios submission checklist",
    "app store compliance",
  ],
  openGraph: {
    title: "Luminetic — AI App Store Submission Intelligence",
    description:
      "Upload your .ipa. Three AI models analyze your code against Apple's 114 review guidelines. Get a readiness score, action plan, and auto-generated test suite.",
    type: "website",
    siteName: "Luminetic",
    url: "https://luminetic.io",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Luminetic — AI App Store Submission Intelligence",
    description:
      "Upload your .ipa. Three AI models analyze your code against Apple's 114 review guidelines. Pass review on the first try.",
    creator: "@luminetic",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "https://luminetic.io",
  },
  category: "technology",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Luminetic",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Web",
  url: "https://luminetic.io",
  description:
    "AI-powered App Store submission intelligence. Upload your .ipa, get code analysis from 3 AI models, automated testing with Maestro & Detox, and a readiness score against Apple's 114 review guidelines.",
  offers: [
    {
      "@type": "Offer",
      name: "Starter",
      price: "15.00",
      priceCurrency: "USD",
      description: "1 scan with dual-model AI analysis",
    },
    {
      "@type": "Offer",
      name: "Pro",
      price: "40.00",
      priceCurrency: "USD",
      description: "3 scans with Maestro & Detox test generation",
    },
    {
      "@type": "Offer",
      name: "Agency",
      price: "119.00",
      priceCurrency: "USD",
      description: "10 scans with multi-app support and priority queue",
    },
  ],
  creator: {
    "@type": "Organization",
    name: "SLTR Digital LLC",
    url: "https://luminetic.io",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <Script
          src="https://cdn.consentmanager.net/delivery/autoblocking/f2cd906b925a9.js"
          data-cmp-ab="1"
          data-cmp-host="b.delivery.consentmanager.net"
          data-cmp-cdn="cdn.consentmanager.net"
          data-cmp-codesrc="16"
          strategy="beforeInteractive"
        />
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-Z5G4M2RXHK"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-Z5G4M2RXHK');
          `}
        </Script>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`${orbitron.variable} ${outfit.variable} font-outfit antialiased`}>
        <AmbientHud />
        <div className="relative z-10 min-h-screen">{children}</div>
      </body>
    </html>
  );
}
