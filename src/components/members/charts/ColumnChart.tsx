import { useId, useState } from "react";
import { GRID, MARK, MARK_MUTED } from "./chartTokens";

interface Datum {
  date: string;
  count: number;
}

const VIEW_W = 640;
const VIEW_H = 150;
const PAD_BOTTOM = 22;
const PAD_TOP = 12;
const MAX_BAR_W = 24; // mark spec: never fill the slot
const GAP = 2; // surface gap between adjacent bars

function dayLabel(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString(undefined, {
    weekday: "narrow",
  });
}

function fullLabel(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
}

/**
 * Problems solved per day. One series, so no legend — the heading names
 * what's plotted. Today's column carries the accent; the rest are
 * recessive, which keeps "where am I now" the thing you see first.
 */
export default function ColumnChart({ data }: { data: Datum[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const titleId = useId();

  const max = Math.max(1, ...data.map((d) => d.count));
  const plotH = VIEW_H - PAD_BOTTOM - PAD_TOP;
  const slot = VIEW_W / data.length;
  const barW = Math.min(MAX_BAR_W, slot - GAP);

  const active = hover != null ? data[hover] : null;

  return (
    <figure className="m-0">
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        className="w-full"
        role="img"
        aria-labelledby={titleId}
        preserveAspectRatio="none"
      >
        <title id={titleId}>
          Problems solved per day over the last {data.length} days
        </title>

        {/* Baseline only — gridlines would out-ink 14 short bars. */}
        <line
          x1={0}
          y1={VIEW_H - PAD_BOTTOM}
          x2={VIEW_W}
          y2={VIEW_H - PAD_BOTTOM}
          stroke={GRID}
          strokeWidth={1}
        />

        {data.map((d, i) => {
          const h = (d.count / max) * plotH;
          const x = i * slot + (slot - barW) / 2;
          const y = VIEW_H - PAD_BOTTOM - h;
          const isLast = i === data.length - 1;
          const isHover = hover === i;

          return (
            <g
              key={d.date}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            >
              {/* Full-height hit target — the bars themselves are too short
                  to hover reliably. */}
              <rect
                x={i * slot}
                y={0}
                width={slot}
                height={VIEW_H - PAD_BOTTOM}
                fill="transparent"
              />
              {d.count > 0 && (
                <rect
                  x={x}
                  y={y}
                  width={barW}
                  height={h}
                  rx={4}
                  fill={isLast || isHover ? MARK : MARK_MUTED}
                />
              )}
              <text
                x={i * slot + slot / 2}
                y={VIEW_H - 6}
                textAnchor="middle"
                fontSize={10}
                fill="currentColor"
                className="text-galaxy-muted"
              >
                {dayLabel(d.date)}
              </text>
            </g>
          );
        })}
      </svg>

      <figcaption className="mt-2 h-4 text-xs text-galaxy-muted">
        {active ? (
          <span>
            <span className="text-galaxy-text">{fullLabel(active.date)}</span> —{" "}
            {active.count} solved
          </span>
        ) : (
          <span>Last {data.length} days</span>
        )}
      </figcaption>
    </figure>
  );
}
