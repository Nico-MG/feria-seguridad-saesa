import Link from "next/link";

type HeroProps = {
  eventDate: string | null;
};

function getDateInChile(date: string) {
  const [year, month, day] = date.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return null;
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }
  return parsed;
}

function getChileCalendarDate(now: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  return new Date(
    Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day)),
  );
}

function formatEventDate(date: Date) {
  return new Intl.DateTimeFormat("es-CL", {
    timeZone: "UTC",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export default function Hero({ eventDate }: HeroProps) {
  const targetDate = eventDate ? getDateInChile(eventDate) : null;
  const daysRemaining = targetDate
    ? Math.ceil(
        (targetDate.getTime() - getChileCalendarDate(new Date()).getTime()) /
          86_400_000,
      )
    : null;

  return (
    <section className="relative overflow-hidden bg-slate-950 text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-sky-500/10 blur-3xl"
      />

      <div className="relative mx-auto max-w-6xl px-5 pb-12 pt-10 sm:pb-16 sm:pt-14 lg:pb-20 lg:pt-16">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1.5">
            <span className="h-2 w-2 rounded-full bg-sky-400" />
            {targetDate ? (
              <>
                <p className="text-xs font-bold uppercase tracking-wider text-sky-300 sm:text-sm">
                  {formatEventDate(targetDate)}
                </p>
                <span aria-hidden="true" className="text-sky-200/60">
                  ·
                </span>
                <p
                  aria-live="polite"
                  className="text-xs font-bold text-white sm:text-sm"
                >
                  {daysRemaining === 0
                    ? "¡Es hoy!"
                    : daysRemaining && daysRemaining > 0
                      ? `Faltan ${daysRemaining} ${
                          daysRemaining === 1 ? "día" : "días"
                        }`
                      : "La feria ya comenzó"}
                </p>
              </>
            ) : (
              <p className="text-xs font-bold uppercase tracking-wider text-sky-300 sm:text-sm">
                Fecha por confirmar
              </p>
            )}
          </div>

          <p className="mt-3 flex items-center gap-2 text-sm font-medium text-slate-300">
            <span aria-hidden="true">📍</span>
            Hotel Sonesta, Osorno, Chile
          </p>

          <h2 className="mt-6 max-w-2xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            Seguridad que <span className="text-sky-400">nos conecta</span>
          </h2>

          <p className="mt-5 max-w-xl text-base leading-7 text-slate-300 sm:text-lg sm:leading-8">
            Charlas, empresas, innovación y experiencias para fortalecer nuestra
            cultura de seguridad.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/programa"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-400 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-sky-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              Explorar programa
              <span aria-hidden="true">→</span>
            </Link>

            <Link
              href="/stands"
              className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
            >
              Ver empresas
            </Link>
          </div>
        </div>

        <div
          aria-hidden="true"
          className="mt-10 h-px w-full bg-gradient-to-r from-sky-400/50 via-white/10 to-transparent"
        />
      </div>
    </section>
  );
}
