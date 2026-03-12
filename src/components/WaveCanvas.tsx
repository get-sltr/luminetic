"use client";

import { useEffect, useRef } from "react";

interface Wave {
  amplitude: number;
  frequency: number;
  speed: number;
  color: string;
  lineWidth: number;
  yOffset: number;
  phase: number;
}

export function WaveCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let time = 0;

    const waves: Wave[] = [
      {
        amplitude: 80,
        frequency: 0.006,
        speed: 0.012,
        color: "rgba(255, 45, 120, 0.5)",
        lineWidth: 2.5,
        yOffset: -40,
        phase: 0,
      },
      {
        amplitude: 60,
        frequency: 0.009,
        speed: 0.018,
        color: "rgba(255, 45, 120, 0.3)",
        lineWidth: 2,
        yOffset: 0,
        phase: 2,
      },
      {
        amplitude: 50,
        frequency: 0.005,
        speed: 0.008,
        color: "rgba(255, 255, 255, 0.12)",
        lineWidth: 1.5,
        yOffset: 40,
        phase: 4,
      },
      {
        amplitude: 35,
        frequency: 0.013,
        speed: 0.022,
        color: "rgba(255, 45, 120, 0.18)",
        lineWidth: 1.5,
        yOffset: 70,
        phase: 1,
      },
      {
        amplitude: 70,
        frequency: 0.007,
        speed: 0.01,
        color: "rgba(255, 255, 255, 0.06)",
        lineWidth: 1,
        yOffset: -70,
        phase: 3,
      },
      {
        amplitude: 25,
        frequency: 0.016,
        speed: 0.03,
        color: "rgba(255, 45, 120, 0.1)",
        lineWidth: 1,
        yOffset: 20,
        phase: 5,
      },
    ];

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + "px";
      canvas.style.height = window.innerHeight + "px";
      ctx.scale(dpr, dpr);
    };

    const drawWave = (wave: Wave) => {
      const centerY = window.innerHeight * 0.48 + wave.yOffset;
      const w = window.innerWidth;

      ctx.beginPath();
      ctx.strokeStyle = wave.color;
      ctx.lineWidth = wave.lineWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      for (let x = 0; x <= w; x += 1) {
        const y =
          centerY +
          Math.sin(x * wave.frequency + time * wave.speed + wave.phase) *
            wave.amplitude +
          Math.sin(x * wave.frequency * 0.6 + time * wave.speed * 0.8 + wave.phase * 0.5) *
            wave.amplitude * 0.4 +
          Math.cos(x * wave.frequency * 0.3 + time * wave.speed * 0.5) *
            wave.amplitude * 0.2;

        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.stroke();
    };

    const animate = () => {
      const dpr = window.devicePixelRatio || 1;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      for (const wave of waves) {
        drawWave(wave);
      }

      time += 1;
      animationId = requestAnimationFrame(animate);
    };

    resize();
    window.addEventListener("resize", resize);
    animate();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
    />
  );
}
