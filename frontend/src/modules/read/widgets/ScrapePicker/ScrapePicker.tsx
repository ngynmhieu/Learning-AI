import { useState } from "react";
import { Globe } from "lucide-react";
import { useScrapePages } from "../../features/scrape-pages";
import { CandidateCard } from "./components/CandidateCard";

interface ScrapePickerProps {
  /** Called with the chosen URLs in pick order, plus the scraped page URL
   *  (sent as Referer — some sites hotlink-protect on it). */
  onImport: (urls: string[], referer: string) => Promise<void> | void;
  busy: boolean;
  importLabel?: string;
}

/** Paste URL → scrape candidates → pick + order → import. The import target
 *  (a section, or the pool) is the page's choice via `onImport`. */
export function ScrapePicker({ onImport, busy, importLabel = "Import" }: ScrapePickerProps) {
  const [url, setUrl] = useState("");
  const [picked, setPicked] = useState<string[]>([]); // in pick order
  const { scrape, candidates, sourceUrl, scraping, error, reset } = useScrapePages();

  const toggle = (candidateUrl: string) => {
    setPicked((prev) =>
      prev.includes(candidateUrl) ? prev.filter((u) => u !== candidateUrl) : [...prev, candidateUrl]
    );
  };

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

      {error && <p className="text-sm text-red-700">{error}</p>}

      {candidates.length > 0 && (
        <>
          <div className="flex items-center gap-3">
            <p className="text-xs text-[var(--owl-brown-muted)]">
              {candidates.length} image{candidates.length > 1 ? "s" : ""} found — click to pick, in reading order.
            </p>
            <button
              onClick={() => setPicked(candidates.map((c) => c.url))}
              className="text-xs text-[var(--owl-orange-deep)] hover:underline cursor-pointer"
            >
              Select all
            </button>
            {picked.length > 0 && (
              <button
                onClick={() => setPicked([])}
                className="text-xs text-[var(--owl-brown-muted)] hover:underline cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(6rem,1fr))] gap-2 max-h-[24rem] overflow-y-auto pr-1">
            {candidates.map((candidate) => (
              <CandidateCard
                key={candidate.url}
                url={candidate.url}
                order={picked.includes(candidate.url) ? picked.indexOf(candidate.url) : null}
                onToggle={() => toggle(candidate.url)}
              />
            ))}
          </div>
          {picked.length > 0 && (
            <button
              onClick={runImport}
              disabled={busy}
              className="w-fit rounded-md bg-[var(--owl-brown)] px-3 py-1.5 text-sm text-[var(--owl-cream)] hover:bg-[var(--owl-brown-deep)] transition-colors cursor-pointer disabled:opacity-50"
            >
              {busy ? "Importing…" : `${importLabel} ${picked.length} image${picked.length > 1 ? "s" : ""}`}
            </button>
          )}
        </>
      )}
    </div>
  );
}
