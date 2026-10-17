import {
  databaseErrorResponse,
  invalidOriginResponse,
  isAdminRequest,
  isSameOriginRequest,
  unauthorizedResponse,
} from "@/lib/adminApi";
import { getAdminSupabase } from "@/lib/adminAuth";

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

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return invalidOriginResponse();
  if (!isAdminRequest(request)) return unauthorizedResponse();

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
      .insert(input)
      .select("id")
      .single();

    if (error) throw error;
    return Response.json({ id: data.id }, { status: 201 });
  } catch (error) {
    console.error("Error creando empresa:", error);
    return databaseErrorResponse("No fue posible crear la empresa.");
  }
}
