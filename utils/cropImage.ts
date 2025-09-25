// /utils/cropImage.ts
import type { Area } from "react-easy-crop";

type CropOpts = {
  mime?: string;    // "image/jpeg" | "image/png" | "image/webp"
  quality?: number; // 0..1 (used for JPEG/WebP)
};

export const getCroppedImg = async (
  imageSrc: string,
  pixelCrop: Area,
  opts: CropOpts = {}
): Promise<Blob> => {
  const mime = opts.mime ?? "image/jpeg";
  const quality = opts.quality ?? 0.92;

  const image = await createImage(imageSrc);

  const w = Math.max(1, Math.floor(pixelCrop.width));
  const h = Math.max(1, Math.floor(pixelCrop.height));
  const sx = Math.max(0, Math.floor(pixelCrop.x));
  const sy = Math.max(0, Math.floor(pixelCrop.y));

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context not available");

  canvas.width = w;
  canvas.height = h;
  ctx.drawImage(image, sx, sy, w, h, 0, 0, w, h);

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Failed to create image blob"))),
      mime,
      quality
    );
  });

  if (!blob || blob.size === 0) throw new Error("Empty image blob");
  return blob;
};

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = url;
  });
}