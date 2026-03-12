"use client";

import { useState } from "react";
import { RejectionParser } from "@/components/RejectionParser";

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="relative min-h-screen">
      {/* Ambient glows */}
      <div className="bg-glow-1" />
      <div className="bg-glow-2" />

      {/* Content */}
      <div className="relative z-10">

        {/* ── Nav ── */}
        <nav className="flex items-center justify-between max-w-[1200px] mx-auto px-8 py-8 md:px-12">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #7c3aed, #6d28d9)" }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="text-[18px] font-bold text-white tracking-tight" style={{ fontFamily: "var(--font-space)" }}>
              AppReady
            </span>
          </div>

          <div className="desktop-nav flex items-center gap-10">
            <a href="#features" className="nav-link">Features</a>
            <a href="#how" className="nav-link">How It Works</a>
            <a href="#pricing" className="nav-link">Pricing</a>
            <a href="#about" className="nav-link">About</a>
          </div>

          <a href="#try" className="desktop-cta btn-ghost" style={{ padding: "10px 24px", fontSize: 13 }}>
            Get Started
          </a>

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
          <div className="md:hidden animate-fade-in glass-card-static mx-6 mb-6 p-6 flex flex-col gap-4">
            <a href="#features" className="nav-link text-base" onClick={() => setMobileMenuOpen(false)}>Features</a>
            <a href="#how" className="nav-link text-base" onClick={() => setMobileMenuOpen(false)}>How It Works</a>
            <a href="#pricing" className="nav-link text-base" onClick={() => setMobileMenuOpen(false)}>Pricing</a>
            <a href="#about" className="nav-link text-base" onClick={() => setMobileMenuOpen(false)}>About</a>
            <a href="#try" className="btn-primary mt-2 text-center" onClick={() => setMobileMenuOpen(false)}>Get Started</a>
          </div>
        )}

        {/* ── Hero ── */}
        <section className="max-w-[1200px] mx-auto px-8 pt-16 pb-32 md:pt-24 md:pb-40 md:px-12">
          <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-24">

            {/* Left: text */}
            <div className="flex-1 text-center lg:text-left">
              <div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[12px] font-medium text-[#a78bfa] mb-10 animate-fade-up"
                style={{
                  background: "rgba(124, 58, 237, 0.08)",
                  border: "1px solid rgba(124, 58, 237, 0.12)",
                  fontFamily: "var(--font-space)",
                  letterSpacing: "0.05em",
                  animationDelay: "0.1s",
                }}
              >
                <span className="w-[6px] h-[6px] rounded-full bg-[#22c55e] shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                AI-Powered Readiness
              </div>

              <h1
                className="text-[clamp(38px,6vw,64px)] font-bold leading-[1.08] tracking-[-0.035em] text-white mb-7 animate-fade-up"
                style={{ fontFamily: "var(--font-space)", animationDelay: "0.2s" }}
              >
                Ship your app{" "}
                <span className="gradient-text">reviewer-ready</span>
              </h1>

              <p
                className="text-[17px] leading-[1.75] text-white/40 max-w-[460px] mb-10 mx-auto lg:mx-0 animate-fade-up"
                style={{ animationDelay: "0.3s" }}
              >
                Paste your review feedback from App Store Connect. Get a clear action plan in 60 seconds. No signup required.
              </p>

              <div className="flex flex-wrap gap-4 justify-center lg:justify-start animate-fade-up" style={{ animationDelay: "0.4s" }}>
                <a href="#try" className="btn-primary">Get Started Free</a>
                <a href="#features" className="btn-ghost">Explore Features</a>
              </div>
            </div>

            {/* Right: orb visual */}
            <div className="flex-shrink-0 animate-fade-up" style={{ animationDelay: "0.3s" }}>
              <div className="hero-orb-wrap">
                <div className="hero-orb-glow" />
                <div className="hero-orb-outer" />
                <div className="hero-orb-mid" />
                <div className="hero-orb-inner" />

                {/* Floating icons */}
                <div className="orb-icon" style={{ top: "5%", left: "50%", transform: "translateX(-50%)", animationDelay: "0s" }}>📋</div>
                <div className="orb-icon" style={{ top: "30%", right: "-8%", animationDelay: "0.8s" }}>✓</div>
                <div className="orb-icon" style={{ bottom: "10%", right: "5%", animationDelay: "1.6s" }}>🔒</div>
                <div className="orb-icon" style={{ bottom: "5%", left: "10%", animationDelay: "2.4s" }}>⚡</div>
                <div className="orb-icon" style={{ top: "35%", left: "-8%", animationDelay: "3.2s" }}>📱</div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Parser ── */}
        <section id="try" className="max-w-[700px] mx-auto px-8 pb-32">
          <p className="section-label">Try It Now</p>
          <h2
            className="text-[clamp(22px,3vw,30px)] font-bold text-white text-center mb-10 tracking-[-0.02em]"
            style={{ fontFamily: "var(--font-space)" }}
          >
            Paste your review feedback
          </h2>
          <RejectionParser />
        </section>

        {/* ── Features ── */}
        <section id="features" className="max-w-[1100px] mx-auto px-8 pb-36 md:px-12">
          <p className="section-label">Features</p>
          <h2 className="section-heading">Everything you need to ship</h2>
          <div className="features-grid">
            {[
              {
                num: "01",
                title: "Smart Analysis Engine",
                desc: "Scans Info.plist, entitlements, privacy manifests, IAP config, permissions, and screenshots for compliance.",
              },
              {
                num: "02",
                title: "AI Readiness Check",
                desc: "Powered by AI trained on Apple's Review Guidelines and Human Interface Guidelines.",
              },
              {
                num: "03",
                title: "Review Packet Generator",
                desc: "Auto-generates demo credentials, testing steps, and reviewer notes for App Store Connect.",
              },
              {
                num: "04",
                title: "Build Memory",
                desc: "Tracks every submission. Flags recurring issues and cross-references past feedback automatically.",
              },
              {
                num: "05",
                title: "Completeness Dashboard",
                desc: "Pre-flight checklist covering privacy, account deletion, screenshots, IAP, age rating, and export compliance.",
              },
              {
                num: "06",
                title: "Readiness Score",
                desc: "Get a 0–100 submission readiness score so you know exactly where you stand before submitting.",
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
                <p className="text-[14px] leading-[1.65] text-white/30">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── How it works ── */}
        <section id="how" className="max-w-[720px] mx-auto px-8 pb-36">
          <p className="section-label">How it works</p>
          <h2 className="section-heading">Three steps to submission</h2>
          <div className="flex flex-col gap-12">
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
                    className="text-[17px] font-bold text-white mb-2"
                    style={{ fontFamily: "var(--font-space)" }}
                  >
                    {s.title}
                  </h3>
                  <p className="text-[15px] leading-[1.7] text-white/35">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Pricing ── */}
        <section id="pricing" className="max-w-[1060px] mx-auto px-8 pb-36 md:px-12">
          <p className="section-label">Pricing</p>
          <h2 className="section-heading">Start free, scale when ready</h2>
          <div className="pricing-grid">
            {[
              {
                name: "Free",
                price: "$0",
                period: "forever",
                desc: "For your first submission",
                features: ["1 scan / month", "Basic checklist", "URL health checks"],
                cta: "Get Started",
                highlight: false,
              },
              {
                name: "Indie",
                price: "$19",
                period: "/month",
                desc: "For active developers",
                features: ["5 scans / month", "AI Readiness Check", "Review Packet Generator", "Build history"],
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
                desc: "For teams & agencies",
                features: ["Unlimited scans", "Multi-app support", "Client dashboards", "White-label packets", "API access"],
                cta: "Contact Us",
                highlight: false,
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`${plan.highlight ? "glass-card-highlight" : "glass-card"} p-8 flex flex-col`}
              >
                <span
                  className="text-[12px] font-semibold tracking-[0.1em] uppercase mb-5"
                  style={{
                    fontFamily: "var(--font-space)",
                    color: plan.highlight ? "#a78bfa" : "rgba(255,255,255,0.4)",
                  }}
                >
                  {plan.name}
                </span>
                <div className="mb-3">
                  <span
                    className="text-[42px] font-bold text-white tracking-[-0.03em]"
                    style={{ fontFamily: "var(--font-space)" }}
                  >
                    {plan.price}
                  </span>
                  <span className="text-[14px] text-white/30 ml-1">{plan.period}</span>
                </div>
                <p className="text-[14px] text-white/25 mb-7">{plan.desc}</p>
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

        {/* ── About ── */}
        <section id="about" className="max-w-[640px] mx-auto px-8 pb-36 text-center">
          <p className="section-label">About</p>
          <h2 className="section-heading">Built for the ecosystem</h2>
          <p className="text-[16px] leading-[1.85] text-white/30 mb-5">
            App Store Review keeps the ecosystem safe and high-quality. AppReady helps you align with those standards before you submit — so the process is smooth for everyone.
          </p>
          <p className="text-[16px] leading-[1.85] text-white/30">
            We built an AI that understands Apple&apos;s guidelines inside and out, so you can ship complete, stable, reviewer-ready apps every time.
          </p>
        </section>

        {/* ── CTA ── */}
        <section className="max-w-[640px] mx-auto px-8 pb-36 text-center">
          <p
            className="text-[clamp(24px,4vw,38px)] font-bold text-white mb-8 tracking-[-0.03em] leading-[1.2]"
            style={{ fontFamily: "var(--font-space)" }}
          >
            Ready to submit with confidence?
          </p>
          <a href="#try" className="btn-primary">Try Free Now</a>
        </section>

        {/* ── Footer ── */}
        <footer className="text-center pb-14 pt-8" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
          <div className="flex justify-center gap-10 mb-6 text-[13px]">
            <a href="#features" className="nav-link">Features</a>
            <a href="#pricing" className="nav-link">Pricing</a>
            <a href="#about" className="nav-link">About</a>
          </div>
          <p className="text-[11px] text-white/10 tracking-[0.06em]">
            SLTR Digital LLC &middot; AppReady
          </p>
        </footer>
      </div>
    </div>
  );
}
