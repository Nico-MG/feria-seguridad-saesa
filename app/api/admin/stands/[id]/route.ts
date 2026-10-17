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

function parseStandInput(value: unknown) {
  if (!value || typeof value !== "object") return null;

  const input = value as Record<string, unknown>;
  const slug =
    typeof input.slug === "string" ? input.slug.trim() : "";

  if (
    !Number.isInteger(input.companyId) ||
    (input.companyId as number) < 1 ||
    typeof input.number !== "string" ||
    !input.number.trim() ||
    typeof input.location !== "string" ||
    !input.location.trim() ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ||
    typeof input.contestRequired !== "boolean"
  ) {
    return null;
  }

  return {
    company_id: input.companyId as number,
    number: input.number.trim(),
    location: input.location.trim(),
    slug,
    contest_required: input.contestRequired,
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

export async function PATCH(request: Request, context: RouteContext) {
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

  const input = parseStandInput(body);
  if (!input) {
    return Response.json(
      { error: "Revisa los datos del stand y el formato del enlace." },
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
      .from("stands")
      .update(input)
      .eq("id", id)
      .eq("event_id", eventId)
      .select("id")
      .maybeSingle();

    if (error) {
      if (error.code === "23505") {
        return Response.json(
          { error: "Ya existe un stand con ese enlace." },
          { status: 409 }
        );
      }
      throw error;
    }
    if (!data) {
      return Response.json(
        { error: "No se encontró el stand de la feria activa." },
        { status: 404 }
      );
    }

    return Response.json({ updated: true });
  } catch (error) {
    console.error("Error modificando stand:", error);
    return databaseErrorResponse(
      "No fue posible modificar el stand. Verifica que la empresa exista."
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
      .from("stands")
      .delete()
      .eq("id", id)
      .eq("event_id", eventId)
      .select("id")
      .maybeSingle();

    if (error) {
      if (error.code === "23503") {
        return Response.json(
          {
            error:
              "No se puede eliminar este stand porque tiene visitas registradas.",
          },
          { status: 409 }
        );
      }
      throw error;
    }
    if (!data) {
      return Response.json(
        { error: "No se encontró el stand de la feria activa." },
        { status: 404 }
      );
    }

    return Response.json({ deleted: true });
  } catch (error) {
    console.error("Error eliminando stand:", error);
    return databaseErrorResponse("No fue posible eliminar el stand.");
  }
}
