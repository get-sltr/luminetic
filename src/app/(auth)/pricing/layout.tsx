import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing — AI App Store Review Analysis | Luminetic",
  description:
    "Scan your .ipa with 3 AI models for $15. Get code analysis, Apple guideline checks, Maestro & Detox test generation, and a readiness score. No subscription — credits never expire.",
  keywords: [
    "app store review pricing",
    "app store ai tool",
    "ios app testing cost",
    "app store submission tool pricing",
    "ipa analysis pricing",
    "mobile app testing pricing",
  ],
  openGraph: {
    title: "Pricing — AI App Store Review Analysis | Luminetic",
    description:
      "Scan your .ipa with 3 AI models starting at $15. Code analysis, guideline checks, and auto-generated tests.",
    url: "https://luminetic.io/pricing",
  },
  alternates: {
    canonical: "https://luminetic.io/pricing",
  },
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
