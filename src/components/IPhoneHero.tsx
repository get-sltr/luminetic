'use client';

const hudPanels = [
  { position: 'left', top: '30%', label: 'Readiness Score', value: '92 / 100', delay: '1.5s' },
  { position: 'right', top: '25%', label: 'Guidelines Checked', value: '114 rules scanned', delay: '1.8s' },
  { position: 'right', top: '50%', label: 'Build Memory', value: '3 prior submissions', delay: '2.1s' },
  { position: 'left', top: '55%', label: 'Status', value: 'Review packet ready', delay: '2.4s' },
];

function HudPanel({
  position,
  top,
  label,
  value,
  delay,
}: {
  position: 'left' | 'right';
  top: string;
  label: string;
  value: string;
  delay: string;
}) {
  const isLeft = position === 'left';
  const posStyle: React.CSSProperties = isLeft
    ? { right: 'calc(50% + 170px)', textAlign: 'right' }
    : { left: 'calc(50% + 170px)', textAlign: 'left' };

  return (
    <div
      className="absolute px-5 py-4 text-[11px] tracking-[1px] uppercase backdrop-blur-[10px] hidden md:block"
      style={{
        ...posStyle,
        top,
        background: 'var(--panel-bg)',
        border: '1px solid var(--panel-border)',
        color: 'var(--gray)',
        opacity: 0,
        animation: `${isLeft ? 'jarvisPanelLeft' : 'jarvisPanelRight'} 0.8s ${delay} cubic-bezier(0.16, 1, 0.3, 1) forwards`,
      }}
    >
      {/* Top accent line */}
      <div
        className="absolute top-0 left-0 w-full h-px"
        style={{ background: 'linear-gradient(90deg, transparent, var(--pink-dim), transparent)' }}
      />
      <div
        className={`flex items-center gap-1.5 text-[10px] font-medium mb-1.5 ${isLeft ? 'justify-end' : 'justify-start'}`}
        style={{ color: 'var(--pink)' }}
      >
        <div
          className="w-1 h-1 rounded-full animate-pulse"
          style={{ background: 'var(--pink)' }}
        />
        {label}
      </div>
      <div
        className="text-[13px] font-normal tracking-normal normal-case"
        style={{ color: 'rgba(255,255,255,0.7)', fontFamily: "'Sora', sans-serif" }}
      >
        {value}
      </div>
    </div>
  );
}

export default function IPhoneHero() {
  return (
    <div
      className="relative mb-[80px] flex items-center justify-center w-full py-8"
      style={{
        opacity: 0,
        animation: 'jarvisPhoneIn 1.2s 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      }}
    >
      {/* Backlight glow */}
      <div
        className="absolute top-1/2 left-1/2 w-[400px] h-[700px] -z-10 animate-glow-pulse"
        style={{
          transform: 'translate(-50%, -50%)',
          background: 'radial-gradient(ellipse, rgba(255,45,120,0.12) 0%, transparent 70%)',
        }}
      />

      {/* HUD Panels */}
      {hudPanels.map((p) => (
        <HudPanel key={p.label} {...p} position={p.position as 'left' | 'right'} />
      ))}

      {/* Connector lines */}
      <div
        className="absolute h-px hidden md:block"
        style={{
          right: 'calc(50% + 130px)',
          width: '40px',
          top: '35%',
          background: 'linear-gradient(90deg, var(--pink-dim), transparent)',
          opacity: 0,
          animation: 'fadeIn 0.5s 1.5s forwards',
        }}
      />
      <div
        className="absolute h-px hidden md:block"
        style={{
          left: 'calc(50% + 130px)',
          width: '40px',
          top: '30%',
          background: 'linear-gradient(90deg, transparent, var(--pink-dim))',
          opacity: 0,
          animation: 'fadeIn 0.5s 1.8s forwards',
        }}
      />

      {/* iPhone */}
      <div
        className="relative w-[280px] h-[570px] rounded-[44px] overflow-hidden"
        style={{
          background: '#0a0a0a',
          border: '2px solid rgba(255,255,255,0.1)',
          boxShadow:
            '0 0 0 1px rgba(255,255,255,0.05), 0 0 80px rgba(255,45,120,0.08), 0 0 160px rgba(255,45,120,0.04), 0 40px 100px rgba(0,0,0,0.8)',
        }}
      >
        {/* Notch */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-[120px] h-7 bg-black rounded-b-[18px] z-10" />

        {/* Side buttons */}
        <div className="absolute -right-[3px] top-[140px] w-[3px] h-[60px] rounded-sm" style={{ background: 'rgba(255,255,255,0.1)' }} />
        <div className="absolute -left-[3px] top-[100px] w-[3px] h-[30px] rounded-sm" style={{ background: 'rgba(255,255,255,0.1)' }} />
        <div className="absolute -left-[3px] top-[160px] w-[3px] h-[50px] rounded-sm" style={{ background: 'rgba(255,255,255,0.1)' }} />
        <div className="absolute -left-[3px] top-[220px] w-[3px] h-[50px] rounded-sm" style={{ background: 'rgba(255,255,255,0.1)' }} />

        {/* Screen */}
        <div
          className="absolute inset-[10px] rounded-[36px] flex items-center justify-center overflow-hidden"
          style={{
            background: 'radial-gradient(ellipse at center 30%, rgba(255,45,120,0.06) 0%, rgba(0,0,0,0.9) 60%, #000 100%)',
          }}
        >
          <div
            className="w-[120px] h-[120px] rounded-full animate-breathe"
            style={{
              background: 'radial-gradient(circle, rgba(255,45,120,0.15) 0%, transparent 70%)',
            }}
          />
        </div>
      </div>
    </div>
  );
}
