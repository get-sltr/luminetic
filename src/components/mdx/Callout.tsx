interface CalloutProps {
  type?: 'tip' | 'warning' | 'info';
  children: React.ReactNode;
}

const styles: Record<string, { borderColor: string; label: string }> = {
  tip: { borderColor: 'var(--orange)', label: '// Tip' },
  warning: { borderColor: 'var(--warning)', label: '// Warning' },
  info: { borderColor: 'var(--blue)', label: '// Info' },
};

export default function Callout({ type = 'tip', children }: CalloutProps) {
  const { borderColor, label } = styles[type] ?? styles.info;

  return (
    <div
      style={{
        borderLeft: `3px solid ${borderColor}`,
        padding: '16px 20px',
        margin: '24px 0',
        background: 'var(--glass)',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--mono)',
          fontSize: '0.55rem',
          letterSpacing: 3,
          textTransform: 'uppercase',
          color: borderColor,
          display: 'block',
          marginBottom: 8,
        }}
      >
        {label}
      </span>
      <div
        style={{
          fontFamily: 'var(--body)',
          fontSize: '0.9rem',
          color: 'var(--text-mid)',
          lineHeight: 1.6,
        }}
      >
        {children}
      </div>
    </div>
  );
}
