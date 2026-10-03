"use client";
import type { Talk } from "@/types/event";
import { useEffect, useState } from "react";
import { getEventStatus } from "@/lib/eventUtils";
import { getCompanyById } from "@/lib/eventData";

type LiveEventProps = {
  events: Talk[];
};

function formatTime(dateString: string) {
  return new Date(dateString).toLocaleTimeString("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getNextEvent(events: Talk[], now: Date) {
  return events
    .filter((event) => new Date(event.start) > now)
    .sort(
      (a, b) =>
        new Date(a.start).getTime() -
        new Date(b.start).getTime()
    )[0];
}

function getCurrentEvent(events: Talk[], now: Date) {
  return events.find(
    (event) => getEventStatus(event, now) === "live"
  );
}

export default function LiveEvent({
  events,
}: LiveEventProps) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const currentEvent = getCurrentEvent(events, now);
  const nextEvent = getNextEvent(events, now);

  const currentCompany = currentEvent
    ? getCompanyById(currentEvent.companyId)
    : undefined;

  const nextCompany = nextEvent
    ? getCompanyById(nextEvent.companyId)
    : undefined;

  if (currentEvent) {
    return (
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">
            Ahora
          </h2>

          <span className="flex items-center gap-2 text-sm font-medium text-red-600">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-600" />
            EN VIVO
          </span>
        </div>

        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="bg-sky-600 p-6 text-white">
            <p className="text-sm font-medium text-sky-100">
              {formatTime(currentEvent.start)} —{" "}
              {formatTime(currentEvent.end)}
            </p>

            <h3 className="mt-2 text-2xl font-bold">
              {currentEvent.title}
            </h3>

            <p className="mt-3 text-sky-100">
              {currentEvent.speaker} · {currentCompany
                ? ` · ${currentCompany.name}`
              : ""}
            </p>

            <p className="mt-1 text-sm text-sky-100">
              📍 {currentEvent.location}
            </p>
          </div>

          <div className="p-5">
            <button className="w-full rounded-xl bg-slate-950 px-4 py-3 font-semibold text-white">
              Ver información de la charla
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (nextEvent) {
    const difference =
      new Date(nextEvent.start).getTime() - now.getTime();

    const minutes = Math.floor(difference / 60000);
    const seconds = Math.floor((difference % 60000) / 1000);

    return (
      <section>
        <div className="mb-4">
          <h2 className="text-xl font-bold text-slate-900">
            Próximamente
          </h2>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm font-medium text-slate-500">
            Próxima actividad
          </p>

          <h3 className="mt-2 text-2xl font-bold text-slate-900">
            {nextEvent.title}
          </h3>

          <p className="mt-2 text-slate-500">
            {nextEvent.speaker} · {nextCompany
              ? ` · ${nextCompany.name}`
            : ""}
          </p>

          <div className="mt-6 flex items-center gap-4">
            <div>
              <p className="text-xs text-slate-500">
                Comienza a las
              </p>

              <p className="text-xl font-bold text-slate-900">
                {formatTime(nextEvent.start)}
              </p>
            </div>

            <div className="h-10 w-px bg-slate-200" />

            <div>
              <p className="text-xs text-slate-500">
                Faltan
              </p>

              <p className="font-mono text-xl font-bold text-sky-600">
                {minutes}:{seconds
                  .toString()
                  .padStart(2, "0")}
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-slate-200">
        <p className="text-3xl">🎉</p>

        <h2 className="mt-3 text-xl font-bold">
          No hay actividades en este momento
        </h2>

        <p className="mt-2 text-sm text-slate-500">
          Revisa el programa para conocer las próximas actividades.
        </p>
      </div>
    </section>
  );
}