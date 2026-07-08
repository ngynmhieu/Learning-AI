import { useEffect, useRef, useState } from "react";
import { ImagePlus } from "lucide-react";
import { UploadItem } from "./components/UploadItem";

interface StagedFile {
  id: string;
  file: File;
  previewUrl: string;
}

interface UploadTrayProps {
  /** Called with the staged files in their (drag-chosen) display order. */
  onConfirm: (files: File[]) => Promise<void> | void;
  busy: boolean;
  confirmLabel?: string;
}

/** Local-file staging: pick images, drag to reorder — the staging order IS the
 *  page order. Bytes later go straight to Storage (see upload features). */
export function UploadTray({ onConfirm, busy, confirmLabel = "Upload" }: UploadTrayProps) {
  const [staged, setStaged] = useState<StagedFile[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const stagedRef = useRef<StagedFile[]>([]);

  // Track the latest staged set so unmount can revoke exactly the URLs still live.
  useEffect(() => {
    stagedRef.current = staged;
  }, [staged]);

  // Revoke every remaining preview URL when the tray unmounts.
  useEffect(() => {
    return () => stagedRef.current.forEach((item) => URL.revokeObjectURL(item.previewUrl));
  }, []);

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const images = Array.from(files).filter((f) => f.type.startsWith("image/"));
    setStaged((prev) => [
      ...prev,
      ...images.map((file) => ({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
      })),
    ]);
  };

  const removeAt = (index: number) => {
    setStaged((prev) => {
      URL.revokeObjectURL(prev[index].previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  };

  const moveTo = (target: number) => {
    if (dragIndex === null || dragIndex === target) return;
    setStaged((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(target, 0, moved);
      return next;
    });
    setDragIndex(target);
  };

  const confirm = async () => {
    await onConfirm(staged.map((item) => item.file));
    staged.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    setStaged([]);
  };

  return (
    <div className="flex flex-col gap-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = ""; // allow re-picking the same files
        }}
      />

      {staged.length > 0 && (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(6rem,1fr))] gap-2">
          {staged.map((item, index) => (
            <UploadItem
              key={item.id}
              previewUrl={item.previewUrl}
              name={item.file.name}
              position={index}
              dragging={dragIndex === index}
              onRemove={() => removeAt(index)}
              onDragStart={() => setDragIndex(index)}
              onDragEnter={() => moveTo(index)}
              onDragEnd={() => setDragIndex(null)}
            />
          ))}
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="flex items-center gap-1.5 rounded-md border border-[var(--owl-border)] px-3 py-1.5 text-sm text-[var(--owl-brown)] hover:bg-[var(--owl-brown-mid)]/10 transition-colors cursor-pointer disabled:opacity-50"
        >
          <ImagePlus size={15} aria-hidden="true" />
          Choose images
        </button>
        {staged.length > 0 && (
          <button
            onClick={confirm}
            disabled={busy}
            className="rounded-md bg-[var(--owl-brown)] px-3 py-1.5 text-sm text-[var(--owl-cream)] hover:bg-[var(--owl-brown-deep)] transition-colors cursor-pointer disabled:opacity-50"
          >
            {busy ? "Uploading…" : `${confirmLabel} ${staged.length} image${staged.length > 1 ? "s" : ""}`}
          </button>
        )}
      </div>
      {staged.length > 1 && (
        <p className="text-xs text-[var(--owl-brown-muted)]">Drag to reorder — this order becomes the page order.</p>
      )}
    </div>
  );
}
