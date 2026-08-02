import { TRACK } from "./chartTokens";

/**
 * A single ratio against a limit. The unfilled track is a lighter step of
 * the fill's own ramp, so the state reads across the whole bar rather than
 * the fill floating on neutral grey.
 */
export default function Meter({
  value,
  max,
  color,
  label,
}: {
  value: number;
  max: number;
  color: string;
  /** Accessible name — the visible caption usually lives outside the meter. */
  label: string;
}) {
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;

  return (
    <div
      role="meter"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={label}
      className="h-1.5 w-full overflow-hidden rounded-full"
      style={{ backgroundColor: TRACK }}
    >
      <div
        className="h-full rounded-full transition-[width] duration-500 ease-out"
        style={{ width: `${pct * 100}%`, backgroundColor: color }}
      />
    </div>
  );
}
