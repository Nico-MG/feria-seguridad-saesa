import "server-only";

import { getAdminSupabase } from "@/lib/adminAuth";

export const GALLERY_BUCKET = "feria-gallery";
export const GALLERY_PATH_PREFIX = "gallery-photos";
export const MAX_GALLERY_PHOTO_SIZE = 4 * 1024 * 1024;
export const MAX_GALLERY_DELETE_COUNT = 1000;

const GALLERY_FILE_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/i;

export type GalleryPhoto = {
  path: string;
  url: string;
  createdAt: string | null;
};

export function isGalleryPhotoPath(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const [prefix, filename, extra] = value.split("/");
  return (
    prefix === GALLERY_PATH_PREFIX &&
    filename !== undefined &&
    extra === undefined &&
    GALLERY_FILE_PATTERN.test(filename)
  );
}

export function parseGalleryPhotoFile(value: FormDataEntryValue | null) {
  if (value === null || !(value instanceof File) || value.size === 0) {
    return { file: null, error: "Selecciona una imagen válida." };
  }
  if (!["image/jpeg", "image/png", "image/webp"].includes(value.type)) {
    return { file: null, error: "Las fotos deben ser JPG, PNG o WebP." };
  }
  if (value.size > MAX_GALLERY_PHOTO_SIZE) {
    return { file: null, error: "Cada foto debe pesar como máximo 4 MB." };
  }

  return { file: value, error: null };
}

export async function listGalleryPhotos(): Promise<GalleryPhoto[]> {
  const supabase = getAdminSupabase();
  const bucket = supabase.storage.from(GALLERY_BUCKET);
  const photos: GalleryPhoto[] = [];
  const pageSize = 1000;
  let offset = 0;

  while (true) {
    const { data, error } = await bucket.list(GALLERY_PATH_PREFIX, {
      limit: pageSize,
      offset,
      sortBy: { column: "created_at", order: "desc" },
    });

    if (error) throw error;

    for (const file of data) {
      if (!GALLERY_FILE_PATTERN.test(file.name)) continue;
      const path = `${GALLERY_PATH_PREFIX}/${file.name}`;
      photos.push({
        path,
        url: bucket.getPublicUrl(path).data.publicUrl,
        createdAt: file.created_at ?? null,
      });
    }

    if (data.length < pageSize) return photos;
    offset += pageSize;
  }
}

export async function uploadGalleryPhoto(file: File) {
  const extension =
    file.type === "image/png"
      ? "png"
      : file.type === "image/webp"
        ? "webp"
        : "jpg";
  const path = `${GALLERY_PATH_PREFIX}/${crypto.randomUUID()}.${extension}`;
  const { error } = await getAdminSupabase()
    .storage.from(GALLERY_BUCKET)
    .upload(path, new Uint8Array(await file.arrayBuffer()), {
      contentType: file.type,
      cacheControl: "3600",
      upsert: false,
    });

  if (error) throw error;
}

export async function removeGalleryPhotos(paths: string[]) {
  const { error } = await getAdminSupabase()
    .storage.from(GALLERY_BUCKET)
    .remove(paths);

  if (error) throw error;
}
