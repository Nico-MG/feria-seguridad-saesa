import Header from "@/components/Header";
import Hero from "@/components/Hero";
import LiveEvent from "@/components/LiveEvent";
import UpcomingEvents from "@/components/UpcomingEvents";
import QuickLinks from "@/components/QuickLinks";

import { talks } from "@/data/mock";

export default function Home() {

  return (
    <main className="min-h-screen bg-slate-50">
      <Header />

      <Hero />

      <div className="mx-auto max-w-6xl px-5 py-8">
        <LiveEvent events={talks} />

        <UpcomingEvents events={talks} />

        <QuickLinks />

        <footer className="mt-12 border-t border-slate-200 py-8 text-center">
          <p className="text-sm font-semibold text-slate-700">
            Feria de Seguridad SAESA
          </p>

          <p className="mt-1 text-xs text-slate-400">
            2026 · Todos los derechos reservados
          </p>
        </footer>
      </div>
    </main>
  );
}