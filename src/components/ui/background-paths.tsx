const PERIOD = 1000; // one seamless tile, in viewBox units
const VIEW_H = 800;
const LINES = 26;
const STEP = 20; // sampling resolution along each curve

/**
 * One thin curve, drawn across two full periods so the second half is an
 * exact repeat of the first. Because it's a pure sine, the value and the
 * slope match at x=0 and x=PERIOD, so shifting the whole layer by exactly
 * one period loops with no visible seam.
 */
function buildLine(baseY: number, amplitude: number, phase: number) {
  const points: string[] = [];
  for (let x = 0; x <= PERIOD * 2; x += STEP) {
    const y = baseY + Math.sin((x / PERIOD) * Math.PI * 2 + phase) * amplitude;
    points.push(`${x === 0 ? "M" : "L"}${x} ${y.toFixed(1)}`);
  }
  return points.join(" ");
}

function linesFor(position: number) {
  return Array.from({ length: LINES }, (_, i) => {
    const t = i / (LINES - 1); // 0 -> 1 across the bundle
    return {
      id: i,
      d: buildLine(
        // Lines bunch tighter at the top of the bundle and fan out lower,
        // so the whole thing reads as a sweep rather than even stripes.
        VIEW_H * 0.12 + t * t * VIEW_H * 0.8,
        (30 + t * 90) * position,
        t * 1.6 * position,
      ),
      width: 0.5 + t * 0.7,
      opacity: 0.08 + t * 0.3,
    };
  });
}

/**
 * Thin lines sweeping in from the left and flowing continuously to the
 * right. Renders in `currentColor`, so wrap it in an element with a text
 * colour class to theme it.
 *
 * The paths themselves are completely static; the flow comes from a
 * single CSS `translateX` on the wrapper (the same marquee technique the
 * footer already uses). That matters: an earlier version animated
 * `pathLength`/`pathOffset` per path, which forced main-thread
 * stroke-dash recalculation for 72 paths every frame and flickered the
 * whole page. One compositor-friendly transform per layer costs nothing.
 */
export function FloatingPaths({ position }: { position: number }) {
  const lines = linesFor(position);
  const flowClass = position > 0 ? "animate-paths-flow" : "animate-paths-flow-slow";

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Oversized + rotated so the lines read as a diagonal sweep and the
          edges of the rotated box never enter the viewport. */}
      <div
        className="absolute -inset-[35%]"
        style={{ transform: `rotate(${position > 0 ? -14 : -8}deg)` }}
      >
        <div className={`flex h-full w-[200%] ${flowClass}`}>
          <svg
            className="h-full w-full shrink-0 text-current"
            viewBox={`0 0 ${PERIOD * 2} ${VIEW_H}`}
            preserveAspectRatio="none"
            fill="none"
          >
            <title>Background Paths</title>
            {lines.map((line) => (
              <path
                key={line.id}
                d={line.d}
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
