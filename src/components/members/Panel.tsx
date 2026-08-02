import type { ComponentType, ReactNode } from "react";

/**
 * The one card shape used across every members page.
 *
 * Solid rather than translucent. It used to be a glass panel the galaxy read
 * through, which only works over a dark, busy ground — over light mode's
 * near-white page a 25%-opacity card is invisible. A flat fill with a hairline
 * border is also simply what the LeetCode direction wants: cards lift by being
 * a step off the page, not by glowing.
 */
export default function Panel({
  title,
  icon: Icon,
  action,
  children,
  className = "",
}: {
  title?: string;
  icon?: ComponentType<{ className?: string }>;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`group relative rounded-xl border border-galaxy-line bg-galaxy-surface p-5 transition-colors duration-200 hover:border-galaxy-dim ${className}`}
    >
      {(title || action) && (
        <header className="mb-4 flex items-center justify-between gap-3">
          {title && (
            <h2 className="flex items-center gap-2 font-tech text-[0.7rem] uppercase tracking-[0.18em] text-galaxy-muted">
              {Icon && <Icon className="h-4 w-4 text-galaxy-accent" />}
              {title}
            </h2>
          )}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}
