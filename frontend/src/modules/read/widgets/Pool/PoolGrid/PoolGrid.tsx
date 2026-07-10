import { AnimatePresence, motion } from "motion/react";
import owlMascot from "@/shared/assets/owl_reading_book_with_glasses.png";
import type { LibraryAsset } from "../../../entities";
import { PoolCard } from "./components/PoolCard";

interface PoolGridProps {
  assets: LibraryAsset[];
  /** path → signed URL map for the assets' previews. */
  urls: Record<string, string>;
  /** Edit mode reveals selection + the discard bin; view mode just opens a
   *  lightbox on click. */
  editing: boolean;
  /** Selected asset ids — order doesn't matter for delete, just membership. */
  selected: string[];
  /** Assets currently being discarded (single or bulk) — their card shows a
   *  spinner and can't be re-triggered. */
  deletingIds: Set<string>;
  /** Click on card `index` (asset `assetId`) — in edit mode this shift-extends
   *  from the last clicked card when `event.shiftKey`, otherwise toggles just
   *  this one; in view mode the page opens the lightbox instead. */
  onCardClick: (assetId: string, index: number, event: React.MouseEvent) => void;
  onDiscard: (assetId: string) => void;
}

/** The unassigned pool — every collected image, awaiting organizing into a
 *  manga's volume/chapter from that section (not from here). Cards fade out
 *  and the rest reflow as each delete actually finishes, not all at once. */
export function PoolGrid({ assets, urls, editing, selected, deletingIds, onCardClick, onDiscard }: PoolGridProps) {
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
      <AnimatePresence>
        {assets.map((asset, index) => (
          <motion.div
            key={asset.id}
            layout
            initial={false}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ duration: 0.2 }}
          >
            <PoolCard
              asset={asset}
              imageUrl={urls[asset.storagePath]}
              editing={editing}
              selected={selected.includes(asset.id)}
              deleting={deletingIds.has(asset.id)}
              onClick={(event) => onCardClick(asset.id, index, event)}
              onDiscard={() => onDiscard(asset.id)}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
