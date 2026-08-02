import { useEffect, useRef } from "react";

/**
 * Particle galaxy backdrop for the members area — a spiral disc viewed
 * nearly edge-on, slowly rotating, with a bright core bleeding into
 * violet arms.
 *
 * Canvas 2D rather than Three.js on purpose: the whole effect is ~5k
 * points with additive blending, which `fillRect` handles fine, and the
 * production bundle is already over Vite's size warning without adding a
 * WebGL renderer for one background.
 *
 * `splash` is the loud version for the post-login screen. `ambient` is
 * dimmed and slowed right down so it can sit behind real content on every
 * members page without competing with it.
 */

interface Variant {
  count: number;
  bokehCount: number;
  spinSpeed: number; // radians per second
  opacity: number;
  tilt: number; // elevation above the disc plane, radians (small = edge-on)
}

const VARIANTS: Record<"splash" | "ambient", Variant> = {
  splash: { count: 5200, bokehCount: 40, spinSpeed: 0.06, opacity: 0.72, tilt: 0.2 },
  ambient: { count: 3200, bokehCount: 22, spinSpeed: 0.025, opacity: 0.34, tilt: 0.17 },
};

const BRANCHES = 3;
const SPIN = 1.35; // how far each arm wraps as it extends outward

/**
 * Global dimmer on every mark and the core bloom. Separate from each
 * variant's `opacity` so the splash/ambient balance stays intact while the
 * whole field gets quieter — additive blending means a dense core clips to
 * white long before the individual points look bright.
 */
const BRIGHTNESS = 0.42;

/**
 * How hot the central bloom is allowed to get, and how wide.
 *
 * Both are kept low deliberately. Under `lighter` compositing a broad, bright
 * core clips to flat white and eats whatever sits in front of it — at 0.5
 * alpha and half the projected width it swallowed the headline entirely.
 */
const CORE_ALPHA = 0.15;
const CORE_SIZE = 0.17; // fraction of projScale

/** Number of pre-rendered dot sprites stepped along the colour ramp. */
const RAMP_STEPS = 8;

/**
 * Pointer response. The disc turns on its own axis; it does not slide around
 * the viewport.
 *
 * The range is deliberately wide (~140 degrees edge to edge). Near edge-on a
 * small axial rotation is nearly invisible, because the arms are spiral
 * rather than radial — it takes a large sweep before the arm ends visibly
 * swing. Pitch stays as a secondary: opening the disc toward face-on is what
 * makes the axial rotation legible at all.
 */
const SPIN_RANGE = 2.4; // axial rotation, radians, edge to edge
const PITCH_RANGE = 0.3; // how far the disc opens toward face-on
const DISC_THICKNESS = 0.06;
const CAMERA_DISTANCE = 2.7;

// A white star field cooling to a faint warm grey at the rim. The rim used to
// carry the theme's violet; under the LeetCode direction the field is meant to
// be atmosphere you don't consciously notice, so the only warmth left is a
// trace of the accent at the outer edge.
const CORE_RGB = [255, 255, 255] as const;
const MID_RGB = [239, 241, 246] as const;
const OUTER_RGB = [176, 166, 152] as const;

interface Particle {
  x: number;
  y: number;
  z: number;
  radius: number; // 0..1, distance from core — drives colour and brightness
  size: number;
  bokeh: boolean;
}

function buildGalaxy(variant: Variant): Particle[] {
  const particles: Particle[] = [];
  const total = variant.count + variant.bokehCount;

  for (let i = 0; i < total; i++) {
    const bokeh = i >= variant.count;

    // Bias toward the centre so the core stays dense while the arms thin out.
    const radius = Math.pow(Math.random(), 1.6);
    const branchAngle = ((i % BRANCHES) / BRANCHES) * Math.PI * 2;
    const angle = branchAngle + radius * SPIN * Math.PI;

    // Cubed randomness keeps most points tight to the arm with a few strays,
    // which is what stops the spiral reading as a clean drawn line.
    const scatter = () => Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? 1 : -1);

    particles.push({
      x: Math.cos(angle) * radius + scatter() * 0.32 * radius,
      y: scatter() * DISC_THICKNESS + (Math.random() - 0.5) * 0.012,
      z: Math.sin(angle) * radius + scatter() * 0.32 * radius,
      radius,
      // Bokeh points are the big out-of-focus foreground dots in the
      // reference; the rest are small but deliberately above sub-pixel, so
      // individual stars stay resolvable rather than mushing into a haze.
      size: bokeh ? 9 + Math.random() * 10 : 2 + Math.random() * 2.4,
      bokeh,
    });
  }

  return particles;
}

