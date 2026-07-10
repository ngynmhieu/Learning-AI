import { Plus } from "lucide-react";

interface AddTileProps {
  onClick: () => void;
  label: string;
}

/** Shared "add new" card shell — same footprint as `Tile`, a dashed
 *  placeholder with a glass hover fill and a plus icon. Pair with a `Modal`
 *  for the actual create form; this component is just the trigger tile. */
export function AddTile({ onClick, label }: AddTileProps) {
  return (
    <button
      onClick={onClick}
      className="group relative flex aspect-[3/4] w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-md border border-dashed border-[var(--owl-border)] text-[var(--owl-brown-muted)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-[var(--owl-orange)]/60 hover:text-[var(--owl-brown-deep)] hover:shadow-[var(--owl-shadow-lift)] cursor-pointer"
    >
      <div
        className="pointer-events-none absolute inset-0 border border-white/15 bg-white/10 opacity-0
                   shadow-[var(--owl-shadow-glass-inset)] backdrop-blur-xl backdrop-saturate-150
                   transition-opacity duration-300 ease-out group-hover:opacity-100"
      />
      <Plus size={28} aria-hidden="true" className="relative" />
      <span className="relative text-xs">{label}</span>
    </button>
  );
}
