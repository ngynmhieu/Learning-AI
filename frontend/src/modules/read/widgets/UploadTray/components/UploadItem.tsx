import { X } from "lucide-react";

interface UploadItemProps {
  previewUrl: string;
  name: string;
  position: number;
  dragging: boolean;
  onRemove: () => void;
  onDragStart: () => void;
  onDragEnter: () => void;
  onDragEnd: () => void;
}

export function UploadItem({
  previewUrl,
  name,
  position,
  dragging,
  onRemove,
  onDragStart,
  onDragEnter,
  onDragEnd,
}: UploadItemProps) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnter={onDragEnter}
      onDragOver={(e) => e.preventDefault()}
      onDragEnd={onDragEnd}
      className={`relative aspect-[3/4] rounded-md overflow-hidden border cursor-grab active:cursor-grabbing transition-opacity ${
        dragging ? "opacity-40 border-[var(--owl-orange)]" : "border-[var(--owl-border)]"
      }`}
      title={name}
    >
      <img src={previewUrl} alt={name} className="size-full object-cover pointer-events-none" />
      <span className="absolute top-1 left-1 flex size-5 items-center justify-center rounded-full bg-[var(--owl-brown-dark)]/70 text-[0.65rem] text-[var(--owl-cream)]">
        {position + 1}
      </span>
      <button
        onClick={onRemove}
        aria-label="Remove"
        className="absolute top-1 right-1 flex size-5 items-center justify-center rounded-full bg-[var(--owl-brown-dark)]/70 text-[var(--owl-cream)] hover:bg-red-700/80 cursor-pointer"
      >
        <X size={12} />
      </button>
    </div>
  );
}
