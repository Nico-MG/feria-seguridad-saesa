import { supabase } from "@/lib/supabase";

import type {
  Company,
  Event,
  Product,
  Stand,
  Talk,
} from "@/types/event";

export async function getStandsFromSupabase(
  eventId?: number
): Promise<Stand[]> {
  let query = supabase
    .from("stands")
    .select("*")
    .order("id");

  if (eventId !== undefined) {
    query = query.eq(
      "event_id",
      eventId
    );
  }

  const { data, error } =
    await query;

  if (error) {
    throw new Error(
      `Error obteniendo stands: ${error.message}`
    );
  }

  return (data ?? []).map((stand) => ({
    id: stand.id,
    eventId: stand.event_id,
    companyId: stand.company_id,
    number: stand.number,
    location: stand.location,
    slug: stand.slug,
    contestRequired:
      stand.contest_required,
  }));
}


export async function getCompaniesFromSupabase(): Promise<
  Company[]
> {
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .order("id");

  if (error) {
    throw new Error(
      `Error obteniendo empresas: ${error.message}`
    );
  }

  return (data ?? []).map((company) => ({
    id: company.id,
    name: company.name,
    description: company.description ?? "",
    category: company.category ?? "",
    logo: company.logo ?? "",
  }));
}


export async function getCompanyFromSupabase(
  companyId: number
): Promise<Company | null> {
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .eq("id", companyId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Error obteniendo empresa: ${error.message}`
    );
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
  };
}


export async function getProductsFromSupabase(
  companyId: number
): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("company_id", companyId)
    .order("id");

  if (error) {
    throw new Error(
      `Error obteniendo productos: ${error.message}`
    );
  }

  return (data ?? []).map((product) => ({
    id: product.id,
    companyId: product.company_id,
    name: product.name,
    description: product.description ?? "",
  }));
}


export async function getStandFromSupabase(
  slug: string
): Promise<Stand | null> {
  const { data, error } = await supabase
    .from("stands")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Error obteniendo stand: ${error.message}`
    );
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
  };
}

export async function getEventFromSupabase(
  eventId: number
): Promise<Event | null> {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Error obteniendo evento: ${error.message}`
    );
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


export async function getTalksFromSupabase(
  eventId: number
): Promise<Talk[]> {
  const { data, error } = await supabase
    .from("talks")
    .select("*")
    .eq("event_id", eventId)
    .order("start");

  if (error) {
    throw new Error(
      `Error obteniendo charlas: ${error.message}`
    );
  }

  return (data ?? []).map((talk) => ({
    id: talk.id,
    eventId: talk.event_id,
    title: talk.title,
    speaker: talk.speaker,
    companyId: talk.company_id,
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
    throw new Error(
      `Error obteniendo evento activo: ${error.message}`
    );
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