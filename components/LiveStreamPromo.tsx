const streamUrl = "https://www.youtube.com/live/lcz6KCHdgSw";
const videoId = "lcz6KCHdgSw";

export default function LiveStreamPromo() {
  return (
    <section
      aria-labelledby="live-stream-title"
      className="mx-auto mt-8 max-w-6xl px-5"
    >
      <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-slate-900 shadow-sm">
        <div className="h-1.5 bg-gradient-to-r from-sky-700 via-sky-500 to-amber-400" />

        <div className="grid gap-6 p-5 sm:p-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:gap-10">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-red-400/30 bg-red-500/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-red-500">
              <span aria-hidden="true" className="h-2 w-2 rounded-full bg-red-500" />
              Transmisión oficial
            </span>

            <h2
              id="live-stream-title"
              className="mt-4 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl"
            >
              La Feria de Seguridad también se vive en línea
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
              Sigue la transmisión de la feria y acompáñanos desde donde estés.
            </p>

            <a
              href={streamUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
            >
              Ver transmisión en YouTube
              <span aria-hidden="true">↗</span>
            </a>
          </div>

          <div className="aspect-video overflow-hidden rounded-2xl bg-black shadow-lg">
            <iframe
              className="h-full w-full"
              src={`https://www.youtube-nocookie.com/embed/${videoId}`}
              title="Transmisión de la Feria de Seguridad SAESA en YouTube"
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        </div>
      </div>
    </section>
  );
}
