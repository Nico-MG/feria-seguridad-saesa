import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export const COMPANY_LOGO_BUCKET = "feria-game-images";
const MAX_COMPANY_LOGO_SIZE = 5 * 1024 * 1024;
const COMPANY_LOGO_PATH_PATTERN =
  /^company-logos\/[0-9a-f-]{36}\.(jpg|png|webp)$/;

export type CompanyInput = {
  name: string;
  description: string;
  category: string;
  website_url: string;
  instagram_url: string;
  facebook_url: string;
  linkedin_url: string;
  youtube_url: string;
};

function parseOptionalUrl(value: unknown) {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string" || value.length > 2048) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) return "";

  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

export function parseCompanyInput(value: unknown): CompanyInput | null {
  if (!value || typeof value !== "object") return null;

  const input = value as Record<string, unknown>;
  const websiteUrl = parseOptionalUrl(input.website_url);
  const instagramUrl = parseOptionalUrl(input.instagram_url);
  const facebookUrl = parseOptionalUrl(input.facebook_url);
  const linkedinUrl = parseOptionalUrl(input.linkedin_url);
  const youtubeUrl = parseOptionalUrl(input.youtube_url);
  if (
    typeof input.name !== "string" ||
    !input.name.trim() ||
    input.name.trim().length > 200 ||
    typeof input.description !== "string" ||
    input.description.length > 5000 ||
    typeof input.category !== "string" ||
    input.category.length > 200 ||
    websiteUrl === null ||
    instagramUrl === null ||
    facebookUrl === null ||
    linkedinUrl === null ||
    youtubeUrl === null
  ) {
    return null;
  }

  return {
    name: input.name.trim(),
    description: input.description.trim(),
    category: input.category.trim(),
    website_url: websiteUrl,
    instagram_url: instagramUrl,
    facebook_url: facebookUrl,
    linkedin_url: linkedinUrl,
    youtube_url: youtubeUrl,
  };
}

export function parseCompanyLogoFile(value: FormDataEntryValue | null) {
  if (value === null) return { file: null, error: null };
  if (!(value instanceof File) || value.size === 0) {
    return { file: null, error: "Selecciona un archivo de imagen válido." };
  }
  if (!["image/jpeg", "image/png", "image/webp"].includes(value.type)) {
    return { file: null, error: "El logo debe ser JPG, PNG o WebP." };
  }
  if (value.size > MAX_COMPANY_LOGO_SIZE) {
    return { file: null, error: "El logo no puede superar los 5 MB." };
  }

  return { file: value, error: null };
}

export async function uploadCompanyLogo(
  supabase: SupabaseClient,
  file: File,
) {
  const extension =
    file.type === "image/png"
      ? "png"
      : file.type === "image/webp"
        ? "webp"
        : "jpg";
  const path = `company-logos/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage
    .from(COMPANY_LOGO_BUCKET)
    .upload(path, new Uint8Array(await file.arrayBuffer()), {
      contentType: file.type,
      cacheControl: "3600",
      upsert: false,
    });

  if (error) throw error;

  return {
    path,
    url: supabase.storage.from(COMPANY_LOGO_BUCKET).getPublicUrl(path).data
      .publicUrl,
  };
}

export function getCompanyLogoPath(logo: string | null | undefined) {
  if (!logo) return null;

  let pathname: string;
  try {
    pathname = new URL(logo).pathname;
  } catch {
    return null;
  }

  const prefix = `/storage/v1/object/public/${COMPANY_LOGO_BUCKET}/`;
  if (!pathname.startsWith(prefix)) return null;

  try {
    const path = decodeURIComponent(pathname.slice(prefix.length));
    return COMPANY_LOGO_PATH_PATTERN.test(path) ? path : null;
  } catch {
    return null;
  }
}

export async function removeCompanyLogo(
  supabase: SupabaseClient,
  path: string,
) {
  const { error } = await supabase.storage
    .from(COMPANY_LOGO_BUCKET)
    .remove([path]);
  if (error) throw error;
}
