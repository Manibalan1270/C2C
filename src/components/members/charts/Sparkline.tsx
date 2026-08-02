import { useId } from "react";
import { MARK, SURFACE } from "./chartTokens";

const VIEW_W = 120;
const VIEW_H = 32;
const PAD = 5; // room for the end marker's ring

/**
 * Twelve-ish point trend line for a stat tile. `invert` flips the y-axis
 * for measures where lower is better (leaderboard rank), so "up and to the
 * right" always means improving.
 */
export default function Sparkline({
  values,
  invert = false,
  label,
}: {
  values: number[];
  invert?: boolean;
  label: string;
}) {
  const titleId = useId();
  if (values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  const points = values.map((v, i) => {
    const t = (v - min) / span;
    const norm = invert ? t : 1 - t;
    return {
      x: PAD + (i / (values.length - 1)) * (VIEW_W - PAD * 2),
      y: PAD + norm * (VIEW_H - PAD * 2),
    };
  });

  const d = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x} ${p.y}`).join(" ");
  const end = points[points.length - 1];

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      className="w-full"
      role="img"
      aria-labelledby={titleId}
    >
      <title id={titleId}>{label}</title>
      <path
        d={d}
        fill="none"
        stroke={MARK}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Surface ring keeps the end marker legible where it meets the line. */}
      <circle cx={end.x} cy={end.y} r={4} fill={MARK} stroke={SURFACE} strokeWidth={2} />
    </svg>
  );
}
