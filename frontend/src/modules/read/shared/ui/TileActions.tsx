import type { LucideIcon } from "lucide-react";
import { Tooltip } from "@/shared/ui";

interface TileAction {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  /** "danger" tints the hover state red for destructive actions (delete). */
  tone?: "default" | "danger";
  disabled?: boolean;
}

interface TileActionsProps {
  actions: TileAction[];
}

/** Hover-reveal action pill for the top-right corner of a `Tile` — the parent
 *  card needs `group relative` for the `group-hover` reveal to work. Shared by
 *  MangaCard and SectionCard so cover/section actions look and behave alike. */
export function TileActions({ actions }: TileActionsProps) {
  return (
    <div className="absolute right-1.5 top-1.5 flex items-center gap-0.5 rounded-md bg-[var(--owl-parchment)]/80 p-0.5 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
      {actions.map(({ icon: Icon, label, onClick, tone = "default", disabled }) => (
        <Tooltip key={label} content={label} side="top">
          <button
            onClick={onClick}
            aria-label={label}
            disabled={disabled}
            className={`rounded p-1 text-[var(--owl-brown-muted)] transition-colors cursor-pointer disabled:opacity-70 ${
              tone === "danger"
                ? "hover:bg-[var(--owl-danger)]/10 hover:text-[var(--owl-danger)]"
                : "hover:bg-[var(--owl-brown-mid)]/10 hover:text-[var(--owl-brown-deep)]"
            }`}
          >
            <Icon size={14} />
          </button>
        </Tooltip>
      ))}
    </div>
  );
}
