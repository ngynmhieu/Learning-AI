import type { ReactNode } from "react";

interface TileProps {
  onClick: () => void;
  /** Plain text shown below the card — decoupled from the card's own border/background. */
  label: string;
  /** Cover image, when one exists. */
  image?: string;
  imageAlt?: string;
  /** Fallback content when there's no `image` (e.g. a mascot or lucide icon). */
  icon?: ReactNode;
}

/** Shared card shell: a bordered, hoverable image/icon box with its label as
 *  plain text below (not part of the card itself). Used for anything shown as
 *  a grid of covers — manga, volumes, chapters. */
export function Tile({ onClick, label, image, imageAlt, icon }: TileProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <button
        onClick={onClick}
        className="flex aspect-[3/4] w-full items-center justify-center overflow-hidden rounded-md border border-[var(--owl-border)] bg-[var(--owl-cream-mid)]/50 transition-all hover:-translate-y-0.5 hover:shadow-[var(--owl-shadow-lift)] cursor-pointer"
      >
        {image ? (
          <img src={image} alt={imageAlt ?? ""} loading="lazy" className="size-full object-cover" />
        ) : (
          icon
        )}
      </button>
      <p className="truncate text-sm text-[var(--owl-brown-deep)]" title={label}>
        {label}
      </p>
    </div>
  );
}
