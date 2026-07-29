import SectionHeading from "../SectionHeading";

const MOCK_MEMBERS = [
  { name: "Add Name", role: "Chairperson" },
  { name: "Add Name", role: "Vice Chairperson" },
  { name: "Add Name", role: "Technical Lead" },
  { name: "Add Name", role: "Events Lead" },
];

export default function BoardMembers() {
  return (
    <section id="board" className="mx-auto max-w-5xl px-6 py-24">
      <SectionHeading>Board Members</SectionHeading>

      <div className="mt-10 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
        {MOCK_MEMBERS.map((member) => (
          <div key={member.role} className="flex flex-col items-center text-center">
            <div className="flex h-28 w-28 items-center justify-center rounded-full border border-hairline bg-canvas">
              <span className="font-display text-2xl text-slate">?</span>
            </div>
            <h3 className="mt-4 font-serif text-lg text-graphite">{member.name}</h3>
            <p className="mt-1 font-mono text-xs uppercase tracking-wider text-slate">
              {member.role}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
