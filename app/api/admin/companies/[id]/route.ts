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

function parseCompanyInput(value: unknown) {
  if (!value || typeof value !== "object") return null;

  const input = value as Record<string, unknown>;
  if (
    typeof input.name !== "string" ||
    !input.name.trim() ||
    input.name.trim().length > 200 ||
    typeof input.description !== "string" ||
    input.description.length > 5000 ||
    typeof input.category !== "string" ||
    input.category.length > 200 ||
    typeof input.logo !== "string" ||
    input.logo.length > 200
  ) {
    return null;
  }

  return {
    name: input.name.trim(),
    description: input.description.trim(),
    category: input.category.trim(),
    logo: input.logo.trim(),
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

  const input = parseCompanyInput(body);
  if (!input) {
    return Response.json(
      { error: "Revisa los datos de la empresa." },
      { status: 400 },
    );
  }

  try {
    const { data, error } = await getAdminSupabase()
      .from("companies")
      .update(input)
      .eq("id", id)
      .select("id")
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return Response.json(
        { error: "No se encontró la empresa." },
        { status: 404 },
      );
    }
    return Response.json({ updated: true });
  } catch (error) {
    console.error("Error modificando empresa:", error);
    return databaseErrorResponse("No fue posible modificar la empresa.");
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  if (!isSameOriginRequest(request)) return invalidOriginResponse();
  if (!isAdminRequest(request)) return unauthorizedResponse();

  const { id: rawId } = await context.params;
  const id = parseId(rawId);
  if (id === null) {
    return Response.json({ error: "Identificador inválido." }, { status: 400 });
  }

  try {
    const { data, error } = await getAdminSupabase()
      .from("companies")
      .delete()
      .eq("id", id)
      .select("id")
      .maybeSingle();

    if (error) {
      if (error.code === "23503") {
        return Response.json(
          {
            error:
              "No se puede eliminar esta empresa porque tiene stands, actividades o productos asociados.",
          },
          { status: 409 },
        );
      }
      throw error;
    }
    if (!data) {
      return Response.json(
        { error: "No se encontró la empresa." },
        { status: 404 },
      );
    }
    return Response.json({ deleted: true });
  } catch (error) {
    console.error("Error eliminando empresa:", error);
    return databaseErrorResponse("No fue posible eliminar la empresa.");
  }
}
