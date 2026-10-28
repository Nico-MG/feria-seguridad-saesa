import {
  databaseErrorResponse,
  invalidOriginResponse,
  isAdminRequest,
  isSameOriginRequest,
  unauthorizedResponse,
} from "@/lib/adminApi";
import { getAdminSupabase } from "@/lib/adminAuth";

const STORAGE_BUCKET = "feria-game-images";
const MAX_IMAGE_SIZE = 8 * 1024 * 1024;
const MAX_TOTAL_IMAGE_SIZE = 32 * 1024 * 1024;

type Finding = {
  id: string;
  x: number;
  y: number;
  radius: number;
  title: string;
};

type ImageConfig = {
  id: string;
  imagePath?: string;
  imageWidth: number;
  imageHeight: number;
  findings: Finding[];
};

function parseFindings(value: unknown): Finding[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;

  const findings: Finding[] = [];

  for (const item of value) {
    if (!item || typeof item !== "object") return null;
    const finding = item as Record<string, unknown>;

    if (
      typeof finding.id !== "string" ||
      !finding.id ||
      typeof finding.title !== "string" ||
      !finding.title.trim() ||
      finding.title.length > 200 ||
      typeof finding.x !== "number" ||
      finding.x < 0 ||
      finding.x > 1 ||
      typeof finding.y !== "number" ||
      finding.y < 0 ||
      finding.y > 1 ||
      typeof finding.radius !== "number" ||
      finding.radius <= 0 ||
      finding.radius > 0.25
    ) {
      return null;
    }

    findings.push({
      id: finding.id,
      x: finding.x,
      y: finding.y,
      radius: finding.radius,
      title: finding.title.trim(),
    });
  }

  return findings;
}

function parseImages(value: unknown): ImageConfig[] | null {
  if (!Array.isArray(value) || value.length < 2 || value.length > 20) {
    return null;
  }

  const images: ImageConfig[] = [];
  const ids = new Set<string>();

  for (const item of value) {
    if (!item || typeof item !== "object") return null;
    const image = item as Record<string, unknown>;
    const findings = parseFindings(image.findings);

    if (
      typeof image.id !== "string" ||
      !/^[a-zA-Z0-9-]{1,80}$/.test(image.id) ||
      ids.has(image.id) ||
      !Number.isSafeInteger(image.imageWidth) ||
      (image.imageWidth as number) < 1 ||
      !Number.isSafeInteger(image.imageHeight) ||
      (image.imageHeight as number) < 1 ||
      (image.imagePath !== undefined &&
        (typeof image.imagePath !== "string" ||
          !/^\d+\/[a-zA-Z0-9-]+\.(jpg|png|webp)$/.test(image.imagePath))) ||
      !findings
    ) {
      return null;
    }

    ids.add(image.id);
    images.push({
      id: image.id,
      imagePath: image.imagePath as string | undefined,
      imageWidth: image.imageWidth as number,
      imageHeight: image.imageHeight as number,
      findings,
    });
  }

  return images;
}

