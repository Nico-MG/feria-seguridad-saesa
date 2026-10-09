"use client";

import { useEffect, useState } from "react";

import ScheduleItem from "@/components/ScheduleItem";
import { getEventStatus } from "@/lib/eventUtils";
import type { Talk } from "@/types/event";

type LiveEventProps = {
  talks: Talk[];
};

export default function LiveEvent({
  talks,
}: LiveEventProps) {
  const [now, setNow] =
    useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const liveTalks = talks.filter(
    (talk) =>
      getEventStatus(talk, now) ===
      "live"
  );

  if (liveTalks.length === 0) {
    return null;
  }

  return (
    <section className="mt-8">
      <div className="mb-4">
        <p className="text-sm font-semibold text-red-600">
          AHORA
        </p>

        <h2 className="mt-1 text-2xl font-bold text-slate-900">
          En vivo
        </h2>
      </div>

      <div className="space-y-4">
        {liveTalks.map((talk) => (
          <ScheduleItem
            key={talk.id}
            event={talk}
            now={now}
          />
        ))}
      </div>
    </section>
  );
}