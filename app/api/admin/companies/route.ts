import {
  databaseErrorResponse,
  invalidOriginResponse,
  isAdminRequest,
  isSameOriginRequest,
  unauthorizedResponse,
} from "@/lib/adminApi";
import { getAdminSupabase } from "@/lib/adminAuth";
import {
  parseCompanyInput,
  parseCompanyLogoFile,
  removeCompanyLogo,
  uploadCompanyLogo,
} from "@/lib/companyLogo";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return invalidOriginResponse();
  if (!isAdminRequest(request)) return unauthorizedResponse();

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 5 * 1024 * 1024 + 100_000) {
    return Response.json(
      { error: "El logo no puede superar los 5 MB." },
      { status: 413 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json(
      { error: "No fue posible leer los datos de la empresa." },
      { status: 400 },
    );
  }

  let body: unknown;
  try {
    body = JSON.parse(String(formData.get("company") ?? ""));
  } catch {
    return Response.json({ error: "Datos de empresa inválidos." }, { status: 400 });
  }

  const input = parseCompanyInput(body);
  if (!input) {
    return Response.json(
      { error: "Revisa los datos de la empresa." },
      { status: 400 },
    );
  }

  const { file, error: fileError } = parseCompanyLogoFile(
    formData.get("logo"),
  );
  if (fileError) {
    return Response.json({ error: fileError }, { status: 400 });
  }

  let supabase: ReturnType<typeof getAdminSupabase> | null = null;
  let uploadedPath: string | null = null;
  try {
    supabase = getAdminSupabase();
    const uploadedLogo = file
      ? await uploadCompanyLogo(supabase, file)
      : null;
    uploadedPath = uploadedLogo?.path ?? null;

    const { data, error } = await supabase
      .from("companies")
      .insert({ ...input, logo: uploadedLogo?.url ?? "" })
      .select("id")
      .single();

    if (error) throw error;
    return Response.json({ id: data.id }, { status: 201 });
  } catch (error) {
    if (supabase && uploadedPath) {
      try {
        await removeCompanyLogo(supabase, uploadedPath);
      } catch (cleanupError) {
        console.error("No se pudo limpiar el logo cargado:", cleanupError);
      }
    }
    console.error("Error creando empresa:", error);
    return databaseErrorResponse("No fue posible crear la empresa.");
  }
}
