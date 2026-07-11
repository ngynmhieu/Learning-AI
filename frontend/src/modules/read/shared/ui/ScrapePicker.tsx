import { useState } from "react";
import { Globe } from "lucide-react";
import { useScrapePages } from "../../features/scrape-pages";
import { useClickSelect } from "../useClickSelect";
import type { ImportStatus } from "../importStatus";
import { PickerGrid } from "./PickerGrid";

interface ScrapePickerProps {
  /** Called with the chosen URLs in pick order, plus the scraped page URL
   *  (sent as Referer — some sites hotlink-protect on it). */
  onImport: (urls: string[], referer: string) => Promise<void> | void;
  busy: boolean;
  /** Per-URL status while `busy` — each candidate shows its own spinner/done
   *  state instead of a single numeric progress readout. */
  importStatus?: Record<string, ImportStatus>;
  importLabel?: string;
}

/** Paste URL → scrape candidates → pick + order → import. The import target
 *  (a section, or the pool) is the page's choice via `onImport`. */
export function ScrapePicker({ onImport, busy, importStatus, importLabel = "Import" }: ScrapePickerProps) {
  const [url, setUrl] = useState("");
  const { scrape, candidates, sourceUrl, scraping, error, reset } = useScrapePages();
  const { picked, setPicked, onItemClick } = useClickSelect(candidates.map((c) => c.url));

  const runScrape = async () => {
    setPicked([]);
    await scrape(url);
  };

  const runImport = async () => {
    if (!sourceUrl || picked.length === 0) return;
    await onImport(picked, sourceUrl);
    setPicked([]);
    setUrl("");
    reset();
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && runScrape()}
          placeholder="Paste a chapter URL to scrape…"
          className="flex-1 min-w-0 rounded-md border border-[var(--owl-border)] bg-transparent px-3 py-1.5 text-sm text-[var(--owl-brown-deep)] placeholder:text-[var(--owl-brown-muted)] outline-none focus:border-[var(--owl-orange)]"
        />
        <button
          onClick={runScrape}
          disabled={scraping || !url.trim()}
          className="flex items-center gap-1.5 rounded-md border border-[var(--owl-border)] px-3 py-1.5 text-sm text-[var(--owl-brown)] hover:bg-[var(--owl-brown-mid)]/10 transition-colors cursor-pointer disabled:opacity-50"
        >
          <Globe size={15} aria-hidden="true" />
          {scraping ? "Scraping…" : "Scrape"}
        </button>
      </div>

      {error && <p className="text-sm text-[var(--owl-danger)]">{error}</p>}

      <PickerGrid
        items={candidates.map((c) => ({ key: c.url, previewUrl: c.url }))}
        picked={picked}
        onItemClick={onItemClick}
        onSelectAll={() => setPicked(candidates.map((c) => c.url))}
        onClear={() => setPicked([])}
        busy={busy}
        busyLabel="Importing…"
        confirmLabel={importLabel}
        importStatus={importStatus}
        onConfirm={runImport}
      />
    </div>
  );
}
