export default function Footer() {
  return (
    <footer
      className="relative z-[1] px-6 md:px-12 py-[60px] flex justify-between items-center max-w-[1100px] mx-auto border-t"
      style={{ borderColor: 'var(--panel-border)' }}
    >
      <div className="text-xs tracking-[1px]" style={{ color: 'var(--gray-dim)' }}>
        &copy; 2026 Luminetic &middot; SLTR Digital LLC
      </div>
      <div className="text-[11px] tracking-[1px] uppercase" style={{ color: 'var(--gray-dim)' }}>
        Luminetic
      </div>
    </footer>
  );
}
