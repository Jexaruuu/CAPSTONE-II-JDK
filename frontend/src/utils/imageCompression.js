// src/utils/imageCompression.js
export async function compressImageFileToDataURL(
  file,
  maxW = 1600,
  maxH = 1600,
  quality = 0.85,
  maxBytes = 2 * 1024 * 1024 // 2MB target (approx; base64 overhead accounted below)
) {
  // Read file as DataURL
  const dataUrl = await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });

  // Create an image from DataURL
  const img = await new Promise((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = dataUrl;
  });

  // Canvas resize
  const canvas = document.createElement('canvas');
  let { width, height } = img;
  const scale = Math.min(maxW / width, maxH / height, 1);
  width = Math.floor(width * scale);
  height = Math.floor(height * scale);

  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, width, height);

  // Prefer JPEG for smaller size
  let q = quality;
  let out = canvas.toDataURL('image/jpeg', q);

  // If still too large, step quality down (1.37 ≈ base64 overhead)
  while (out.length > maxBytes * 1.37 && q > 0.5) {
    q -= 0.05;
    out = canvas.toDataURL('image/jpeg', q);
  }

  return out;
}
