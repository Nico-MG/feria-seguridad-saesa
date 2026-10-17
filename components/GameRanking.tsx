"use client";

import { useEffect, useState } from "react";

type RankingEntry = {
  position: number;
  name: string;
  session: string;
  score: number;
  elapsedMs: number;
};

export default function GameRanking() {
  const [entries, setEntries] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadRanking() {
      try {
        const response = await fetch("/api/game/ranking", {
          cache: "no-store",
        });
        const result = (await response.json()) as {
          entries?: RankingEntry[];
          error?: string;
        };

        if (!response.ok) {
          throw new Error(result.error ?? "No fue posible cargar el ranking.");
        }
        if (active) setEntries(result.entries ?? []);
      } catch (loadError) {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "No fue posible cargar el ranking.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadRanking();
    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="mt-8 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-sky-600">
            JUEGO DE IMÁGENES
          </p>
          <h2 className="mt-1 text-2xl font-bold text-slate-900">
            Ranking de Detectives de seguridad
          </h2>
        </div>
        <p className="text-xs text-slate-500">
          Mayor puntaje; desempate por menor tiempo
        </p>
      </div>

      {loading ? (
        <p className="mt-5 text-sm text-slate-500">Cargando ranking...</p>
      ) : error ? (
        <p role="alert" className="mt-5 text-sm text-red-700">
          {error}
        </p>
      ) : entries.length === 0 ? (
        <p className="mt-5 text-sm text-slate-500">
          Todavía no hay resultados. ¡Sé el primero en jugar!
        </p>
      ) : (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[420px] text-left text-sm">
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
              {entries.map((entry) => (
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
                  <td className="px-3 py-3 text-slate-600">{entry.session}</td>
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
  );
}
