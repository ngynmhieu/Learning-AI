import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { ArrowLeft, Plus, Trash2, Upload, Globe, X } from "lucide-react";
import { readApi } from "../shared";
import {
  useReadLibrary,
  sectionLabel,
  type MangaDetail,
  type Section,
  type SectionKind,
} from "../entities";
import { useCreateSection, useUploadPages, useImportPages } from "../features";
import { SectionTabs, SectionGrid, UploadTray, ScrapePicker } from "../widgets";

/** /lector/manga/:mangaId — one series: Volumes/Chapters tabs, add sections,
 *  and fill a section with pages (local upload or scrape) via the panel below. */
export function MangaDetailPage() {
  const { mangaId } = useParams();
  const navigate = useNavigate();
  const { remove } = useReadLibrary();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab: SectionKind = searchParams.get("tab") === "chapters" ? "chapter" : "volume";

  const [detail, setDetail] = useState<MangaDetail | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [activeSection, setActiveSection] = useState<Section | null>(null);

  const { createSection, creating } = useCreateSection();
  const [newNumber, setNewNumber] = useState("");
  const [newTitle, setNewTitle] = useState("");

  // Post-action refetch (create/delete section) — called from event handlers only.
  const refresh = useCallback(async () => {
    if (!mangaId) return;
    try {
      setDetail(await readApi.getManga(mangaId));
    } catch {
      setNotFound(true);
    }
  }, [mangaId]);

  // Initial load — no synchronous setState in the effect body.
  useEffect(() => {
    if (!mangaId) return;
    let cancelled = false;
    readApi
      .getManga(mangaId)
      .then((loaded) => {
        if (!cancelled) setDetail(loaded);
      })
      .catch(() => {
        if (!cancelled) setNotFound(true);
      });
    return () => {
      cancelled = true;
    };
  }, [mangaId]);

  if (notFound) {
    return <p className="py-12 text-center text-sm text-[var(--owl-brown-muted)]">Manga not found.</p>;
  }
  if (!detail) {
    return <p className="py-12 text-center text-sm text-[var(--owl-brown-muted)]">Loading…</p>;
  }

  const sections = detail.sections.filter((s) => s.kind === tab);

  const addSection = async () => {
    const number = newNumber.trim() === "" ? null : Number(newNumber);
    const section = await createSection(detail.id, {
      kind: tab,
      number: Number.isNaN(number) ? null : number,
      title: newTitle.trim() || null,
    });
    setNewNumber("");
    setNewTitle("");
    await refresh();
    setActiveSection(section); // fresh section → straight to adding pages
  };

  const deleteSection = async (section: Section) => {
    await readApi.deleteSection(section.id);
    if (activeSection?.id === section.id) setActiveSection(null);
    await refresh();
  };

  const deleteManga = async () => {
    await remove(detail.id);
    navigate("/lector");
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
          <div className="flex-1 min-w-0">
            <h1 className="text-xl text-[var(--owl-brown-dark)] truncate">{detail.title}</h1>
            {detail.description && (
              <p className="text-sm text-[var(--owl-brown-muted)] truncate">{detail.description}</p>
            )}
          </div>
          <button
            onClick={deleteManga}
            aria-label="Delete manga"
            className="p-1.5 rounded text-[var(--owl-brown-muted)] hover:text-red-600 cursor-pointer"
          >
            <Trash2 size={16} />
          </button>
        </header>

        <SectionTabs
          active={tab}
          onChange={(kind) => setSearchParams({ tab: kind === "chapter" ? "chapters" : "volumes" })}
        />

        <SectionGrid
          sections={sections}
          onOpen={(section) => navigate(`/lector/read/${section.id}`)}
          onAddPages={setActiveSection}
          onDelete={deleteSection}
        />

        <div className="flex items-center gap-2">
          <input
            value={newNumber}
            onChange={(e) => setNewNumber(e.target.value)}
            placeholder="No."
            inputMode="decimal"
            className="w-16 rounded-md border border-[var(--owl-border)] bg-transparent px-2 py-1.5 text-sm text-[var(--owl-brown-deep)] placeholder:text-[var(--owl-brown-muted)] outline-none focus:border-[var(--owl-orange)]"
          />
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addSection()}
            placeholder={`New ${tab} title (optional)…`}
            className="flex-1 min-w-0 max-w-sm rounded-md border border-[var(--owl-border)] bg-transparent px-3 py-1.5 text-sm text-[var(--owl-brown-deep)] placeholder:text-[var(--owl-brown-muted)] outline-none focus:border-[var(--owl-orange)]"
          />
          <button
            onClick={addSection}
            disabled={creating}
            className="flex items-center gap-1.5 rounded-md border border-[var(--owl-border)] px-3 py-1.5 text-sm text-[var(--owl-brown)] hover:bg-[var(--owl-brown-mid)]/10 transition-colors cursor-pointer disabled:opacity-50"
          >
            <Plus size={15} aria-hidden="true" />
            Add {tab}
          </button>
        </div>

        {activeSection && (
          <AddPagesPanel
            key={activeSection.id}
            mangaId={detail.id}
            section={activeSection}
            onClose={() => setActiveSection(null)}
            onDone={() => navigate(`/lector/read/${activeSection.id}`)}
          />
        )}
      </div>
    </div>
  );
}

interface AddPagesPanelProps {
  mangaId: string;
  section: Section;
  onClose: () => void;
  onDone: () => void;
}

/** Fill one section with pages — Upload (direct-to-storage) or Scrape (backend
 *  import). New pages append after the section's existing ones. */
function AddPagesPanel({ mangaId, section, onClose, onDone }: AddPagesPanelProps) {
  const [mode, setMode] = useState<"upload" | "scrape">("upload");
  const [pageCount, setPageCount] = useState<number | null>(null);
  const { uploadPages, uploading } = useUploadPages(mangaId, section.id);
  const { importPages, importing } = useImportPages(section.id);

  useEffect(() => {
    let cancelled = false;
    readApi.listPages(section.id).then((pages) => {
      if (!cancelled) setPageCount(pages.length);
    });
    return () => {
      cancelled = true;
    };
  }, [section.id]);

  const ready = pageCount !== null;

  return (
    <section className="rounded-md border border-[var(--owl-border)] bg-[var(--owl-cream)]/30 p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <h2 className="flex-1 text-sm font-medium text-[var(--owl-brown-deep)]">
          Add pages to {sectionLabel(section)}
          {pageCount !== null && pageCount > 0 && (
            <span className="ml-2 text-xs font-normal text-[var(--owl-brown-muted)]">
              ({pageCount} page{pageCount > 1 ? "s" : ""} already — new ones append)
            </span>
          )}
        </h2>
        <div className="flex gap-1 rounded-md border border-[var(--owl-border)] p-0.5">
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
        </div>
        <button
          onClick={onClose}
          aria-label="Close panel"
          className="p-1 rounded text-[var(--owl-brown-muted)] hover:text-[var(--owl-brown-deep)] cursor-pointer"
        >
          <X size={15} />
        </button>
      </div>

      {!ready ? (
        <p className="text-sm text-[var(--owl-brown-muted)]">Loading…</p>
      ) : mode === "upload" ? (
        <UploadTray
          busy={uploading}
          onConfirm={async (files) => {
            await uploadPages(files, pageCount);
            onDone();
          }}
        />
      ) : (
        <ScrapePicker
          busy={importing}
          onImport={async (urls, referer) => {
            await importPages(urls, referer);
            onDone();
          }}
        />
      )}
    </section>
  );
}
