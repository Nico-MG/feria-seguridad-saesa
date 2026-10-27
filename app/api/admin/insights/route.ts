import {
  databaseErrorResponse,
  isAdminRequest,
  unauthorizedResponse,
} from "@/lib/adminApi";
import { getAdminSupabase } from "@/lib/adminAuth";

const PAGE_SIZE = 1000;

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

    const { data: stands, error: standsError } = await supabase
      .from("stands")
      .select("id")
      .eq("event_id", event.id)
      .eq("contest_required", true);

    if (standsError) throw standsError;
    const standIds = (stands ?? []).map((stand) => stand.id);

    if (standIds.length === 0) {
      return Response.json(
        { totalStands: 0, participants: [] },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    const visits: { participant_id: string; stand_id: number }[] = [];
    for (let offset = 0; ; offset += PAGE_SIZE) {
      const { data, error } = await supabase
        .from("stand_visits")
        .select("participant_id, stand_id")
        .in("stand_id", standIds)
        .order("participant_id")
        .order("stand_id")
        .range(offset, offset + PAGE_SIZE - 1);

      if (error) throw error;
      visits.push(...(data ?? []));
      if ((data ?? []).length < PAGE_SIZE) break;
    }

    const visitedStandsByParticipant = new Map<string, Set<number>>();
    for (const visit of visits) {
      const visitedStands =
        visitedStandsByParticipant.get(visit.participant_id) ?? new Set();
      visitedStands.add(visit.stand_id);
      visitedStandsByParticipant.set(visit.participant_id, visitedStands);
    }

    const completedParticipantIds = [...visitedStandsByParticipant.entries()]
      .filter(([, visitedStands]) => visitedStands.size === standIds.length)
      .map(([participantId]) => participantId);

    const { data: participants, error: participantsError } =
      completedParticipantIds.length > 0
        ? await supabase
            .from("participants")
            .select("id, name")
            .in("id", completedParticipantIds)
        : { data: [], error: null };

    if (participantsError) throw participantsError;

    const completedStands = new Map(
      (participants ?? []).map((participant) => [
        participant.id,
        visitedStandsByParticipant.get(participant.id)?.size ?? 0,
      ]),
    );
    const result = (participants ?? [])
      .map((participant) => ({
        id: participant.id,
        name: participant.name,
        completedStands: completedStands.get(participant.id) ?? 0,
      }))
      .sort((left, right) =>
        left.name.localeCompare(right.name, "es", { sensitivity: "base" }),
      );

    return Response.json(
      { totalStands: standIds.length, participants: result },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Error cargando resultados de la feria:", error);
    return databaseErrorResponse(
      "No fue posible cargar los resultados de la feria.",
    );
  }
}
