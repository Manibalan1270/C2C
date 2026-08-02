import { useCallback, useEffect, useRef, useState } from "react";
import { PiXBold } from "react-icons/pi";
import { MAX_INLINE_IMAGE_BYTES } from "../../../types/schema";
import type { CropAspect } from "./cropAspects";

/**
 * Crop-to-fit dialog shown after an admin picks an image file.
 *
 * Why this exists rather than accepting the file as-is: the site's event cards
 * and board headshots have fixed aspect ratios, and a phone photo dropped
 * straight in gets letterboxed or has heads cut off. Letting the uploader
 * decide the framing is the difference between a page that looks maintained
 * and one that looks like a form.
 *
 * Hand-rolled rather than a cropper library — the interaction is a drag and a
 * zoom over a canvas, and the bundle is already past Vite's size warning.
 *
 * Output is a compressed JPEG data URL, because images live inline on the
 * Firestore document (Spark plan, no Storage bucket). That makes output size a
 * correctness concern, not just a nicety: see `encodeWithinBudget`.
 */

/** Viewport size of the crop stage, px. */
const STAGE_W = 420;

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

/**
 * Encode to JPEG, stepping quality down until the result fits the budget.
 *
 * A single fixed quality can't work: a flat graphic encodes tiny at q=0.9
 * while a detailed photo of a crowd blows the cap at the same setting. Trying
 * progressively harder is what makes "any photo an admin picks" land under the
 * limit without asking them to understand JPEG.
 */
function encodeWithinBudget(canvas: HTMLCanvasElement): string {
  const qualities = [0.86, 0.74, 0.62, 0.5, 0.4, 0.32];
  let out = canvas.toDataURL("image/jpeg", qualities[0]);
  for (const q of qualities.slice(1)) {
    if (out.length <= MAX_INLINE_IMAGE_BYTES) break;
    out = canvas.toDataURL("image/jpeg", q);
  }
  return out;
}

