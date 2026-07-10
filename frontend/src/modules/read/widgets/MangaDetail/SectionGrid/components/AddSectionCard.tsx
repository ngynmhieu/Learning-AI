import { useState } from "react";
import { Modal } from "@/shared/ui";
import type { SectionKind } from "../../../../entities";
import { AddTile } from "../../../../shared";

interface AddSectionCardProps {
  kind: SectionKind;
  onCreate: (input: { number: number | null; title: string | null }) => Promise<void> | void;
  creating: boolean;
}

/** The "new volume/chapter" tile — same shell as AddMangaCard, opens a modal
 *  with number + title fields instead of just a title. Used both alone (no
 *  sections yet) and as the first tile in the grid. */
export function AddSectionCard({ kind, onCreate, creating }: AddSectionCardProps) {
  const [open, setOpen] = useState(false);
  const [number, setNumber] = useState("");
  const [title, setTitle] = useState("");

  const submit = async () => {
    const parsed = number.trim() === "" ? null : Number(number);
    await onCreate({ number: Number.isNaN(parsed) ? null : parsed, title: title.trim() || null });
    setNumber("");
    setTitle("");
    setOpen(false);
  };

  const close = () => {
    setNumber("");
    setTitle("");
    setOpen(false);
  };

  return (
    <>
      <AddTile onClick={() => setOpen(true)} label={`New ${kind}`} />

      <Modal open={open} onClose={close}>
        <h2 className="text-base font-medium text-[var(--owl-brown-dark)]">New {kind}</h2>
        <p className="mt-1 text-sm text-[var(--owl-brown-muted)]">Give it a number and/or a title.</p>
        <div className="mt-4 flex items-center gap-2">
          <input
            autoFocus
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="No."
            inputMode="decimal"
            className="w-16 rounded-md border border-[var(--owl-border)] bg-[var(--owl-cream-mid)]/50 px-2 py-2 text-sm text-[var(--owl-brown-deep)] placeholder:text-[var(--owl-brown-muted)] outline-none focus:border-[var(--owl-orange)]"
          />
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Title (optional)…"
            className="flex-1 min-w-0 rounded-md border border-[var(--owl-border)] bg-[var(--owl-cream-mid)]/50 px-3 py-2 text-sm text-[var(--owl-brown-deep)] placeholder:text-[var(--owl-brown-muted)] outline-none focus:border-[var(--owl-orange)]"
          />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={close}
            className="rounded-md border border-[var(--owl-border)] px-3 py-1.5 text-sm text-[var(--owl-brown-muted)] transition-colors hover:bg-[var(--owl-brown-mid)]/10 hover:text-[var(--owl-brown-deep)] cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={creating}
            className="rounded-md bg-[var(--owl-brown)] px-3 py-1.5 text-sm text-[var(--owl-cream)] transition-colors hover:bg-[var(--owl-brown-deep)] cursor-pointer disabled:opacity-50"
          >
            {creating ? "Creating…" : "Create"}
          </button>
        </div>
      </Modal>
    </>
  );
}
