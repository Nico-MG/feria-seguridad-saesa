
"use client";

import { useState } from "react";
import Link from "next/link";

const menuLinks = [
  { label: "Inicio", href: "/" },
  { label: "Programa", href: "/programa" },
  { label: "Stands", href: "/stands" },
  { label: "Concurso", href: "/concurso" },
  { label: "Ubicación", href: "/ubicacion" },
];

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="relative z-20 bg-slate-950 text-white">
      <div className="mx-auto max-w-6xl px-5 py-4 sm:py-5">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            aria-label="SAESA Feria de Seguridad - Ir al inicio"
            className="group rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
          >
            <p className="text-sm font-semibold tracking-wide text-sky-400 transition group-hover:text-sky-300">
              SAESA
            </p>
            <h1 className="text-lg font-bold tracking-tight sm:text-xl">
              Feria de Seguridad
            </h1>
          </Link>

          <button
            type="button"
            aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
            className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-lg transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
          >
            {menuOpen ? "✕" : "☰"}
          </button>
        </div>

        {menuOpen && (
          <nav
            aria-label="Navegación principal"
            className="absolute left-0 right-0 top-full border-t border-white/10 bg-slate-950 px-5 py-3 shadow-xl"
          >
            <div className="mx-auto flex max-w-6xl flex-col">
              {menuLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-lg px-3 py-3 text-sm font-medium text-slate-200 transition hover:bg-white/10 hover:text-sky-300"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
} 