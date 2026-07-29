import { motion } from "framer-motion";

const MARQUEE_ITEMS = ["Compete", "Code", "Collaborate", "Ship", "Repeat"];

function MarqueeRow() {
  return (
    <div className="flex shrink-0 items-center gap-10 pr-10 font-mono text-xs uppercase tracking-[0.3em] text-white/40">
      {MARQUEE_ITEMS.map((item) => (
        <span key={item} className="flex items-center gap-10">
          {item}
          <span className="text-white/20">✦</span>
        </span>
      ))}
    </div>
  );
}

export default function ContactFooter() {
  return (
    <footer id="contact" className="relative overflow-hidden bg-void py-24 text-void-text">
      {/* Ambient glow, purely decorative */}
      <div className="animate-aurora pointer-events-none absolute left-1/2 top-1/2 h-[50vh] w-[70vw] rounded-full bg-accent/20 blur-[100px]" />

      {/* Giant faint background wordmark */}
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-[6vw] left-1/2 -translate-x-1/2 select-none whitespace-nowrap font-display text-[22vw] font-bold leading-none tracking-tighter text-white/[0.04]"
      >
        C2C
      </div>

      {/* Scrolling marquee strip */}
      <div className="relative z-10 overflow-hidden border-y border-white/10 py-4">
        <div className="flex w-max animate-marquee">
          <MarqueeRow />
          <MarqueeRow />
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.7 }}
        className="relative z-10 mx-auto mt-16 flex max-w-3xl flex-col items-center px-6 text-center"
      >
        <h2 className="font-display text-4xl font-bold tracking-tight sm:text-6xl">
          Ready to compete?
        </h2>
        <p className="mt-4 max-w-md text-void-muted">
          Have a question, want to collaborate, or just want to say hi? We'd love to
          hear from you.
        </p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="mt-8 flex flex-wrap items-center justify-center gap-3"
        >
          <a
            href="mailto:c2c@college.edu"
            className="rounded-full bg-accent px-6 py-3 text-sm font-medium text-white transition hover:bg-accent-dark"
          >
            c2c@college.edu
          </a>
          <a
            href="#"
            className="rounded-full border border-white/15 px-6 py-3 text-sm font-medium text-void-text transition hover:bg-white/10"
          >
            Instagram
          </a>
          <a
            href="#"
            className="rounded-full border border-white/15 px-6 py-3 text-sm font-medium text-void-text transition hover:bg-white/10"
          >
            LinkedIn
          </a>
          <a
            href="#"
            className="rounded-full border border-white/15 px-6 py-3 text-sm font-medium text-void-text transition hover:bg-white/10"
          >
            GitHub
          </a>
        </motion.div>
      </motion.div>

      <div className="relative z-10 mx-auto mt-20 flex max-w-5xl items-center justify-between px-6 font-mono text-xs text-void-muted">
        <span>&copy; {new Date().getFullYear()} C2C Programming Club</span>
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-void-text transition hover:bg-white/10"
          aria-label="Back to top"
        >
          ↑
        </button>
      </div>
    </footer>
  );
}
