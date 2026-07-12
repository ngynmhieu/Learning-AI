import owlMascot from "@/shared/assets/owl_reading_book_with_glasses.png";
import type { Section, SectionKind } from "../../../entities";
import { TileGrid, useSignedUrls } from "../../../shared";
import { SectionCard } from "./components/SectionCard";
import { AddSectionCard } from "./components/AddSectionCard";

interface SectionGridProps {
  kind: SectionKind;
  sections: Section[];
  editing: boolean;
  onOpen: (section: Section) => void;
  onCoverChanged: () => void;
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
  onCoverChanged,
  onDelete,
  onCreate,
  creating,
}: SectionGridProps) {
  const coverUrls = useSignedUrls(sections.map((s) => s.coverPath ?? s.firstPagePath));

  return (
    <TileGrid
      count={sections.length}
      editing={editing}
      addTile={<AddSectionCard kind={kind} onCreate={onCreate} creating={creating} />}
      emptyMessage={`No ${kind}s yet.`}
      emptyIcon={<img src={owlMascot} alt="" aria-hidden="true" className="w-16 opacity-70" />}
    >
      {sections.map((section) => {
        const coverPath = section.coverPath ?? section.firstPagePath;
        return (
          <SectionCard
            key={section.id}
            section={section}
            coverUrl={coverPath ? coverUrls[coverPath] : undefined}
            editing={editing}
            onOpen={onOpen}
            onCoverChanged={onCoverChanged}
            onDelete={onDelete}
          />
        );
      })}
    </TileGrid>
  );
}
