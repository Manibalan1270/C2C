interface SectionHeadingProps {
  children: string;
}

export default function SectionHeading({ children }: SectionHeadingProps) {
  return (
    <div className="relative inline-block px-4 py-2">
      <span className="absolute left-0 top-0 h-5 w-5 border-l-2 border-t-2 border-graphite" />
      <span className="absolute bottom-0 right-0 h-5 w-5 border-b-2 border-r-2 border-graphite" />
      <h2 className="font-display text-4xl sm:text-5xl font-semibold uppercase tracking-wide text-graphite">
        {children}
      </h2>
    </div>
  );
}
