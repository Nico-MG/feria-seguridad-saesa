
import Header from "@/components/Header";
import InteractiveStandMap from "@/components/InteractiveStandMap";
import StandDirectory from "@/components/StandDirectory";

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
      <main className="min-h-screen bg-background">
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
    <main className="min-h-screen bg-background">
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

        <StandDirectory stands={stands} companies={companies} />
      </div>
    </main>
  );
}
