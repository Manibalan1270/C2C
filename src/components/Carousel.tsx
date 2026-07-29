import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface CarouselProps<T> {
  items: T[];
  renderItem: (item: T) => ReactNode;
  /** Light or dark accent card — controls the arrow button styling. */
  tone?: "light" | "dark";
}

/**
 * One item focused at a time, with left/right arrow navigation and a
 * direction-aware slide transition. Only `x` (transform) and `opacity`
 * are animated, and the transition is click-triggered rather than
 * scroll-linked, so there's no continuous per-frame work — same safe
 * pattern as the rest of the site's motion.
 */
export default function Carousel<T>({ items, renderItem, tone = "light" }: CarouselProps<T>) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  function go(delta: number) {
    setDirection(delta);
    setIndex((prev) => (prev + delta + items.length) % items.length);
  }

  const arrowClass =
    tone === "dark"
      ? "border-white/15 text-white hover:bg-white/10"
      : "border-hairline-strong text-graphite hover:bg-hairline";

  return (
    <div className="flex flex-col items-center">
      <div className="flex w-full items-center justify-center gap-4 sm:gap-8">
        <button
          type="button"
          onClick={() => go(-1)}
          aria-label="Previous"
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border text-lg transition ${arrowClass}`}
        >
          ←
        </button>

        <div className="relative w-full max-w-sm overflow-hidden sm:max-w-md">
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
          onClick={() => go(1)}
          aria-label="Next"
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border text-lg transition ${arrowClass}`}
        >
          →
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
