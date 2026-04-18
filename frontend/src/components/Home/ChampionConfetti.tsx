"use client";

import React, { useEffect, useRef } from "react";
import confetti from "canvas-confetti";

const COLORS = [
  "#ef4444",
  "#f97316",
  "#fbbf24",
  "#eab308",
  "#22c55e",
  "#10b981",
  "#06b6d4",
  "#3b82f6",
  "#6366f1",
  "#a855f7",
  "#ec4899",
  "#f43f5e",
];

const ChampionConfetti: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const fire = confetti.create(canvas, {
      resize: true,
      useWorker: true,
    });

    const interval = window.setInterval(() => {
      fire({
        particleCount: 6,
        angle: 270,
        spread: 80,
        startVelocity: 18,
        gravity: 0.8,
        ticks: 400,
        origin: { x: Math.random(), y: -0.05 },
        colors: COLORS,
        scalar: 1,
      });
    }, 110);

    return () => {
      window.clearInterval(interval);
      fire.reset();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[60] w-full h-full"
    />
  );
};

export default ChampionConfetti;
