import { useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Trash2 } from "lucide-react";
import { Modal } from "@/shared/ui";
import { Tile } from "./Tile";
import { TileActions } from "./TileActions";

interface TileCardSecondaryAction {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

interface TileCardProps {
  onClick: () => void;
  label: string;
  image?: string;
  imageAlt?: string;
  icon?: ReactNode;
  editing: boolean;
  /** Hover action shown next to delete (e.g. "Change cover", "Add pages"). Omit for delete-only. */
  secondaryAction?: TileCardSecondaryAction;
  onDelete: () => Promise<void> | void;
  deleteLabel: string;
  confirmTitle: string;
  confirmDescription: string;
}

/** Shared grid card: a `Tile` plus edit-mode hover actions and a delete
 *  confirmation modal — the view/edit UI, hover effect, and delete flow that
 *  MangaCard and SectionCard both need, whatever their secondary action is. */
export function TileCard({
  onClick,
  label,
  image,
  imageAlt,
  icon,
  editing,
  secondaryAction,
  onDelete,
  deleteLabel,
  confirmTitle,
  confirmDescription,
}: TileCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete();
      setConfirmDelete(false);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="group relative">
      <Tile onClick={onClick} label={label} image={image} imageAlt={imageAlt} icon={icon} />
      {editing && (
        <TileActions
          actions={[
            ...(secondaryAction ? [secondaryAction] : []),
            { icon: Trash2, label: deleteLabel, onClick: () => setConfirmDelete(true), tone: "danger" },
          ]}
        />
      )}

      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)}>
        <h2 className="text-base font-medium text-[var(--owl-brown-dark)]">{confirmTitle}</h2>
        <p className="mt-1 text-sm text-[var(--owl-brown-muted)]">{confirmDescription}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={() => setConfirmDelete(false)}
            className="rounded-md border border-[var(--owl-border)] px-3 py-1.5 text-sm text-[var(--owl-brown-muted)] transition-colors hover:bg-[var(--owl-brown-mid)]/10 hover:text-[var(--owl-brown-deep)] cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="rounded-md bg-[var(--owl-danger)] px-3 py-1.5 text-sm text-[var(--owl-cream)] transition-colors hover:bg-[var(--owl-danger-deep)] cursor-pointer disabled:opacity-50"
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
