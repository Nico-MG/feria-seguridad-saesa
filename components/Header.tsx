export default function Header() {
  return (
    <header className="bg-slate-950 text-white">
      <div className="mx-auto max-w-6xl px-5 py-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-sky-400">
              SAESA
            </p>

            <h1 className="text-xl font-bold">
              Feria de Seguridad
            </h1>
          </div>

          <button className="rounded-lg bg-white/10 px-3 py-2 text-sm">
            ☰
          </button>
        </div>
      </div>
    </header>
  );
}