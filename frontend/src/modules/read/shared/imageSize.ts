/** Read a local image file's intrinsic pixel dimensions client-side, so page rows
 *  carry width/height and the reader can reserve aspect-ratio boxes (no layout shift). */
export async function readImageSize(file: Blob): Promise<{ width: number; height: number } | null> {
  try {
    const bitmap = await createImageBitmap(file);
    const size = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return size;
  } catch {
    return null; // not decodable here — the row just stores null dims
  }
}

/** File extension (with dot) for a Storage object path, from the file's own name/type. */
export function fileExtension(file: File): string {
  const fromName = file.name.includes(".") ? `.${file.name.split(".").pop()}` : "";
  if (fromName) return fromName.toLowerCase();
  const fromType = file.type.split("/")[1];
  return fromType ? `.${fromType}` : ".jpg";
}
