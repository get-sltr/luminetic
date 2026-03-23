/**
 * Full-viewport holographic ambient layer (pointer-events none).
 * Lives in root layout so it appears on every page.
 */
export default function AmbientHud() {
  return (
    <div className="ambient-hud-root" aria-hidden>
      <div className="ambient-hud-orb" />
      <div className="ambient-hud-grid" />
      <div className="ambient-hud-scan-band" />
    </div>
  );
}
