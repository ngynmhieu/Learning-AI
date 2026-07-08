import { Trash2 } from "lucide-react";
import type { LibraryAsset } from "../../../entities";

interface PoolCardProps {
  asset: LibraryAsset;
  /** Signed URL for the asset's Storage object. */
  imageUrl?: string;
  /** 0-based pick order when selected, or null when not selected. */
  order: number | null;
  onToggle: () => void;
  onDiscard: () => void;
}

export function PoolCard({ asset, imageUrl, order, onToggle, onDiscard }: PoolCardProps) {
  const selected = order !== null;

  return (
    <div
      className={`group relative aspect-[3/4] rounded-md overflow-hidden border-2 transition-colors ${
        selected ? "border-[var(--owl-orange)]" : "border-[var(--owl-border)] hover:border-[var(--owl-tan-mid)]"
      }`}
    >
      <button
        onClick={onToggle}
        className="size-full cursor-pointer"
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
      {selected && (
        <span className="absolute top-1 left-1 flex size-5 items-center justify-center rounded-full bg-[var(--owl-orange)] text-[0.65rem] font-medium text-[var(--owl-cream)] pointer-events-none">
          {order + 1}
        </span>
      )}
      <button
        onClick={onDiscard}
        aria-label="Discard from pool"
        className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-full bg-[var(--owl-brown-dark)]/70 text-[var(--owl-cream)] opacity-0 group-hover:opacity-100 hover:bg-red-700/80 transition-opacity cursor-pointer"
      >
        <Trash2 size={12} />
      </button>
    </div>
  );
}