/** Colour at position `t` (0 = core, 1 = rim) along the ramp. */
function rampColor(t: number): [number, number, number] {
  if (t < 0.45) {
    const k = t / 0.45;
    return [
      CORE_RGB[0] + (MID_RGB[0] - CORE_RGB[0]) * k,
      CORE_RGB[1] + (MID_RGB[1] - CORE_RGB[1]) * k,
      CORE_RGB[2] + (MID_RGB[2] - CORE_RGB[2]) * k,
    ];
  }
  const k = (t - 0.45) / 0.55;
  return [
    MID_RGB[0] + (OUTER_RGB[0] - MID_RGB[0]) * k,
    MID_RGB[1] + (OUTER_RGB[1] - MID_RGB[1]) * k,
    MID_RGB[2] + (OUTER_RGB[2] - MID_RGB[2]) * k,
  ];
}

/**
 * A soft round star, pre-rendered once per ramp step.
 *
 * This exists because `fillRect` was the wrong mark. At sub-pixel sizes a
 * square is indistinguishable from a dot, but once the points grew past a
 * couple of pixels every one of them read as a visible brick. Blitting a
 * sprite with a soft edge costs about the same and actually looks like a
 * star; it also means the per-particle colour maths leaves the hot loop.
 */
function makeDotSprite(rgb: readonly number[]): HTMLCanvasElement {
  const size = 32;
  const sprite = document.createElement("canvas");
  sprite.width = size;
  sprite.height = size;
  const ctx = sprite.getContext("2d");
  if (ctx) {
    const c = size / 2;
    const g = ctx.createRadialGradient(c, c, 0, c, c, c);
    g.addColorStop(0, `rgba(${rgb[0] | 0},${rgb[1] | 0},${rgb[2] | 0},1)`);
    g.addColorStop(0.4, `rgba(${rgb[0] | 0},${rgb[1] | 0},${rgb[2] | 0},0.6)`);
    g.addColorStop(1, `rgba(${rgb[0] | 0},${rgb[1] | 0},${rgb[2] | 0},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }
  return sprite;
}

/** Wider, softer sprite for the bokeh dots and the core glow. */
function makeGlowSprite(rgb: readonly number[]): HTMLCanvasElement {
  const size = 64;
  const sprite = document.createElement("canvas");
  sprite.width = size;
  sprite.height = size;
  const ctx = sprite.getContext("2d");
  if (ctx) {
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},1)`);
    g.addColorStop(0.35, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.35)`);
    g.addColorStop(1, `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }
  return sprite;
}

