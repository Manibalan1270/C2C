function pathsFor(position: number) {
  return Array.from({ length: 36 }, (_, i) => ({
    id: i,
    d: `M-${380 - i * 5 * position} -${189 + i * 6}C-${
      380 - i * 5 * position
    } -${189 + i * 6} -${312 - i * 5 * position} ${216 - i * 6} ${
      152 - i * 5 * position
    } ${343 - i * 6}C${616 - i * 5 * position} ${470 - i * 6} ${
      684 - i * 5 * position
    } ${875 - i * 6} ${684 - i * 5 * position} ${875 - i * 6}`,
    width: 0.5 + i * 0.03,
  }));
}

/**
 * The flowing diagonal line-art background. Renders in `currentColor`,
 * so wrap it in an element with a text color class to theme it — white
 * on the dark hero, graphite on the light login page.
 *
 * Deliberately static (no animation). The original version animated
 * `pathLength`/`pathOffset` on all 72 paths (36 x 2 layers) forever —
 * that forces per-frame stroke-dasharray/dashoffset recalculation on the
 * main thread for every path, continuously, which is what caused the
 * page-wide flicker. A plain static SVG costs nothing after first paint.
 */
export function FloatingPaths({ position }: { position: number }) {
  const paths = pathsFor(position);

  return (
    <div className="pointer-events-none absolute inset-0">
      <svg className="h-full w-full text-current" viewBox="0 0 696 316" fill="none">
        <title>Background Paths</title>
        {paths.map((path) => (
          <path
            key={path.id}
            d={path.d}
            stroke="currentColor"
            strokeWidth={path.width}
            strokeOpacity={0.1 + path.id * 0.03}
          />
        ))}
      </svg>
    </div>
  );
}
