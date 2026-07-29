import { motion } from "framer-motion";

export default function ContactFooter() {
  return (
    <footer id="contact" className="border-t border-hairline">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.6 }}
        className="mx-auto max-w-5xl px-6 py-12 text-center"
      >
        <h2 className="font-display text-2xl font-semibold text-graphite">Get in touch</h2>
        <p className="mt-3 text-slate">
          Have a question, want to collaborate, or just want to say hi?
        </p>
        <a
          href="mailto:c2c@college.edu"
          className="mt-6 inline-block font-mono text-sm text-graphite underline"
        >
          c2c@college.edu
        </a>

        <p className="mt-10 font-mono text-xs text-hairline-strong">
          &copy; {new Date().getFullYear()} C2C Programming Club
        </p>
      </motion.div>
    </footer>
  );
}
