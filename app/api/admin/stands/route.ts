import {
  databaseErrorResponse,
  invalidOriginResponse,
  isAdminRequest,
  isSameOriginRequest,
  unauthorizedResponse,
} from "@/lib/adminApi";
import { getAdminSupabase } from "@/lib/adminAuth";

type StandInput = {
  companyId: number;
  number: string;
  location: string;
  slug: string;
  contestRequired: boolean;
};

function parseStandInput(value: unknown): StandInput | null {
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
    companyId: input.companyId as number,
    number: input.number.trim(),
    location: input.location.trim(),
    slug,
    contestRequired: input.contestRequired,
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
      .insert({
        event_id: eventId,
        company_id: input.companyId,
        number: input.number,
        location: input.location,
        slug: input.slug,
        contest_required: input.contestRequired,
      })
      .select("id")
      .single();

    if (error) {
      if (error.code === "23505") {
        return Response.json(
          { error: "Ya existe un stand con ese enlace." },
          { status: 409 }
        );
      }
      throw error;
    }

    return Response.json({ id: data.id }, { status: 201 });
  } catch (error) {
    console.error("Error creando stand:", error);
    return databaseErrorResponse(
      "No fue posible crear el stand. Verifica que la empresa exista."
    );
  }
}
