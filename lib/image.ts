// Center-crops an image file to a square and returns a compact JPEG
// data URL, small enough to store directly in the user's Firestore
// profile doc. This keeps avatars completely free — no Cloud Storage
// bucket (which now requires a billing account) is involved.
// Browser-only (canvas).

// 256px at ~0.82 quality lands well under 60KB, comfortably inside
// Firestore's per-document limit and cheap to read everywhere the
// profile is loaded.
export async function cropToDataUrl(
  file: File,
  size = 256,
  quality = 0.82,
): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("Canvas is not supported in this browser.");
  }
  ctx.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    size,
    size,
  );
  bitmap.close();

  // Always JPEG: smallest encoding, and avatars don't need alpha.
  return canvas.toDataURL("image/jpeg", quality);
}
