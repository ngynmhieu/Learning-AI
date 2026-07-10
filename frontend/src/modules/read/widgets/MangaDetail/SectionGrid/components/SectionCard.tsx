import { BookOpen, ImagePlus, Trash2 } from "lucide-react";
import { sectionLabel, type Section } from "../../../../entities";
import { Tile, TileActions } from "../../../../shared";

interface SectionCardProps {
  section: Section;
  editing: boolean;
  onOpen: (section: Section) => void;
  onAddPages: (section: Section) => void;
  onDelete: (section: Section) => void;
}

export function SectionCard({ section, editing, onOpen, onAddPages, onDelete }: SectionCardProps) {
  return (
    <div className="group relative">
      <Tile
        onClick={() => onOpen(section)}
        label={sectionLabel(section)}
        icon={<BookOpen size={28} aria-hidden="true" className="opacity-70" />}
      />
      {editing && (
        <TileActions
          actions={[
            { icon: ImagePlus, label: "Add pages", onClick: () => onAddPages(section) },
            { icon: Trash2, label: "Delete section", onClick: () => onDelete(section), tone: "danger" },
          ]}
        />
      )}
    </div>
  );
}
