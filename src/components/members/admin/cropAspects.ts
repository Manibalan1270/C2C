/**
 * Crop presets, one per place the site displays an uploaded image.
 *
 * Kept out of ImageCropper.tsx so the component file exports only a component
 * (Fast Refresh can't handle a module that mixes the two), and so the shapes
 * the site actually renders are listed in one place. If you add a new image
 * slot to the marketing page, add its aspect here rather than passing a
 * one-off object at the call site — otherwise the crop and the CSS frame drift
 * apart and images start getting letterboxed.
 */
export interface CropAspect {
  /** width / height, e.g. 16/9 */
  ratio: number;
  /** Width of the exported image, px. With `ratio`, this caps encoded size. */
  exportWidth: number;
  /** Shown in the crop dialog so the uploader knows what they're framing. */
  label: string;
}

/** Event cards on the landing page render inside an aspect-[4/3] frame. */
export const EVENT_ASPECT: CropAspect = {
  ratio: 4 / 3,
  exportWidth: 1000,
  label: "4:3 — event card",
};

/** Board member photos render in a 7rem circle. */
export const PORTRAIT_ASPECT: CropAspect = {
  ratio: 1,
  exportWidth: 600,
  label: "1:1 — board headshot",
};
