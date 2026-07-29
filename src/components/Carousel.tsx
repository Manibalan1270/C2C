import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface CarouselProps<T> {
  items: T[];
  renderItem: (item: T) => ReactNode;
  /** Light or dark accent card — controls the edge/indicator styling. */
  tone?: "light" | "dark";
}

/** How long to hold before the next item advances while hovering. */
const HOVER_STEP_MS = 1100;

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
 * One item focused at a time. Hovering either edge scrolls that way and
 * keeps stepping while the pointer stays there; the edges are still real
 * buttons, so click and keyboard focus work too (hover alone would leave
 * touch and keyboard users stranded). Only `x` and `opacity` animate, and
 * only in response to input — no continuous per-frame work.
 */
export default function Carousel<T>({ items, renderItem, tone = "light" }: CarouselProps<T>) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const timerRef = useRef<number | null>(null);

  function go(delta: number) {
    setDirection(delta);
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
    "group absolute inset-y-0 z-10 flex w-16 items-center justify-center focus:outline-none sm:w-20";
  const chevronBase =
    tone === "dark"
      ? "border-white/15 bg-white/5 text-white/70 group-hover:border-white/40 group-hover:text-white"
      : "border-hairline bg-surface/80 text-slate group-hover:border-accent group-hover:text-accent";

  return (
    <div className="flex flex-col items-center">
      <div className="relative mx-auto w-full max-w-sm sm:max-w-md">
        <div className="overflow-hidden">
          <AnimatePresence mode="wait" custom={direction} initial={false}>
            <motion.div
              key={index}
              custom={direction}
              initial={{ x: direction >= 0 ? 48 : -48, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: direction >= 0 ? -48 : 48, opacity: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            >
              {renderItem(items[index])}
            </motion.div>
          </AnimatePresence>
        </div>

        <button
          type="button"
          aria-label="Previous"
          onMouseEnter={() => startStepping(-1)}
          onMouseLeave={stopStepping}
          onFocus={() => startStepping(-1)}
          onBlur={stopStepping}
          onClick={() => go(-1)}
          className={`${edgeBase} left-0 -translate-x-1/3 sm:-translate-x-1/2`}
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
          className={`${edgeBase} right-0 translate-x-1/3 sm:translate-x-1/2`}
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
            onClick={() => {
              setDirection(i > index ? 1 : -1);
              setIndex(i);
            }}
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
