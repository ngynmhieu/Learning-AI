import type { SectionKind } from "../entities";

interface SectionTabsProps {
  active: SectionKind;
  onChange: (kind: SectionKind) => void;
}

const TABS: { kind: SectionKind; label: string }[] = [
  { kind: "volume", label: "Volumes" },
  { kind: "chapter", label: "Chapters" },
];

/** Volumes | Chapters switch — the two tabs are just a `kind` filter. */
export function SectionTabs({ active, onChange }: SectionTabsProps) {
  return (
    <div className="flex gap-1 rounded-md border border-[var(--owl-border)] p-1 w-fit">
      {TABS.map(({ kind, label }) => (
        <button
          key={kind}
          onClick={() => onChange(kind)}
          className={`px-3 py-1 rounded text-sm transition-colors cursor-pointer ${
            active === kind
              ? "bg-[var(--owl-brown)]/10 text-[var(--owl-brown-deep)] font-medium"
              : "text-[var(--owl-brown-muted)] hover:text-[var(--owl-brown-deep)]"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
