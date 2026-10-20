"use client";

import Link from "next/link";
import CompanyLogo from "@/components/CompanyLogo";
import { useEffect, useState } from "react";

import type { Company, Stand } from "@/types/event";
import { supabase } from "@/lib/supabase";

type Props = {
  stands: Stand[];
  companies: Company[];
};

export default function InteractiveStandMap({ stands, companies }: Props) {
  const [selectedStandId, setSelectedStandId] = useState<Stand["id"] | null>(
    null,
  );
  const [visitedStandIds, setVisitedStandIds] = useState<number[]>([]);
  const [visitsLoading, setVisitsLoading] = useState(true);
  const [visitsError, setVisitsError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadVisits() {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (!session) return;

        const { data: participant, error: participantError } = await supabase
          .from("participants")
          .select("id")
          .eq("id", session.user.id)
          .maybeSingle();
        if (participantError) throw participantError;
        if (!participant || stands.length === 0) return;

        const { data: visits, error: visitsError } = await supabase
          .from("stand_visits")
          .select("stand_id")
          .eq("participant_id", session.user.id)
          .in(
            "stand_id",
            stands.map((stand) => stand.id),
          );
        if (visitsError) throw visitsError;
        if (active) {
          setVisitedStandIds((visits ?? []).map((visit) => visit.stand_id));
        }
      } catch (loadError) {
        console.error(
          "No fue posible consultar las visitas al mapa:",
          loadError,
        );
        if (active) {
          setVisitsError(
            "No fue posible comprobar tus visitas. Los stands se muestran como pendientes.",
          );
        }
      } finally {
        if (active) setVisitsLoading(false);
      }
    }

    void loadVisits();
    return () => {
      active = false;
    };
  }, [stands]);

  const mappedStands = stands.filter(
    (stand) =>
      stand.mapArea &&
      companies.some((company) => company.id === stand.companyId),
  );
  const selectedStand = stands.find((stand) => stand.id === selectedStandId);
  const selectedCompany = selectedStand
    ? companies.find((company) => company.id === selectedStand.companyId)
    : undefined;

  return (
    <section className="mb-10">
      <div className="mb-4">
        <p className="text-sm font-semibold text-sky-600">EXPLORA EL RECINTO</p>
        <h2 className="mt-1 text-2xl font-bold text-slate-900">
          Mapa de stands
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Los stands pendientes se muestran en amarillo y los que ya visitaste
          en verde. Selecciona un área para ver sus detalles.
        </p>
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_290px]">
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="relative w-full">
            <img
              src="/images/mapa-feria.jpg"
              alt="Plano del recinto de la feria de seguridad SAESA"
              className="block h-auto w-full"
            />
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="absolute inset-0 h-full w-full"
              aria-label="Ubicación y estado de visita de los stands"
            >
              {mappedStands.map((stand) => {
                const area = stand.mapArea;
                if (!area) return null;
                const isVisited = visitedStandIds.includes(stand.id);
                const isSelected = selectedStandId === stand.id;

                return (
                  <g
                    key={stand.id}
                    role="button"
                    tabIndex={0}
                    aria-label={`Stand ${stand.number}: ${isVisited ? "visitado" : "pendiente de visita"}`}
                    aria-pressed={isSelected}
                    onClick={() => setSelectedStandId(stand.id)}
                    style={{ outline: "none" }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelectedStandId(stand.id);
                      }
                    }}
                    className="cursor-pointer focus:outline-none focus-visible:outline-none"
                  >
                    <rect
                      x={area.x}
                      y={area.y}
                      width={area.width}
                      height={area.height}
                      rx="0.7"
                      fill={
                        isVisited
                          ? "rgba(34, 197, 94, 0.72)"
                          : "rgba(250, 204, 21, 0.72)"
                      }
                      stroke={isSelected ? "#075985" : "#ffffff"}
                      strokeWidth={isSelected ? "0.55" : "0.25"}
                      vectorEffect="non-scaling-stroke"
                    />
                    <text
                      x={area.x + area.width / 2}
                      y={area.y + area.height / 2}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill="#0f172a"
                      fontSize="2"
                      fontWeight="700"
                      pointerEvents="none"
                    >
                      {stand.number}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-100 px-4 py-3 text-xs text-slate-600">
            <span className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm bg-yellow-400" />
              Pendiente
            </span>
            <span className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-sm bg-green-500" />
              Visitado
            </span>
            <span>
              {mappedStands.length} de {stands.length} stands ubicados
            </span>
            {visitsLoading && <span>Comprobando visitas...</span>}
          </div>
          {visitsError && (
            <p role="status" className="px-4 pb-3 text-xs text-amber-800">
              {visitsError}
            </p>
          )}
        </div>

        <aside className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          {selectedStand && selectedCompany ? (
            <>
              <p className="text-xs font-bold uppercase tracking-wider text-sky-600">
                Stand {selectedStand.number}
              </p>
              <CompanyLogo
                logo={selectedCompany.logo}
                name={selectedCompany.name}
                className="mt-4 flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl bg-sky-50"
              />
              <h3 className="mt-4 text-xl font-bold text-slate-900">
                {selectedCompany.name}
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {selectedCompany.description ||
                  "Conoce a esta empresa participante."}
              </p>
              <p className="mt-3 text-sm font-semibold text-slate-700">
                {visitedStandIds.includes(selectedStand.id)
                  ? "✓ Stand visitado"
                  : "○ Pendiente de visita"}
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
                Selecciona un área coloreada en el plano para consultar la
                empresa y abrir su página.
              </p>
              {mappedStands.length === 0 && (
                <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
                  Aún no hay stands ubicados en el plano. El administrador puede
                  marcarlos desde el panel.
                </p>
              )}
              <div className="mt-5 border-t border-slate-100 pt-4">
                <p className="text-sm font-semibold text-slate-700">
                  Stands en el mapa
                </p>
                <div className="mt-3 space-y-2">
                  {mappedStands.map((stand) => {
                    const company = companies.find(
                      (item) => item.id === stand.companyId,
                    );
                    if (!company) return null;
                    const visited = visitedStandIds.includes(stand.id);

                    return (
                      <button
                        key={stand.id}
                        type="button"
                        onClick={() => setSelectedStandId(stand.id)}
                        className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-slate-50"
                      >
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-slate-900 ${
                            visited ? "bg-green-300" : "bg-yellow-300"
                          }`}
                        >
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
