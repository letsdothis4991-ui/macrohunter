"use client";
/**
 * Shrinks a photo in the browser before upload: phone photos are 3-8 MB, and Claude
 * reads a 1568 px image just as well, so this makes uploads fast and cheap.
 */
export type PreparedImage = { mediaType: "image/jpeg"; base64: string; previewUrl: string };

const MAX_SIDE = 1568;

export async function prepareImage(file: File): Promise<PreparedImage> {
  if (!file.type.startsWith("image/")) throw new Error("That file isn't a photo.");
  const bitmap = await loadBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser couldn't process that photo.");
  ctx.drawImage(bitmap, 0, 0, w, h);
  if ("close" in bitmap) bitmap.close();
  const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
  return { mediaType: "image/jpeg", base64: dataUrl.split(",")[1], previewUrl: dataUrl };
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    // Older Safari: fall back to an <img>.
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return img;
    } catch {
      throw new Error("Couldn't open that photo. Try a JPEG or PNG.");
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}
