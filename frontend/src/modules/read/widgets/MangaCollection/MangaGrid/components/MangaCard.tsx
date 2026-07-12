import { useState } from "react";
import { useNavigate } from "react-router";
import { ImagePlus } from "lucide-react";
import owlMascot from "@/shared/assets/owl_reading_book_with_glasses.png";
import { useMangaCollection, type Manga } from "../../../../entities";
import { TileCard, PoolPickerModal } from "../../../../shared";

interface MangaCardProps {
  manga: Manga;
  /** Signed cover URL, when the manga has a cover and signing succeeded. */
  coverUrl?: string;
  /** Edit mode reveals hover buttons to replace the cover or delete the manga. */
  editing: boolean;
}

export function MangaCard({ manga, coverUrl, editing }: MangaCardProps) {
  const navigate = useNavigate();
  const { remove } = useMangaCollection();
  const [coverPickerOpen, setCoverPickerOpen] = useState(false);

  return (
    <>
      <TileCard
        onClick={() => navigate(`/lector/manga/${manga.id}`)}
        label={manga.title}
        image={coverUrl}
        imageAlt={manga.title}
        icon={<img src={owlMascot} alt="" aria-hidden="true" className="w-1/2 opacity-70" />}
        editing={editing}
        secondaryAction={{
          icon: ImagePlus,
          label: "Change cover",
          onClick: () => setCoverPickerOpen(true),
        }}
        onDelete={() => remove(manga.id)}
        deleteLabel="Delete manga"
        confirmTitle={`Delete "${manga.title}"?`}
        confirmDescription="This removes the manga, its sections and pages, and their files. This can't be undone."
      />

      <PoolPickerModal
        open={coverPickerOpen}
        onClose={() => setCoverPickerOpen(false)}
        target={{ kind: "manga-cover", mangaId: manga.id, onDone: () => setCoverPickerOpen(false) }}
      />
    </>
  );
}
