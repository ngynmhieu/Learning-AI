import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Upload, Globe, FolderInput } from "lucide-react";
import owlMascot from "@/shared/assets/owl_reading_book_with_glasses.png";
import { readApi, useSignedUrls } from "../shared";
import { useReadLibrary, usePoolAssets, sectionLabel, type Section } from "../entities";
import { useCollectToPool, useOrganizeFromPool } from "../features";
import { PoolGrid, UploadTray, ScrapePicker } from "../widgets";

/** /lector/pool — the staging pool: collect images (scrape or upload) with no
 *  manga attached, then pick + order them into a volume/chapter later. */
export function PoolPage() {
  const navigate = useNavigate();
  const { assets, loading, error, addAssets, removeAssets } = usePoolAssets();
  const urls = useSignedUrls(assets.map((a) => a.storagePath));

  const [mode, setMode] = useState<"scrape" | "upload">("scrape");
  const { importUrlsToPool, uploadFilesToPool, collecting } = useCollectToPool();

  /** Picked asset ids, in pick order (= the page order after organizing). */
  const [selection, setSelection] = useState<string[]>([]);

  const toggle = (assetId: string) => {
    setSelection((prev) =>
      prev.includes(assetId) ? prev.filter((id) => id !== assetId) : [...prev, assetId]
    );
  };

  const discard = async (assetId: string) => {
    await readApi.discardLibraryAsset(assetId);
    removeAssets([assetId]);
    setSelection((prev) => prev.filter((id) => id !== assetId));
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-5xl px-6 py-6 flex flex-col gap-5">
        <header className="flex items-center gap-3">
          <button
            onClick={() => navigate("/lector")}
            aria-label="Back to library"
            className="p-1 rounded text-[var(--owl-brown-muted)] hover:text-[var(--owl-brown-deep)] cursor-pointer"
          >
            <ArrowLeft size={18} />
          </button>
          <img src={owlMascot} alt="" aria-hidden="true" className="w-10" />
          <div className="flex-1 min-w-0">
            <h1 className="text-xl text-[var(--owl-brown-dark)]">Image pool</h1>
            <p className="text-sm text-[var(--owl-brown-muted)]">
              Collect now, organize into mangas later.
            </p>
          </div>
        </header>

        <section className="rounded-md border border-[var(--owl-border)] bg-[var(--owl-cream)]/30 p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <h2 className="flex-1 text-sm font-medium text-[var(--owl-brown-deep)]">Collect images</h2>
            <div className="flex gap-1 rounded-md border border-[var(--owl-border)] p-0.5">
              <button
                onClick={() => setMode("scrape")}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-colors cursor-pointer ${
                  mode === "scrape"
                    ? "bg-[var(--owl-brown)]/10 text-[var(--owl-brown-deep)] font-medium"
                    : "text-[var(--owl-brown-muted)]"
                }`}
              >
                <Globe size={12} aria-hidden="true" /> Scrape
              </button>
              <button
                onClick={() => setMode("upload")}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-colors cursor-pointer ${
                  mode === "upload"
                    ? "bg-[var(--owl-brown)]/10 text-[var(--owl-brown-deep)] font-medium"
                    : "text-[var(--owl-brown-muted)]"
                }`}
              >
                <Upload size={12} aria-hidden="true" /> Upload
              </button>
            </div>
          </div>
          {mode === "scrape" ? (
            <ScrapePicker
              busy={collecting}
              importLabel="Collect"
              onImport={async (urls, referer) => {
                addAssets(await importUrlsToPool(urls, referer));
              }}
            />
          ) : (
            <UploadTray
              busy={collecting}
              confirmLabel="Collect"
              onConfirm={async (files) => {
                addAssets(await uploadFilesToPool(files));
              }}
            />
          )}
        </section>

        {selection.length > 0 && (
          <OrganizeControls
            selection={selection}
            onOrganized={(ids) => {
              removeAssets(ids);
              setSelection([]);
            }}
          />
        )}

        {error ? (
          <p className="py-8 text-center text-sm text-[var(--owl-brown-muted)]">Couldn't load the pool.</p>
        ) : loading && assets.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--owl-brown-muted)]">Loading…</p>
        ) : (
          <PoolGrid
            assets={assets}
            urls={urls}
            selection={selection}
            onToggle={toggle}
            onDiscard={discard}
          />
        )}
      </div>
    </div>
  );
}

interface OrganizeControlsProps {
  /** Picked asset ids in pick order. */
  selection: string[];
  onOrganized: (assetIds: string[]) => void;
}

/** Pick a target manga + volume/chapter for the current selection, then move the
 *  assets in (pool → pages, in pick order — no re-upload, metadata only). */
function OrganizeControls({ selection, onOrganized }: OrganizeControlsProps) {
  const navigate = useNavigate();
  const { mangas } = useReadLibrary();
  const [mangaId, setMangaId] = useState("");
  const [sections, setSections] = useState<Section[]>([]);
  const [sectionId, setSectionId] = useState("");
  const { organize, organizing } = useOrganizeFromPool();

  // Fetch the chosen manga's sections; the reset happens in the select handler.
  useEffect(() => {
    if (!mangaId) return;
    let cancelled = false;
    readApi.getManga(mangaId).then((detail) => {
      if (!cancelled) setSections(detail.sections);
    });
    return () => {
      cancelled = true;
    };
  }, [mangaId]);

  const pickManga = (id: string) => {
    setMangaId(id);
    setSections([]);
    setSectionId("");
  };

  const run = async () => {
    if (!sectionId) return;
    await organize(sectionId, selection);
    onOrganized(selection);
    navigate(`/lector/read/${sectionId}`);
  };

  const selectClass =
    "rounded-md border border-[var(--owl-border)] bg-[var(--bg)] px-2 py-1.5 text-sm text-[var(--owl-brown-deep)] outline-none focus:border-[var(--owl-orange)] cursor-pointer";

  return (
    <section className="flex flex-wrap items-center gap-2 rounded-md border border-[var(--owl-orange)]/50 bg-[var(--accent-bg)] px-4 py-3">
      <p className="text-sm text-[var(--owl-brown-deep)]">
        {selection.length} image{selection.length > 1 ? "s" : ""} picked →
      </p>
      <select value={mangaId} onChange={(e) => pickManga(e.target.value)} className={selectClass}>
        <option value="">Choose manga…</option>
        {mangas.map((manga) => (
          <option key={manga.id} value={manga.id}>
            {manga.title}
          </option>
        ))}
      </select>
      <select
        value={sectionId}
        onChange={(e) => setSectionId(e.target.value)}
        disabled={!mangaId}
        className={selectClass}
      >
        <option value="">Choose section…</option>
        {sections.map((section) => (
          <option key={section.id} value={section.id}>
            {sectionLabel(section)}
          </option>
        ))}
      </select>
      <button
        onClick={run}
        disabled={!sectionId || organizing}
        className="flex items-center gap-1.5 rounded-md bg-[var(--owl-brown)] px-3 py-1.5 text-sm text-[var(--owl-cream)] hover:bg-[var(--owl-brown-deep)] transition-colors cursor-pointer disabled:opacity-50"
      >
        <FolderInput size={15} aria-hidden="true" />
        {organizing ? "Organizing…" : "Organize"}
      </button>
    </section>
  );
}
