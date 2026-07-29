interface SectionHeadingProps {
  children: string;
}

export default function SectionHeading({ children }: SectionHeadingProps) {
  return (
    <h2 className="font-display text-4xl sm:text-5xl font-semibold uppercase tracking-wide text-graphite">
      {children}
    </h2>
  );
}
