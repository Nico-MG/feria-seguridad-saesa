
import Link from "next/link";

export default function Hero() {
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
            <p className="text-xs font-bold uppercase tracking-wider text-sky-300 sm:text-sm">
              25 de octubre de 2026
            </p>
          </div>

          <h2 className="mt-6 max-w-2xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            Seguridad que{" "}
            <span className="text-sky-400">nos conecta</span>
          </h2>

          <p className="mt-5 max-w-xl text-base leading-7 text-slate-300 sm:text-lg sm:leading-8">
            Charlas, empresas, innovación y experiencias para
            fortalecer nuestra cultura de seguridad.
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