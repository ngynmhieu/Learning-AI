import { useState } from "react";
import { Modal } from "@/shared/ui";
import { AddTile } from "../../../../shared";

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
      <AddTile onClick={() => setOpen(true)} label="New manga" />

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
