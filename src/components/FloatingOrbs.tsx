"use client";

export function FloatingOrbs() {
  const orbs = [
    { size: 300, x: 10, y: 20, color: "rgba(255, 45, 120, 0.08)", duration: 20, delay: 0 },
    { size: 250, x: 65, y: 15, color: "rgba(255, 45, 120, 0.06)", duration: 25, delay: 2 },
    { size: 200, x: 80, y: 55, color: "rgba(255, 255, 255, 0.03)", duration: 18, delay: 4 },
    { size: 180, x: 25, y: 65, color: "rgba(255, 45, 120, 0.04)", duration: 22, delay: 1 },
  ];

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {orbs.map((orb, i) => (
        <div
          key={i}
          className="absolute rounded-full animate-float"
          style={{
            width: orb.size,
            height: orb.size,
            left: `${orb.x}%`,
            top: `${orb.y}%`,
            background: `radial-gradient(circle, ${orb.color} 0%, transparent 70%)`,
            animationDuration: `${orb.duration}s`,
            animationDelay: `${orb.delay}s`,
            filter: "blur(80px)",
          }}
        />
      ))}
    </div>
  );
}
