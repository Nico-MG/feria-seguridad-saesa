"use client";

import { useEffect, useState } from "react";

import Header from "@/components/Header";
import ScheduleItem from "@/components/ScheduleItem";

import { getTalksFromSupabase,getActiveEvent } from "@/lib/supabaseData";
import { getEventStatus } from "@/lib/eventUtils";
import type { Talk } from "@/types/event";


export default function ProgramaPage() {
  const [talks, setTalks] = useState<Talk[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(
    null
  );

  const [now, setNow] = useState(
    () => new Date()
  );

  useEffect(() => {
  async function loadProgram() {
    try {
      const event =
        await getActiveEvent();

      if (!event) {
        throw new Error(
          "No hay un evento activo."
        );
      }

      const data =
        await getTalksFromSupabase(
          event.id
        );

      setTalks(data);
    } catch (error) {
      console.error(error);

      setError(
        "No fue posible cargar el programa."
      );
    } finally {
      setLoading(false);
    }
  }

  loadProgram();
}, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const sortedTalks = [...talks].sort(
    (a, b) =>
      new Date(a.start).getTime() -
      new Date(b.start).getTime()
  );

  const liveEvents = sortedTalks.filter(
    (talk) =>
      getEventStatus(talk, now) === "live"
  );

  const upcomingEvents = sortedTalks.filter(
    (talk) =>
      getEventStatus(talk, now) === "upcoming"
  );

  const finishedEvents = sortedTalks.filter(
    (talk) =>
      getEventStatus(talk, now) === "finished"
  );

  return (
    <main className="min-h-screen bg-[#f6f7f3]">
      <Header />

      <div className="mx-auto max-w-4xl px-5 py-8">

        <div className="mb-8">
          <p className="text-sm font-semibold text-sky-600">
            FERIA DE SEGURIDAD
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Programa
          </h1>

          <p className="mt-3 text-slate-500">
            Revisa las charlas y actividades de
            la feria.
          </p>
        </div>


        {loading && (
          <div className="rounded-2xl bg-white p-6 text-center ring-1 ring-slate-200">
            <p className="text-sm text-slate-500">
              Cargando programa...
            </p>
          </div>
        )}


        {error && (
          <div className="rounded-2xl bg-red-50 p-6 text-center ring-1 ring-red-200">
            <p className="font-semibold text-red-700">
              {error}
            </p>
          </div>
        )}


        {!loading &&
          !error &&
          talks.length === 0 && (
            <div className="rounded-2xl bg-white p-6 text-center ring-1 ring-slate-200">
              <p className="text-sm text-slate-500">
                No hay actividades registradas.
              </p>
            </div>
          )}


        {!loading &&
          !error &&
          liveEvents.length > 0 && (
            <section className="mb-10">

              <div className="mb-4">
                <p className="text-sm font-bold text-red-600">
                  AHORA
                </p>

                <h2 className="mt-1 text-2xl font-bold text-slate-900">
                  En vivo
                </h2>
              </div>

              <div className="space-y-4">
                {liveEvents.map((talk) => (
                  <ScheduleItem
                    key={talk.id}
                    event={talk}
                    now={now}
                  />
                ))}
              </div>

            </section>
          )}


        {!loading &&
          !error &&
          upcomingEvents.length > 0 && (
            <section className="mb-10">

              <div className="mb-4">
                <p className="text-sm font-bold text-sky-600">
                  PRÓXIMAMENTE
                </p>

                <h2 className="mt-1 text-2xl font-bold text-slate-900">
                  Próximas actividades
                </h2>
              </div>

              <div className="space-y-4">
                {upcomingEvents.map((talk) => (
                  <ScheduleItem
                    key={talk.id}
                    event={talk}
                    now={now}
                  />
                ))}
              </div>

            </section>
          )}


        {!loading &&
          !error &&
          finishedEvents.length > 0 && (
            <section>

              <div className="mb-4">
                <p className="text-sm font-bold text-slate-400">
                  HISTORIAL
                </p>

                <h2 className="mt-1 text-2xl font-bold text-slate-900">
                  Actividades finalizadas
                </h2>
              </div>

              <div className="space-y-4">
                {finishedEvents.map((talk) => (
                  <ScheduleItem
                    key={talk.id}
                    event={talk}
                    now={now}
                  />
                ))}
              </div>

            </section>
          )}

      </div>
    </main>
  );
}
