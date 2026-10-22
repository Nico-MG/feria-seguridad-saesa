import { supabase } from "@/lib/supabase";

import type { Company, Event, Product, Stand, Talk } from "@/types/event";

function getStandMapArea(stand: {
  map_x?: number | null;
  map_y?: number | null;
  map_width?: number | null;
  map_height?: number | null;
}) {
  if (
    typeof stand.map_x !== "number" ||
    typeof stand.map_y !== "number" ||
    typeof stand.map_width !== "number" ||
    typeof stand.map_height !== "number"
  ) {
    return null;
  }

  return {
    x: stand.map_x,
    y: stand.map_y,
    width: stand.map_width,
    height: stand.map_height,
  };
}

export async function getStandsFromSupabase(
  eventId?: number,
): Promise<Stand[]> {
  let query = supabase.from("stands").select("*").order("id");

  if (eventId !== undefined) {
    query = query.eq("event_id", eventId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Error obteniendo stands: ${error.message}`);
  }

  return (data ?? []).map((stand) => ({
    id: stand.id,
    eventId: stand.event_id,
    companyId: stand.company_id,
    number: stand.number,
    location: stand.location,
    slug: stand.slug,
    contestRequired: stand.contest_required,
    mapArea: getStandMapArea(stand),
  }));
}

export async function getCompaniesFromSupabase(): Promise<Company[]> {
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .order("id");

  if (error) {
    throw new Error(`Error obteniendo empresas: ${error.message}`);
  }

  return (data ?? []).map((company) => ({
    id: company.id,
    name: company.name,
    description: company.description ?? "",
    category: company.category ?? "",
    logo: company.logo ?? "",
    websiteUrl: company.website_url ?? "",
    instagramUrl: company.instagram_url ?? "",
    facebookUrl: company.facebook_url ?? "",
    linkedinUrl: company.linkedin_url ?? "",
    youtubeUrl: company.youtube_url ?? "",
  }));
}

export async function getCompanyFromSupabase(
  companyId: number,
): Promise<Company | null> {
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .eq("id", companyId)
    .maybeSingle();

  if (error) {
    throw new Error(`Error obteniendo empresa: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    name: data.name,
    description: data.description ?? "",
    category: data.category ?? "",
    logo: data.logo ?? "",
    websiteUrl: data.website_url ?? "",
    instagramUrl: data.instagram_url ?? "",
    facebookUrl: data.facebook_url ?? "",
    linkedinUrl: data.linkedin_url ?? "",
    youtubeUrl: data.youtube_url ?? "",
  };
}

export async function getProductsFromSupabase(
  companyId: number,
): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("company_id", companyId)
    .order("id");

  if (error) {
    throw new Error(`Error obteniendo productos: ${error.message}`);
  }

  return (data ?? []).map((product) => ({
    id: product.id,
    companyId: product.company_id,
    name: product.name,
    description: product.description ?? "",
  }));
}

export async function getStandFromSupabase(
  slug: string,
): Promise<Stand | null> {
  const { data, error } = await supabase
    .from("stands")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    throw new Error(`Error obteniendo stand: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    eventId: data.event_id,
    companyId: data.company_id,
    number: data.number,
    location: data.location,
    slug: data.slug,
    contestRequired: data.contest_required,
    mapArea: getStandMapArea(data),
  };
}

export async function getEventFromSupabase(
  eventId: number,
): Promise<Event | null> {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .maybeSingle();

  if (error) {
    throw new Error(`Error obteniendo evento: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    name: data.name,
    date: data.date,
    location: data.location,
  };
}

export async function getTalksFromSupabase(eventId: number): Promise<Talk[]> {
  const { data, error } = await supabase
    .from("talks")
    .select(
      `
      *,
      companies (
        id,
        name,
        description,
        category,
        logo
      )
    `,
    )
    .eq("event_id", eventId)
    .order("start");

  if (error) {
    throw new Error(`Error obteniendo charlas: ${error.message}`);
  }

  return (data ?? []).map((talk) => ({
    id: talk.id,
    eventId: talk.event_id,
    title: talk.title,
    speaker: talk.speaker,
    companyId: talk.company_id,
    company: talk.companies
      ? {
          id: talk.companies.id,
          name: talk.companies.name,
          description: talk.companies.description ?? "",
          category: talk.companies.category ?? "",
          logo: talk.companies.logo ?? "",
        }
      : null,
    start: talk.start,
    end: talk.end,
    location: talk.location,
  }));
}

export async function getActiveEvent(): Promise<Event | null> {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    throw new Error(`Error obteniendo evento activo: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    name: data.name,
    date: data.date,
    location: data.location,
  };
}

export async function getContestStands(eventId: number): Promise<Stand[]> {
  const { data, error } = await supabase
    .from("stands")
    .select("*")
    .eq("event_id", eventId)
    .eq("contest_required", true)
    .order("id");

  if (error) {
    throw new Error(`Error obteniendo stands del concurso: ${error.message}`);
  }

  return (data ?? []).map((stand) => ({
    id: stand.id,
    eventId: stand.event_id,
    companyId: stand.company_id,
    number: stand.number,
    location: stand.location,
    slug: stand.slug,
    contestRequired: stand.contest_required,
  }));
}

export async function getParticipantVisits(
  participantId: string,
): Promise<number[]> {
  const { data, error } = await supabase
    .from("stand_visits")
    .select("stand_id")
    .eq("participant_id", participantId);

  if (error) {
    throw new Error(`Error obteniendo visitas: ${error.message}`);
  }

  return (data ?? []).map((visit) => visit.stand_id);
}

export async function getActiveEventTalks(): Promise<Talk[]> {
  const event = await getActiveEvent();

  if (!event) {
    return [];
  }

  return getTalksFromSupabase(event.id);
}
