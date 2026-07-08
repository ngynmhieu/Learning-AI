import { useState } from "react";
import { ImageOff } from "lucide-react";

interface CandidateCardProps {
  url: string;
  /** 0-based pick order when selected, or null when not selected. */
  order: number | null;
  onToggle: () => void;
}

export function CandidateCard({ url, order, onToggle }: CandidateCardProps) {
  // Many sites hotlink-protect images, so the preview may not load in the
  // browser even though the backend can import it — show a neutral tile then.
  const [broken, setBroken] = useState(false);
  const selected = order !== null;

  return (
    <button
      onClick={onToggle}
      className={`relative aspect-[3/4] rounded-md overflow-hidden border-2 transition-colors cursor-pointer ${
        selected ? "border-[var(--owl-orange)]" : "border-[var(--owl-border)] hover:border-[var(--owl-tan-mid)]"
      }`}
      title={url}
    >
      {broken ? (
        <span className="flex size-full flex-col items-center justify-center gap-1 bg-[var(--owl-cream-mid)]/50 text-[var(--owl-brown-muted)]">
          <ImageOff size={20} aria-hidden="true" />
          <span className="px-1 text-[0.6rem] leading-tight break-all line-clamp-3">{url}</span>
        </span>
      ) : (
        <img
          src={url}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setBroken(true)}
          className="size-full object-cover"
        />
      )}
      {selected && (
        <span className="absolute top-1 left-1 flex size-5 items-center justify-center rounded-full bg-[var(--owl-orange)] text-[0.65rem] font-medium text-[var(--owl-cream)]">
          {order + 1}
        </span>
      )}
    </button>
  );
}
