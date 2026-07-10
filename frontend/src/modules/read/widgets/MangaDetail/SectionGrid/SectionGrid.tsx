import owlMascot from "@/shared/assets/owl_reading_book_with_glasses.png";
import type { Section, SectionKind } from "../../../entities";
import { TileGrid } from "../../../shared";
import { SectionCard } from "./components/SectionCard";
import { AddSectionCard } from "./components/AddSectionCard";

interface SectionGridProps {
  kind: SectionKind;
  sections: Section[];
  editing: boolean;
  onOpen: (section: Section) => void;
  onAddPages: (section: Section) => void;
  onDelete: (section: Section) => void;
  onCreate: (input: { number: number | null; title: string | null }) => Promise<void> | void;
  creating: boolean;
}

/** One tab's sections in reading order (backend sorts by kind, number). View
 *  mode is read-only; edit mode adds the "add" tile and per-card hover
 *  actions. Same card layout as MangaGrid so library, volumes and chapters
 *  all read as one visual language. */
export function SectionGrid({
  kind,
  sections,
  editing,
  onOpen,
  onAddPages,
  onDelete,
  onCreate,
  creating,
}: SectionGridProps) {
  return (
    <TileGrid
      count={sections.length}
      editing={editing}
      addTile={<AddSectionCard kind={kind} onCreate={onCreate} creating={creating} />}
      emptyMessage={`No ${kind}s yet.`}
      emptyIcon={<img src={owlMascot} alt="" aria-hidden="true" className="w-16 opacity-70" />}
    >
      {sections.map((section) => (
        <SectionCard
          key={section.id}
          section={section}
          editing={editing}
          onOpen={onOpen}
          onAddPages={onAddPages}
          onDelete={onDelete}
        />
      ))}
    </TileGrid>
  );
}
