import {
  databaseErrorResponse,
  invalidOriginResponse,
  isAdminRequest,
  isSameOriginRequest,
  unauthorizedResponse,
} from "@/lib/adminApi";
import { getAdminSupabase } from "@/lib/adminAuth";
import {
  getCompanyLogoPath,
  parseCompanyInput,
  parseCompanyLogoFile,
  removeCompanyLogo,
  uploadCompanyLogo,
} from "@/lib/companyLogo";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function parseId(value: string) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export async function PATCH(request: Request, context: RouteContext) {
  if (!isSameOriginRequest(request)) return invalidOriginResponse();
  if (!isAdminRequest(request)) return unauthorizedResponse();

  const { id: rawId } = await context.params;
  const id = parseId(rawId);
  if (id === null) {
    return Response.json({ error: "Identificador inválido." }, { status: 400 });
  }

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
    const { data: existing, error: existingError } = await supabase
      .from("companies")
      .select("logo")
      .eq("id", id)
      .maybeSingle();
    if (existingError) throw existingError;
    if (!existing) {
      return Response.json(
        { error: "No se encontró la empresa." },
        { status: 404 },
      );
    }

    const uploadedLogo = file
      ? await uploadCompanyLogo(supabase, file)
      : null;
    uploadedPath = uploadedLogo?.path ?? null;
    const { data, error } = await supabase
      .from("companies")
      .update({ ...input, logo: uploadedLogo?.url ?? existing.logo ?? "" })
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

    if (uploadedLogo) {
      const previousPath = getCompanyLogoPath(existing.logo);
      if (previousPath) {
        try {
          await removeCompanyLogo(supabase, previousPath);
        } catch (cleanupError) {
          console.error("No se pudo eliminar el logo anterior:", cleanupError);
        }
      }
    }

    return Response.json({ updated: true });
  } catch (error) {
    if (supabase && uploadedPath) {
      try {
        await removeCompanyLogo(supabase, uploadedPath);
      } catch (cleanupError) {
        console.error("No se pudo limpiar el logo cargado:", cleanupError);
      }
    }
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
    const supabase = getAdminSupabase();
    const { data: existing, error: existingError } = await supabase
      .from("companies")
      .select("logo")
      .eq("id", id)
      .maybeSingle();

    if (existingError) throw existingError;
    if (!existing) {
      return Response.json(
        { error: "No se encontró la empresa." },
        { status: 404 },
      );
    }

    const { data, error } = await supabase
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

    const logoPath = getCompanyLogoPath(existing.logo);
    if (logoPath) {
      try {
        await removeCompanyLogo(supabase, logoPath);
      } catch (cleanupError) {
        console.error("No se pudo eliminar el logo de la empresa:", cleanupError);
      }
    }

    return Response.json({ deleted: true });
  } catch (error) {
    console.error("Error eliminando empresa:", error);
    return databaseErrorResponse("No fue posible eliminar la empresa.");
  }
}
