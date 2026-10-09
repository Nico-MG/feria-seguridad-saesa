
"use client";

import { useEffect, useState } from "react";
import ScheduleItem from "@/components/ScheduleItem";
import { getEventStatus } from "@/lib/eventUtils";
import type { Talk } from "@/types/event";

type UpcomingEventsProps = {
  talks: Talk[];
};

function formatTime(date: string) {
  return new Date(date).toLocaleTimeString("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export default function UpcomingEvents({
  talks,
}: UpcomingEventsProps) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const upcomingTalks = talks
    .filter((talk) => getEventStatus(talk, now) === "upcoming")
    .sort(
      (a, b) =>
        new Date(a.start).getTime() -
        new Date(b.start).getTime()
    );

  const nextTalk = upcomingTalks[0];
  const remainingTalks = upcomingTalks.slice(1, 3);

  return (
    <section className="mt-12">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-wider text-sky-600">
            Sigue en el programa
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            Próxima actividad
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            No te pierdas lo que viene en la feria.
          </p>
        </div>

        <a
          href="/programa"
          className="shrink-0 text-sm font-semibold text-sky-700 hover:text-sky-900"
        >
          Ver programa →
        </a>
      </div>

      {nextTalk ? (
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="overflow-hidden rounded-2xl bg-slate-950 text-white shadow-lg">
            <div className="h-1.5 bg-sky-400" />

            <div className="p-6 sm:p-8">
              <span className="inline-flex rounded-full bg-sky-400/15 px-3 py-1 text-xs font-bold text-sky-300">
                PRÓXIMA CHARLA
              </span>

              <p className="mt-6 text-sm font-semibold text-sky-300">
                {formatTime(nextTalk.start)} — {formatTime(nextTalk.end)}
              </p>

              <h3 className="mt-3 text-2xl font-bold leading-tight sm:text-3xl">
                {nextTalk.title}
              </h3>

              <p className="mt-3 text-sm text-slate-300">
                {nextTalk.speaker}
                {nextTalk.company?.name
                  ? ` · ${nextTalk.company.name}`
                  : ""}
              </p>

              <p className="mt-5 text-sm text-slate-400">
                📍 {nextTalk.location}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <h3 className="mb-4 font-bold text-slate-900">
              A continuación
            </h3>

            {remainingTalks.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {remainingTalks.map((talk) => (
                  <article key={talk.id} className="py-4 first:pt-0 last:pb-0">
                    <p className="text-sm font-bold text-sky-700">
                      {formatTime(talk.start)} — {formatTime(talk.end)}
                    </p>

                    <h4 className="mt-1 font-semibold text-slate-900">
                      {talk.title}
                    </h4>

                    <p className="mt-1 text-sm text-slate-500">
                      {talk.speaker}
                    </p>

                    <p className="mt-2 text-xs text-slate-400">
                      📍 {talk.location}
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                Esta es la siguiente actividad programada.
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <p className="font-semibold text-slate-900">
            No hay próximas actividades programadas.
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Consulta el programa completo para revisar las actividades.
          </p>
        </div>
      )}
    </section>
  );
}