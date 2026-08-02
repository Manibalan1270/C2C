import { useRef, useState } from "react";
import { PiImageDuotone, PiTrashBold } from "react-icons/pi";
import ImageCropper from "./ImageCropper";
import type { CropAspect } from "./cropAspects";

/**
 * File picker -> crop dialog -> preview, as one control.
 *
 * The value handed back is a compressed JPEG data URL ready to write straight
 * onto the Firestore document. Both admin forms that take an image use this,
 * so the crop step can't be skipped on one of them by accident.
 */
export default function ImageField({
  label,
  value,
  aspect,
  onChange,
}: {
  label: string;
  value: string | null;
  aspect: CropAspect;
  onChange: (dataUrl: string | null) => void;
}) {
  const [pending, setPending] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handlePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setPending(file);
    // Reset so picking the same file twice still fires a change event —
    // otherwise re-cropping the image you just cancelled silently does nothing.
    e.target.value = "";
  }

  return (
    <div>
      <span className="mb-1.5 block font-tech text-xs text-galaxy-muted">{label}</span>

      <div className="flex items-center gap-3">
        <div
          className="grid shrink-0 place-items-center overflow-hidden rounded-lg border border-galaxy-line bg-galaxy-deep"
          style={{ width: 88, height: Math.round(88 / aspect.ratio) }}
        >
          {value ? (
            <img src={value} alt="" className="h-full w-full object-cover" />
          ) : (
            <PiImageDuotone className="h-6 w-6 text-galaxy-dim" />
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="rounded-full bg-galaxy-control px-3.5 py-1.5 text-xs font-semibold text-galaxy-text transition-colors hover:bg-galaxy-control-hover"
          >
            {value ? "Replace image" : "Upload image"}
          </button>
          {value && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="flex items-center gap-1.5 rounded-full border border-galaxy-line px-3.5 py-1.5 text-xs font-medium text-galaxy-muted transition-colors hover:border-galaxy-dim hover:text-galaxy-text"
            >
              <PiTrashBold className="h-3 w-3" />
              Remove
            </button>
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={handlePick}
          className="hidden"
        />
      </div>

      {pending && (
        <ImageCropper
          file={pending}
          aspect={aspect}
          onCancel={() => setPending(null)}
          onDone={(dataUrl) => {
            onChange(dataUrl);
            setPending(null);
          }}
        />
      )}
    </div>
  );
}
