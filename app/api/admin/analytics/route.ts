import {
  databaseErrorResponse,
  isAdminRequest,
  unauthorizedResponse,
} from "@/lib/adminApi";
import { getAdminSupabase } from "@/lib/adminAuth";

type PageAnalyticsRow = {
  page_views: number | string | null;
  unique_visitors: number | string | null;
  average_load_ms: number | string | null;
};

async function getPageAnalytics(
  supabase: ReturnType<typeof getAdminSupabase>,
  eventId: number,
  since: string,
) {
  const { data, error } = await supabase.rpc("get_page_analytics", {
    p_event_id: eventId,
    p_since: since,
  });

  if (error) throw error;
  const row = ((data ?? []) as PageAnalyticsRow[])[0];

  return {
    pageViews: Number(row?.page_views ?? 0),
    uniqueVisitors: Number(row?.unique_visitors ?? 0),
    averageLoadMs:
      row?.average_load_ms === null || row?.average_load_ms === undefined
        ? null
        : Number(row.average_load_ms),
  };
}

export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return unauthorizedResponse();
  }

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
        { error: "No hay una feria activa para consultar." },
        { status: 409, headers: { "Cache-Control": "no-store" } },
      );
    }

    const now = Date.now();
    const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000).toISOString();
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
    const [
      { count: participantCount, error: participantError },
      { data: stands, error: standsError },
      { count: gameAttemptCount, error: gameAttemptError },
      { count: completedGameCount, error: completedGameError },
      lastDay,
      lastSevenDays,
    ] = await Promise.all([
      supabase.from("participants").select("id", { count: "exact", head: true }),
      supabase.from("stands").select("id").eq("event_id", event.id),
      supabase
        .from("game_attempts")
        .select("id", { count: "exact", head: true })
        .eq("event_id", event.id),
      supabase
        .from("game_attempts")
        .select("id", { count: "exact", head: true })
        .eq("event_id", event.id)
        .not("finished_at", "is", null),
      getPageAnalytics(supabase, event.id, oneDayAgo),
      getPageAnalytics(supabase, event.id, sevenDaysAgo),
    ]);

    if (participantError) throw participantError;
    if (standsError) throw standsError;
    if (gameAttemptError) throw gameAttemptError;
    if (completedGameError) throw completedGameError;

    const standIds = (stands ?? []).map((stand) => stand.id);
    let standVisitCount = 0;
    if (standIds.length > 0) {
      const { count, error } = await supabase
        .from("stand_visits")
        .select("id", { count: "exact", head: true })
        .in("stand_id", standIds);

      if (error) throw error;
      standVisitCount = count ?? 0;
    }

    return Response.json(
      {
        registeredParticipants: participantCount ?? 0,
        standVisits: standVisitCount,
        gameAttempts: gameAttemptCount ?? 0,
        completedGames: completedGameCount ?? 0,
        lastDay,
        lastSevenDays,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Error cargando métricas de la feria:", error);
    return databaseErrorResponse("No fue posible cargar las métricas.");
  }
}
