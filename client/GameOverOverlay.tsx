import { useEffect, useRef } from "react";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  life: number;
  maxLife: number;
  hue: number;
  saturation: number;
  lightness: number;
  twinkleSpeed: number;
};

export function GameOverOverlay({ isVictory }: { isVictory: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Capture non-null refs for use in nested functions
    const c = canvas;
    const g = ctx;

    const resize = () => {
      c.width = window.innerWidth;
      c.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const particles: Particle[] = [];
    let frame = 0;

    function spawnVictoryParticle() {
      const isStar = Math.random() < 0.08;
      particles.push({
        x: Math.random() * c.width,
        y: c.height + Math.random() * 20,
        vx: (Math.random() - 0.5) * 1.2,
        vy: -(Math.random() * 1.8 + 0.6),
        size: isStar ? Math.random() * 5 + 3 : Math.random() * 3 + 1,
        opacity: isStar ? 0.9 : Math.random() * 0.7 + 0.3,
        life: 0,
        maxLife: Math.random() * 180 + 120,
        hue: 35 + Math.random() * 25,
        saturation: 80 + Math.random() * 20,
        lightness: isStar ? 75 + Math.random() * 20 : 55 + Math.random() * 25,
        twinkleSpeed: isStar ? 0.08 + Math.random() * 0.06 : 0,
      });
    }

    function spawnDefeatParticle() {
      const isEmber = Math.random() < 0.1;
      particles.push({
        x: Math.random() * c.width,
        y: -Math.random() * 20,
        vx: (Math.random() - 0.5) * 0.8,
        vy: Math.random() * 1.2 + 0.3,
        size: isEmber ? Math.random() * 4 + 2 : Math.random() * 2.5 + 0.5,
        opacity: isEmber ? 0.7 : Math.random() * 0.5 + 0.15,
        life: 0,
        maxLife: Math.random() * 220 + 120,
        hue: isEmber ? Math.random() * 15 : Math.random() * 30,
        saturation: isEmber ? 70 + Math.random() * 30 : 20 + Math.random() * 30,
        lightness: isEmber ? 35 + Math.random() * 15 : 15 + Math.random() * 15,
        twinkleSpeed: isEmber ? 0.05 + Math.random() * 0.05 : 0,
      });
    }

    function animate() {
      g.clearRect(0, 0, c.width, c.height);
      frame++;

      // Ramp up spawn rate over first ~60 frames
      const spawnRate = Math.min(frame / 40, 1) * 3;
      for (let i = 0; i < spawnRate; i++) {
        if (particles.length < 200) {
          if (isVictory) {
            spawnVictoryParticle();
          } else {
            spawnDefeatParticle();
          }
        }
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]!;
        p.x += p.vx;
        p.y += p.vy;
        p.life++;

        // Gentle sway
        if (isVictory) {
          p.vx += Math.sin(p.life * 0.02 + p.x * 0.01) * 0.02;
        } else {
          p.vx += Math.sin(p.life * 0.015 + p.x * 0.005) * 0.01;
        }

        const lifeRatio = p.life / p.maxLife;
        let alpha = p.opacity * (1 - lifeRatio * lifeRatio);

        // Twinkle effect for star/ember particles
        if (p.twinkleSpeed > 0) {
          alpha *= 0.6 + 0.4 * Math.sin(p.life * p.twinkleSpeed);
        }

        if (p.life >= p.maxLife || alpha <= 0.01) {
          particles.splice(i, 1);
          continue;
        }

        // Draw glow for larger particles
        if (p.size > 2) {
          const glowRadius = p.size * (isVictory ? 4 : 3);
          const gradient = g.createRadialGradient(
            p.x,
            p.y,
            0,
            p.x,
            p.y,
            glowRadius
          );
          gradient.addColorStop(
            0,
            `hsla(${p.hue}, ${p.saturation}%, ${p.lightness}%, ${alpha * 0.4})`
          );
          gradient.addColorStop(
            1,
            `hsla(${p.hue}, ${p.saturation}%, ${p.lightness}%, 0)`
          );
          g.beginPath();
          g.arc(p.x, p.y, glowRadius, 0, Math.PI * 2);
          g.fillStyle = gradient;
          g.fill();
        }

        // Draw particle core
        g.beginPath();
        g.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        g.fillStyle = `hsla(${p.hue}, ${p.saturation}%, ${p.lightness}%, ${alpha})`;
        g.fill();
      }

      animId = requestAnimationFrame(animate);
    }

    let animId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, [isVictory]);

  return (
    <canvas
      ref={canvasRef}
      className={`gameover-canvas ${isVictory ? "gameover-canvas-victory" : "gameover-canvas-defeat"}`}
    />
  );
}
