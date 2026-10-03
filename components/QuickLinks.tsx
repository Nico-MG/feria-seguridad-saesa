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
  {
    icon: "📍",
    title: "Ubicación",
    description: "Cómo llegar",
    href: "/ubicacion",
  },
];

export default function QuickLinks() {
  return (
    <section className="mt-10">
      <h2 className="mb-4 text-xl font-bold text-slate-900">
        Explora la feria
      </h2>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {links.map((link) => (
          <Link
            key={link.title}
            href={link.href}
            className="rounded-2xl bg-white p-5 text-left shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-1 hover:shadow-md"
          >
            <span className="text-2xl">
              {link.icon}
            </span>

            <p className="mt-3 font-semibold text-slate-900">
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