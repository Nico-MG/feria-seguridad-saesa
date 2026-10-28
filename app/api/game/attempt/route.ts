import { createClient } from "@supabase/supabase-js";
import { getAdminSupabase } from "@/lib/adminAuth";

const STORAGE_BUCKET = "feria-game-images";
type Session = "morning" | "afternoon";
type SnapshotImage = {
  id: string;
  image_path: string;
  image_width: number;
  image_height: number;
  findings: Array<{
    id: string;
    x: number;
    y: number;
    radius: number;
    title: string;
  }>;
  found_ids: string[];
};

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return origin !== null && origin === new URL(request.url).origin;
}

function getBearerToken(request: Request) {
  const match = request.headers
    .get("authorization")
    ?.match(/^Bearer\s+(\S+)$/i);
  return match?.[1];
}

async function getParticipantId(request: Request) {
  const accessToken = getBearerToken(request);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!accessToken || !supabaseUrl || !publishableKey) return null;

  const authClient = createClient(supabaseUrl, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await authClient.auth.getUser(accessToken);
  if (error) return null;
  return data.user?.id ?? null;
}

function publicImage(
  supabase: ReturnType<typeof getAdminSupabase>,
  image: SnapshotImage,
  revealFindings = false,
) {
  const publicData = {
    id: image.id,
    image: supabase.storage.from(STORAGE_BUCKET).getPublicUrl(image.image_path)
      .data.publicUrl,
    imageWidth: image.image_width,
    imageHeight: image.image_height,
  };

  return revealFindings
    ? {
        ...publicData,
        findings: image.findings,
        foundIds: image.found_ids ?? [],
      }
    : publicData;
}

