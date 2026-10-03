"use client";

import { useEffect, useState } from "react";

import Header from "@/components/Header";
import ContestForm from "@/components/ContestForm";
import ParticipantForm from "@/components/ParticipantForm";
import ParticipantStatus from "@/components/ParticipantStatus";


import { stands } from "@/data/mock";
import { getCompanyById } from "@/lib/eventData";
import { getVisitedStands } from "@/lib/contest";

export default function ConcursoPage() {
  const [visitedStands, setVisitedStands] =
    useState<string[]>([]);

  useEffect(() => {
    const updateVisits = () => {
      setVisitedStands(getVisitedStands());
    };

    updateVisits();

    window.addEventListener(
      "stand-visit-registered",
      updateVisits
    );

    return () => {
      window.removeEventListener(
        "stand-visit-registered",
        updateVisits
      );
    };
  }, []);

  const contestStands = stands.filter(
    (stand) => stand.contestRequired
  );

  const visitedContestStands =
    contestStands.filter((stand) =>
      visitedStands.includes(stand.slug)
    );

  const visitedCount =
    visitedContestStands.length;

  const totalStands = contestStands.length;

  const progress =
    totalStands === 0
      ? 0
      : Math.round(
          (visitedCount / totalStands) * 100
        );

  const completed =
    totalStands > 0 &&
    visitedCount === totalStands;

  return (
    <main className="min-h-screen bg-slate-50">
      <Header />

      <div className="mx-auto max-w-4xl px-5 py-8">
        <div className="mb-8">
          <p className="text-sm font-semibold text-sky-600">
            FERIA DE SEGURIDAD
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Concurso
          </h1>

          <p className="mt-3 text-slate-500">
            Visita los stands participantes y completa
            tu pasaporte para participar.
          </p>
        </div>

        <section className="mb-8">
  <div className="mb-4">
    <h2 className="text-xl font-bold text-slate-900">
      Participa en la feria
    </h2>

    <p className="mt-1 text-sm text-slate-500">
      Regístrate para comenzar a guardar tus visitas
      y participar en el concurso.
    </p>
  </div>

  <ParticipantForm />
</section>

        {/* PROGRESO */}
        <section className="rounded-3xl bg-slate-900 p-6 text-white">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-sm text-slate-400">
                Tu progreso
              </p>

              <p className="mt-1 text-4xl font-bold">
                {visitedCount}
                <span className="text-xl text-slate-500">
                  {" "}
                  / {totalStands}
                </span>
              </p>
            </div>

            <p className="text-2xl font-bold text-sky-400">
              {progress}%
            </p>
          </div>

          <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-700">
            <div
              className="h-full rounded-full bg-sky-500 transition-all duration-500"
              style={{
                width: `${progress}%`,
              }}
            />
          </div>

          <p className="mt-4 text-sm text-slate-400">
            {completed
              ? "¡Completaste todos los stands!"
              : `Te faltan ${
                  totalStands - visitedCount
                } stand${
                  totalStands - visitedCount === 1
                    ? ""
                    : "s"
                }.`}
          </p>
        </section>

        {/* PASAPORTE */}
        <section className="mt-10">
          <h2 className="text-xl font-bold text-slate-900">
            Tu pasaporte
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Estos son los stands que debes visitar.
          </p>

          <div className="mt-4 space-y-3">
            {contestStands.map((stand) => {
              const company = getCompanyById(
                stand.companyId
              );

              if (!company) {
                return null;
              }

              const visited =
                visitedStands.includes(
                  stand.slug
                );

              return (
                <div
                  key={stand.id}
                  className={`flex items-center gap-4 rounded-2xl bg-white p-4 ring-1 ${
                    visited
                      ? "ring-green-200"
                      : "ring-slate-200"
                  }`}
                >
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-xl ${
                      visited
                        ? "bg-green-100"
                        : "bg-slate-100"
                    }`}
                  >
                    {visited
                      ? "✓"
                      : company.logo}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-900">
                      {company.name}
                    </p>

                    <p className="text-sm text-slate-500">
                      Stand {stand.number}
                    </p>
                  </div>

                  <span
                    className={`text-xs font-bold ${
                      visited
                        ? "text-green-600"
                        : "text-slate-400"
                    }`}
                  >
                    {visited
                      ? "VISITADO"
                      : "PENDIENTE"}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* PARTICIPACIÓN */}
        <section className="mt-10">
          <h2 className="mb-4 text-xl font-bold text-slate-900">
            Participar
          </h2>

          <ContestForm
            completed={completed}
          />
        </section>
      </div>
    </main>
  );
}