import { WaveCanvas } from "@/components/WaveCanvas";
import { FloatingOrbs } from "@/components/FloatingOrbs";
import { RejectionParser } from "@/components/RejectionParser";

export default function Home() {
  return (
    <div style={{ position: "relative", minHeight: "100vh", overflow: "hidden", background: "#000" }}>
      <WaveCanvas />
      <FloatingOrbs />

      {/* Dot grid */}
      <div
        style={{
          position: "fixed",
          bottom: 64,
          right: 64,
          width: 120,
          height: 120,
          opacity: 0.2,
          pointerEvents: "none",
          backgroundImage: "radial-gradient(circle, rgba(255, 45, 120, 0.5) 1.2px, transparent 1.2px)",
          backgroundSize: "14px 14px",
        }}
      />

      {/* All content */}
      <div style={{ position: "relative", zIndex: 10 }}>

        {/* Nav */}
        <nav style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          maxWidth: 1100,
          margin: "0 auto",
          padding: "28px 40px",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#ff2d78" }} />
            <span style={{ fontSize: 18, fontWeight: 700, color: "#fff", fontFamily: "var(--font-space)", letterSpacing: "-0.03em" }}>
              AppReady
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 40, fontSize: 14, color: "rgba(255,255,255,0.3)" }}>
            <a href="#features" style={{ color: "inherit", textDecoration: "none" }}>Features</a>
            <a href="#pricing" style={{ color: "inherit", textDecoration: "none" }}>Pricing</a>
            <a href="#about" style={{ color: "inherit", textDecoration: "none" }}>About</a>
          </div>

          <a
            href="#try"
            style={{
              padding: "10px 24px",
              borderRadius: 100,
              fontSize: 13,
              fontWeight: 500,
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.15)",
              textDecoration: "none",
              fontFamily: "var(--font-space)",
            }}
          >
            Try Free
          </a>
        </nav>

        {/* Hero */}
        <section style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          maxWidth: 800,
          margin: "0 auto",
          padding: "120px 24px 80px",
        }}>
          <p style={{
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            color: "#ff2d78",
            marginBottom: 40,
            fontFamily: "var(--font-space)",
          }}>
            Stop getting rejected
          </p>

          <h1 style={{
            fontSize: "clamp(48px, 8vw, 82px)",
            fontWeight: 700,
            lineHeight: 1.02,
            letterSpacing: "-0.04em",
            color: "#fff",
            marginBottom: 32,
            fontFamily: "var(--font-space)",
          }}>
            Package your app
            <br />
            <span style={{ color: "#ff2d78" }}>so Apple says yes</span>
          </h1>

          <p style={{
            fontSize: 17,
            lineHeight: 1.7,
            color: "rgba(255,255,255,0.35)",
            maxWidth: 420,
            marginBottom: 80,
          }}>
            Paste your rejection email. Get a fix plan in 60 seconds.
            <br />
            No signup required.
          </p>
        </section>

        {/* Parser */}
        <section id="try" style={{ maxWidth: 640, margin: "0 auto", padding: "0 24px 80px" }}>
          <RejectionParser />
        </section>

        {/* Social proof */}
        <p style={{
          textAlign: "center",
          fontSize: 13,
          color: "rgba(255,255,255,0.15)",
          paddingBottom: 112,
        }}>
          Built by an indie dev who burned 60+ builds learning what Apple actually wants.
        </p>

        {/* Features */}
        <section id="features" style={{ maxWidth: 1060, margin: "0 auto", padding: "0 24px 128px" }}>
          <h2 style={{
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            color: "#ff2d78",
            textAlign: "center",
            marginBottom: 16,
            fontFamily: "var(--font-space)",
          }}>
            Features
          </h2>
          <p style={{
            fontSize: "clamp(28px, 4vw, 40px)",
            fontWeight: 700,
            color: "#fff",
            textAlign: "center",
            marginBottom: 64,
            fontFamily: "var(--font-space)",
            letterSpacing: "-0.03em",
          }}>
            Everything you need to ship
          </p>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 20,
          }}>
            {[
              {
                num: "01",
                title: "Smart Analysis Engine",
                desc: "Upload your IPA or connect your repo. Scans Info.plist, entitlements, privacy manifests, IAP config, permissions, and screenshots.",
              },
              {
                num: "02",
                title: "AI Review Simulator",
                desc: "Thinks like an Apple reviewer. Built on a RAG index of 200+ guidelines, HIG, and real rejection patterns.",
              },
              {
                num: "03",
                title: "Review Packet Generator",
                desc: "Auto-generates demo credentials, testing steps, and everything the reviewer needs. Pastes directly into App Store Connect.",
              },
              {
                num: "04",
                title: "Build Memory",
                desc: "Remembers every submission. When you upload Build 61, it knows Build 58 was rejected for 2.1(b) and checks if you fixed it.",
              },
              {
                num: "05",
                title: "Completeness Dashboard",
                desc: "Pre-flight checklist: privacy policy, account deletion, screenshots, IAP products, age rating, export compliance. Readiness score 0-100.",
              },
            ].map((f) => (
              <div
                key={f.num}
                style={{
                  borderRadius: 16,
                  padding: 32,
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.05)",
                }}
              >
                <span style={{ display: "block", fontSize: 12, fontFamily: "monospace", color: "#ff2d78", marginBottom: 20 }}>
                  {f.num}
                </span>
                <h3 style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: "#fff",
                  marginBottom: 12,
                  fontFamily: "var(--font-space)",
                  letterSpacing: "-0.01em",
                }}>
                  {f.title}
                </h3>
                <p style={{ fontSize: 14, lineHeight: 1.6, color: "rgba(255,255,255,0.25)" }}>
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section style={{ maxWidth: 700, margin: "0 auto", padding: "0 24px 128px" }}>
          <h2 style={{
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            color: "#ff2d78",
            textAlign: "center",
            marginBottom: 16,
            fontFamily: "var(--font-space)",
          }}>
            How it works
          </h2>
          <p style={{
            fontSize: "clamp(28px, 4vw, 40px)",
            fontWeight: 700,
            color: "#fff",
            textAlign: "center",
            marginBottom: 64,
            fontFamily: "var(--font-space)",
            letterSpacing: "-0.03em",
          }}>
            Three steps to approval
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
            {[
              {
                step: "1",
                title: "Paste your rejection",
                desc: "Copy the email from Apple Resolution Center and drop it in.",
              },
              {
                step: "2",
                title: "Get your fix plan",
                desc: "AI analyzes the exact guideline, explains the issue, and gives you step-by-step fixes.",
              },
              {
                step: "3",
                title: "Resubmit with confidence",
                desc: "Follow the plan, attach the auto-generated review packet, and ship.",
              },
            ].map((s) => (
              <div key={s.step} style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
                <div style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  background: "rgba(255, 45, 120, 0.1)",
                  border: "1px solid rgba(255, 45, 120, 0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#ff2d78",
                  fontFamily: "var(--font-space)",
                  flexShrink: 0,
                }}>
                  {s.step}
                </div>
                <div>
                  <h3 style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: "#fff",
                    marginBottom: 6,
                    fontFamily: "var(--font-space)",
                  }}>
                    {s.title}
                  </h3>
                  <p style={{ fontSize: 14, lineHeight: 1.6, color: "rgba(255,255,255,0.3)" }}>
                    {s.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" style={{ maxWidth: 960, margin: "0 auto", padding: "0 24px 128px" }}>
          <h2 style={{
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            color: "#ff2d78",
            textAlign: "center",
            marginBottom: 16,
            fontFamily: "var(--font-space)",
          }}>
            Pricing
          </h2>
          <p style={{
            fontSize: "clamp(28px, 4vw, 40px)",
            fontWeight: 700,
            color: "#fff",
            textAlign: "center",
            marginBottom: 64,
            fontFamily: "var(--font-space)",
            letterSpacing: "-0.03em",
          }}>
            Start free, scale when ready
          </p>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 16,
          }}>
            {[
              {
                name: "Free",
                price: "$0",
                period: "forever",
                desc: "For your first rejection",
                features: ["1 scan/month", "Basic checklist", "URL health checks"],
                cta: "Get Started",
                highlight: false,
              },
              {
                name: "Indie",
                price: "$19",
                period: "/month",
                desc: "For active developers",
                features: ["5 scans/month", "AI Review Simulator", "Review Packet Generator", "Build history"],
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
                style={{
                  borderRadius: 16,
                  padding: 32,
                  background: plan.highlight ? "rgba(255, 45, 120, 0.06)" : "rgba(255,255,255,0.02)",
                  border: plan.highlight ? "1px solid rgba(255, 45, 120, 0.2)" : "1px solid rgba(255,255,255,0.05)",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <span style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: plan.highlight ? "#ff2d78" : "rgba(255,255,255,0.4)",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  fontFamily: "var(--font-space)",
                  marginBottom: 16,
                }}>
                  {plan.name}
                </span>
                <div style={{ marginBottom: 8 }}>
                  <span style={{
                    fontSize: 40,
                    fontWeight: 700,
                    color: "#fff",
                    fontFamily: "var(--font-space)",
                    letterSpacing: "-0.03em",
                  }}>
                    {plan.price}
                  </span>
                  <span style={{ fontSize: 14, color: "rgba(255,255,255,0.3)", marginLeft: 4 }}>
                    {plan.period}
                  </span>
                </div>
                <p style={{ fontSize: 14, color: "rgba(255,255,255,0.25)", marginBottom: 24 }}>
                  {plan.desc}
                </p>
                <ul style={{ listStyle: "none", marginBottom: 32, flexGrow: 1 }}>
                  {plan.features.map((feat) => (
                    <li key={feat} style={{
                      fontSize: 13,
                      color: "rgba(255,255,255,0.4)",
                      lineHeight: 1.6,
                      paddingLeft: 16,
                      position: "relative",
                      marginBottom: 6,
                    }}>
                      <span style={{
                        position: "absolute",
                        left: 0,
                        color: "#ff2d78",
                      }}>+</span>
                      {feat}
                    </li>
                  ))}
                </ul>
                <a
                  href="#try"
                  style={{
                    display: "block",
                    textAlign: "center",
                    padding: "12px 24px",
                    borderRadius: 100,
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#fff",
                    background: plan.highlight ? "#ff2d78" : "transparent",
                    border: plan.highlight ? "none" : "1px solid rgba(255,255,255,0.1)",
                    textDecoration: "none",
                    fontFamily: "var(--font-space)",
                    boxShadow: plan.highlight ? "0 0 30px rgba(255, 45, 120, 0.25)" : "none",
                  }}
                >
                  {plan.cta}
                </a>
              </div>
            ))}
          </div>
        </section>

        {/* About */}
        <section id="about" style={{ maxWidth: 600, margin: "0 auto", padding: "0 24px 128px", textAlign: "center" }}>
          <h2 style={{
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            color: "#ff2d78",
            marginBottom: 16,
            fontFamily: "var(--font-space)",
          }}>
            About
          </h2>
          <p style={{
            fontSize: "clamp(28px, 4vw, 40px)",
            fontWeight: 700,
            color: "#fff",
            marginBottom: 32,
            fontFamily: "var(--font-space)",
            letterSpacing: "-0.03em",
          }}>
            Built from rejection
          </p>
          <p style={{
            fontSize: 15,
            lineHeight: 1.8,
            color: "rgba(255,255,255,0.3)",
            marginBottom: 16,
          }}>
            AppReady was born from 60+ failed App Store submissions. Every guideline violation, every vague rejection email, every week-long back-and-forth with Apple Review.
          </p>
          <p style={{
            fontSize: 15,
            lineHeight: 1.8,
            color: "rgba(255,255,255,0.3)",
          }}>
            We turned that pain into an AI that understands what Apple actually wants, so you can ship your app without the guesswork.
          </p>
        </section>

        {/* CTA */}
        <section style={{
          maxWidth: 600,
          margin: "0 auto",
          padding: "0 24px 128px",
          textAlign: "center",
        }}>
          <p style={{
            fontSize: "clamp(24px, 4vw, 36px)",
            fontWeight: 700,
            color: "#fff",
            marginBottom: 24,
            fontFamily: "var(--font-space)",
            letterSpacing: "-0.03em",
          }}>
            Ready to stop getting rejected?
          </p>
          <a
            href="#try"
            style={{
              display: "inline-block",
              padding: "14px 40px",
              borderRadius: 100,
              fontSize: 15,
              fontWeight: 600,
              color: "#fff",
              background: "#ff2d78",
              textDecoration: "none",
              fontFamily: "var(--font-space)",
              boxShadow: "0 0 50px rgba(255, 45, 120, 0.3), 0 4px 20px rgba(0,0,0,0.4)",
            }}
          >
            Try Free Now
          </a>
        </section>

        {/* Footer */}
        <footer style={{ textAlign: "center", paddingBottom: 48 }}>
          <div style={{
            display: "flex",
            justifyContent: "center",
            gap: 32,
            marginBottom: 24,
            fontSize: 13,
          }}>
            <a href="#features" style={{ color: "rgba(255,255,255,0.2)", textDecoration: "none" }}>Features</a>
            <a href="#pricing" style={{ color: "rgba(255,255,255,0.2)", textDecoration: "none" }}>Pricing</a>
            <a href="#about" style={{ color: "rgba(255,255,255,0.2)", textDecoration: "none" }}>About</a>
          </div>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.1)", letterSpacing: "0.05em" }}>
            SLTR Digital LLC &middot; AppReady
          </p>
        </footer>
      </div>
    </div>
  );
}
