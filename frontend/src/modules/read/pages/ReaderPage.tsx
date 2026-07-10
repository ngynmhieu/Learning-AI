import { useNavigate, useParams } from "react-router";
import { ArrowLeft } from "lucide-react";
import { LoadingDialog } from "@/shared/ui";
import owlMascot from "@/shared/assets/owl_reading_book_with_glasses.png";
import { useSignedUrls } from "../shared";
import { useSectionPages } from "../entities";
import { Reader } from "../widgets";

/** /lector/read/:sectionId — the reading view. The backend serves only ordered
 *  metadata; the images stream from the Storage CDN via batch signed URLs. */
export function ReaderPage() {
  const { sectionId } = useParams();
  const navigate = useNavigate();
  const { pages, error } = useSectionPages(sectionId);
  const urls = useSignedUrls((pages ?? []).map((p) => p.storagePath));

  if (error) {
    return <p className="py-12 text-center text-sm text-[var(--owl-brown-muted)]">{error}</p>;
  }
  if (pages === null) {
    return <LoadingDialog fullScreen={false} message="Fetching this section…" />;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 flex items-center gap-2 px-4 py-2 border-b border-[var(--owl-border)]">
        <button
          onClick={() => navigate(-1)}
          aria-label="Back"
          className="p-1 rounded text-[var(--owl-brown-muted)] hover:text-[var(--owl-brown-deep)] cursor-pointer"
        >
          <ArrowLeft size={18} />
        </button>
        <p className="text-sm text-[var(--owl-brown-muted)]">
          {pages.length} page{pages.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="flex-1 min-h-0">
        {pages.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12">
            <img src={owlMascot} alt="" aria-hidden="true" className="w-28 opacity-80" />
            <p className="text-sm text-[var(--owl-brown-muted)]">
              No pages yet — add some from the manga's detail page.
            </p>
          </div>
        ) : (
          <Reader pages={pages} urls={urls} />
        )}
      </div>
    </div>
  );
}
