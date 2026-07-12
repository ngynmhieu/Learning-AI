import { useState } from "react";
import { BookOpen, ImagePlus } from "lucide-react";
import { sectionLabel, type Section } from "../../../../entities";
import { TileCard, PoolPickerModal } from "../../../../shared";

interface SectionCardProps {
  section: Section;
  /** Signed URL for `section.coverPath ?? section.firstPagePath`, when one resolved. */
  coverUrl?: string;
  editing: boolean;
  onOpen: (section: Section) => void;
  /** Called after a successful cover pick, so the page can refresh sections. */
  onCoverChanged: () => void;
  onDelete: (section: Section) => void;
}

export function SectionCard({ section, coverUrl, editing, onOpen, onCoverChanged, onDelete }: SectionCardProps) {
  const label = sectionLabel(section);
  const [coverPickerOpen, setCoverPickerOpen] = useState(false);

  return (
    <>
      <TileCard
        onClick={() => onOpen(section)}
        label={label}
        image={coverUrl}
        imageAlt={label}
        icon={<BookOpen size={28} aria-hidden="true" className="opacity-70" />}
        editing={editing}
        secondaryAction={{
          icon: ImagePlus,
          label: "Change cover",
          onClick: () => setCoverPickerOpen(true),
        }}
        onDelete={() => onDelete(section)}
        deleteLabel="Delete section"
        confirmTitle={`Delete ${label}?`}
        confirmDescription="This removes the section and its pages, and their files. This can't be undone."
      />

      <PoolPickerModal
        open={coverPickerOpen}
        onClose={() => setCoverPickerOpen(false)}
        target={{
          kind: "section-cover",
          sectionId: section.id,
          onDone: () => {
            setCoverPickerOpen(false);
            onCoverChanged();
          },
        }}
      />
    </>
  );
}
