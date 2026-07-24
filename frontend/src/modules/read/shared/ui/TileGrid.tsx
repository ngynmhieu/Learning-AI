import type { ReactNode } from "react";

interface TileGridProps {
  count: number;
  editing: boolean;
  /** A configured `AddTile` (+ its own modal) — shown alone when empty and
   *  editing, or as the grid's first tile otherwise. Hidden entirely outside
   *  edit mode. */
  addTile: ReactNode;
  emptyMessage: string;
  /** Shown above `emptyMessage` in the view-mode empty state, e.g. a mascot. */
  emptyIcon?: ReactNode;
  children: ReactNode;
}

/** Shared empty/populated grid shell for anything shown as a `Tile` grid —
 *  library, volumes, chapters. View mode is read-only; edit mode reveals the
 *  add tile (centered alone when empty, first tile otherwise). */
export function TileGrid({ count, editing, addTile, emptyMessage, emptyIcon, children }: TileGridProps) {
  if (count === 0) {
    if (!editing) {
      return emptyIcon ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          {emptyIcon}
          <p className="text-sm text-[var(--owl-brown-muted)]">{emptyMessage}</p>
        </div>
      ) : (
        <p className="py-6 text-sm text-[var(--owl-brown-muted)]">{emptyMessage}</p>
      );
    }
    return (
      <div className="flex justify-center py-12">
        <div className="w-40">{addTile}</div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-4">
      {editing && addTile}
      {children}
    </div>
  );
}
