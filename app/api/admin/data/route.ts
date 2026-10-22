import {
  databaseErrorResponse,
  isAdminRequest,
  unauthorizedResponse,
} from "@/lib/adminApi";
import { getAdminSupabase } from "@/lib/adminAuth";

export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return unauthorizedResponse();
  }

  try {
    const supabase = getAdminSupabase();
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id, name")
      .eq("is_active", true)
      .maybeSingle();

    if (eventError) {
      throw eventError;
    }

    if (!event) {
      return Response.json(
        { error: "No hay una feria activa para administrar." },
        { status: 409 },
      );
    }

    const [
      { data: companies, error: companiesError },
      { data: stands, error: standsError },
      { data: talks, error: talksError },
    ] = await Promise.all([
      supabase
        .from("companies")
        .select(
          "id, name, description, category, logo, website_url, instagram_url, facebook_url, linkedin_url, youtube_url",
        )
        .order("name"),
      supabase
        .from("stands")
        .select(
          "id, event_id, company_id, number, location, slug, contest_required, map_x, map_y, map_width, map_height",
        )
        .eq("event_id", event.id)
        .order("id"),
      supabase
        .from("talks")
        .select(
          "id, event_id, title, speaker, company_id, start, end, location",
        )
        .eq("event_id", event.id)
        .order("start"),
    ]);

    if (companiesError) throw companiesError;
    if (standsError) throw standsError;
    if (talksError) throw talksError;

    return Response.json({
      event,
      companies: (companies ?? []).map((company) => ({
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
      })),
      stands: (stands ?? []).map((stand) => ({
        id: stand.id,
        eventId: stand.event_id,
        companyId: stand.company_id,
        number: stand.number,
        location: stand.location,
        slug: stand.slug,
        contestRequired: stand.contest_required,
        mapArea:
          stand.map_x === null ||
          stand.map_y === null ||
          stand.map_width === null ||
          stand.map_height === null
            ? null
            : {
                x: Number(stand.map_x),
                y: Number(stand.map_y),
                width: Number(stand.map_width),
                height: Number(stand.map_height),
              },
      })),
      talks: (talks ?? []).map((talk) => ({
        id: talk.id,
        eventId: talk.event_id,
        title: talk.title,
        speaker: talk.speaker,
        companyId: talk.company_id,
        start: talk.start,
        end: talk.end,
        location: talk.location,
      })),
    });
  } catch (error) {
    console.error("Error cargando datos de administración:", error);
    return databaseErrorResponse(
      "No fue posible cargar los datos de administración.",
    );
  }
}
