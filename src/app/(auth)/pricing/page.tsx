import Link from 'next/link';
import Footer from '@/components/Footer';

const tiers = [
  {
    name: 'Starter',
    price: '$15',
    period: '1 scan',
    features: [
      'Dual-model AI analysis (Gemini + Claude)',
      'Pre-flight submission checklist',
      'Review packet generator',
      'Action plan with priorities',
      'Readiness score out of 100',
    ],
  },
  {
    name: 'Pro',
    price: '$40',
    period: '3 scans',
    featured: true,
    features: [
      'Everything in Starter',
      'Maestro & Detox test generation',
      'Build Memory intelligence',
      'Score trend tracking across builds',
      'Priority issue detection',
    ],
  },
  {
    name: 'Agency',
    price: '$119',
    period: '10 scans',
    features: [
      'Everything in Pro',
      'Multi-app support',
      'Priority analysis queue',
      'Team-ready review packets',
      'Bulk submission workflow',
    ],
  },
];

export default function PricingPage() {
  return (
    <div style={{ background: 'var(--black)' }}>
      <div className="grid-bg" />

      {/* Simple nav — just logo */}
      <header className="fixed top-0 left-0 w-full z-50" style={{ background: 'rgba(9,9,11,0.8)', backdropFilter: 'blur(24px)', borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center py-4 px-6 md:px-12 lg:px-20">
          <Link href="/" className="flex items-center gap-2.5 no-underline">
            <div className="w-2 h-2 rounded-full" style={{ background: 'var(--pink)', boxShadow: '0 0 12px var(--pink-dim)' }} />
            <span className="text-xl font-bold tracking-tight text-white">Luminetic</span>
          </Link>
        </div>
      </header>

      <main className="min-h-screen px-6 md:px-12 lg:px-20 pt-[160px] pb-[140px]">
        <div className="text-[11px] font-medium tracking-[5px] uppercase mb-8" style={{ color: 'var(--pink)' }}>
          Pricing
        </div>
        <h1 className="text-[32px] font-bold mb-5 tracking-tight" style={{ letterSpacing: '-0.5px' }}>
          Pay per scan. No subscription.
        </h1>
        <p className="text-[14px] mb-24" style={{ color: 'var(--gray)' }}>
          One-time purchase. Credits never expire.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className="relative flex flex-col"
              style={{
                background: tier.featured
                  ? 'rgba(255, 45, 120, 0.04)'
                  : 'rgba(255, 255, 255, 0.02)',
                border: tier.featured
                  ? '1px solid rgba(255, 45, 120, 0.25)'
                  : '1px solid rgba(255, 255, 255, 0.04)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                boxShadow: tier.featured
                  ? '0 0 40px rgba(255, 45, 120, 0.1), 0 0 80px rgba(255, 45, 120, 0.05)'
                  : '0 0 20px rgba(255, 45, 120, 0.03)',
                padding: '48px 40px',
              }}
            >
              {/* Top glow line */}
              <div
                className="absolute top-0 left-0 right-0 h-px"
                style={{
                  background: tier.featured
                    ? 'linear-gradient(90deg, transparent, rgba(255, 45, 120, 0.5), transparent)'
                    : 'linear-gradient(90deg, transparent, rgba(255, 45, 120, 0.15), transparent)',
                }}
              />

              {tier.featured && (
                <div
                  className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-5 py-1.5 text-[9px] tracking-[2px] font-semibold text-white uppercase"
                  style={{ background: 'var(--pink)' }}
                >
                  Popular
                </div>
              )}

              <div className="text-[11px] tracking-[3px] uppercase mb-8" style={{ color: 'var(--gray)' }}>
                {tier.name}
              </div>

              <div className="mb-12">
                <span className="text-[48px] font-bold tracking-tight">{tier.price}</span>
                <span className="text-[14px] ml-3" style={{ color: 'var(--gray)' }}>
                  / {tier.period}
                </span>
              </div>

              <ul className="flex flex-col gap-5 mb-14 flex-1 list-none p-0">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-4 text-[14px] leading-relaxed" style={{ color: 'var(--gray)' }}>
                    <span className="shrink-0 mt-2 w-1 h-1" style={{ background: 'var(--pink)' }} />
                    {feature}
                  </li>
                ))}
              </ul>

              <Link
                href="/signup"
                className="block w-full text-center no-underline text-white text-[12px] tracking-[2px] uppercase font-medium"
                style={{
                  background: tier.featured ? 'var(--pink)' : 'transparent',
                  border: '1px solid rgba(255, 45, 120, 0.4)',
                  padding: '18px',
                  boxShadow: tier.featured
                    ? '0 0 20px rgba(255, 45, 120, 0.2)'
                    : 'none',
                }}
              >
                Get Started
              </Link>
            </div>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}
