import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-heading",
});

export const metadata: Metadata = {
  title: "Luminetic - Ship reviewer-ready apps to the App Store",
  description:
    "AI-powered App Store submission readiness. Paste your review feedback, get an action plan in 60 seconds. Meet Apple's guidelines before you submit.",
  metadataBase: new URL("https://luminetic.io"),
  icons: {
    icon: "/favicon.svg",
  },
  openGraph: {
    title: "Luminetic - Ship reviewer-ready apps to the App Store",
    description:
      "AI-powered App Store submission readiness. Paste your review feedback, get an action plan in 60 seconds.",
    type: "website",
    siteName: "Luminetic",
  },
  twitter: {
    card: "summary_large_image",
    title: "Luminetic - Ship reviewer-ready apps to the App Store",
    description:
      "AI-powered App Store submission readiness. Paste your review feedback, get an action plan in 60 seconds.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${spaceGrotesk.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
