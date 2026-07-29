import SectionHeading from "../SectionHeading";

function RobotMascot() {
  return (
    <svg
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
      <path d="M60 90 Q75 108 90 90" />
      <path d="M110 90 Q125 108 140 90" />
      <rect x="10" y="70" width="14" height="40" rx="7" />
      <rect x="176" y="70" width="14" height="40" rx="7" />
      <rect x="55" y="160" width="90" height="60" rx="20" />
      <circle cx="100" cy="190" r="14" />
    </svg>
  );
}

export default function About() {
  return (
    <section id="about" className="mx-auto max-w-5xl px-6 py-24">
      <SectionHeading>About Us</SectionHeading>

      <div className="mt-10 overflow-hidden rounded-3xl border border-hairline bg-graphite shadow-xl">
        <div className="relative flex items-center border-b border-white/10 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-red-500/80" />
            <span className="h-3 w-3 rounded-full bg-yellow-500/80" />
            <span className="h-3 w-3 rounded-full bg-green-500/80" />
          </div>
          <span className="absolute left-1/2 -translate-x-1/2 font-mono text-xs text-white/50">
            terminal ~ /about_us
          </span>
        </div>

        <div className="relative grid gap-8 p-6 sm:grid-cols-[1fr_auto] sm:p-10">
          <div className="space-y-6 font-mono text-sm leading-relaxed sm:text-base">
            <p className="text-white">
              <span className="text-emerald-400">&gt;</span> ls -a about_us
              <span className="ml-1 inline-block w-2 animate-pulse bg-white/70 align-middle">
                &nbsp;
              </span>
            </p>
            <p className="text-white/80">
              C2C — Compete to Compute — is where curious minds sharpen their craft. We're
              building a community of coders who solve problems, ship projects, and push
              each other to get better every week.
            </p>
            <p className="text-white/80">
              Weekly challenges, coding roadmaps, hackathon teams, and a leaderboard that
              actually means something — all built by members, for members.
            </p>
          </div>

          <div className="hidden items-end justify-center sm:flex">
            <RobotMascot />
          </div>
        </div>
      </div>
    </section>
  );
}
