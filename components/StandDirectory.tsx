"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import CompanyLogo from "@/components/CompanyLogo";
import type { Company, Stand } from "@/types/event";

type Props = {
  stands: Stand[];
  companies: Company[];
};

function normalizeSearch(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("es")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export default function StandDirectory({ stands, companies }: Props) {
  const [query, setQuery] = useState("");

  const filteredStands = useMemo(() => {
    const normalizedQuery = normalizeSearch(query);
    if (!normalizedQuery) return stands;

    return stands.filter((stand) => {
      const company = companies.find((item) => item.id === stand.companyId);
      const normalizedStand = normalizeSearch(`stand ${stand.number}`);
      return (
        normalizeSearch(company?.name ?? "").includes(normalizedQuery) ||
        normalizeSearch(stand.number).includes(normalizedQuery) ||
        normalizedStand.includes(normalizedQuery)
      );
    });
  }, [companies, query, stands]);

  return (
    <section>
      <h2 className="mb-5 text-2xl font-bold text-slate-900">
        Todas las empresas
      </h2>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <label className="sr-only" htmlFor="stand-search">
          Buscar por empresa o número de stand
        </label>
        <input
          id="stand-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar por empresa o número de stand"
          className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none placeholder:text-slate-400 focus:border-sky-700 focus:ring-2 focus:ring-sky-700/20"
        />
        <button
          type="button"
          onClick={() => setQuery("")}
          disabled={!query}
          className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Borrar filtro
        </button>
      </div>

      <p className="mb-4 text-sm text-slate-500" aria-live="polite">
        {filteredStands.length}{" "}
        {filteredStands.length === 1 ? "stand encontrado" : "stands encontrados"}
      </p>

      {filteredStands.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredStands.map((stand) => {
            const company = companies.find(
              (item) => item.id === stand.companyId,
            );

            if (!company) return null;

            return (
              <Link
                key={stand.id}
                href={`/stands/${stand.slug}`}
                className="group rounded-2xl border border-slate-200/80 border-t-2 border-t-sky-700 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <CompanyLogo
                    logo={company.logo}
                    name={company.name}
                    className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-sky-50"
                  />

                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                    Stand {stand.number}
                  </span>
                </div>

                <h3 className="mt-5 text-xl font-bold text-slate-900 group-hover:text-sky-600">
                  {company.name}
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {company.description}
                </p>

                <p className="mt-5 text-sm font-semibold text-sky-600">
                  Ver stand →
                </p>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl bg-slate-50 p-8 text-center text-slate-600 ring-1 ring-slate-200">
          No encontramos empresas ni stands que coincidan con “{query}”.
        </div>
      )}
    </section>
  );
}
