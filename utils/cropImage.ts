// utils/cropImage.ts
// Returns a Blob.  Never hangs.  Works with data URLs or remote images.

type PixelCrop = { x: number; y: number; width: number; height: number };
type Options = { mime?: string; quality?: number; background?: string };

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous"; // safe for data: and remote images
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) return resolve(blob);
      // Fallback when toBlob returns null.
      const dataURL = canvas.toDataURL(type, quality);
      const base64 = dataURL.split(",")[1] || "";
      const bytes = atob(base64);
      const arr = new Uint8Array(bytes.length);
      for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
      resolve(new Blob([arr], { type }));
    }, type, quality);
  });
}

export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: PixelCrop,
  opts: Options = {}
): Promise<Blob> {
  const mime = opts.mime || "image/jpeg";
  const quality = opts.quality ?? 0.92;

  const image = await loadImage(imageSrc);
  if ("decode" in image) {
    try { await (image as any).decode(); } catch { /* older browsers */ }
  }

  const w = Math.max(1, Math.round(pixelCrop.width));
  const h = Math.max(1, Math.round(pixelCrop.height));
  const sx = Math.max(0, Math.round(pixelCrop.x));
  const sy = Math.max(0, Math.round(pixelCrop.y));

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context not available.");

  canvas.width = w;
  canvas.height = h;

  // Optional background for JPEG if the source had transparency.
  if (opts.background) {
    ctx.fillStyle = opts.background;
    ctx.fillRect(0, 0, w, h);
  }

  ctx.drawImage(image, sx, sy, w, h, 0, 0, w, h);

  const blob = await canvasToBlob(canvas, mime, quality);
  if (!blob || blob.size === 0) throw new Error("Crop produced an empty image.");
  return blob;
}
