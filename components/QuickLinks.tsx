import Link from "next/link";

const links = [
  {
    icon: "🗓️",
    title: "Programa",
    description: "Charlas y horarios",
    href: "/programa",
  },
  {
    icon: "🏢",
    title: "Stands",
    description: "Empresas participantes",
    href: "/stands",
  },
  {
    icon: "🎁",
    title: "Concurso",
    description: "Participa y gana",
    href: "/concurso",
  },
];

export default function QuickLinks() {
  return (
    <section className="mt-10">
      <h2 className="mb-4 text-xl font-bold text-[#12344a]">
        Explora la feria
      </h2>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {links.map((link) => (
          <Link
            key={link.title}
            href={link.href}
            className="group rounded-2xl border border-slate-200/80 border-t-2 border-t-sky-700 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-md"
          >
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-2xl transition group-hover:bg-amber-50">
              {link.icon}
            </span>

            <p className="mt-3 font-bold text-[#12344a]">
              {link.title}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              {link.description}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}