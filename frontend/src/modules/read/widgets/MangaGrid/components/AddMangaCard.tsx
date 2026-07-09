import { useState } from "react";
import { Plus } from "lucide-react";
import { Modal } from "@/shared/ui";

interface AddMangaCardProps {
  onCreate: (title: string) => Promise<void> | void;
  creating: boolean;
}

/** The "new manga" tile — a placeholder card (same footprint as a MangaCard)
 *  that opens a modal with a title input on click. Used both alone (empty
 *  library) and as the first tile in the grid (non-empty library). */
export function AddMangaCard({ onCreate, creating }: AddMangaCardProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");

  const submit = async () => {
    if (!title.trim()) return;
    await onCreate(title.trim());
    setTitle("");
    setOpen(false);
  };

  const close = () => {
    setTitle("");
    setOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="group relative flex aspect-[3/4] w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-md border border-dashed border-[var(--owl-border)] text-[var(--owl-brown-muted)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-[var(--owl-orange)]/60 hover:text-[var(--owl-brown-deep)] hover:shadow-[0_8px_20px_-10px_rgba(46,26,14,0.25)] cursor-pointer"
      >
        {/* iOS-style frosted glass fill, matching MangaCard's hover treatment */}
        <div
          className="pointer-events-none absolute inset-0 border border-white/15 bg-white/10 opacity-0
                     shadow-[inset_0_1px_0_0_rgba(255,255,255,0.4)] backdrop-blur-xl backdrop-saturate-150
                     transition-opacity duration-300 ease-out group-hover:opacity-100"
        />
        <Plus size={28} aria-hidden="true" className="relative" />
        <span className="relative text-xs">New manga</span>
      </button>

      <Modal open={open} onClose={close}>
        <h2 className="text-base font-medium text-[var(--owl-brown-dark)]">New manga</h2>
        <p className="mt-1 text-sm text-[var(--owl-brown-muted)]">Give your series a title to start.</p>
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Manga title…"
          className="mt-4 w-full rounded-md border border-[var(--owl-border)] bg-[var(--owl-cream-mid)]/50 px-3 py-2 text-sm text-[var(--owl-brown-deep)] placeholder:text-[var(--owl-brown-muted)] outline-none focus:border-[var(--owl-orange)]"
        />
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={close}
            className="rounded-md border border-[var(--owl-border)] px-3 py-1.5 text-sm text-[var(--owl-brown-muted)] transition-colors hover:bg-[var(--owl-brown-mid)]/10 hover:text-[var(--owl-brown-deep)] cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={creating || !title.trim()}
            className="rounded-md bg-[var(--owl-brown)] px-3 py-1.5 text-sm text-[var(--owl-cream)] transition-colors hover:bg-[var(--owl-brown-deep)] cursor-pointer disabled:opacity-50"
          >
            {creating ? "Creating…" : "Create"}
          </button>
        </div>
      </Modal>
    </>
  );
}
