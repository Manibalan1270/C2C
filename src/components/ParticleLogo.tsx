import { useEffect, useRef, useState } from "react";
import { animate, type MotionValue } from "framer-motion";
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
 * On mount, particles fly in from random directions and converge into the
 * logo (a bounded, one-shot animation via Framer Motion's `animate()` —
 * not a free-running loop). Once formed, it swaps to the actual crisp PNG
 * so the logo stays fully legible at rest, not a sparse dot field. From
 * then on, scroll progress (passed in as `progress`) takes over — breaking
 * the logo back apart into particles as you scroll down, same as before.
 */
export default function ParticleLogo({ progress }: { progress: MotionValue<number> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[] | null>(null);
  const entranceDoneRef = useRef(false);
  const [showCrisp, setShowCrisp] = useState(false);

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
      draw(1); // start fully scattered

      const controls = animate(1, 0, {
        duration: 1.3,
        ease: [0.16, 1, 0.3, 1], // easeOutExpo-ish — fast start, gentle settle
        onUpdate: draw,
        onComplete: () => {
          entranceDoneRef.current = true;
          const v = progress.get();
          draw(v);
          setShowCrisp(v <= 0.01);
        },
      });

      return () => controls.stop();
    };

    const unsubscribe = progress.on("change", (v) => {
      if (!entranceDoneRef.current) return;
      draw(v);
      setShowCrisp(v <= 0.01);
    });
    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative h-56 w-56 sm:h-80 sm:w-80">
      {showCrisp && (
        <img
          src={clubLogo}
          alt="C2C Programming Club"
          className="absolute inset-0 h-full w-full object-contain"
        />
      )}
      <canvas
        ref={canvasRef}
        width={CANVAS_SIZE}
        height={CANVAS_SIZE}
        className={`absolute inset-0 h-full w-full object-contain ${
          showCrisp ? "opacity-0" : "opacity-100"
        }`}
      />
    </div>
  );
}
