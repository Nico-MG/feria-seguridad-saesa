import { getCompanyById } from "@/lib/eventData";
import { getEventStatus } from "@/lib/eventUtils";
import type { Talk } from "@/types/event";

type ScheduleItemProps = {
  event: Talk;
  now: Date;
};

function formatTime(dateString: string) {
  return new Date(dateString).toLocaleTimeString("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ScheduleItem({
  event,
  now,
}: ScheduleItemProps) {
  const status = getEventStatus(event, now);

  const company = getCompanyById(event.companyId);

  const isLive = status === "live";
  const isUpcoming = status === "upcoming";
  const isFinished = status === "finished";

  return (
    <article
      className={`relative rounded-2xl bg-white p-5 shadow-sm ring-1 transition ${
        isLive
          ? "ring-2 ring-sky-500"
          : "ring-slate-200"
      } ${
        isFinished
          ? "opacity-50"
          : "opacity-100"
      }`}
    >
      {isLive && (
        <div className="absolute right-4 top-4 flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-600">
          <span className="h-2 w-2 animate-pulse rounded-full bg-red-600" />
          EN VIVO
        </div>
      )}

      {isUpcoming && (
        <div className="absolute right-4 top-4 rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-600">
          PRÓXIMA
        </div>
      )}

      {isFinished && (
        <div className="absolute right-4 top-4 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
          FINALIZADA
        </div>
      )}

      <div className="pr-24">
        <p className="text-sm font-semibold text-sky-600">
          {formatTime(event.start)} —{" "}
          {formatTime(event.end)}
        </p>

        <h3 className="mt-2 text-lg font-bold text-slate-900">
          {event.title}
        </h3>

        <p className="mt-2 text-sm text-slate-500">
          {event.speaker}
          {company ? ` · ${company.name}` : ""}
        </p>

        <p className="mt-2 text-sm text-slate-400">
          📍 {event.location}
        </p>
      </div>

      {isLive && (
        <div className="mt-5 rounded-xl bg-sky-50 p-3 text-sm text-sky-800">
          <strong>
            Esta actividad está ocurriendo ahora.
          </strong>
        </div>
      )}
    </article>
  );
}