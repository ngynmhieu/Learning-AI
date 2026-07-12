import { useCallback, useState } from "react";
import { readApi, type ScrapeCandidate } from "../../../shared";

/** Paste a URL → backend fetches the page and returns candidate images for the
 *  user to pick from. No persistence — import is a separate, second action. */
export function useScrapePages() {
  const [candidates, setCandidates] = useState<ScrapeCandidate[]>([]);
  /** The page URL the candidates came from — imports send it as the Referer. */
  const [sourceUrl, setSourceUrl] = useState<string | null>(null);
  const [scraping, setScraping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrape = useCallback(async (url: string) => {
    const trimmed = url.trim();
    if (!trimmed) return;
    setScraping(true);
    setError(null);
    try {
      const result = await readApi.scrape(trimmed);
      setCandidates(result.candidates);
      setSourceUrl(trimmed);
    } catch (err) {
      setError((err as Error).message);
      setCandidates([]);
      setSourceUrl(null);
    } finally {
      setScraping(false);
    }
  }, []);

  const reset = useCallback(() => {
    setCandidates([]);
    setSourceUrl(null);
    setError(null);
  }, []);

  return { scrape, candidates, sourceUrl, scraping, error, reset };
}
