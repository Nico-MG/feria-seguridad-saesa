import {
  databaseErrorResponse,
  invalidOriginResponse,
  isAdminRequest,
  isSameOriginRequest,
  unauthorizedResponse,
} from "@/lib/adminApi";
import { getAdminSupabase } from "@/lib/adminAuth";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function parseId(value: string) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

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

export async function PATCH(
  request: Request,
  context: RouteContext
) {
  if (!isSameOriginRequest(request)) return invalidOriginResponse();
  if (!isAdminRequest(request)) return unauthorizedResponse();

  const { id: rawId } = await context.params;
  const id = parseId(rawId);
  if (id === null) {
    return Response.json({ error: "Identificador inválido." }, { status: 400 });
  }

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
      .update(input)
      .eq("id", id)
      .eq("event_id", eventId)
      .select("id")
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return Response.json(
        { error: "No se encontró la actividad de la feria activa." },
        { status: 404 }
      );
    }

    return Response.json({ updated: true });
  } catch (error) {
    console.error("Error modificando actividad:", error);
    return databaseErrorResponse(
      "No fue posible modificar la actividad. Verifica que la empresa exista."
    );
  }
}

export async function DELETE(
  request: Request,
  context: RouteContext
) {
  if (!isSameOriginRequest(request)) return invalidOriginResponse();
  if (!isAdminRequest(request)) return unauthorizedResponse();

  const { id: rawId } = await context.params;
  const id = parseId(rawId);
  if (id === null) {
    return Response.json({ error: "Identificador inválido." }, { status: 400 });
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
      .delete()
      .eq("id", id)
      .eq("event_id", eventId)
      .select("id")
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return Response.json(
        { error: "No se encontró la actividad de la feria activa." },
        { status: 404 }
      );
    }

    return Response.json({ deleted: true });
  } catch (error) {
    console.error("Error eliminando actividad:", error);
    return databaseErrorResponse("No fue posible eliminar la actividad.");
  }
}
