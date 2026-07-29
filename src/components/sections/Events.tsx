import SectionHeading from "../SectionHeading";

export default function Events() {
  return (
    <section id="events" className="mx-auto max-w-5xl px-6 py-24">
      <SectionHeading>Events</SectionHeading>

      <div className="mt-10 grid items-center gap-10 rounded-3xl border border-hairline bg-graphite p-6 sm:grid-cols-2 sm:p-10">
        <div className="mx-auto aspect-[4/3] w-full max-w-sm -rotate-3 rounded-2xl border border-white/10 bg-white/5 shadow-xl">
          <div className="flex h-full items-center justify-center font-mono text-xs uppercase tracking-widest text-white/30">
            Event Photo
          </div>
        </div>

        <div>
          <h3 className="font-display text-3xl font-semibold text-white sm:text-4xl">
            C2C Hack Day
          </h3>
          <p className="mt-4 text-white/70">
            Our flagship hackathon challenges participants to build creative,
            user-friendly solutions to real-world problems — with top teams
            winning prizes and bragging rights.
          </p>
        </div>
      </div>
    </section>
  );
}
