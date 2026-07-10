import { useRef, useState } from "react";
import { useNavigate } from "react-router";
import { ImagePlus, Trash2 } from "lucide-react";
import { Modal } from "@/shared/ui";
import owlMascot from "@/shared/assets/owl_reading_book_with_glasses.png";
import { useUploadCover } from "../../../../features";
import { useReadLibrary, type Manga } from "../../../../entities";
import { Tile, TileActions } from "../../../../shared";

interface MangaCardProps {
  manga: Manga;
  /** Signed cover URL, when the manga has a cover and signing succeeded. */
  coverUrl?: string;
  /** Edit mode reveals hover buttons to replace the cover or delete the manga. */
  editing: boolean;
}

export function MangaCard({ manga, coverUrl, editing }: MangaCardProps) {
  const navigate = useNavigate();
  const { remove } = useReadLibrary();
  const { uploadCover, uploading } = useUploadCover(manga.id);
  const inputRef = useRef<HTMLInputElement>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) await uploadCover(file);
  };

  const deleteManga = async () => {
    setDeleting(true);
    try {
      await remove(manga.id);
      setConfirmDelete(false);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="group relative">
      <Tile
        onClick={() => navigate(`/lector/manga/${manga.id}`)}
        label={manga.title}
        image={coverUrl}
        imageAlt={manga.title}
        icon={<img src={owlMascot} alt="" aria-hidden="true" className="w-1/2 opacity-70" />}
      />
      {editing && (
        <>
          <input ref={inputRef} type="file" accept="image/*" hidden onChange={onFileChange} />
          <TileActions
            actions={[
              { icon: ImagePlus, label: "Change cover", onClick: () => inputRef.current?.click(), disabled: uploading },
              { icon: Trash2, label: "Delete manga", onClick: () => setConfirmDelete(true), tone: "danger" },
            ]}
          />
        </>
      )}

      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)}>
        <h2 className="text-base font-medium text-[var(--owl-brown-dark)]">Delete "{manga.title}"?</h2>
        <p className="mt-1 text-sm text-[var(--owl-brown-muted)]">
          This removes the manga, its sections and pages, and their files. This can't be undone.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={() => setConfirmDelete(false)}
            className="rounded-md border border-[var(--owl-border)] px-3 py-1.5 text-sm text-[var(--owl-brown-muted)] transition-colors hover:bg-[var(--owl-brown-mid)]/10 hover:text-[var(--owl-brown-deep)] cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={deleteManga}
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
