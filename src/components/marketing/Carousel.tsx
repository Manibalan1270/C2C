import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import useMeasure from "react-use-measure";

interface CarouselProps<T> {
  items: T[];
  renderItem: (item: T) => ReactNode;
  /** Light or dark accent card — controls the edge/indicator styling. */
  tone?: "light" | "dark";
}

/** How long to hold before the next item advances while hovering. */
const HOVER_STEP_MS = 1100;
const GAP = 20;

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
    >
      <path d={dir === "left" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} />
    </svg>
  );
}

/**
 * A centred card with its neighbours peeking in on either side, dimmed
 * and slightly scaled back. Hovering either edge scrolls that way and
 * keeps stepping while the pointer stays there; the edges are still real
 * buttons, so click and keyboard focus work too (hover alone would leave
 * touch and keyboard users stranded).
 *
 * The whole track is laid out in normal flow and moved with one `x`
 * transform, so the row keeps the natural height of its tallest card and
 * nothing needs absolute positioning or per-frame measurement.
 */
export default function Carousel<T>({ items, renderItem, tone = "light" }: CarouselProps<T>) {
  const [index, setIndex] = useState(0);
  const timerRef = useRef<number | null>(null);
  const [trackRef, { width }] = useMeasure();

  // Card takes ~72% of the rail so a slice of each neighbour stays visible.
  const cardW = width ? Math.min(Math.max(width * 0.72, 220), 440) : 0;
  const pad = width ? Math.max((width - cardW) / 2, 0) : 0;

  function go(delta: number) {
    setIndex((prev) => (prev + delta + items.length) % items.length);
  }

  function stopStepping() {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function startStepping(delta: number) {
    go(delta);
    stopStepping();
    timerRef.current = window.setInterval(() => go(delta), HOVER_STEP_MS);
  }

  // Never leave an interval running if the component goes away mid-hover.
  useEffect(() => stopStepping, []);

  const edgeBase =
    "group absolute inset-y-0 z-20 flex w-16 items-center justify-center focus:outline-none sm:w-20";
  const chevronBase =
    tone === "dark"
      ? "border-white/15 bg-white/5 text-white/70 group-hover:border-white/40 group-hover:text-white"
      : "border-hairline bg-surface/80 text-slate group-hover:border-accent group-hover:text-accent";

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-full">
        <div ref={trackRef} className="w-full overflow-hidden py-2">
          <motion.div
            className="flex items-stretch"
            style={{ paddingLeft: pad, paddingRight: pad }}
            animate={{ x: -index * (cardW + GAP) }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            {items.map((item, i) => (
              <motion.div
                key={i}
                className="shrink-0"
                style={{ width: cardW || undefined, marginRight: GAP }}
                animate={{
                  opacity: i === index ? 1 : 0.5,
                  scale: i === index ? 1 : 0.92,
                }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              >
                {renderItem(item)}
              </motion.div>
            ))}
          </motion.div>
        </div>

        <button
          type="button"
          aria-label="Previous"
          onMouseEnter={() => startStepping(-1)}
          onMouseLeave={stopStepping}
          onFocus={() => startStepping(-1)}
          onBlur={stopStepping}
          onClick={() => go(-1)}
          className={`${edgeBase} left-0`}
        >
          <span
            className={`flex h-10 w-10 items-center justify-center rounded-full border opacity-0 backdrop-blur transition-all duration-300 group-hover:opacity-100 group-focus-visible:opacity-100 ${chevronBase}`}
          >
            <Chevron dir="left" />
          </span>
        </button>

        <button
          type="button"
          aria-label="Next"
          onMouseEnter={() => startStepping(1)}
          onMouseLeave={stopStepping}
          onFocus={() => startStepping(1)}
          onBlur={stopStepping}
          onClick={() => go(1)}
          className={`${edgeBase} right-0`}
        >
          <span
            className={`flex h-10 w-10 items-center justify-center rounded-full border opacity-0 backdrop-blur transition-all duration-300 group-hover:opacity-100 group-focus-visible:opacity-100 ${chevronBase}`}
          >
            <Chevron dir="right" />
          </span>
        </button>
      </div>

      <div className="mt-6 flex items-center gap-2">
        {items.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Go to item ${i + 1}`}
            onClick={() => setIndex(i)}
            className={`h-1.5 rounded-full transition-all ${
              i === index
                ? "w-6 bg-accent"
                : tone === "dark"
                  ? "w-1.5 bg-white/25"
                  : "w-1.5 bg-hairline-strong"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
