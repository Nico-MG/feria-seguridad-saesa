import Link from "next/link";
import Image from "next/image";

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
    <section className="relative overflow-hidden border-b border-slate-200/70 bg-slate-50 text-slate-900">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-amber-300/20 blur-3xl"
      />

      <div className="relative mx-auto flex max-w-6xl items-center justify-between gap-10 px-5 pb-12 pt-10 sm:pb-16 sm:pt-14 lg:pb-20 lg:pt-16">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-800/10 bg-white/80 px-3 py-1.5 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            {targetDate ? (
              <>
                <p className="text-xs font-bold uppercase tracking-wider text-sky-800 sm:text-sm">
                  {formatEventDate(targetDate)}
                </p>
                <span aria-hidden="true" className="text-slate-400">
                  ·
                </span>
                <p
                  aria-live="polite"
                  className="text-xs font-bold text-slate-700 sm:text-sm"
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
              <p className="text-xs font-bold uppercase tracking-wider text-sky-800 sm:text-sm">
                Fecha por confirmar
              </p>
            )}
          </div>

          <p className="mt-4 flex items-center gap-2 text-sm font-medium text-slate-600">
            <span aria-hidden="true">📍</span>
            Hotel Sonesta, Osorno, Chile
          </p>

          <h2 className="mt-5 max-w-5xl text-4xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
            Cien años de seguridad y{" "}
            <span className="text-sky-700">resiliencia energética</span>
          </h2>

          <div aria-hidden="true" className="mt-5 h-1 w-16 rounded-full bg-amber-400" />

          <p className="mt-5 max-w-xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
            Charlas, empresas, innovación y experiencias para fortalecer nuestra
            cultura de seguridad.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/programa"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-800 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-sky-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 focus-visible:ring-offset-2"
            >
              Explorar programa
              <span aria-hidden="true">→</span>
            </Link>

            <Link
              href="/stands"
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white/80 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-sky-700 hover:text-sky-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600"
            >
              Ver empresas
            </Link>
          </div>
        </div>

        <div className="relative hidden h-64 w-80 shrink-0 items-center justify-center lg:flex">
          <div
            aria-hidden="true"
            className="absolute h-64 w-64 rounded-full border border-sky-800/10"
          />
          <div
            aria-hidden="true"
            className="absolute h-48 w-48 rounded-full border border-amber-500/20"
          />
          <div className="relative w-full rounded-3xl border border-white/80 bg-white/90 px-6 py-8 shadow-[0_20px_60px_rgba(0,0,0,0.4)] ring-1 ring-slate-200/70">
            <Image
              src="/images/grupo-saesa-logo.svg"
              alt="Grupo SAESA"
              width={336}
              height={102}
              priority
              unoptimized
              className="h-auto w-full"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
