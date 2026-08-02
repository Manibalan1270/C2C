import { useEffect, useRef } from "react";

const EYE_L = { x: 75, y: 90 };
const EYE_R = { x: 125, y: 90 };
const SOCKET_R = 15;
const PUPIL_R = 6;
const MAX_OFFSET = SOCKET_R - PUPIL_R - 2; // keep the pupil inside the socket

/**
 * Eyes track the cursor anywhere on the page. Pupil position is written
 * straight to the SVG `transform` attribute via refs (not React state),
 * so a mousemove listener firing dozens of times a second never triggers
 * a re-render — same "no layout-affecting per-frame work" discipline as
 * the rest of the site's motion.
 */
export default function RobotMascot() {
  const svgRef = useRef<SVGSVGElement>(null);
  const leftPupilRef = useRef<SVGCircleElement>(null);
  const rightPupilRef = useRef<SVGCircleElement>(null);

  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      const svg = svgRef.current;
      if (!svg) return;

      const rect = svg.getBoundingClientRect();
      const scaleX = rect.width / 200;
      const scaleY = rect.height / 240;

      function pupilOffset(eye: { x: number; y: number }) {
        const eyeScreenX = rect.left + eye.x * scaleX;
        const eyeScreenY = rect.top + eye.y * scaleY;
        const dx = e.clientX - eyeScreenX;
        const dy = e.clientY - eyeScreenY;
        const angle = Math.atan2(dy, dx);
        const dist = Math.min(Math.hypot(dx, dy) / 12, MAX_OFFSET);
        return `translate(${Math.cos(angle) * dist} ${Math.sin(angle) * dist})`;
      }

      leftPupilRef.current?.setAttribute("transform", pupilOffset(EYE_L));
      rightPupilRef.current?.setAttribute("transform", pupilOffset(EYE_R));
    }

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 200 240"
      className="h-32 w-32 text-white/25 sm:h-44 sm:w-44"
      fill="none"
      stroke="currentColor"
      strokeWidth="4"
      strokeLinecap="round"
    >
      <circle cx="100" cy="12" r="4" fill="currentColor" stroke="none" />
      <line x1="100" y1="16" x2="100" y2="32" />
      <rect x="30" y="32" width="140" height="120" rx="36" />

      {/* Eyes: white sockets, dark pupils that track the mouse */}
      <circle cx={EYE_L.x} cy={EYE_L.y} r={SOCKET_R} fill="white" stroke="none" />
      <circle cx={EYE_R.x} cy={EYE_R.y} r={SOCKET_R} fill="white" stroke="none" />
      <circle
        ref={leftPupilRef}
        cx={EYE_L.x}
        cy={EYE_L.y}
        r={PUPIL_R}
        fill="#111110"
        stroke="none"
      />
      <circle
        ref={rightPupilRef}
        cx={EYE_R.x}
        cy={EYE_R.y}
        r={PUPIL_R}
        fill="#111110"
        stroke="none"
      />

      <rect x="10" y="70" width="14" height="40" rx="7" />
      <rect x="176" y="70" width="14" height="40" rx="7" />
      <rect x="55" y="160" width="90" height="60" rx="20" />
      <circle cx="100" cy="190" r="14" />
    </svg>
  );
}