export default function GalaxyBackground({
  variant = "ambient",
  boostRef,
}: {
  variant?: "splash" | "ambient";
  /**
   * Live multiplier on the rotation speed, read once per frame. A ref rather
   * than a prop so the caller can ramp it continuously without re-running
   * the effect and rebuilding several thousand particles.
   */
  boostRef?: { current: number };
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // `ambient` is currently dimmed to nothing in both themes, and building
  // several thousand particles to animate them at opacity 0 is pure waste.
  // Read the dimmer rather than hard-coding "off", so raising the value in
  // index.css is genuinely all it takes to bring the field back. `splash`
  // opts out of the dimmer entirely and is never switched off here.
  //
  // Read during render, with no subscription of its own: the dimmer is a
  // per-theme value, and MembersLayout — which owns this component — already
  // re-renders on every theme change, so the read is repeated exactly when it
  // needs to be.
  const ambientOff =
    variant === "ambient" &&
    !(
      parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue(
          "--fx-galaxy-opacity",
        ),
      ) > 0
    );

  useEffect(() => {
    if (ambientOff) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const config = VARIANTS[variant];
    const particles = buildGalaxy(config);
    const glow = makeGlowSprite(MID_RGB);
    const coreGlow = makeGlowSprite(CORE_RGB);
    // One sprite per ramp step, picked by the particle's distance from the
    // core — so colour is resolved at setup rather than per point per frame.
    const dots = Array.from({ length: RAMP_STEPS }, (_, i) =>
      makeDotSprite(rampColor(i / (RAMP_STEPS - 1))),
    );

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = 0;
    let height = 0;
    let dpr = 1;

    // Pointer parallax. `target*` is where the pointer is (normalised to
    // -1..1 from the centre of the viewport); `pointer*` eases toward it so
    // the disc drifts rather than snapping. Yaw feeds the spin angle and
    // pitch opens or closes the tilt, so moving the mouse reads as orbiting
    // the galaxy rather than sliding a flat image around.
    let targetYaw = 0;
    let targetPitch = 0;
    let pointerYaw = 0;
    let pointerPitch = 0;

    function resize() {
      if (!canvas) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
    }
    resize();

    function draw(spin: number) {
      if (!ctx) return;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      // Additive blending is what makes overlapping points bloom into a
      // core instead of flatly stacking.
      ctx.globalCompositeOperation = "lighter";

      // Deliberately larger than the viewport's short side — the arms run
      // off the edges, which is what makes it read as a galaxy you're
      // inside rather than a logo centred on the page.
      const projScale = Math.min(width * 0.78, height * 1.6);

      // Ease toward the pointer each frame.
      pointerYaw += (targetYaw - pointerYaw) * 0.08;
      pointerPitch += (targetPitch - pointerPitch) * 0.08;

      // The disc stays put; only its orientation answers the pointer.
      // Translating to the centre once means every particle below is in
      // local coordinates.
      ctx.translate(width / 2, height * 0.52);

      // Horizontal pointer position turns the disc on its own axis, added to
      // the ambient drift already in `spin`.
      const spinAngle = spin + pointerYaw * SPIN_RANGE;
      // Clamp the low end so the disc never flips past edge-on.
      const tiltAngle = Math.max(0.05, config.tilt + pointerPitch * PITCH_RANGE);

      const cosSpin = Math.cos(spinAngle);
      const sinSpin = Math.sin(spinAngle);
      const cosTilt = Math.cos(tiltAngle);
      const sinTilt = Math.sin(tiltAngle);

      // Core bloom, drawn first so particles layer over it.
      const coreSize = projScale * CORE_SIZE;
      ctx.globalAlpha = CORE_ALPHA * config.opacity;
      ctx.drawImage(coreGlow, -coreSize / 2, -coreSize / 2, coreSize, coreSize);

      for (const p of particles) {
        // Spin about the disc axis, then tilt the whole disc toward edge-on.
        const rx = p.x * cosSpin - p.z * sinSpin;
        const rz = p.x * sinSpin + p.z * cosSpin;
        const ry = p.y * cosTilt - rz * sinTilt;
        const depth = p.y * sinTilt + rz * cosTilt;

        const perspective = CAMERA_DISTANCE + depth;
        if (perspective <= 0.1) continue;
        const scale = projScale / perspective;

        // Local coordinates: the canvas transform already carries the
        // camera offset and roll.
        const sx = rx * scale;
        const sy = ry * scale;
        // Generous cull — the origin can be off-centre and the layer is
        // rolled, so bounds are checked against the viewport's diagonal
        // rather than its literal edges.
        if (Math.abs(sx) > width || Math.abs(sy) > height) continue;

        const t = p.radius;

        // Nearer points read brighter; inner points brighter than the rim.
        const depthFade = CAMERA_DISTANCE / perspective - 0.55;
        const alpha =
          Math.max(0, Math.min(1, depthFade)) *
          (1 - t * 0.55) *
          config.opacity *
          BRIGHTNESS;
        if (alpha <= 0.004) continue;

        if (p.bokeh) {
          const size = p.size * scale * 0.06;
          ctx.globalAlpha = alpha * 0.32;
          ctx.drawImage(glow, sx - size / 2, sy - size / 2, size, size);
        } else {
          ctx.globalAlpha = alpha;
          // Soft round sprite, sized generously because the edge falls off —
          // the bright part still reads as a point.
          const size = p.size * (scale / projScale) * 7 + 2;
          const sprite = dots[Math.min(RAMP_STEPS - 1, (t * RAMP_STEPS) | 0)];
          ctx.drawImage(sprite, sx - size / 2, sy - size / 2, size, size);
        }
      }

      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    }

    let frame = 0;
    let last = performance.now();
    // Accumulated rather than derived from elapsed time, so `boostRef` can
    // change the rate mid-flight without the angle jumping.
    let spinAccum = 0;

    function loop(now: number) {
      // Clamp dt so a backgrounded tab or a long frame can't fling the disc
      // around on the next paint.
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      spinAccum += dt * config.spinSpeed * (boostRef?.current ?? 1);
      draw(spinAccum);
      frame = requestAnimationFrame(loop);
    }

    if (reduceMotion) {
      draw(0.6);
    } else {
      frame = requestAnimationFrame(loop);
    }

    function onResize() {
      resize();
      if (reduceMotion) draw(0.6);
    }
    window.addEventListener("resize", onResize);

    // Pointer parallax. Reads clientX/Y off the window rather than the
    // canvas: the canvas is `pointer-events-none` and sits under the whole
    // members UI, so it never receives events of its own.
    function onPointerMove(e: PointerEvent) {
      targetYaw = (e.clientX / window.innerWidth) * 2 - 1;
      targetPitch = (e.clientY / window.innerHeight) * 2 - 1;
    }
    // Drift back to rest when the pointer leaves the window entirely.
    function onPointerOut() {
      targetYaw = 0;
      targetPitch = 0;
    }
    if (!reduceMotion) {
      window.addEventListener("pointermove", onPointerMove, { passive: true });
      document.addEventListener("pointerleave", onPointerOut);
    }

    // Stop burning frames while the tab is in the background.
    function onVisibility() {
      if (reduceMotion) return;
      if (document.hidden) {
        cancelAnimationFrame(frame);
      } else {
        last = performance.now();
        frame = requestAnimationFrame(loop);
      }
    }
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerleave", onPointerOut);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [variant, boostRef, ambientOff]);

  // Nothing to paint and nothing to composite — not even a transparent
  // full-screen layer for the compositor to carry around.
  if (ambientOff) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 overflow-hidden bg-galaxy-void"
      // The splash curtain is a launch screen: dark in both themes, so it is
      // pinned rather than tokenised, overriding the class above. The ambient
      // variant leaves this undefined and follows the theme.
      style={{ backgroundColor: variant === "splash" ? "#141414" : undefined }}
    >
      {/* The whole field rides one dimmer. `--fx-galaxy-opacity` in index.css
          is the single value that decides how present the galaxy is, and it is
          currently 0 in both themes. Turning the atmosphere back up is a
          one-number change; nothing here was deleted to get the flat look. */}
      <div
        className="absolute inset-0"
        style={{
          // `splash` opts out of the dimmer. On the welcome curtain the galaxy
          // isn't atmosphere behind content — it is the content, on a screen
          // that stays dark in both themes, so muting it would leave a blank
          // rectangle. Only the ambient variant sitting behind real UI is
          // turned down.
          opacity: variant === "splash" ? 1 : "var(--fx-galaxy-opacity)",
        }}
      >
        {/* Faint warm wash so the ground never reads as flat, and the disc has
            something to sit in. */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 78% 60% at 50% 52%, rgba(255,161,22,0.14), rgba(255,161,22,0.04) 48%, transparent 72%)",
          }}
        />
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      </div>
    </div>
  );
}
