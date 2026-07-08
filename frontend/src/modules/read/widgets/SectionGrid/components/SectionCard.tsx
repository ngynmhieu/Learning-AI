import { BookOpen, ImagePlus, Trash2 } from "lucide-react";
import { sectionLabel, type Section } from "../../../entities";

interface SectionCardProps {
  section: Section;
  onOpen: (section: Section) => void;
  onAddPages: (section: Section) => void;
  onDelete: (section: Section) => void;
}

export function SectionCard({ section, onOpen, onAddPages, onDelete }: SectionCardProps) {
  return (
    <div className="group flex items-center gap-2 rounded-md border border-[var(--owl-border)] bg-[var(--owl-cream)]/40 px-3 py-2 hover:shadow-[var(--shadow)] transition-shadow">
      <button
        onClick={() => onOpen(section)}
        className="flex flex-1 min-w-0 items-center gap-2 text-left cursor-pointer"
        title="Read"
      >
        <BookOpen size={16} className="shrink-0 text-[var(--owl-brown)]" aria-hidden="true" />
        <span className="text-sm text-[var(--owl-brown-deep)] truncate">{sectionLabel(section)}</span>
      </button>
      <div className="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onAddPages(section)}
          aria-label="Add pages"
          className="p-1 rounded text-[var(--owl-brown-muted)] hover:text-[var(--owl-brown-deep)] cursor-pointer"
        >
          <ImagePlus size={15} />
        </button>
        <button
          onClick={() => onDelete(section)}
          aria-label="Delete section"
          className="p-1 rounded text-[var(--owl-brown-muted)] hover:text-red-600 cursor-pointer"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  );
}
