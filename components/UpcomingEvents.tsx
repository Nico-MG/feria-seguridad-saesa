"use client";

import { useEffect, useState } from "react";

import { getCompanyById } from "@/lib/eventData";
import type { Talk } from "@/types/event";

type UpcomingEventsProps = {
  events: Talk[];
};

function formatTime(dateString: string) {
  return new Date(dateString).toLocaleTimeString("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function UpcomingEvents({
  events,
}: UpcomingEventsProps) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const upcomingEvents = [...events]
    .filter(
      (event) =>
        new Date(event.start).getTime() >
        now.getTime()
    )
    .sort(
      (a, b) =>
        new Date(a.start).getTime() -
        new Date(b.start).getTime()
    )
    .slice(0, 3);

  if (upcomingEvents.length === 0) {
    return null;
  }

  return (
    <section className="mt-10">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">
          Próximamente
        </h2>

        <a
          href="/programa"
          className="text-sm font-semibold text-sky-600"
        >
          Ver programa →
        </a>
      </div>

      <div className="space-y-3">
        {upcomingEvents.map((event) => {
          const company = getCompanyById(
            event.companyId
          );

          return (
            <div
              key={event.id}
              className="flex gap-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200"
            >
              <div className="w-16 shrink-0">
                <p className="text-lg font-bold text-slate-900">
                  {formatTime(event.start)}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  hrs
                </p>
              </div>

              <div className="border-l border-slate-200 pl-4">
                <h3 className="font-semibold text-slate-900">
                  {event.title}
                </h3>

                <p className="mt-1 text-sm text-slate-500">
                  {event.speaker}
                  {company
                    ? ` · ${company.name}`
                    : ""}
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  📍 {event.location}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}