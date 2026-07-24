import { Trash2, Check, Loader2 } from "lucide-react";
import type { LibraryAsset } from "../../../../entities";

interface PoolCardProps {
  asset: LibraryAsset;
  /** Signed URL for the asset's Storage object. */
  imageUrl?: string;
  /** Edit mode reveals selection + the discard bin; view mode just opens the
   *  lightbox on click. */
  editing: boolean;
  selected: boolean;
  /** Being discarded right now — shows a spinner and blocks re-triggering. */
  deleting: boolean;
  onClick: (event: React.MouseEvent) => void;
  onDiscard: () => void;
}

export function PoolCard({ asset, imageUrl, editing, selected, deleting, onClick, onDiscard }: PoolCardProps) {
  return (
    <div
      className={`group relative aspect-[3/4] rounded-md overflow-hidden border-2 transition-colors ${
        editing && selected
          ? "border-[var(--owl-orange)]"
          : "border-[var(--owl-border)] hover:border-[var(--owl-tan-mid)]"
      }`}
    >
      <button
        onClick={onClick}
        disabled={deleting}
        className="size-full cursor-pointer disabled:cursor-default"
        title={asset.sourceUrl ?? "Uploaded image"}
      >
        {imageUrl ? (
          <img src={imageUrl} alt="" loading="lazy" className="size-full object-cover" />
        ) : (
          <span className="flex size-full items-center justify-center bg-[var(--owl-cream-mid)]/50 text-xs text-[var(--owl-brown-muted)]">
            …
          </span>
        )}
      </button>
      {editing && selected && (
        <span className="absolute top-1 left-1 flex size-5 items-center justify-center rounded-full bg-[var(--owl-orange)] text-[var(--owl-cream)] pointer-events-none">
          <Check size={12} aria-hidden="true" />
        </span>
      )}
      {editing && !deleting && (
        <button
          onClick={onDiscard}
          aria-label="Discard from pool"
          className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-full bg-[var(--owl-brown-dark)]/70 text-[var(--owl-cream)] opacity-0 group-hover:opacity-100 hover:bg-[var(--owl-danger)] transition-opacity cursor-pointer"
        >
          <Trash2 size={12} />
        </button>
      )}
      {deleting && (
        <span className="absolute inset-0 flex items-center justify-center bg-black/40">
          <Loader2 size={18} aria-hidden="true" className="animate-spin text-white" />
        </span>
      )}
    </div>
  );
}
