
import Link from "next/link";

import Header from "@/components/Header";
import InteractiveStandMap from "@/components/InteractiveStandMap";
import CompanyLogo from "@/components/CompanyLogo";

import {
  getActiveEvent,
  getCompaniesFromSupabase,
  getStandsFromSupabase,
} from "@/lib/supabaseData";

export const dynamic = "force-dynamic";

export default async function StandsPage() {
  const event = await getActiveEvent();

  if (!event) {
    return (
      <main className="min-h-screen bg-slate-50">
        <Header />

        <div className="mx-auto max-w-5xl px-5 py-16 text-center">
          <h1 className="text-2xl font-bold">
            No hay una feria activa
          </h1>
        </div>
      </main>
    );
  }

  const [stands, companies] = await Promise.all([
    getStandsFromSupabase(event.id),
    getCompaniesFromSupabase(),
  ]);

  return (
    <main className="min-h-screen bg-slate-50">
      <Header />

      <div className="mx-auto max-w-7xl px-5 py-8">
        <div className="mb-8">
          <p className="text-sm font-semibold text-sky-600">
            FERIA DE SEGURIDAD
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Stands
          </h1>

          <p className="mt-3 text-slate-500">
            Explora el recinto y conoce las empresas participantes
            y sus soluciones.
          </p>
        </div>

        <InteractiveStandMap
          stands={stands}
          companies={companies}
        />

        <section>
          <h2 className="mb-5 text-2xl font-bold text-slate-900">
            Todas las empresas
          </h2>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {stands.map((stand) => {
              const company = companies.find(
                (item) => item.id === stand.companyId
              );

              if (!company) return null;

              return (
                <Link
                  key={stand.id}
                  href={`/stands/${stand.slug}`}
                  className="group rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-1 hover:shadow-md"
                >
                  <div className="flex items-start justify-between">
                    <CompanyLogo
                      logo={company.logo}
                      name={company.name}
                      className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-sky-50"
                    />

                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
                      {stand.number}
                    </span>
                  </div>

                  <h3 className="mt-5 text-xl font-bold text-slate-900 group-hover:text-sky-600">
                    {company.name}
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    {company.description}
                  </p>

                  <p className="mt-5 text-sm font-semibold text-sky-600">
                    Ver stand →
                  </p>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
