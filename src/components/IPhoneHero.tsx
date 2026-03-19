'use client';

const hudPanels = [
  { position: 'left', top: '20%', label: 'Readiness Score', value: '92 / 100', delay: '1.5s' },
  { position: 'right', top: '20%', label: 'Guidelines Checked', value: '114 rules scanned', delay: '1.8s' },
  { position: 'left', top: '55%', label: 'Status', value: 'Review packet ready', delay: '2.1s' },
  { position: 'right', top: '55%', label: 'Build Memory', value: '3 prior submissions', delay: '2.4s' },
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
    ? { right: 'calc(50% + 140px)', textAlign: 'right' }
    : { left: 'calc(50% + 140px)', textAlign: 'left' };

  return (
    <div
      className="absolute hidden md:flex flex-col justify-center"
      style={{
        ...posStyle,
        top,
        width: '180px',
        height: '72px',
        padding: '0 20px',
        background: 'rgba(255, 45, 120, 0.04)',
        border: '1px solid rgba(255, 45, 120, 0.15)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        color: 'var(--gray)',
        opacity: 0,
        animation: `${isLeft ? 'jarvisPanelLeft' : 'jarvisPanelRight'} 0.8s ${delay} cubic-bezier(0.16, 1, 0.3, 1) forwards`,
        boxShadow: '0 0 20px rgba(255, 45, 120, 0.05)',
      }}
    >
      <div
        className={`flex items-center gap-1.5 text-[9px] font-medium tracking-[2px] uppercase mb-1 ${isLeft ? 'justify-end' : 'justify-start'}`}
        style={{ color: 'var(--pink)' }}
      >
        <div
          className="w-1 h-1 rounded-full animate-pulse"
          style={{ background: 'var(--pink)' }}
        />
        {label}
      </div>
      <div
        className={`text-[13px] font-normal tracking-normal ${isLeft ? 'text-right' : 'text-left'}`}
        style={{ color: 'rgba(255,255,255,0.7)' }}
      >
        {value}
      </div>
    </div>
  );
}

export default function IPhoneHero() {
  return (
    <div
      className="relative mb-[120px] flex items-center justify-center w-full py-4"
      style={{
        opacity: 0,
        animation: 'jarvisPhoneIn 1.2s 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      }}
    >
      {/* Backlight glow */}
      <div
        className="absolute top-1/2 left-1/2 w-[350px] h-[550px] -z-10 animate-glow-pulse"
        style={{
          transform: 'translate(-50%, -50%)',
          background: 'radial-gradient(ellipse, rgba(255,45,120,0.08) 0%, transparent 70%)',
        }}
      />

      {/* HUD Panels — all same size, liquid glass */}
      {hudPanels.map((p) => (
        <HudPanel key={p.label} {...p} position={p.position as 'left' | 'right'} />
      ))}

      {/* Connector lines */}
      <div
        className="absolute h-px hidden md:block"
        style={{
          right: 'calc(50% + 110px)',
          width: '30px',
          top: '25%',
          background: 'linear-gradient(90deg, rgba(255,45,120,0.2), transparent)',
          opacity: 0,
          animation: 'fadeIn 0.5s 1.5s forwards',
        }}
      />
      <div
        className="absolute h-px hidden md:block"
        style={{
          left: 'calc(50% + 110px)',
          width: '30px',
          top: '25%',
          background: 'linear-gradient(90deg, transparent, rgba(255,45,120,0.2))',
          opacity: 0,
          animation: 'fadeIn 0.5s 1.8s forwards',
        }}
      />
      <div
        className="absolute h-px hidden md:block"
        style={{
          right: 'calc(50% + 110px)',
          width: '30px',
          top: '60%',
          background: 'linear-gradient(90deg, rgba(255,45,120,0.2), transparent)',
          opacity: 0,
          animation: 'fadeIn 0.5s 2.1s forwards',
        }}
      />
      <div
        className="absolute h-px hidden md:block"
        style={{
          left: 'calc(50% + 110px)',
          width: '30px',
          top: '60%',
          background: 'linear-gradient(90deg, transparent, rgba(255,45,120,0.2))',
          opacity: 0,
          animation: 'fadeIn 0.5s 2.4s forwards',
        }}
      />

      {/* iPhone — smaller, dark empty screen */}
      <div
        className="relative w-[220px] h-[450px] rounded-[36px] overflow-hidden"
        style={{
          background: '#0a0a0a',
          border: '2px solid rgba(255,255,255,0.06)',
          boxShadow:
            '0 0 0 1px rgba(255,255,255,0.02), 0 0 60px rgba(255,45,120,0.05), 0 0 120px rgba(255,45,120,0.03), 0 30px 80px rgba(0,0,0,0.8)',
        }}
      >
        {/* Notch */}
        <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-[90px] h-6 bg-black rounded-b-[14px] z-10" />

        {/* Side buttons */}
        <div className="absolute -right-[3px] top-[110px] w-[3px] h-[45px] rounded-sm" style={{ background: 'rgba(255,255,255,0.06)' }} />
        <div className="absolute -left-[3px] top-[80px] w-[3px] h-[24px] rounded-sm" style={{ background: 'rgba(255,255,255,0.06)' }} />
        <div className="absolute -left-[3px] top-[120px] w-[3px] h-[40px] rounded-sm" style={{ background: 'rgba(255,255,255,0.06)' }} />
        <div className="absolute -left-[3px] top-[170px] w-[3px] h-[40px] rounded-sm" style={{ background: 'rgba(255,255,255,0.06)' }} />

        {/* Screen — dark with breathing glow */}
        <div
          className="absolute inset-[8px] rounded-[30px] flex items-center justify-center overflow-hidden"
          style={{
            background: 'radial-gradient(ellipse at center 30%, rgba(255,45,120,0.04) 0%, rgba(0,0,0,0.9) 60%, #000 100%)',
          }}
        >
          <div
            className="w-[90px] h-[90px] rounded-full animate-breathe"
            style={{
              background: 'radial-gradient(circle, rgba(255,45,120,0.12) 0%, transparent 70%)',
            }}
          />
        </div>
      </div>
    </div>
  );
}
