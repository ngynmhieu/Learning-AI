import type { Section } from "../../entities";
import { SectionCard } from "./components/SectionCard";

interface SectionGridProps {
  sections: Section[];
  onOpen: (section: Section) => void;
  onAddPages: (section: Section) => void;
  onDelete: (section: Section) => void;
}

/** One tab's sections in reading order (backend sorts by kind, number). */
export function SectionGrid({ sections, onOpen, onAddPages, onDelete }: SectionGridProps) {
  if (sections.length === 0) {
    return (
      <p className="py-6 text-sm text-[var(--owl-brown-muted)]">
        Nothing here yet — add one below.
      </p>
    );
  }
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] gap-2">
      {sections.map((section) => (
        <SectionCard
          key={section.id}
          section={section}
          onOpen={onOpen}
          onAddPages={onAddPages}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
