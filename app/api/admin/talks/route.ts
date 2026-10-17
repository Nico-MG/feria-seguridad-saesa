import {
  databaseErrorResponse,
  invalidOriginResponse,
  isAdminRequest,
  isSameOriginRequest,
  unauthorizedResponse,
} from "@/lib/adminApi";
import { getAdminSupabase } from "@/lib/adminAuth";

function parseTalkInput(value: unknown) {
  if (!value || typeof value !== "object") return null;

  const input = value as Record<string, unknown>;
  if (
    typeof input.title !== "string" ||
    !input.title.trim() ||
    typeof input.speaker !== "string" ||
    !input.speaker.trim() ||
    !Number.isInteger(input.companyId) ||
    (input.companyId as number) < 1 ||
    typeof input.start !== "string" ||
    !Number.isFinite(Date.parse(input.start)) ||
    typeof input.end !== "string" ||
    !Number.isFinite(Date.parse(input.end)) ||
    Date.parse(input.end) <= Date.parse(input.start) ||
    typeof input.location !== "string" ||
    !input.location.trim()
  ) {
    return null;
  }

  return {
    title: input.title.trim(),
    speaker: input.speaker.trim(),
    company_id: input.companyId as number,
    start: input.start,
    end: input.end,
    location: input.location.trim(),
  };
}

async function getActiveEventId() {
  const { data, error } = await getAdminSupabase()
    .from("events")
    .select("id")
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw error;
  return data?.id ?? null;
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return invalidOriginResponse();
  if (!isAdminRequest(request)) return unauthorizedResponse();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }

  const input = parseTalkInput(body);
  if (!input) {
    return Response.json(
      { error: "Revisa los datos de la actividad y sus horarios." },
      { status: 400 }
    );
  }

  try {
    const supabase = getAdminSupabase();
    const eventId = await getActiveEventId();
    if (eventId === null) {
      return Response.json(
        { error: "No hay una feria activa." },
        { status: 409 }
      );
    }

    const { data, error } = await supabase
      .from("talks")
      .insert({ ...input, event_id: eventId })
      .select("id")
      .single();

    if (error) throw error;
    return Response.json({ id: data.id }, { status: 201 });
  } catch (error) {
    console.error("Error creando actividad:", error);
    return databaseErrorResponse(
      "No fue posible crear la actividad. Verifica que la empresa exista."
    );
  }
}
