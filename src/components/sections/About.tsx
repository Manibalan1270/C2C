import SectionHeading from "../SectionHeading";

export default function About() {
  return (
    <section id="about" className="mx-auto max-w-5xl px-6 py-24">
      <SectionHeading>About Us</SectionHeading>

      <div className="mt-10 rounded-2xl border border-hairline bg-graphite p-6 sm:p-10">
        <p className="text-white/90">
          C2C — Compete to Compute — is where curious minds sharpen their craft. We're
          building a community of coders who solve problems, ship projects, and push
          each other to get better every week.
        </p>
        <p className="mt-4 text-white/70">
          Weekly challenges, coding roadmaps, hackathon teams, and a leaderboard that
          actually means something — all built by members, for members.
        </p>
      </div>
    </section>
  );
}
