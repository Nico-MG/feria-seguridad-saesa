import {
  invalidOriginResponse,
  isSameOriginRequest,
} from "@/lib/adminApi";
import { getAdminSupabase } from "@/lib/adminAuth";

const visitorIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const trackedPathPattern =
  /^\/(?:|programa|concurso|imagen|stands(?:\/[a-z0-9-]+(?:\/qr)?)?)$/;

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return invalidOriginResponse();
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return Response.json({ error: "Datos de visita inválidos." }, { status: 400 });
  }

  const input = body as Record<string, unknown>;
  const loadMs = input.loadMs;
  const validLoadMs =
    loadMs === null ||
    (typeof loadMs === "number" &&
      Number.isInteger(loadMs) &&
      loadMs >= 0 &&
      loadMs <= 60_000);
  if (
    typeof input.visitorId !== "string" ||
    !visitorIdPattern.test(input.visitorId) ||
    typeof input.path !== "string" ||
    input.path.length > 200 ||
    !trackedPathPattern.test(input.path) ||
    !validLoadMs
  ) {
    return Response.json(
      { error: "Datos de visita inválidos." },
      { status: 400 },
    );
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
      return Response.json({ recorded: false }, { status: 202 });
    }

    const { error } = await supabase.rpc("record_page_view", {
      p_visitor_id: input.visitorId,
      p_event_id: event.id,
      p_path: input.path,
      p_load_ms: loadMs,
    });

    if (error) throw error;
    return Response.json({ recorded: true }, { status: 202 });
  } catch (error) {
    console.error("Error registrando métricas de página:", error);
    return Response.json(
      { error: "No fue posible registrar la visita." },
      { status: 500 },
    );
  }
}
