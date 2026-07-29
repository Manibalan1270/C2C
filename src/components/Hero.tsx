import clubLogo from "../assets/club-logo.jpeg";

export default function Hero() {
  return (
    <section className="flex min-h-[80vh] w-full flex-col items-center justify-center bg-void px-6 py-24 text-center text-void-text">
      <img
        src={clubLogo}
        alt="C2C Programming Club"
        className="h-28 w-28 rounded-2xl object-cover sm:h-36 sm:w-36"
      />

      <p className="mt-8 font-mono text-xs uppercase tracking-[0.3em] text-void-muted">
        Compete to Compute
      </p>
      <h1 className="mt-4 font-display text-5xl font-semibold tracking-tight sm:text-7xl">
        C2C Programming Club
      </h1>
      <p className="mt-6 max-w-xl text-base text-void-muted sm:text-lg">
        Where curiosity meets code. Solve, compete, and level up with a community
        built for people who love to build.
      </p>

      <a
        href="#about"
        className="mt-10 rounded-full border border-void-muted px-6 py-3 text-sm font-medium text-void-text transition hover:bg-white/10"
      >
        Explore More
      </a>
    </section>
  );
}
