import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import SectionHeading from "../SectionHeading";
import RobotMascot from "../RobotMascot";
import { useTypewriter } from "../../hooks/useTypewriter";

const SPEED = 16;
const COMMAND = "ls -a about_us";
const PARA_1 =
  "C2C — Compete to Compute — is where curious minds sharpen their craft. We're building a community of coders who solve problems, ship projects, and push each other to get better every week.";
const PARA_2 =
  "Weekly challenges, coding roadmaps, hackathon teams, and a leaderboard that actually means something — all built by members, for members.";

export default function About() {
  // Typing starts once (when the terminal scrolls into view), then plays
  // through the command and both paragraphs in sequence — each phase
  // gated behind a timeout keyed to how long the previous line took.
  const [started, setStarted] = useState(false);
  const [para1Active, setPara1Active] = useState(false);
  const [para2Active, setPara2Active] = useState(false);

  const command = useTypewriter(COMMAND, started, SPEED);
  const para1 = useTypewriter(PARA_1, para1Active, SPEED);
  const para2 = useTypewriter(PARA_2, para2Active, SPEED);

  useEffect(() => {
    if (!started) return;
    const t = setTimeout(() => setPara1Active(true), COMMAND.length * SPEED + 400);
    return () => clearTimeout(t);
  }, [started]);

  useEffect(() => {
    if (!para1Active) return;
    const t = setTimeout(() => setPara2Active(true), PARA_1.length * SPEED + 400);
    return () => clearTimeout(t);
  }, [para1Active]);

  return (
    <section id="about" className="mx-auto max-w-5xl px-6 py-24">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.6 }}
      >
        <SectionHeading>About Us</SectionHeading>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        onViewportEnter={() => setStarted(true)}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="mt-10 overflow-hidden rounded-3xl border border-hairline bg-graphite shadow-xl"
      >
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
          <div className="min-h-[220px] space-y-6 font-mono text-sm leading-relaxed sm:text-base">
            <p className="text-white">
              <span className="text-emerald-400">&gt;</span> {command}
              {command.length < COMMAND.length && (
                <span className="ml-0.5 inline-block h-4 w-2 animate-pulse bg-white/70 align-middle" />
              )}
            </p>
            {para1Active && (
              <p className="text-white/80">
                {para1}
                {para1.length < PARA_1.length && (
                  <span className="ml-0.5 inline-block h-4 w-2 animate-pulse bg-white/70 align-middle" />
                )}
              </p>
            )}
            {para2Active && (
              <p className="text-white/80">
                {para2}
                {para2.length < PARA_2.length && (
                  <span className="ml-0.5 inline-block h-4 w-2 animate-pulse bg-white/70 align-middle" />
                )}
              </p>
            )}
          </div>

          <div className="hidden items-end justify-center sm:flex">
            <RobotMascot />
          </div>
        </div>
      </motion.div>
    </section>
  );
}
