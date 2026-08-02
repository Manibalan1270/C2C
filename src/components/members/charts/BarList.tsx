import { useId } from "react";

export interface BarDatum {
  key: string;
  label: string;
  value: number;
  color: string;
  /** Pulls the row forward — used for "you" in the leaderboard. */
  emphasis?: boolean;
  /** Optional leading slot, e.g. a rank number. */
  lead?: string;
}

/**
 * Horizontal bars for magnitude across a handful of named rows.
 *
 * Horizontal rather than columns because the labels are names, which don't
 * fit under a vertical axis. Values sit at the tip of each bar rather than
 * on a second axis.
 */
export default function BarList({
  data,
  valueSuffix = "",
  title,
}: {
  data: BarDatum[];
  valueSuffix?: string;
  title: string;
}) {
  const titleId = useId();
  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <ul className="m-0 flex list-none flex-col gap-1 p-0" aria-labelledby={titleId}>
      <span id={titleId} className="sr-only">
        {title}
      </span>

      {data.map((d) => (
        <li
          key={d.key}
          className={[
            "grid grid-cols-[2rem_1fr_auto] items-center gap-3 rounded-lg px-2 py-2 transition-colors",
            d.emphasis
              ? "bg-galaxy-accent/10 ring-1 ring-inset ring-galaxy-accent/30"
              : "hover:bg-galaxy-surface-hover/30",
          ].join(" ")}
        >
          <span className="text-right font-mono text-xs tabular-nums text-galaxy-muted">
            {d.lead}
          </span>

          <span className="min-w-0">
            <span
              className={[
                "block truncate text-sm",
                d.emphasis ? "font-medium text-galaxy-text" : "text-galaxy-text/85",
              ].join(" ")}
            >
              {d.label}
            </span>
            <span
              className="mt-1.5 block h-1.5 rounded-full transition-[width] duration-500 ease-out"
              style={{
                width: `${(d.value / max) * 100}%`,
                backgroundColor: d.color,
              }}
            />
          </span>

          <span className="font-mono text-xs tabular-nums text-galaxy-muted">
            {d.value.toLocaleString()}
            {valueSuffix}
          </span>
        </li>
      ))}
    </ul>
  );
}
