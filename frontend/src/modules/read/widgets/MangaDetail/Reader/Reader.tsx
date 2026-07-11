import type { Page } from "../../../entities";
import { PageView } from "./components/PageView";

interface ReaderProps {
  pages: Page[];
  /** path → signed URL map (batch-signed once per section by the page). */
  urls: Record<string, string>;
}

/** The reading view: a vertical long-strip of pages loading straight from the
 *  Storage CDN. Off-screen pages skip layout/paint via content-visibility and
 *  load lazily, so large volumes stay smooth. */
export function Reader({ pages, urls }: ReaderProps) {
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex w-full max-w-3xl flex-col">
        {pages.map((page) => (
          <PageView key={page.id} page={page} imageUrl={urls[page.storagePath]} />
        ))}
      </div>
    </div>
  );
}