async function getActiveEvent(supabase: ReturnType<typeof getAdminSupabase>) {
  const { data, error } = await supabase
    .from("events")
    .select("id")
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function getActiveSession(
  supabase: ReturnType<typeof getAdminSupabase>,
  eventId: number,
) {
  const { data, error } = await supabase
    .from("game_sessions")
    .select("active_session")
    .eq("event_id", eventId)
    .maybeSingle();

  if (error) throw error;
  return data?.active_session ?? null;
}

export async function GET(request: Request) {
  if (!isAdminRequest(request)) return unauthorizedResponse();

  try {
    const supabase = getAdminSupabase();
    const event = await getActiveEvent(supabase);

    if (!event) {
      return Response.json(
        { error: "No hay una feria activa." },
        { status: 409 },
      );
    }

    const [{ data: settings, error: settingsError }, activeSession] =
      await Promise.all([
        supabase
          .from("game_settings")
          .select("images")
          .eq("event_id", event.id)
          .maybeSingle(),
        getActiveSession(supabase, event.id),
      ]);

    if (settingsError) throw settingsError;

    const images = Array.isArray(settings?.images)
      ? (
          settings.images as Array<{
            id: string;
            image_path: string;
            image_width: number;
            image_height: number;
            findings: Finding[];
          }>
        ).map((image) => ({
          id: image.id,
          image: supabase.storage
            .from(STORAGE_BUCKET)
            .getPublicUrl(image.image_path).data.publicUrl,
          imagePath: image.image_path,
          imageWidth: image.image_width,
          imageHeight: image.image_height,
          findings: image.findings,
        }))
      : [];

    return Response.json(
      { images, activeSession },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Error cargando configuración del juego:", error);
    return databaseErrorResponse(
      "No fue posible cargar la configuración del juego.",
    );
  }
}

export async function PUT(request: Request) {
  if (!isSameOriginRequest(request)) return invalidOriginResponse();
  if (!isAdminRequest(request)) return unauthorizedResponse();

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_TOTAL_IMAGE_SIZE + 500_000) {
    return Response.json(
      { error: "El total de imágenes no puede exceder 32 MB." },
      { status: 413 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json(
      { error: "No fue posible leer la configuración enviada." },
      { status: 400 },
    );
  }

  let imagesInput: unknown;
  try {
    imagesInput = JSON.parse(String(formData.get("images") ?? ""));
  } catch {
    return Response.json(
      { error: "La lista de imágenes no tiene formato válido." },
      { status: 400 },
    );
  }

  const images = parseImages(imagesInput);
  if (!images) {
    return Response.json(
      {
        error:
          "Configura entre 2 y 20 imágenes, cada una con dimensiones y al menos un hallazgo.",
      },
      { status: 400 },
    );
  }

  const files = new Map<string, File>();
  let totalImageSize = 0;
  for (const image of images) {
    const fileValue = formData.get(`image-${image.id}`);
    if (fileValue === null) continue;
    if (!(fileValue instanceof File) || fileValue.size === 0) {
      return Response.json(
        { error: "Una de las imágenes no es válida." },
        { status: 400 },
      );
    }
    if (
      fileValue.size > MAX_IMAGE_SIZE ||
      !["image/jpeg", "image/png", "image/webp"].includes(fileValue.type)
    ) {
      return Response.json(
        { error: "Cada imagen debe ser JPG, PNG o WebP y pesar hasta 8 MB." },
        { status: 400 },
      );
    }
    totalImageSize += fileValue.size;
    files.set(image.id, fileValue);
  }

  if (totalImageSize > MAX_TOTAL_IMAGE_SIZE) {
    return Response.json(
      { error: "El total de imágenes no puede exceder 32 MB." },
      { status: 413 },
    );
  }

  try {
    const supabase = getAdminSupabase();
    const event = await getActiveEvent(supabase);
    if (!event) {
      return Response.json(
        { error: "No hay una feria activa." },
        { status: 409 },
      );
    }

    const activeSession = await getActiveSession(supabase, event.id);
    if (activeSession) {
      return Response.json(
        {
          error:
            "Cierra la sesión activa antes de modificar las imágenes del juego.",
        },
        { status: 409 },
      );
    }

    const { count: unfinishedAttempts, error: attemptsError } = await supabase
      .from("game_attempts")
      .select("id", { count: "exact", head: true })
      .eq("event_id", event.id)
      .is("finished_at", null);
    if (attemptsError) throw attemptsError;
    if (unfinishedAttempts) {
      return Response.json(
        {
          error:
            "Hay participantes con una partida en curso. Espera a que terminen antes de modificar las imágenes.",
        },
        { status: 409 },
      );
    }

    const { data: previous, error: previousError } = await supabase
      .from("game_settings")
      .select("images")
      .eq("event_id", event.id)
      .maybeSingle();
    if (previousError) throw previousError;

    const previousImages = Array.isArray(previous?.images)
      ? (previous.images as Array<{ image_path: string }>)
      : [];
    const uploadedPaths: string[] = [];
    const savedImages = [];

    try {
      for (const image of images) {
        let imagePath = image.imagePath;
        const file = files.get(image.id);

        if (file) {
          const extension =
            file.type === "image/png"
              ? "png"
              : file.type === "image/webp"
                ? "webp"
                : "jpg";
          imagePath = `${event.id}/${crypto.randomUUID()}.${extension}`;
          const { error: uploadError } = await supabase.storage
            .from(STORAGE_BUCKET)
            .upload(imagePath, new Uint8Array(await file.arrayBuffer()), {
              contentType: file.type,
              cacheControl: "3600",
              upsert: false,
            });
          if (uploadError) throw uploadError;
          uploadedPaths.push(imagePath);
        }

        if (!imagePath) {
          throw new Error(`Falta el archivo para la imagen ${image.id}.`);
        }

        savedImages.push({
          id: image.id,
          image_path: imagePath,
          image_width: image.imageWidth,
          image_height: image.imageHeight,
          findings: image.findings,
        });
      }
    } catch (uploadError) {
      if (uploadedPaths.length > 0) {
        const { error: cleanupError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .remove(uploadedPaths);
        if (cleanupError) {
          console.error(
            "No se pudieron limpiar las imágenes cargadas parcialmente:",
            cleanupError,
          );
        }
      }
      throw uploadError;
    }

    const firstImage = savedImages[0];
    const { error: saveError } = await supabase.from("game_settings").upsert(
      {
        event_id: event.id,
        image_path: firstImage.image_path,
        image_width: firstImage.image_width,
        image_height: firstImage.image_height,
        findings: firstImage.findings,
        images: savedImages,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "event_id" },
    );

    if (saveError) {
      if (uploadedPaths.length > 0) {
        const { error: cleanupError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .remove(uploadedPaths);
        if (cleanupError) {
          console.error(
            "No se pudieron limpiar las imágenes nuevas:",
            cleanupError,
          );
        }
      }
      throw saveError;
    }

    const retainedPaths = new Set(savedImages.map((image) => image.image_path));
    const removedPaths = previousImages
      .map((image) => image.image_path)
      .filter((path) => !retainedPaths.has(path));
    if (removedPaths.length > 0) {
      const { error: removeError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove(removedPaths);
      if (removeError) {
        console.error(
          "No se pudieron eliminar imágenes antiguas:",
          removeError,
        );
      }
    }

    return Response.json({
      images: savedImages.map((image) => ({
        id: image.id,
        image: supabase.storage
          .from(STORAGE_BUCKET)
          .getPublicUrl(image.image_path).data.publicUrl,
        imagePath: image.image_path,
        imageWidth: image.image_width,
        imageHeight: image.image_height,
        findings: image.findings,
      })),
    });
  } catch (error) {
    console.error("Error guardando configuración del juego:", error);
    return databaseErrorResponse(
      "No fue posible guardar la configuración de imágenes.",
    );
  }
}

export async function PATCH(request: Request) {
  if (!isSameOriginRequest(request)) return invalidOriginResponse();
  if (!isAdminRequest(request)) return unauthorizedResponse();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }

  if (
    !body ||
    typeof body !== "object" ||
    !("session" in body) ||
    !(
      body.session === null ||
      body.session === "morning" ||
      body.session === "afternoon"
    )
  ) {
    return Response.json(
      { error: "Selecciona una sesión válida o ciérrala." },
      { status: 400 },
    );
  }

  try {
    const supabase = getAdminSupabase();
    const event = await getActiveEvent(supabase);
    if (!event) {
      return Response.json(
        { error: "No hay una feria activa." },
        { status: 409 },
      );
    }

    const activeSession = await getActiveSession(supabase, event.id);
    if (
      activeSession &&
      body.session !== null &&
      body.session !== activeSession
    ) {
      return Response.json(
        {
          error: "Cierra la sesión actual antes de habilitar la otra sesión.",
        },
        { status: 409 },
      );
    }

    const session = body.session;
    if (session === null) {
      const { error } = await supabase.rpc("close_game_session", {
        p_event_id: event.id,
      });
      if (error) throw error;

      return Response.json({ activeSession: null });
    }

    if (session) {
      const { data: settings, error: settingsError } = await supabase
        .from("game_settings")
        .select("images")
        .eq("event_id", event.id)
        .maybeSingle();
      if (settingsError) throw settingsError;

      const images = Array.isArray(settings?.images)
        ? (settings.images as Array<{ findings?: unknown }>)
        : [];
      const splitIndex = Math.ceil(images.length / 2);
      const assigned =
        session === "morning"
          ? images.slice(0, splitIndex)
          : images.slice(splitIndex);

      if (
        images.length < 2 ||
        assigned.length === 0 ||
        assigned.some(
          (image) =>
            !Array.isArray(image.findings) || image.findings.length === 0,
        )
      ) {
        return Response.json(
          {
            error:
              "Configura al menos dos imágenes y agrega hallazgos en todas antes de habilitar una sesión.",
          },
          { status: 409 },
        );
      }
    }

    const { error } = await supabase.from("game_sessions").upsert(
      {
        event_id: event.id,
        active_session: session,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "event_id" },
    );

    if (error) throw error;
    return Response.json({ activeSession: session });
  } catch (error) {
    console.error("Error cambiando sesión activa:", error);
    return databaseErrorResponse(
      "No fue posible actualizar el estado del juego.",
    );
  }
}
