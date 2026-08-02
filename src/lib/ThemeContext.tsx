import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "c2c-theme";

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeState>({
  theme: "dark",
  setTheme: () => {},
  toggleTheme: () => {},
});

/**
 * Resolve the theme the same way the boot script in index.html does.
 *
 * Kept in sync with that script by hand rather than shared, because it has to
 * run before any bundle is parsed — see the comment there. If you change the
 * precedence here, change it there too, or the first paint will disagree with
 * React and the page will visibly flip.
 */
export function resolveInitialTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    // Private mode / blocked storage — fall through to the system preference.
  }
  return window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
}

/**
 * Write the attribute the CSS actually keys off.
 *
 * Called from the event handler rather than only from an effect, and that
 * ordering is load-bearing: React runs child effects before parent ones, so a
 * consumer that reads a themed custom property in its own effect (CursorGlow
 * reads --fx-cursor-opacity) would otherwise sample the OUTGOING theme on
 * every toggle and stay one step behind. Doing it here means the DOM is
 * already correct before any of that runs.
 */
function applyTheme(next: Theme) {
  document.documentElement.dataset.theme = next;
}

function persistTheme(next: Theme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, next);
  } catch {
    // Not being able to persist is not a reason to refuse the change.
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(resolveInitialTheme);

  // Covers the initial mount and any change that didn't come through the
  // setters below (the OS-preference listener). Cheap and idempotent.
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    applyTheme(next);
    persistTheme(next);
    setThemeState(next);
  }, []);

  // Reads `theme` rather than using a state updater, so the DOM write and the
  // storage write stay out of the updater — StrictMode invokes updaters twice,
  // and side effects don't belong in one.
  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  // Follow the OS only while the member hasn't expressed a preference of their
  // own. Once they've picked, an OS change must not overrule them.
  useEffect(() => {
    const query = window.matchMedia("(prefers-color-scheme: light)");
    function onChange(event: MediaQueryListEvent) {
      try {
        if (localStorage.getItem(THEME_STORAGE_KEY)) return;
      } catch {
        // Can't read storage — treat as "no stored preference" and follow.
      }
      setThemeState(event.matches ? "light" : "dark");
    }
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  const value = useMemo(
    () => ({ theme, setTheme, toggleTheme }),
    [theme, setTheme, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
