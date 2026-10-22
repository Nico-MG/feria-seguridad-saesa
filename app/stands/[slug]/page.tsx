import Link from "next/link";

import Header from "@/components/Header";
import CompanyLogo from "@/components/CompanyLogo";
import RegisterVisitButton from "@/components/RegisterVisitButton";
import StandLocationMap from "@/components/StandLocationMap";

import {
  getCompanyFromSupabase,
  getStandFromSupabase,
} from "@/lib/supabaseData";

type StandPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function StandPage({ params }: StandPageProps) {
  const { slug } = await params;

  const stand = await getStandFromSupabase(slug);

  if (!stand) {
    return (
      <main className="min-h-screen bg-slate-50">
        <Header />

        <div className="mx-auto max-w-3xl px-5 py-16 text-center">
          <h1 className="text-2xl font-bold text-slate-900">
            Stand no encontrado
          </h1>

          <Link
            href="/stands"
            className="mt-4 inline-block text-sm font-semibold text-sky-600"
          >
            ← Volver a stands
          </Link>
        </div>
      </main>
    );
  }

  const company = await getCompanyFromSupabase(stand.companyId);

  if (!company) {
    return (
      <main className="min-h-screen bg-slate-50">
        <Header />

        <div className="mx-auto max-w-3xl px-5 py-16 text-center">
          <h1 className="text-2xl font-bold text-slate-900">
            Empresa no encontrada
          </h1>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <Header />

      <div className="mx-auto max-w-4xl px-5 py-8">
        <Link href="/stands" className="text-sm font-semibold text-sky-600">
          ← Volver a stands
        </Link>

        {/* Información principal */}

        <section className="mt-6 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="bg-sky-600 p-6 text-white">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-sky-100">
                  STAND {stand.number}
                </p>

                <h1 className="mt-2 text-3xl font-bold">{company.name}</h1>

                <p className="mt-2 text-sm text-sky-100">{company.category}</p>
              </div>

              <CompanyLogo
                logo={company.logo}
                name={company.name}
                className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white"
              />
            </div>
          </div>

          <div className="p-6">
            <h2 className="text-xl font-bold text-slate-900">
              Sobre la empresa
            </h2>

            <p className="mt-3 leading-7 text-slate-500">
              {company.description}
            </p>

            <Link
              href={`/stands/${stand.slug}/qr`}
              className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Ver código QR del stand
            </Link>
          </div>
        </section>

        <section className="mt-8 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm font-semibold text-sky-600">
            MÁS INFORMACIÓN
          </p>
          <h2 className="mt-1 text-2xl font-bold text-slate-900">
            Conoce más de {company.name}
          </h2>
          <div className="mt-5 flex flex-wrap gap-3">
            {[
              ["Página web", company.websiteUrl],
              ["Instagram", company.instagramUrl],
              ["Facebook", company.facebookUrl],
              ["YouTube", company.youtubeUrl],
            ].map(
              ([label, url]) =>
                url && (
                  <a
                    key={label}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-xl bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-800 transition hover:bg-sky-100"
                  >
                    {label}
                  </a>
                ),
            )}
            {!company.websiteUrl &&
              !company.instagramUrl &&
              !company.facebookUrl &&
              !company.youtubeUrl && (
                <p className="text-sm text-slate-500">
                  Esta empresa todavía no ha agregado enlaces.
                </p>
              )}
          </div>
        </section>

        {/* Concurso */}

        {stand.contestRequired && (
          <section className="mt-8">
            <div className="rounded-2xl bg-slate-950 p-6 text-white">
              <p className="text-sm font-semibold text-sky-300">CONCURSO</p>

              <h2 className="mt-2 text-xl font-bold">Registra tu visita</h2>

              <p className="mt-2 text-sm leading-6 text-slate-300">
                Visita este stand y registra tu participación para completar tu
                pasaporte de la feria.
              </p>

              <div className="mt-5">
                <RegisterVisitButton standId={stand.id} />
              </div>
            </div>
          </section>
        )}

        {/* Mapa */}

        <section className="mt-8 rounded-2xl bg-white p-6 ring-1 ring-slate-200">
          <h2 className="text-lg font-bold text-slate-900">
            Ubicación del stand
          </h2>
          <StandLocationMap stand={stand} />
        </section>
      </div>
    </main>
  );
}
