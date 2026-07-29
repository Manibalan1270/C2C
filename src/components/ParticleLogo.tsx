import { useEffect, useRef } from "react";
import type { MotionValue } from "framer-motion";
import clubLogo from "../assets/club-logo-transparent.png";

interface Particle {
  fx: number;
  fy: number;
  sx: number;
  sy: number;
}

const CANVAS_SIZE = 320;
const SAMPLE_STEP = 4; // grid step over the sampled logo — bigger = fewer particles

/**
 * Renders the logo as a field of particles. Particle position is a pure
 * function of `progress` (0 = formed logo, 1 = fully scattered/faded) —
 * there is no free-running animation loop. The canvas only redraws when
 * `progress` changes, which Framer Motion already keeps in sync with
 * scroll via requestAnimationFrame, so this doesn't add a second,
 * independent per-frame loop competing for the frame budget.
 */
export default function ParticleLogo({ progress }: { progress: MotionValue<number> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[] | null>(null);

  useEffect(() => {
    function draw(p: number) {
      const canvas = canvasRef.current;
      const particles = particlesRef.current;
      if (!canvas || !particles) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      const opacity = Math.max(0, 1 - p * 1.2);
      if (opacity <= 0) return;
      ctx.fillStyle = `rgba(250,250,249,${opacity})`;

      for (const particle of particles) {
        const x = particle.fx + (particle.sx - particle.fx) * p;
        const y = particle.fy + (particle.sy - particle.fy) * p;
        ctx.fillRect(x, y, 2, 2);
      }
    }

    const img = new Image();
    img.src = clubLogo;
    img.onload = () => {
      const off = document.createElement("canvas");
      off.width = CANVAS_SIZE;
      off.height = CANVAS_SIZE;
      const octx = off.getContext("2d");
      if (!octx) return;

      const scale = Math.min(CANVAS_SIZE / img.width, CANVAS_SIZE / img.height) * 0.85;
      const w = img.width * scale;
      const h = img.height * scale;
      const ox = (CANVAS_SIZE - w) / 2;
      const oy = (CANVAS_SIZE - h) / 2;
      octx.drawImage(img, ox, oy, w, h);

      const { data } = octx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      const particles: Particle[] = [];
      for (let y = 0; y < CANVAS_SIZE; y += SAMPLE_STEP) {
        for (let x = 0; x < CANVAS_SIZE; x += SAMPLE_STEP) {
          const alpha = data[(y * CANVAS_SIZE + x) * 4 + 3];
          if (alpha > 80) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 60 + Math.random() * 200;
            particles.push({
              fx: x,
              fy: y,
              sx: x + Math.cos(angle) * dist,
              sy: y + Math.sin(angle) * dist,
            });
          }
        }
      }
      particlesRef.current = particles;
      draw(progress.get());
    };

    const unsubscribe = progress.on("change", draw);
    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_SIZE}
      height={CANVAS_SIZE}
      className="h-56 w-56 sm:h-80 sm:w-80"
    />
  );
}
