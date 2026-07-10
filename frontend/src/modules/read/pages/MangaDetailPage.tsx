import { useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { ArrowLeft, Pencil, Check, Upload, Globe, X } from "lucide-react";
import { LoadingDialog, Tabs } from "@/shared/ui";
import {
  sectionLabel,
  useMangaDetail,
  useSectionPages,
  type Section,
  type SectionKind,
} from "../entities";
import { useCreateSection, useDeleteSection, useUploadPages, useImportPages } from "../features";
import { SectionTabs, SectionGrid, UploadTray, ScrapePicker } from "../widgets";

/** /lector/manga/:mangaId — one series: Volumes/Chapters tabs, add sections,
 *  and fill a section with pages (local upload or scrape) via the panel below.
 *  Same view/edit split as the library: view is read-only, edit reveals the
 *  add-section tile and per-card hover actions. */
export function MangaDetailPage() {
  const { mangaId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab: SectionKind = searchParams.get("tab") === "chapters" ? "chapter" : "volume";

  const { detail, notFound, refresh } = useMangaDetail(mangaId);
  const [activeSection, setActiveSection] = useState<Section | null>(null);
  const [editing, setEditing] = useState(false);

  const { createSection, creating } = useCreateSection();
  const { deleteSection: deleteSectionApi } = useDeleteSection();

  if (notFound) {
    return <p className="py-12 text-center text-sm text-[var(--owl-brown-muted)]">Manga not found.</p>;
  }
  if (!detail) {
    return <LoadingDialog fullScreen={false} message="Fetching your manga…" />;
  }

  const sections = detail.sections.filter((s) => s.kind === tab);

  const addSection = async (input: { number: number | null; title: string | null }) => {
    const section = await createSection(detail.id, { kind: tab, ...input });
    await refresh();
    setActiveSection(section); // fresh section → straight to adding pages
  };

  const deleteSection = async (section: Section) => {
    await deleteSectionApi(section.id);
    if (activeSection?.id === section.id) setActiveSection(null);
    await refresh();
  };

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
          <div className="flex-1 min-w-0">
            <h1 className="text-xl text-[var(--owl-brown-dark)] truncate">{detail.title}</h1>
            {detail.description && (
              <p className="text-sm text-[var(--owl-brown-muted)] truncate">{detail.description}</p>
            )}
          </div>
          <button
            onClick={() => setEditing((e) => !e)}
            className="flex items-center gap-1.5 rounded-md border border-[var(--owl-border)] px-3 py-1.5 text-sm text-[var(--owl-brown)] hover:bg-[var(--owl-brown-mid)]/10 transition-colors cursor-pointer"
          >
            {editing ? <Check size={15} aria-hidden="true" /> : <Pencil size={15} aria-hidden="true" />}
            {editing ? "Done" : "Edit"}
          </button>
        </header>

        <SectionTabs
          active={tab}
          onChange={(kind) => setSearchParams({ tab: kind === "chapter" ? "chapters" : "volumes" })}
        />

        <SectionGrid
          kind={tab}
          sections={sections}
          editing={editing}
          onOpen={(section) => navigate(`/lector/read/${section.id}`)}
          onAddPages={setActiveSection}
          onDelete={deleteSection}
          onCreate={addSection}
          creating={creating}
        />

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

type AddPagesMode = "upload" | "scrape";

const ADD_PAGES_MODE_TABS: { value: AddPagesMode; label: string; icon: typeof Globe }[] = [
  { value: "upload", label: "Upload", icon: Upload },
  { value: "scrape", label: "Scrape", icon: Globe },
];

/** Fill one section with pages — Upload (direct-to-storage) or Scrape (backend
 *  import). New pages append after the section's existing ones. */
function AddPagesPanel({ mangaId, section, onClose, onDone }: AddPagesPanelProps) {
  const [mode, setMode] = useState<AddPagesMode>("upload");
  const { pages } = useSectionPages(section.id);
  const pageCount = pages?.length ?? null;
  const { uploadPages, uploading, uploadStatus } = useUploadPages(mangaId, section.id);
  const { importPages, importing, importStatus } = useImportPages(section.id);

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
        <Tabs tabs={ADD_PAGES_MODE_TABS} active={mode} onChange={setMode} layoutId="add-pages-mode" />
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
          uploadStatus={uploadStatus}
          onConfirm={async (items) => {
            await uploadPages(items, pageCount);
            onDone();
          }}
        />
      ) : (
        <ScrapePicker
          busy={importing}
          importStatus={importStatus}
          onImport={async (urls, referer) => {
            await importPages(urls, referer);
            onDone();
          }}
        />
      )}
    </section>
  );
}
