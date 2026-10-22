import Link from "next/link";

import Header from "@/components/Header";
import StandQRCode from "@/components/StandQRCode";
import PrintButton from "@/components/PrintButton";

import {
  getCompanyFromSupabase,
  getStandFromSupabase,
} from "@/lib/supabaseData";

type QRPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export const dynamic = "force-dynamic";

export default async function QRPage({ params }: QRPageProps) {
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

      <div className="mx-auto max-w-3xl px-5 py-8">
        <Link
          href={`/stands/${stand.slug}`}
          className="text-sm font-semibold text-sky-600"
        >
          ← Volver al stand
        </Link>

        <section className="mt-6 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="text-center">
            <p className="text-sm font-bold text-sky-600">
              STAND {stand.number}
            </p>

            <h1 className="mt-2 text-3xl font-bold text-slate-900">
              {company.name}
            </h1>

            <p className="mt-2 text-sm text-slate-500">Código QR del stand</p>
          </div>

          <div className="mt-8">
            <StandQRCode slug={stand.slug} />
          </div>

          <div className="mt-8 rounded-2xl bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-700">
              Instrucciones
            </p>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Imprime este código y colócalo en el stand. Al escanearlo, los
              asistentes podrán registrarse en el concurso y sumar su visita a
              este stand.
            </p>
          </div>

          <div className="mt-6">
            <PrintButton />
          </div>
        </section>
      </div>
    </main>
  );
}
