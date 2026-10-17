
"use client";

import { useState } from "react";
import Link from "next/link";

import type { Company, Stand } from "@/types/event";
import { standMapPositions } from "@/lib/standMapPositions";

type Props = {
  stands: Stand[];
  companies: Company[];
};

export default function InteractiveStandMap({
  stands,
  companies,
}: Props) {
  const [selectedStandId, setSelectedStandId] =
    useState<Stand["id"] | null>(null);

  const mappedStands = stands.filter(
    (stand) =>
      standMapPositions[String(stand.number)] !== undefined &&
      companies.some(
        (company) => company.id === stand.companyId
      )
  );

  const selectedStand = stands.find(
    (stand) => stand.id === selectedStandId
  );

  const selectedCompany = selectedStand
    ? companies.find(
        (company) => company.id === selectedStand.companyId
      )
    : undefined;

  return (
    <section className="mb-10">
      <div className="mb-4">
        <p className="text-sm font-semibold text-sky-600">
          EXPLORA EL RECINTO
        </p>

        <h2 className="mt-1 text-2xl font-bold text-slate-900">
          Mapa de stands
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          Selecciona un número para conocer la empresa y acceder
          a su stand.
        </p>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_290px]">
        {/* Plano */}
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="relative w-full">
            <img
              src="/images/mapa-feria.jpg"
              alt="Plano del recinto de la feria de seguridad SAESA"
              className="block h-auto w-full"
            />

            {mappedStands.map((stand) => {
              const position =
                standMapPositions[String(stand.number)];

              const isSelected = selectedStandId === stand.id;

              return (
                <button
                  key={stand.id}
                  type="button"
                  aria-label={`Stand ${stand.number}`}
                  aria-pressed={isSelected}
                  onClick={() => setSelectedStandId(stand.id)}
                  style={{
                    left: `${position.x}%`,
                    top: `${position.y}%`,
                  }}
                  className={`absolute flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white text-sm font-bold text-white shadow-md transition hover:scale-110 focus:outline-none focus:ring-4 focus:ring-sky-300 ${
                    isSelected
                      ? "z-10 scale-110 bg-amber-500"
                      : "bg-sky-600 hover:bg-sky-500"
                  }`}
                >
                  {stand.number}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
            <span className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-sky-600" />
              Stand participante
            </span>

            <span>
              {mappedStands.length} de {stands.length} stands ubicados
            </span>
          </div>
        </div>

        {/* Información de la selección */}
        <aside className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          {selectedStand && selectedCompany ? (
            <>
              <p className="text-xs font-bold uppercase tracking-wider text-sky-600">
                Stand {selectedStand.number}
              </p>

              <div className="mt-4 flex h-14 w-14 items-center justify-center rounded-xl bg-sky-50 text-2xl">
                {selectedCompany.logo}
              </div>

              <h3 className="mt-4 text-xl font-bold text-slate-900">
                {selectedCompany.name}
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                {selectedCompany.description ||
                  "Conoce a esta empresa participante."}
              </p>

              <Link
                href={`/stands/${selectedStand.slug}`}
                className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-700"
              >
                Ver stand →
              </Link>

              <button
                type="button"
                onClick={() => setSelectedStandId(null)}
                className="mt-3 w-full rounded-xl px-4 py-2 text-sm text-slate-500 hover:bg-slate-50"
              >
                Cerrar detalle
              </button>
            </>
          ) : (
            <>
              <h3 className="text-lg font-bold text-slate-900">
                Encuentra una empresa
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Haz clic en un marcador del plano para consultar
                su empresa y abrir la información del stand.
              </p>

              <div className="mt-5 border-t border-slate-100 pt-4">
                <p className="text-sm font-semibold text-slate-700">
                  Stands en el mapa
                </p>

                <div className="mt-3 space-y-2">
                  {mappedStands.map((stand) => {
                    const company = companies.find(
                      (item) => item.id === stand.companyId
                    );

                    if (!company) return null;

                    return (
                      <button
                        key={stand.id}
                        type="button"
                        onClick={() =>
                          setSelectedStandId(stand.id)
                        }
                        className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-slate-50"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sm font-bold text-sky-700">
                          {stand.number}
                        </span>

                        <span className="min-w-0 truncate text-sm font-medium text-slate-700">
                          {company.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </aside>
      </div>
    </section>
  );
}
