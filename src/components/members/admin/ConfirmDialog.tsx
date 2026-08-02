import { useEffect, useRef } from "react";

/**
 * Confirmation gate for destructive admin actions.
 *
 * Every delete in the admin area was a single unguarded icon click, and none
 * of them are recoverable — there's no soft-delete and no undo, so a stray
 * click on a board member's trash icon removed them for good.
 *
 * The confirm button carries the specific action ("Delete event"), never a
 * bare "OK": the whole point of the dialog is that the reader registers what
 * they're about to destroy, and "OK" is the word people click without reading.
 */
export default function ConfirmDialog({
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  // Focus lands on Cancel, not Confirm. A dialog that opens with the
  // destructive button focused turns a stray Enter keypress into the deletion
  // it was meant to prevent.
  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      className="fixed inset-0 z-[95] grid place-items-center bg-black/70 p-4"
    >
      <div className="w-full max-w-sm rounded-xl border border-galaxy-line bg-galaxy-surface p-5">
        <h2
          id="confirm-title"
          className="font-tech text-base font-semibold text-galaxy-text"
        >
          {title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-galaxy-muted">{message}</p>

        <div className="mt-5 flex justify-end gap-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            className="rounded-full bg-galaxy-control px-4 py-2 text-xs font-semibold text-galaxy-text transition-colors hover:bg-galaxy-control-hover"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-full px-4 py-2 text-xs font-semibold text-white transition hover:opacity-90"
            style={{ backgroundColor: "var(--chart-bad)" }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
