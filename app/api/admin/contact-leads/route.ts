import {
  databaseErrorResponse,
  isAdminRequest,
  unauthorizedResponse,
} from "@/lib/adminApi";
import { getAdminSupabase } from "@/lib/adminAuth";

const PAGE_SIZE = 1000;
const PARTICIPANT_BATCH_SIZE = 200;

type StandVisit = {
  participant_id: string;
  stand_id: number;
  visited_at: string;
};

type ParticipantContact = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
};

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
      .select("id, company_id, number")
      .eq("event_id", event.id)
      .order("id");

    if (standsError) throw standsError;

    const companyIds = [...new Set((stands ?? []).map((stand) => stand.company_id))];
    const { data: companies, error: companiesError } =
      companyIds.length > 0
        ? await supabase
            .from("companies")
            .select("id, name")
            .in("id", companyIds)
            .order("name")
        : { data: [], error: null };

    if (companiesError) throw companiesError;

    const companyIdParam = new URL(request.url).searchParams.get("companyId");
    if (companyIdParam === null) {
      return Response.json(
        { companies: companies ?? [] },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    const companyId = Number(companyIdParam);
    if (
      !Number.isSafeInteger(companyId) ||
      !companyIds.includes(companyId)
    ) {
      return Response.json(
        { error: "La empresa seleccionada no pertenece a la feria activa." },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }

    const companyStands = (stands ?? []).filter(
      (stand) => stand.company_id === companyId,
    );
    const standIds = companyStands.map((stand) => stand.id);
    const standNumbers = new Map(
      companyStands.map((stand) => [stand.id, stand.number]),
    );
    const visits: StandVisit[] = [];

    for (let offset = 0; ; offset += PAGE_SIZE) {
      const { data, error } = await supabase
        .from("stand_visits")
        .select("participant_id, stand_id, visited_at")
        .in("stand_id", standIds)
        .order("participant_id")
        .order("visited_at")
        .range(offset, offset + PAGE_SIZE - 1);

      if (error) throw error;
      visits.push(...(data ?? []));
      if ((data ?? []).length < PAGE_SIZE) break;
    }

    const visitsByParticipant = new Map<string, StandVisit[]>();
    for (const visit of visits) {
      const participantVisits =
        visitsByParticipant.get(visit.participant_id) ?? [];
      participantVisits.push(visit);
      visitsByParticipant.set(visit.participant_id, participantVisits);
    }

    const participantIds = [...visitsByParticipant.keys()];
    const participants: ParticipantContact[] = [];
    for (
      let offset = 0;
      offset < participantIds.length;
      offset += PARTICIPANT_BATCH_SIZE
    ) {
      const { data, error } = await supabase
        .from("participants")
        .select("id, name, email, phone")
        .eq("contact_sharing_consent", true)
        .in(
          "id",
          participantIds.slice(offset, offset + PARTICIPANT_BATCH_SIZE),
        )
        .or("email.not.is.null,phone.not.is.null");

      if (error) throw error;
      participants.push(...(data ?? []));
    }

    const leads = participants
      .map((participant) => {
        const participantVisits =
          visitsByParticipant.get(participant.id) ?? [];
        return {
          name: participant.name,
          email: participant.email,
          phone: participant.phone,
          standNumbers: [
            ...new Set(
              participantVisits
                .map((visit) => standNumbers.get(visit.stand_id))
                .filter((number): number is string => number !== undefined),
            ),
          ],
          lastVisitedAt:
            participantVisits.at(-1)?.visited_at ?? null,
        };
      })
      .sort((left, right) =>
        left.name.localeCompare(right.name, "es", { sensitivity: "base" }),
      );

    return Response.json(
      {
        companyId,
        leads,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Error cargando contactos autorizados por empresa:", error);
    return databaseErrorResponse(
      "No fue posible cargar los contactos autorizados.",
    );
  }
}
