import { getAdminSupabase } from "@/lib/adminAuth";

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
        { entries: [] },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    const { data: attempts, error: attemptsError } = await supabase
      .from("game_attempts")
      .select("participant_id, session_name, score, elapsed_ms, finished_at")
      .eq("event_id", event.id)
      .not("finished_at", "is", null)
      .order("score", { ascending: false })
      .order("elapsed_ms", { ascending: true })
      .order("finished_at", { ascending: true })
      .limit(20);

    if (attemptsError) throw attemptsError;

    const participantIds = [
      ...new Set((attempts ?? []).map((attempt) => attempt.participant_id)),
    ];

    const { data: participants, error: participantsError } =
      participantIds.length > 0
        ? await supabase
            .from("participants")
            .select("id, name")
            .in("id", participantIds)
        : { data: [], error: null };

    if (participantsError) throw participantsError;

    const names = new Map(
      (participants ?? []).map((participant) => [
        participant.id,
        participant.name,
      ]),
    );

    return Response.json(
      {
        entries: (attempts ?? []).map((attempt, index) => ({
          position: index + 1,
          name: names.get(attempt.participant_id) ?? "Participante",
          session: attempt.session_name === "morning" ? "Mañana" : "Tarde",
          score: attempt.score,
          elapsedMs: attempt.elapsed_ms,
          finishedAt: attempt.finished_at,
        })),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Error cargando el ranking del juego:", error);
    return Response.json(
      { error: "No fue posible cargar el ranking." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