async function getFinishedAttemptResponse(
  supabase: ReturnType<typeof getAdminSupabase>,
  attemptId: string,
  participantId: string,
) {
  const { data: attempt, error } = await supabase
    .from("game_attempts")
    .select(
      "images, current_image_index, total_found, mistakes, score, elapsed_ms, finished_at",
    )
    .eq("id", attemptId)
    .eq("participant_id", participantId)
    .maybeSingle();

  if (error) throw error;
  if (!attempt?.finished_at) return null;

  const images = attempt.images as SnapshotImage[];
  if (!Array.isArray(images)) {
    throw new Error("El resultado guardado tiene imágenes inválidas.");
  }

  return Response.json({
    status: "completed",
    already_finished: true,
    image_index: attempt.current_image_index,
    image_count: images.length,
    found_count: attempt.total_found,
    total: images.reduce((sum, image) => sum + image.findings.length, 0),
    mistakes: attempt.mistakes,
    score: attempt.score,
    elapsed_ms: attempt.elapsed_ms,
    images: images.map((image) => publicImage(supabase, image, true)),
  });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) {
    return Response.json(
      { error: "Solicitud de origen no permitido." },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return Response.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  const input = body as Record<string, unknown>;
  const participantId = await getParticipantId(request);
  if (!participantId) {
    return Response.json(
      { error: "Inicia sesión para participar en el juego." },
      { status: 401 },
    );
  }

  try {
    const supabase = getAdminSupabase();
    const { data: participant, error: participantError } = await supabase
      .from("participants")
      .select("id")
      .eq("id", participantId)
      .maybeSingle();

    if (participantError) throw participantError;
    if (!participant) {
      return Response.json(
        { error: "Regístrate en la sección de concursos antes de jugar." },
        { status: 403 },
      );
    }

    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id")
      .eq("is_active", true)
      .maybeSingle();
    if (eventError) throw eventError;
    if (!event) {
      return Response.json(
        { error: "No hay una feria activa." },
        { status: 409 },
      );
    }

    if (input.action === "start") {
      const [
        { data: sessionRecord, error: sessionError },
        { data: settings, error: settingsError },
      ] = await Promise.all([
        supabase
          .from("game_sessions")
          .select("active_session")
          .eq("event_id", event.id)
          .maybeSingle(),
        supabase
          .from("game_settings")
          .select("images")
          .eq("event_id", event.id)
          .maybeSingle(),
      ]);

      if (sessionError) throw sessionError;
      if (settingsError) throw settingsError;

      const activeSession = sessionRecord?.active_session as Session | null;

      const allImages = Array.isArray(settings?.images)
        ? (settings.images as Omit<SnapshotImage, "found_ids">[])
        : [];

      const { data: unfinished, error: unfinishedError } = await supabase
        .from("game_attempts")
        .select(
          "id, session_name, images, current_image_index, total_found, mistakes, finished_at, score, elapsed_ms",
        )
        .eq("event_id", event.id)
        .eq("participant_id", participantId)
        .is("finished_at", null)
        .limit(1)
        .maybeSingle();

      if (unfinishedError) throw unfinishedError;

      if (unfinished) {
        const images = unfinished.images as SnapshotImage[];
        const currentImage = images[unfinished.current_image_index];
        const unfinishedSession = unfinished.session_name as Session;
        if (!currentImage) {
          throw new Error("El intento guardado tiene una imagen inválida.");
        }

        return Response.json({
          attemptId: unfinished.id,
          session: unfinishedSession,
          images: [publicImage(supabase, currentImage)],
          imageIndex: unfinished.current_image_index,
          imageCount: images.length,
          foundCount:
            unfinished.total_found + (currentImage.found_ids?.length ?? 0),
          total: images.reduce((sum, image) => sum + image.findings.length, 0),
          mistakes: unfinished.mistakes,
          resumed: true,
        });
      }

      if (!activeSession) {
        return Response.json(
          { error: "No hay una sesión abierta ni un juego por retomar." },
          { status: 409 },
        );
      }

      const splitIndex = Math.ceil(allImages.length / 2);
      const selectedImages =
        activeSession === "morning"
          ? allImages.slice(0, splitIndex)
          : allImages.slice(splitIndex);

      if (
        selectedImages.length === 0 ||
        selectedImages.some(
          (image) =>
            !image.image_path ||
            !Array.isArray(image.findings) ||
            image.findings.length === 0,
        )
      ) {
        return Response.json(
          { error: "Esta sesión aún no tiene imágenes configuradas." },
          { status: 409 },
        );
      }

      const snapshot: SnapshotImage[] = selectedImages.map((image) => ({
        ...image,
        found_ids: [],
      }));

      const { data: existing, error: existingError } = await supabase
        .from("game_attempts")
        .select(
          "id, session_name, images, current_image_index, total_found, mistakes, finished_at, score, elapsed_ms",
        )
        .eq("event_id", event.id)
        .eq("participant_id", participantId)
        .eq("session_name", activeSession)
        .maybeSingle();

      if (existingError) throw existingError;
      if (existing) {
        return Response.json(
          {
            error: `Ya completaste la sesión de ${activeSession === "morning" ? "la mañana" : "la tarde"} con ${existing.score} puntos.`,
          },
          { status: 409 },
        );
      }

      const firstImage = snapshot[0];
      const { data: attempt, error: attemptError } = await supabase
        .from("game_attempts")
        .insert({
          event_id: event.id,
          participant_id: participantId,
          session_name: activeSession,
          images: snapshot,
          image_path: firstImage.image_path,
          image_width: firstImage.image_width,
          image_height: firstImage.image_height,
          findings: firstImage.findings,
        })
        .select("id")
        .single();

      if (attemptError) {
        if (attemptError.code === "23505") {
          return Response.json(
            { error: "Tu intento ya está iniciado para esta sesión." },
            { status: 409 },
          );
        }
        throw attemptError;
      }

      return Response.json({
        attemptId: attempt.id,
        session: activeSession,
        images: [publicImage(supabase, firstImage)],
        imageIndex: 0,
        imageCount: snapshot.length,
        foundCount: 0,
        total: snapshot.reduce((sum, image) => sum + image.findings.length, 0),
        mistakes: 0,
      });
    }

    if (
      input.action === "click" ||
      input.action === "advance" ||
      input.action === "finish"
    ) {
      if (
        typeof input.attemptId !== "string" ||
        !/^[0-9a-f-]{36}$/i.test(input.attemptId)
      ) {
        return Response.json(
          { error: "El intento no es válido." },
          { status: 400 },
        );
      }

      if (input.action !== "click") {
        const { data, error } = await supabase.rpc("advance_game_image", {
          p_attempt_id: input.attemptId,
          p_participant_id: participantId,
          p_finish: input.action === "finish",
        });
        if (error) throw error;
        if (!data || typeof data !== "object" || Array.isArray(data)) {
          throw new Error("Supabase devolvió un resultado inválido.");
        }

        const result = data as Record<string, unknown>;
        if (result.status === "not_found") {
          return Response.json(
            { error: "No se encontró tu intento." },
            { status: 404 },
          );
        }
        if (result.status === "already_finished") {
          const finishedResponse = await getFinishedAttemptResponse(
            supabase,
            input.attemptId,
            participantId,
          );
          return (
            finishedResponse ??
            Response.json(
              { error: "Este intento ya fue completado." },
              { status: 409 },
            )
          );
        }
        if (result.status === "not_last_image") {
          return Response.json(
            { error: "Solo puedes finalizar el juego desde la última imagen." },
            { status: 409 },
          );
        }
        if (result.status === "last_image") {
          return Response.json(
            { error: "Esta es la última imagen; finaliza el juego." },
            { status: 409 },
          );
        }
        if (result.image_changed && typeof result.image_path === "string") {
          result.image = supabase.storage
            .from(STORAGE_BUCKET)
            .getPublicUrl(result.image_path).data.publicUrl;
        }
        if (result.status === "completed" && Array.isArray(result.images)) {
          result.images = (result.images as SnapshotImage[]).map((image) =>
            publicImage(supabase, image, true),
          );
        }

        return Response.json(result);
      }

      if (
        typeof input.x !== "number" ||
        !Number.isFinite(input.x) ||
        input.x < 0 ||
        input.x > 1 ||
        typeof input.y !== "number" ||
        !Number.isFinite(input.y) ||
        input.y < 0 ||
        input.y > 1
      ) {
        return Response.json(
          { error: "La selección no es válida." },
          { status: 400 },
        );
      }

      const { data, error } = await supabase.rpc("submit_game_click", {
        p_attempt_id: input.attemptId,
        p_participant_id: participantId,
        p_x: input.x,
        p_y: input.y,
      });
      if (error) throw error;
      if (!data || typeof data !== "object" || Array.isArray(data)) {
        throw new Error("Supabase devolvió un resultado inválido.");
      }

      const result = data as Record<string, unknown>;
      if (result.status === "not_found") {
        return Response.json(
          { error: "No se encontró tu intento." },
          { status: 404 },
        );
      }
      if (result.status === "already_finished") {
        const finishedResponse = await getFinishedAttemptResponse(
          supabase,
          input.attemptId,
          participantId,
        );
        return (
          finishedResponse ??
          Response.json(
            { error: "Este intento ya fue completado." },
            { status: 409 },
          )
        );
      }

      if (result.image_changed && typeof result.image_path === "string") {
        result.image = supabase.storage
          .from(STORAGE_BUCKET)
          .getPublicUrl(result.image_path).data.publicUrl;
      }

      if (result.status === "completed" && Array.isArray(result.images)) {
        result.images = (result.images as SnapshotImage[]).map((image) =>
          publicImage(supabase, image, true),
        );
      }

      return Response.json(result);
    }

    return Response.json(
      { error: "Acción de juego desconocida." },
      { status: 400 },
    );
  } catch (error) {
    console.error("Error procesando intento del juego:", error);
    return Response.json(
      { error: "No fue posible procesar tu intento." },
      { status: 500 },
    );
  }
}
