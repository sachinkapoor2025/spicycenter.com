export type CopySection = {
  heading: string;
  level?: 2 | 3;
  paragraphs?: readonly string[];
  items?: readonly string[];
  after?: readonly string[];
};

export function SuppliedPageCopy({
  sections,
  className = "",
}: {
  sections: readonly CopySection[];
  className?: string;
}) {
  return (
    <div className={`max-w-3xl space-y-8 ${className}`}>
      {sections.map((section) => (
        <section key={section.heading}>
          {section.level === 3 ? (
            <h3 className="font-serif text-xl text-primary leading-snug">{section.heading}</h3>
          ) : (
            <h2 className="font-serif text-2xl sm:text-[1.65rem] text-primary leading-snug">{section.heading}</h2>
          )}
          {section.paragraphs?.map((paragraph) => (
            <p key={paragraph} className="mt-3 text-muted leading-relaxed">
              {paragraph}
            </p>
          ))}
          {section.items ? (
            <ul className="mt-3 list-disc space-y-2 pl-5 text-muted leading-relaxed">
              {section.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
          {section.after?.map((paragraph) => (
            <p key={paragraph} className="mt-3 text-muted leading-relaxed">
              {paragraph}
            </p>
          ))}
        </section>
      ))}
    </div>
  );
}
