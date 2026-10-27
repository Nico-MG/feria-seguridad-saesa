
"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const menuLinks = [
  { label: "Inicio", href: "/" },
  { label: "Programa", href: "/programa" },
  { label: "Stands", href: "/stands" },
  { label: "Concurso", href: "/concurso" },
];

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="relative z-20 border-b border-slate-200/80 bg-slate-50 text-slate-900">
      <div aria-hidden="true" className="h-1 bg-gradient-to-r from-sky-700 via-sky-500 to-amber-400" />
      <div className="mx-auto max-w-6xl px-5 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            aria-label="SAESA Feria de Seguridad - Ir al inicio"
            className="group flex items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 sm:gap-4"
          >
            <Image
              src="/images/logo-saesa-blanco-letra.png"
              alt="Grupo Saesa"
              width={515}
              height={248}
              priority
              className="h-9 w-auto shrink-0 transition-opacity group-hover:opacity-80 sm:h-11"
            />
            <span
              aria-hidden="true"
              className="h-8 w-px shrink-0 bg-amber-400/70 sm:h-10"
            />
            <h1 className="text-base font-bold tracking-tight text-slate-900 sm:text-xl">
              Feria de Seguridad
            </h1>
          </Link>

          <nav aria-label="Navegación principal" className="hidden items-center gap-1 md:flex">
            {menuLinks.map((link) => {
              const active =
                link.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(link.href);

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    active
                      ? "bg-sky-50 text-sky-800"
                      : "text-slate-600 hover:bg-slate-50 hover:text-sky-800"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <button
            type="button"
            aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-lg text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600 md:hidden"
          >
            {menuOpen ? "✕" : "☰"}
          </button>
        </div>

        {menuOpen && (
          <nav
            aria-label="Navegación principal"
            className="absolute left-0 right-0 top-full border-t border-slate-100 bg-white px-5 py-3 shadow-lg md:hidden"
          >
            <div className="mx-auto flex max-w-6xl flex-col">
              {menuLinks.map((link) => {
                const active =
                  link.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(link.href);

                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setMenuOpen(false)}
                    className={`rounded-lg px-3 py-3 text-sm font-semibold transition ${
                      active
                        ? "bg-sky-50 text-sky-800"
                        : "text-slate-600 hover:bg-slate-50 hover:text-sky-800"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
} 