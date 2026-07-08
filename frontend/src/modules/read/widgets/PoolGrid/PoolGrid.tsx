import owlMascot from "@/shared/assets/owl_reading_book_with_glasses.png";
import type { LibraryAsset } from "../../entities";
import { PoolCard } from "./components/PoolCard";

interface PoolGridProps {
  assets: LibraryAsset[];
  /** path → signed URL map for the assets' previews. */
  urls: Record<string, string>;
  /** Currently picked asset ids, in pick order (= future page order). */
  selection: string[];
  onToggle: (assetId: string) => void;
  onDiscard: (assetId: string) => void;
}

/** The unassigned pool: click to pick assets in reading order, then the page's
 *  organize controls turn the picks into a section's pages. */
export function PoolGrid({ assets, urls, selection, onToggle, onDiscard }: PoolGridProps) {
  if (assets.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-12">
        <img src={owlMascot} alt="" aria-hidden="true" className="w-28 opacity-80" />
        <p className="text-sm text-[var(--owl-brown-muted)]">
          The pool is empty — scrape or upload images above to start collecting.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(7rem,1fr))] gap-2">
      {assets.map((asset) => (
        <PoolCard
          key={asset.id}
          asset={asset}
          imageUrl={urls[asset.storagePath]}
          order={selection.includes(asset.id) ? selection.indexOf(asset.id) : null}
          onToggle={() => onToggle(asset.id)}
          onDiscard={() => onDiscard(asset.id)}
        />
      ))}
    </div>
  );
}
