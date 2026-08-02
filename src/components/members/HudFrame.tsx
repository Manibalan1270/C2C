import type { ReactNode } from "react";

/**
 * The angled corner brackets that sit around the logo in the reference
 * design — a HUD/targeting-reticle motif. Drawn as four absolutely
 * positioned L-shapes rather than a border image so they scale with the
 * box and inherit the accent colour.
 */
export default function HudFrame({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const corner =
    "pointer-events-none absolute h-2 w-2 border-galaxy-accent-text/70";

  return (
    <span className={`relative inline-flex items-center px-2.5 py-1 ${className}`}>
      <span className={`${corner} left-0 top-0 border-l border-t`} />
      <span className={`${corner} right-0 top-0 border-r border-t`} />
      <span className={`${corner} bottom-0 left-0 border-b border-l`} />
      <span className={`${corner} bottom-0 right-0 border-b border-r`} />
      {children}
    </span>
  );
}
