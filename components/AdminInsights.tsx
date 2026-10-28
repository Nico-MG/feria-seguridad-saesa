"use client";

import { useEffect, useState } from "react";

type ContestParticipant = {
  id: string;
  name: string;
  opportunities: number;
};

type RankingEntry = {
  position: number;
  name: string;
  session: string;
  score: number;
  elapsedMs: number;
};

type ScanSummary = {
  totalStands: number;
  participants: ContestParticipant[];
};

export default function AdminInsights() {
  const [scans, setScans] = useState<ScanSummary | null>(null);
  const [ranking, setRanking] = useState<RankingEntry[] | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [rankingError, setRankingError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadResults() {
      const [scansResult, rankingResult] = await Promise.allSettled([
        fetch("/api/admin/insights", { cache: "no-store" }).then(
          async (response) => {
            const result = (await response.json()) as ScanSummary & {
              error?: string;
            };
            if (!response.ok) {
              throw new Error(
                result.error ?? "No fue posible cargar los participantes del sorteo.",
              );
            }
            return result;
          },
        ),
        fetch("/api/game/ranking", { cache: "no-store" }).then(
          async (response) => {
            const result = (await response.json()) as {
              entries?: RankingEntry[];
              error?: string;
            };
            if (!response.ok) {
              throw new Error(
                result.error ?? "No fue posible cargar el ranking.",
              );
            }
            return result.entries ?? [];
          },
        ),
      ]);

      if (!active) return;

      if (scansResult.status === "fulfilled") {
        setScans(scansResult.value);
      } else {
        setScanError(
          scansResult.reason instanceof Error
            ? scansResult.reason.message
            : "No fue posible cargar los participantes del sorteo.",
        );
      }

      if (rankingResult.status === "fulfilled") {
        setRanking(rankingResult.value);
      } else {
        setRankingError(
          rankingResult.reason instanceof Error
            ? rankingResult.reason.message
            : "No fue posible cargar el ranking.",
        );
      }
    }

    void loadResults();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="grid items-start gap-6 xl:grid-cols-2">
      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-sky-700">CONCURSO</p>
            <h2 className="mt-1 text-xl font-bold text-slate-900">
              Participantes del sorteo
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Cada stand registrado equivale a una oportunidad
            </p>
          </div>
          {scans && (
            <p className="text-sm text-slate-600">
              {scans.totalStands} stands participantes
            </p>
          )}
        </div>

        {scanError ? (
          <p role="alert" className="mt-5 text-sm text-red-700">
            {scanError}
          </p>
        ) : !scans ? (
          <p className="mt-5 text-sm text-slate-500">
            Cargando participantes...
          </p>
        ) : scans.totalStands === 0 ? (
          <p className="mt-5 text-sm text-slate-500">
            No hay stands habilitados para el concurso.
          </p>
        ) : scans.participants.length === 0 ? (
          <p className="mt-5 text-sm text-slate-500">
            Aún no hay participantes registrados con visitas para el sorteo.
          </p>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[320px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th scope="col" className="px-3 py-3">
                    Participante
                  </th>
                  <th scope="col" className="px-3 py-3 text-right">
                    Oportunidades
                  </th>
                </tr>
              </thead>
              <tbody>
                {scans.participants.map((participant) => (
                  <tr
                    key={participant.id}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="px-3 py-3 font-medium text-slate-900">
                      {participant.name}
                    </td>
                    <td className="px-3 py-3 text-right text-slate-600">
                      {participant.opportunities}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div>
          <p className="text-sm font-semibold text-sky-700">JUEGO DE IMÁGENES</p>
          <h2 className="mt-1 text-xl font-bold text-slate-900">
            Ranking de detectives
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Ordenado por puntaje y luego por menor tiempo
          </p>
        </div>

        {rankingError ? (
          <p role="alert" className="mt-5 text-sm text-red-700">
            {rankingError}
          </p>
        ) : ranking === null ? (
          <p className="mt-5 text-sm text-slate-500">Cargando ranking...</p>
        ) : ranking.length === 0 ? (
          <p className="mt-5 text-sm text-slate-500">
            Todavía no hay partidas completadas.
          </p>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[440px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th scope="col" className="px-3 py-3">
                    Puesto
                  </th>
                  <th scope="col" className="px-3 py-3">
                    Participante
                  </th>
                  <th scope="col" className="px-3 py-3">
                    Sesión
                  </th>
                  <th scope="col" className="px-3 py-3 text-right">
                    Puntaje
                  </th>
                  <th scope="col" className="px-3 py-3 text-right">
                    Tiempo
                  </th>
                </tr>
              </thead>
              <tbody>
                {ranking.map((entry) => (
                  <tr
                    key={`${entry.position}-${entry.name}`}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="px-3 py-3 font-bold text-slate-700">
                      {entry.position}
                    </td>
                    <td className="px-3 py-3 font-medium text-slate-900">
                      {entry.name}
                    </td>
                    <td className="px-3 py-3 text-slate-600">
                      {entry.session}
                    </td>
                    <td className="px-3 py-3 text-right font-semibold text-slate-900">
                      {entry.score}
                    </td>
                    <td className="px-3 py-3 text-right text-slate-600">
                      {(entry.elapsedMs / 1000).toFixed(1)} s
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
