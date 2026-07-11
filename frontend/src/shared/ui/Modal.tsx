import { useEffect } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** "dialog" (default) — a small prompt: confirmations, a short form (see
   *  `TileCard`'s delete confirm, `AddMangaCard`/`AddSectionCard`). "window" —
   *  a wider, taller surface for a self-contained task with real content
   *  (tabs, a grid, a picker — see `PoolPickerModal`), scrolling internally
   *  once it outgrows the viewport instead of pushing the backdrop off-screen. */
  size?: "dialog" | "window";
}

const SIZE_CLASSES: Record<NonNullable<ModalProps["size"]>, string> = {
  dialog: "max-w-sm",
  window: "max-w-2xl max-h-[85vh] overflow-y-auto",
};

/** Centered modal dialog, portaled to <body> (same pattern as UserMenu's
 *  dropdown). Closes on backdrop click or Escape. Visual language matches
 *  LoadingDialog: a parchment card over a blurred backdrop. */
export function Modal({ open, onClose, children, size = "dialog" }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-6 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            className={`w-full rounded-2xl border border-[var(--owl-brown)]/15 bg-[var(--owl-parchment)] p-6 shadow-lg ${SIZE_CLASSES[size]}`}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
