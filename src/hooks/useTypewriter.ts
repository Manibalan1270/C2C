import { useEffect, useState } from "react";

/**
 * Reveals `text` one character at a time while `active` is true. Purely
 * a `setInterval` ticking a character count — no scroll listeners, no
 * per-frame work, so it's cheap regardless of how long the text is.
 */
export function useTypewriter(text: string, active: boolean, speed = 18) {
  const [chars, setChars] = useState(0);

  useEffect(() => {
    if (!active) return;
    setChars(0);
    const id = setInterval(() => {
      setChars((c) => {
        if (c + 1 >= text.length) {
          clearInterval(id);
          return text.length;
        }
        return c + 1;
      });
    }, speed);
    return () => clearInterval(id);
  }, [active, text, speed]);

  return text.slice(0, chars);
}
