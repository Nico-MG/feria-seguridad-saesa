import {
  invalidOriginResponse,
  isAdminRequest,
  isSameOriginRequest,
  unauthorizedResponse,
} from "@/lib/adminApi";
import {
  isGalleryPhotoPath,
  MAX_GALLERY_DELETE_COUNT,
  MAX_GALLERY_PHOTO_SIZE,
  parseGalleryPhotoFile,
  removeGalleryPhotos,
  uploadGalleryPhoto,
} from "@/lib/gallery";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return invalidOriginResponse();
  if (!isAdminRequest(request)) return unauthorizedResponse();

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_GALLERY_PHOTO_SIZE + 100_000) {
    return Response.json(
      { error: "Cada foto debe pesar como máximo 4 MB." },
      { status: 413 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json(
      { error: "No fue posible leer la foto seleccionada." },
      { status: 400 },
    );
  }

  const { file, error } = parseGalleryPhotoFile(formData.get("photo"));
  if (error || !file) {
    return Response.json(
      { error: error ?? "Selecciona una imagen válida." },
      { status: 400 },
    );
  }

  try {
    await uploadGalleryPhoto(file);
    return Response.json({ uploaded: true }, { status: 201 });
  } catch (uploadError) {
    console.error("Error subiendo foto a la galería:", uploadError);
    return Response.json(
      { error: "No fue posible subir la foto." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  if (!isSameOriginRequest(request)) return invalidOriginResponse();
  if (!isAdminRequest(request)) return unauthorizedResponse();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "La selección de fotos no es válida." },
      { status: 400 },
    );
  }

  const paths =
    body && typeof body === "object" && "paths" in body
      ? (body as { paths?: unknown }).paths
      : null;
  if (
    !Array.isArray(paths) ||
    paths.length === 0 ||
    paths.length > MAX_GALLERY_DELETE_COUNT ||
    !paths.every(isGalleryPhotoPath) ||
    new Set(paths).size !== paths.length
  ) {
    return Response.json(
      { error: "Selecciona entre 1 y 1000 fotos válidas." },
      { status: 400 },
    );
  }

  try {
    await removeGalleryPhotos(paths);
    return Response.json({ deleted: paths.length });
  } catch (deleteError) {
    console.error("Error eliminando fotos de la galería:", deleteError);
    return Response.json(
      { error: "No fue posible eliminar las fotos seleccionadas." },
      { status: 500 },
    );
  }
}
