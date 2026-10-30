import { listGalleryPhotos } from "@/lib/gallery";

export async function GET() {
  try {
    return Response.json({ photos: await listGalleryPhotos() });
  } catch (error) {
    console.error("Error obteniendo fotos de la galería:", error);
    return Response.json(
      { error: "No fue posible cargar las fotos de la galería." },
      { status: 500 },
    );
  }
}
