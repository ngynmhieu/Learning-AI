import { useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Upload, Globe, Trash2, Pencil, Check } from "lucide-react";
import { LoadingDialog, Tabs } from "@/shared/ui";
import { useSignedUrls, useClickSelect, ImageLightbox, UploadTray, ScrapePicker } from "../shared";
import { usePoolAssets } from "../entities";
import { useCollectToPool, useDiscardFromPool } from "../features";
import { PoolGrid } from "../widgets";

type CollectMode = "scrape" | "upload";

const COLLECT_MODE_TABS: { value: CollectMode; label: string; icon: typeof Globe }[] = [
  { value: "scrape", label: "Scrape", icon: Globe },
  { value: "upload", label: "Upload", icon: Upload },
];

/** /lector/pool — manage the staging pool: collect images (scrape or upload)
 *  with no manga attached, or discard ones you don't want. Organizing them
 *  into a manga's volume/chapter happens from that section, not here. */
export function PoolPage() {
  const navigate = useNavigate();
  const { assets, loading, error, addAssets, removeAssets } = usePoolAssets();
  const urls = useSignedUrls(assets.map((a) => a.storagePath));

  const [mode, setMode] = useState<CollectMode>("scrape");
  const { importUrlsToPool, uploadFilesToPool, collecting, importStatus } = useCollectToPool();

  /** View is read-only (click to preview); edit reveals selection + delete. */
  const [editing, setEditing] = useState(false);
  /** Index into `assets` for the view-mode lightbox, or null when closed. */
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  /** Selected asset ids, for bulk delete — click toggles one, shift-click
   *  extends from the last-clicked card to the current one. */
  const { picked: selected, setPicked: setSelected, onItemClick: handleSelectClick } = useClickSelect(
    assets.map((a) => a.id)
  );
  const { discardOne, discardMany, deletingIds } = useDiscardFromPool();

  const toggleEditing = () => {
    setEditing((e) => !e);
    setSelected([]);
  };

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

  const discardSingle = (assetId: string) => discardOne(assetId, handleDiscarded);
  const deleteSelected = () => discardMany(selected, handleDiscarded);

  // Initial load — show only the mascot dialog, nothing else on the page yet.
  if (loading && assets.length === 0) {
    return <LoadingDialog fullScreen={false} message="Fetching your pool…" />;
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-5xl px-6 py-6 flex flex-col gap-5">
        <header className="flex items-center gap-3">
          <button
            onClick={() => navigate("/lector")}
            aria-label="Back to library"
            className="p-1.5 rounded-md text-[var(--owl-brown-muted)] transition-colors hover:bg-[var(--owl-brown-mid)]/10 hover:text-[var(--owl-brown-deep)] cursor-pointer"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="flex-1 min-w-0 text-xl text-[var(--owl-brown-dark)] truncate">Image pool</h1>
          <button
            onClick={toggleEditing}
            className="flex items-center gap-1.5 rounded-md border border-[var(--owl-border)] px-3 py-1.5 text-sm text-[var(--owl-brown)] hover:bg-[var(--owl-brown-mid)]/10 transition-colors cursor-pointer"
          >
            {editing ? <Check size={15} aria-hidden="true" /> : <Pencil size={15} aria-hidden="true" />}
            {editing ? "Done" : "Edit"}
          </button>
        </header>

        <section className="rounded-md border border-[var(--owl-border)] bg-[var(--owl-cream)]/30 p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <h2 className="flex-1 text-xs font-medium text-[var(--owl-brown-deep)]">Collect images</h2>
            <Tabs tabs={COLLECT_MODE_TABS} active={mode} onChange={setMode} layoutId="pool-collect-mode" />
          </div>
          {mode === "scrape" ? (
            <ScrapePicker
              busy={collecting}
              importStatus={importStatus}
              importLabel="Collect"
              onImport={async (urls, referer) => {
                await importUrlsToPool(urls, referer, addAssets);
              }}
            />
          ) : (
            <UploadTray
              busy={collecting}
              uploadStatus={importStatus}
              confirmLabel="Collect"
              onConfirm={async (items) => {
                await uploadFilesToPool(items, addAssets);
              }}
            />
          )}
        </section>

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

        {error ? (
          <p className="py-8 text-center text-sm text-[var(--owl-brown-muted)]">Couldn't load the pool.</p>
        ) : (
          <PoolGrid
            assets={assets}
            urls={urls}
            editing={editing}
            selected={selected}
            deletingIds={deletingIds}
            onCardClick={handleCardClick}
            onDiscard={discardSingle}
          />
        )}
      </div>

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
    </div>
  );
}
