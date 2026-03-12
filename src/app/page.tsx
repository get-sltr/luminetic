"use client";

import { useState } from "react";
import { RejectionParser } from "@/components/RejectionParser";

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background effects */}
      <div className="grid-bg" />
      <div className="glow-orb glow-orb-1" />
      <div className="glow-orb glow-orb-2" />
      <div className="glow-orb glow-orb-3" />
      <div className="scan-line" />

      {/* Content */}
      <div className="relative z-10">

        {/* Nav */}
        <nav className="flex items-center justify-between max-w-[1100px] mx-auto px-6 py-7 md:px-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#ff2d78] shadow-[0_0_20px_rgba(255,45,120,0.5)]" />
            <span className="text-lg font-bold text-white tracking-tight" style={{ fontFamily: "var(--font-space)" }}>
              AppReady
            </span>
          </div>

          <div className="desktop-nav flex items-center gap-10">
            <a href="#features" className="nav-link">Features</a>
            <a href="#how" className="nav-link">How It Works</a>
            <a href="#pricing" className="nav-link">Pricing</a>
            <a href="#about" className="nav-link">About</a>
          </div>

          <a href="#try" className="desktop-cta btn-ghost">Try Free</a>

          <button
            className="mobile-menu-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2">
              {mobileMenuOpen ? (
                <path d="M18 6L6 18M6 6l12 12" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </nav>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div
            className="md:hidden animate-fade-in glass-card-static mx-6 mb-6 p-6 flex flex-col gap-4"
          >
            <a href="#features" className="nav-link text-base" onClick={() => setMobileMenuOpen(false)}>Features</a>
            <a href="#how" className="nav-link text-base" onClick={() => setMobileMenuOpen(false)}>How It Works</a>
            <a href="#pricing" className="nav-link text-base" onClick={() => setMobileMenuOpen(false)}>Pricing</a>
            <a href="#about" className="nav-link text-base" onClick={() => setMobileMenuOpen(false)}>About</a>
            <a href="#try" className="btn-primary mt-2 text-center" onClick={() => setMobileMenuOpen(false)}>Try Free</a>
          </div>
        )}

        {/* Hero */}
        <section className="flex flex-col items-center text-center max-w-[850px] mx-auto px-6 pt-24 pb-20 md:pt-32 md:pb-24">
          <div className="status-badge mb-10 animate-fade-up" style={{ animationDelay: "0.1s" }}>
            <span className="status-dot" />
            AI-Powered Submission Readiness
          </div>

          <h1
            className="text-[clamp(42px,8vw,80px)] font-bold leading-[1.02] tracking-[-0.04em] text-white mb-8 animate-fade-up"
            style={{ fontFamily: "var(--font-space)", animationDelay: "0.2s" }}
          >
            Ship your app
            <br />
            <span className="shimmer-text">reviewer-ready</span>
          </h1>

          <p
            className="text-[17px] leading-[1.7] text-white/35 max-w-[440px] mb-12 animate-fade-up"
            style={{ animationDelay: "0.3s" }}
          >
            Paste your review feedback. Get an action plan in 60 seconds.
            <br />
            No signup required.
          </p>

          <div className="flex gap-4 animate-fade-up" style={{ animationDelay: "0.4s" }}>
            <a href="#try" className="btn-primary">Get Started Free</a>
            <a href="#features" className="btn-ghost">Learn More</a>
          </div>
        </section>

        {/* Parser */}
        <section id="try" className="max-w-[660px] mx-auto px-6 pb-20">
          <RejectionParser />
        </section>

        {/* Social proof */}
        <p className="text-center text-[13px] text-white/15 pb-28">
          Helping developers meet App Store standards since day one.
        </p>

        {/* Features */}
        <section id="features" className="max-w-[1080px] mx-auto px-6 pb-32">
          <p className="section-label">Features</p>
          <h2 className="section-heading">Everything you need to ship</h2>
          <div className="features-grid">
            {[
              {
                num: "01",
                title: "Smart Analysis Engine",
                desc: "Upload your IPA or connect your repo. Scans Info.plist, entitlements, privacy manifests, IAP config, permissions, and screenshots.",
              },
              {
                num: "02",
                title: "AI Readiness Check",
                desc: "Powered by AI that understands Apple's Review Guidelines and Human Interface Guidelines inside and out.",
              },
              {
                num: "03",
                title: "Review Packet Generator",
                desc: "Auto-generates demo credentials, testing steps, and reviewer notes. Paste directly into App Store Connect.",
              },
              {
                num: "04",
                title: "Build Memory",
                desc: "Tracks every submission. When you upload Build 61, it knows what was flagged on Build 58 and checks if it's resolved.",
              },
              {
                num: "05",
                title: "Completeness Dashboard",
                desc: "Pre-flight checklist: privacy policy, account deletion, screenshots, IAP products, age rating, export compliance. Readiness score 0–100.",
              },
            ].map((f) => (
              <div key={f.num} className="glass-card p-8">
                <span className="feature-num">{f.num}</span>
                <h3
                  className="text-[16px] font-bold text-white mb-3 tracking-[-0.01em]"
                  style={{ fontFamily: "var(--font-space)" }}
                >
                  {f.title}
                </h3>
                <p className="text-[14px] leading-[1.6] text-white/25">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="max-w-[700px] mx-auto px-6 pb-32">
          <p className="section-label">How it works</p>
          <h2 className="section-heading">Three steps to submission</h2>
          <div className="flex flex-col gap-10">
            {[
              {
                step: "1",
                title: "Paste your review feedback",
                desc: "Copy the feedback from App Store Connect and drop it in.",
              },
              {
                step: "2",
                title: "Get your action plan",
                desc: "AI identifies the relevant guideline, explains what needs attention, and gives you step-by-step fixes.",
              },
              {
                step: "3",
                title: "Submit with confidence",
                desc: "Follow the plan, attach the auto-generated review packet, and ship.",
              },
            ].map((s) => (
              <div key={s.step} className="flex gap-6 items-start">
                <div className="step-number">{s.step}</div>
                <div>
                  <h3
                    className="text-[16px] font-bold text-white mb-2"
                    style={{ fontFamily: "var(--font-space)" }}
                  >
                    {s.title}
                  </h3>
                  <p className="text-[14px] leading-[1.6] text-white/30">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="max-w-[1000px] mx-auto px-6 pb-32">
          <p className="section-label">Pricing</p>
          <h2 className="section-heading">Start free, scale when ready</h2>
          <div className="pricing-grid">
            {[
              {
                name: "Free",
                price: "$0",
                period: "forever",
                desc: "For your first submission",
                features: ["1 scan/month", "Basic checklist", "URL health checks"],
                cta: "Get Started",
                highlight: false,
              },
              {
                name: "Indie",
                price: "$19",
                period: "/month",
                desc: "For active developers",
                features: ["5 scans/month", "AI Readiness Check", "Review Packet Generator", "Build history"],
                cta: "Start Indie",
                highlight: true,
              },
              {
                name: "Pro",
                price: "$49",
                period: "/month",
                desc: "For power users",
                features: ["Unlimited scans", "App Store Connect integration", "Team seats", "Priority analysis"],
                cta: "Start Pro",
                highlight: false,
              },
              {
                name: "Agency",
                price: "$149",
                period: "/month",
                desc: "For dev teams and agencies",
                features: ["Unlimited scans", "Multi-app support", "Client dashboards", "White-label packets", "API access"],
                cta: "Contact Us",
                highlight: false,
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={plan.highlight ? "glass-card-highlight p-8 flex flex-col" : "glass-card p-8 flex flex-col"}
              >
                <span
                  className="text-[12px] font-semibold tracking-[0.1em] uppercase mb-4"
                  style={{
                    fontFamily: "var(--font-space)",
                    color: plan.highlight ? "#ff2d78" : "rgba(255,255,255,0.4)",
                  }}
                >
                  {plan.name}
                </span>
                <div className="mb-2">
                  <span
                    className="text-[40px] font-bold text-white tracking-[-0.03em]"
                    style={{ fontFamily: "var(--font-space)" }}
                  >
                    {plan.price}
                  </span>
                  <span className="text-[14px] text-white/30 ml-1">{plan.period}</span>
                </div>
                <p className="text-[14px] text-white/25 mb-6">{plan.desc}</p>
                <ul className="list-none mb-8 grow">
                  {plan.features.map((feat) => (
                    <li key={feat} className="pricing-feature">{feat}</li>
                  ))}
                </ul>
                <a
                  href="#try"
                  className={plan.highlight ? "btn-primary text-center" : "btn-ghost text-center"}
                >
                  {plan.cta}
                </a>
              </div>
            ))}
          </div>
        </section>

        {/* About */}
        <section id="about" className="max-w-[600px] mx-auto px-6 pb-32 text-center">
          <p className="section-label">About</p>
          <h2 className="section-heading">Built for the ecosystem</h2>
          <p className="text-[15px] leading-[1.8] text-white/30 mb-4">
            App Store Review keeps the ecosystem safe and high-quality. AppReady helps you align with those standards before you submit — so the process is smooth for everyone.
          </p>
          <p className="text-[15px] leading-[1.8] text-white/30">
            We built an AI that understands Apple&apos;s guidelines inside and out, so you can ship complete, stable, reviewer-ready apps every time.
          </p>
        </section>

        {/* CTA */}
        <section className="max-w-[600px] mx-auto px-6 pb-32 text-center">
          <p
            className="text-[clamp(24px,4vw,36px)] font-bold text-white mb-6 tracking-[-0.03em]"
            style={{ fontFamily: "var(--font-space)" }}
          >
            Ready to submit with confidence?
          </p>
          <a href="#try" className="btn-primary">Try Free Now</a>
        </section>

        {/* Footer */}
        <footer className="text-center pb-12">
          <div className="flex justify-center gap-8 mb-6 text-[13px]">
            <a href="#features" className="nav-link">Features</a>
            <a href="#pricing" className="nav-link">Pricing</a>
            <a href="#about" className="nav-link">About</a>
          </div>
          <p className="text-[11px] text-white/10 tracking-[0.05em]">
            SLTR Digital LLC &middot; AppReady
          </p>
        </footer>
      </div>
    </div>
  );
}
