import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { useSignedUrls, useClickSelect, ImageLightbox } from "../../shared";
import { useDiscardFromLibrary } from "../../features";
import type { LibraryAsset } from "../../entities";
import { PoolGrid } from "./PoolGrid";

interface LibraryStorageProps {
  assets: LibraryAsset[];
  error: string | null;
  editing: boolean;
  removeAssets: (ids: string[]) => void;
}

/** The pool itself — every collected image, awaiting organizing into a
 *  manga's volume/chapter from that section (not from here). View mode is
 *  read-only (click to preview); edit mode reveals selection + bulk delete. */
export function LibraryStorage({ assets, error, editing, removeAssets }: LibraryStorageProps) {
  const urls = useSignedUrls(assets.map((a) => a.storagePath));

  /** Index into `assets` for the view-mode lightbox, or null when closed. */
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  /** Selected asset ids, for bulk delete — click toggles one, shift-click
   *  extends from the last-clicked card to the current one. */
  const { picked: selected, setPicked: setSelected, onItemClick: handleSelectClick } = useClickSelect(
    assets.map((a) => a.id)
  );
  const { discardImage, discardImages, deletingIds } = useDiscardFromLibrary();

  // Clear the selection whenever edit mode is entered or left, so a stale
  // selection from a previous edit session never lingers.
  useEffect(() => {
    setSelected([]);
  }, [editing, setSelected]);

  const handleCardClick = (assetId: string, index: number, event: React.MouseEvent) => {
    if (editing) {
      handleSelectClick(assetId, index, event);
      return;
    }
    setPreviewIndex(index);
  };

  const previewAsset = previewIndex !== null ? assets[previewIndex] : null;
  const previewUrl = previewAsset ? (urls[previewAsset.storagePath] ?? null) : null;

  const handleDiscarded = (assetId: string) => {
    removeAssets([assetId]);
    setSelected((prev) => prev.filter((id) => id !== assetId));
  };

  const discardSingle = (assetId: string) => discardImage(assetId, handleDiscarded);
  const deleteSelected = () => discardImages(selected, handleDiscarded);

  if (error) {
    return <p className="py-8 text-center text-sm text-[var(--owl-brown-muted)]">Couldn't load the pool.</p>;
  }

  return (
    <>
      {editing && selected.length > 0 && (
        <section className="flex flex-wrap items-center gap-2 rounded-md border border-[var(--owl-border)] bg-[var(--owl-cream)]/40 px-4 py-3">
          <p className="text-sm text-[var(--owl-brown-deep)]">
            {selected.length} image{selected.length > 1 ? "s" : ""} selected
          </p>
          <button
            onClick={() => setSelected(assets.map((a) => a.id))}
            className="text-xs text-[var(--owl-orange-deep)] hover:underline cursor-pointer"
          >
            Select all
          </button>
          <button
            onClick={() => setSelected([])}
            className="text-xs text-[var(--owl-brown-muted)] hover:underline cursor-pointer"
          >
            Clear
          </button>
          <button
            onClick={deleteSelected}
            disabled={selected.every((id) => deletingIds.has(id))}
            className="ml-auto flex items-center gap-1.5 rounded-md bg-[var(--owl-danger)] px-3 py-1.5 text-sm text-[var(--owl-cream)] hover:bg-[var(--owl-danger-deep)] transition-colors cursor-pointer disabled:opacity-50"
          >
            <Trash2 size={15} aria-hidden="true" />
            Delete {selected.length}
          </button>
        </section>
      )}

      <PoolGrid
        assets={assets}
        urls={urls}
        editing={editing}
        selected={selected}
        deletingIds={deletingIds}
        onCardClick={handleCardClick}
        onDiscard={discardSingle}
      />

      <ImageLightbox
        imageUrl={previewUrl}
        onClose={() => setPreviewIndex(null)}
        onPrev={previewIndex !== null && previewIndex > 0 ? () => setPreviewIndex(previewIndex - 1) : undefined}
        onNext={
          previewIndex !== null && previewIndex < assets.length - 1
            ? () => setPreviewIndex(previewIndex + 1)
            : undefined
        }
      />
    </>
  );
}
