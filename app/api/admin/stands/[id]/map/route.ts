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

type MapArea = {
  x: number;
  y: number;
  width: number;
  height: number;
};

function parseId(value: string) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function parseMapArea(value: unknown): MapArea | null | undefined {
  if (value === null) return null;
  if (!value || typeof value !== "object") return undefined;

  const area = value as Record<string, unknown>;
  if (
    typeof area.x !== "number" ||
    !Number.isFinite(area.x) ||
    typeof area.y !== "number" ||
    !Number.isFinite(area.y) ||
    typeof area.width !== "number" ||
    !Number.isFinite(area.width) ||
    typeof area.height !== "number" ||
    !Number.isFinite(area.height) ||
    area.x < 0 ||
    area.y < 0 ||
    area.width <= 0 ||
    area.height <= 0 ||
    area.x + area.width > 100 ||
    area.y + area.height > 100
  ) {
    return undefined;
  }

  return {
    x: area.x,
    y: area.y,
    width: area.width,
    height: area.height,
  };
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

  const area =
    body && typeof body === "object"
      ? parseMapArea((body as Record<string, unknown>).area)
      : undefined;
  if (area === undefined) {
    return Response.json(
      { error: "La ubicación debe ser un área válida del plano." },
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
      return Response.json(
        { error: "No hay una feria activa." },
        { status: 409 },
      );
    }

    const { data, error } = await supabase
      .from("stands")
      .update({
        map_x: area?.x ?? null,
        map_y: area?.y ?? null,
        map_width: area?.width ?? null,
        map_height: area?.height ?? null,
      })
      .eq("id", id)
      .eq("event_id", event.id)
      .select("id")
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return Response.json(
        { error: "No se encontró el stand de la feria activa." },
        { status: 404 },
      );
    }

    return Response.json({ updated: true });
  } catch (error) {
    console.error("Error guardando ubicación del stand:", error);
    return databaseErrorResponse(
      "No fue posible guardar la ubicación del stand.",
    );
  }
}
