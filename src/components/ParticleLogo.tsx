import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { animate, type MotionValue } from "framer-motion";
import clubLogo from "../assets/club-logo-transparent.png";

interface Particle {
  /** Offset from the anchor's top-left, in the size it was sampled at. */
  localX: number;
  localY: number;
  /** Scatter target as a fraction (0-1) of the full viewport. */
  scatterFracX: number;
  scatterFracY: number;
}

/**
 * The particle canvas is portaled to <body> and fixed to the full
 * viewport — a canvas confined to a small local element clips anything
 * that scatters past its own edges, which is why particles looked boxed
 * into a small square before. Scatter targets are random points anywhere
 * on screen. The "formed" target for each particle still tracks the small
 * anchor element (which sits inside Hero's scaled/translated wrapper), so
 * particles correctly converge on the logo's live position even while it's
 * rising/shrinking.
 */
export default function ParticleLogo({ progress }: { progress: MotionValue<number> }) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[] | null>(null);
  const entranceDoneRef = useRef(false);
  const [showCrisp, setShowCrisp] = useState(false);

  useEffect(() => {
    function resizeCanvas() {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    function draw(p: number) {
      const canvas = canvasRef.current;
      const particles = particlesRef.current;
      const anchor = anchorRef.current;
      if (!canvas || !particles || !anchor) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const opacity = Math.max(0, 1 - p * 1.2);
      if (opacity <= 0) return;
      ctx.fillStyle = `rgba(250,250,249,${opacity})`;

      const rect = anchor.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      for (const particle of particles) {
        const fx = rect.left + particle.localX;
        const fy = rect.top + particle.localY;
        const sx = particle.scatterFracX * vw;
        const sy = particle.scatterFracY * vh;
        const x = fx + (sx - fx) * p;
        const y = fy + (sy - fy) * p;
        ctx.fillRect(x, y, 2, 2);
      }
    }

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    const img = new Image();
    img.src = clubLogo;
    img.onload = () => {
      const anchor = anchorRef.current;
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      const size = Math.round(Math.max(rect.width, rect.height)) || 320;

      const off = document.createElement("canvas");
      off.width = size;
      off.height = size;
      const octx = off.getContext("2d");
      if (!octx) return;

      // Same fit math as the <img>'s object-contain, so the sampled dots
      // land in the same place the crisp image will render.
      const scale = Math.min(size / img.width, size / img.height) * 0.85;
      const w = img.width * scale;
      const h = img.height * scale;
      const ox = (size - w) / 2;
      const oy = (size - h) / 2;
      octx.drawImage(img, ox, oy, w, h);

      const { data } = octx.getImageData(0, 0, size, size);
      const step = 4;
      const particles: Particle[] = [];
      for (let y = 0; y < size; y += step) {
        for (let x = 0; x < size; x += step) {
          const alpha = data[(y * size + x) * 4 + 3];
          if (alpha > 80) {
            particles.push({
              localX: x,
              localY: y,
              scatterFracX: Math.random(),
              scatterFracY: Math.random(),
            });
          }
        }
      }
      particlesRef.current = particles;
      draw(1); // start fully scattered

      const controls = animate(1, 0, {
        duration: 1.3,
        ease: [0.16, 1, 0.3, 1],
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

    return () => {
      unsubscribe();
      window.removeEventListener("resize", resizeCanvas);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div ref={anchorRef} className="relative h-56 w-56 sm:h-80 sm:w-80">
        <img
          src={clubLogo}
          alt="C2C Programming Club"
          className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-200 ${
            showCrisp ? "opacity-100" : "opacity-0"
          }`}
        />
      </div>
      {createPortal(
        <canvas
          ref={canvasRef}
          className={`pointer-events-none fixed inset-0 z-30 transition-opacity duration-200 ${
            showCrisp ? "opacity-0" : "opacity-100"
          }`}
        />,
        document.body,
      )}
    </>
  );
}