export default function ImageCropper({
  file,
  aspect,
  onCancel,
  onDone,
}: {
  file: File;
  aspect: CropAspect;
  onCancel: () => void;
  onDone: (dataUrl: string) => void;
}) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  // Offset of the image centre from the stage centre, in stage pixels.
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const stageH = Math.round(STAGE_W / aspect.ratio);

  // Load the picked file into an <img> we can draw from.
  useEffect(() => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => setImg(image);
    image.onerror = () =>
      setError("That file couldn't be read as an image. Try a JPG, PNG or WebP.");
    image.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  /**
   * Scale at which the image exactly covers the stage. Everything else is a
   * multiple of this, so zoom=1 always means "no empty space", regardless of
   * whether the source is portrait, landscape or square.
   */
  const coverScale = img
    ? Math.max(STAGE_W / img.naturalWidth, stageH / img.naturalHeight)
    : 1;

  /** Keep the image covering the stage — no gaps at any zoom or offset. */
  const clampOffset = useCallback(
    (next: { x: number; y: number }, atZoom: number) => {
      if (!img) return { x: 0, y: 0 };
      const drawW = img.naturalWidth * coverScale * atZoom;
      const drawH = img.naturalHeight * coverScale * atZoom;
      const maxX = Math.max(0, (drawW - STAGE_W) / 2);
      const maxY = Math.max(0, (drawH - stageH) / 2);
      return {
        x: Math.min(maxX, Math.max(-maxX, next.x)),
        y: Math.min(maxY, Math.max(-maxY, next.y)),
      };
    },
    [img, coverScale, stageH],
  );

  // Re-clamp whenever zoom changes, so zooming out can't strand the image
  // off-centre with a gap along one edge.
  useEffect(() => {
    setOffset((current) => clampOffset(current, zoom));
  }, [zoom, clampOffset]);

  // Paint the preview.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = STAGE_W * dpr;
    canvas.height = stageH * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, STAGE_W, stageH);

    const drawW = img.naturalWidth * coverScale * zoom;
    const drawH = img.naturalHeight * coverScale * zoom;
    ctx.drawImage(
      img,
      STAGE_W / 2 - drawW / 2 + offset.x,
      stageH / 2 - drawH / 2 + offset.y,
      drawW,
      drawH,
    );
  }, [img, zoom, offset, coverScale, stageH]);

  function onPointerDown(e: React.PointerEvent) {
    if (!img) return;
    (e.target as Element).setPointerCapture(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  }

  function onPointerMove(e: React.PointerEvent) {
    const drag = dragRef.current;
    if (!drag) return;
    setOffset(
      clampOffset(
        { x: drag.ox + (e.clientX - drag.x), y: drag.oy + (e.clientY - drag.y) },
        zoom,
      ),
    );
  }

  function onPointerUp() {
    dragRef.current = null;
  }

  /** Render the crop at export resolution and hand back a data URL. */
  function handleApply() {
    if (!img) return;
    setWorking(true);
    setError(null);
    try {
      const outW = aspect.exportWidth;
      const outH = Math.round(outW / aspect.ratio);
      const out = document.createElement("canvas");
      out.width = outW;
      out.height = outH;
      const ctx = out.getContext("2d");
      if (!ctx) throw new Error("Canvas unavailable in this browser.");

      // JPEG has no alpha; without this, transparent PNG areas render black.
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, outW, outH);

      // The stage is a scaled-down view of the export, so the same geometry
      // scales up by exactly this factor.
      const k = outW / STAGE_W;
      const drawW = img.naturalWidth * coverScale * zoom * k;
      const drawH = img.naturalHeight * coverScale * zoom * k;
      ctx.drawImage(
        img,
        outW / 2 - drawW / 2 + offset.x * k,
        outH / 2 - drawH / 2 + offset.y * k,
        drawW,
        drawH,
      );

      const dataUrl = encodeWithinBudget(out);
      if (dataUrl.length > MAX_INLINE_IMAGE_BYTES) {
        setError(
          "Even at low quality this image is too large to store. " +
            "Try a smaller or less detailed photo.",
        );
        setWorking(false);
        return;
      }
      onDone(dataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't process that image.");
      setWorking(false);
    }
  }

  // Escape closes, matching every other dialog the admin will have used.
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
      aria-label="Position and crop the image"
      className="fixed inset-0 z-[90] grid place-items-center bg-black/70 p-4"
    >
      <div className="w-full max-w-lg rounded-xl border border-galaxy-line bg-galaxy-surface p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-tech text-base font-semibold text-galaxy-text">
              Position the image
            </h2>
            <p className="mt-1 text-xs text-galaxy-muted">
              Drag to reposition, zoom to fill. The site crops to {aspect.label}.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Cancel"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-galaxy-control text-galaxy-text transition-colors hover:bg-galaxy-control-hover"
          >
            <PiXBold className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 flex justify-center">
          <canvas
            ref={canvasRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            style={{ width: STAGE_W, height: stageH, touchAction: "none" }}
            className="cursor-grab rounded-lg border border-galaxy-line bg-galaxy-deep active:cursor-grabbing"
          />
        </div>

        <label className="mt-4 flex items-center gap-3">
          <span className="w-12 shrink-0 font-tech text-xs text-galaxy-muted">Zoom</span>
          <input
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full accent-galaxy-accent"
          />
        </label>

        {error && (
          <p role="alert" className="mt-3 text-xs text-[var(--chart-bad)]">
            {error}
          </p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full bg-galaxy-control px-4 py-2 text-xs font-semibold text-galaxy-text transition-colors hover:bg-galaxy-control-hover"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={!img || working}
            className="rounded-full bg-galaxy-cta px-4 py-2 text-xs font-semibold text-galaxy-on-cta transition hover:opacity-90 disabled:opacity-60"
          >
            {working ? "Processing…" : "Use this crop"}
          </button>
        </div>
      </div>
    </div>
  );
}
