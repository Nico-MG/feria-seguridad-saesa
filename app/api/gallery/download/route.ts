import { getAdminSupabase } from "@/lib/adminAuth";
import { GALLERY_BUCKET, isGalleryPhotoPath } from "@/lib/gallery";

export async function GET(request: Request) {
  const path = new URL(request.url).searchParams.get("path");
  if (!isGalleryPhotoPath(path)) {
    return Response.json({ error: "La foto solicitada no es válida." }, { status: 400 });
  }

  try {
    const { data, error } = await getAdminSupabase()
      .storage.from(GALLERY_BUCKET)
      .download(path);
    if (error) throw error;

    const filename = `feria-seguridad-${path.split("/").at(-1)}`;
    return new Response(data, {
      headers: {
        "Content-Type": data.type || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Error descargando foto de la galería:", error);
    return Response.json(
      { error: "No fue posible descargar la foto." },
      { status: 500 },
    );
  }
}
