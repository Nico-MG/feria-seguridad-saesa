import { getAdminSupabase } from "@/lib/adminAuth";

type Session = "morning" | "afternoon";

export async function GET() {
  try {
    const supabase = getAdminSupabase();
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id")
      .eq("is_active", true)
      .maybeSingle();

    if (eventError) throw eventError;
    if (!event) {
      return Response.json(
        { activeSession: null, imageCount: 0 },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    const [
      { data: settings, error: settingsError },
      { data: gameSession, error: sessionError },
    ] = await Promise.all([
      supabase
        .from("game_settings")
        .select("images")
        .eq("event_id", event.id)
        .maybeSingle(),
      supabase
        .from("game_sessions")
        .select("active_session")
        .eq("event_id", event.id)
        .maybeSingle(),
    ]);

    if (settingsError) throw settingsError;
    if (sessionError) throw sessionError;

    const allImages = Array.isArray(settings?.images) ? settings.images : [];
    const session = gameSession?.active_session as Session | null;
    const splitIndex = Math.ceil(allImages.length / 2);
    const imageCount =
      session === "morning"
        ? splitIndex
        : session === "afternoon"
          ? allImages.length - splitIndex
          : 0;

    return Response.json(
      {
        activeSession: session,
        sessionLabel:
          session === "morning"
            ? "Mañana"
            : session === "afternoon"
              ? "Tarde"
              : null,
        imageCount,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Error consultando disponibilidad del juego:", error);
    return Response.json(
      { error: "No fue posible consultar el estado del juego." },
      {
        status: 500,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
