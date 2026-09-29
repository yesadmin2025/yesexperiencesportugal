/** A quiet, claim-adjacent reading trail; never a replacement for YES journey links. */
export type EditorialSource = { label: string; url: `https://${string}` };

export function EditorialSources({ sources }: { sources?: readonly EditorialSource[] }) {
  if (!sources?.length) return null;

  return (
    <aside aria-label="Sources & context" className="mt-4 text-[13px] leading-[1.7] text-[color:var(--charcoal-soft)]">
      <span className="font-medium text-[color:var(--charcoal)]">Sources & context</span>
      <ul className="mt-1 flex flex-wrap gap-x-5 gap-y-1">
        {sources.slice(0, 3).map(({ label, url }) => (
          <li key={url}>
            <a href={url} target="_blank" rel="noopener noreferrer" className="underline decoration-[color:var(--gold)] underline-offset-4 hover:text-[color:var(--teal)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--teal)]">
              {label} ↗
            </a>
          </li>
        ))}
      </ul>
    </aside>
  );
}