const PERIOD = 1600; // one seamless tile, in viewBox units
const VIEW_H = 800;
const STEP = 20;

/**
 * Sparse, long sweeping curves — drawn to match the hand-sketched
 * reference: a handful of thin lines running off the left edge and
 * sweeping across, rather than the dense fan used on the Login page.
 *
 * Wide period + large amplitude means you only ever see part of a wave
 * on screen, which reads as one long sweep instead of a repeating ripple.
 */
const LINES = [
  { baseY: 120, amp: 150, phase: 0.0, width: 0.8, opacity: 0.22 },
  { baseY: 280, amp: 185, phase: 0.35, width: 1.0, opacity: 0.34 },
  { baseY: 420, amp: 160, phase: 0.7, width: 0.8, opacity: 0.26 },
  { baseY: 560, amp: 195, phase: 1.0, width: 1.1, opacity: 0.4 },
  { baseY: 700, amp: 170, phase: 1.35, width: 0.9, opacity: 0.3 },
  { baseY: 850, amp: 180, phase: 1.7, width: 0.9, opacity: 0.2 },
];

/**
 * Two full periods, so the second half exactly repeats the first. Pure
 * sine means both the value and the slope match at the tile boundary, so
 * shifting the layer by one period loops with no visible seam.
 */
function buildLine(baseY: number, amp: number, phase: number) {
  const points: string[] = [];
  for (let x = 0; x <= PERIOD * 2; x += STEP) {
    const y = baseY + Math.sin((x / PERIOD) * Math.PI * 2 + phase) * amp;
    points.push(`${x === 0 ? "M" : "L"}${x} ${y.toFixed(1)}`);
  }
  return points.join(" ");
}

/**
 * Landing-page background lines. Static paths; the flow is a single CSS
 * translateX on the wrapper (marquee technique), so nothing recalculates
 * per frame.
 */
export function HeroLines() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute -inset-[30%]"
        style={{ transform: "rotate(-9deg)" }}
      >
        <div className="animate-paths-flow-slow flex h-full w-[200%]">
          <svg
            className="h-full w-full shrink-0 text-current"
            viewBox={`0 0 ${PERIOD * 2} ${VIEW_H}`}
            preserveAspectRatio="none"
            fill="none"
          >
            <title>Background Lines</title>
            {LINES.map((line, i) => (
              <path
                key={i}
                d={buildLine(line.baseY, line.amp, line.phase)}
                stroke="currentColor"
                strokeWidth={line.width}
                strokeOpacity={line.opacity}
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </svg>
        </div>
      </div>
    </div>
  );
}
