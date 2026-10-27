"use client";

import { useCallback, useEffect, useState } from "react";

type Analytics = {
  registeredParticipants: number;
  standVisits: number;
  gameAttempts: number;
  completedGames: number;
  lastDay: {
    pageViews: number;
    uniqueVisitors: number;
    averageLoadMs: number | null;
  };
  lastSevenDays: {
    pageViews: number;
    uniqueVisitors: number;
    averageLoadMs: number | null;
  };
};

async function requestAnalytics() {
  const response = await fetch("/api/admin/analytics", {
    cache: "no-store",
  });
  const result = (await response.json()) as Analytics & { error?: string };
  if (!response.ok) {
    throw new Error(result.error ?? "No fue posible cargar las métricas.");
  }
  return result;
}

function formatLoadTime(milliseconds: number | null) {
  if (milliseconds === null) return "Sin datos";
  if (milliseconds < 1000) return `${milliseconds} ms`;
  return `${(milliseconds / 1000).toFixed(2)} s`;
}

function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail?: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
      <p className="text-sm font-medium text-slate-600">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
      {detail && <p className="mt-1 text-xs text-slate-500">{detail}</p>}
    </div>
  );
}

export default function AdminPerformance() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      setAnalytics(await requestAnalytics());
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "No fue posible cargar las métricas.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    void requestAnalytics()
      .then((result) => {
        if (active) setAnalytics(result);
      })
      .catch((loadError: unknown) => {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "No fue posible cargar las métricas.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-sky-700">USO DE LA FERIA</p>
            <h2 className="mt-1 text-xl font-bold text-slate-900">
              Participación y actividad
            </h2>
          </div>
          <button
            type="button"
            onClick={() => void loadAnalytics()}
            disabled={loading}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60"
          >
            {loading ? "Actualizando..." : "Actualizar métricas"}
          </button>
        </div>

        {error && (
          <p role="alert" className="mt-5 text-sm text-red-700">
            {error}
          </p>
        )}

        {analytics && (
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Participantes registrados"
              value={analytics.registeredParticipants}
              detail="Personas registradas en el sitio"
            />
            <MetricCard
              label="Visitas a stands"
              value={analytics.standVisits}
              detail="Escaneos registrados en esta feria"
            />
            <MetricCard
              label="Partidas iniciadas"
              value={analytics.gameAttempts}
              detail="Incluye partidas sin terminar"
            />
            <MetricCard
              label="Partidas completadas"
              value={analytics.completedGames}
              detail="Intentos con puntaje final"
            />
          </div>
        )}
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div>
          <p className="text-sm font-semibold text-sky-700">
            RENDIMIENTO DE LA PÁGINA
          </p>
          <h2 className="mt-1 text-xl font-bold text-slate-900">
            Visitas y tiempos de carga
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Visitantes únicos se estiman con un identificador anónimo guardado
            en el navegador.
          </p>
        </div>

        {analytics && (
          <>
            <h3 className="mt-5 text-sm font-bold uppercase tracking-wide text-slate-600">
              Últimas 24 horas
            </h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <MetricCard
                label="Visitantes únicos"
                value={analytics.lastDay.uniqueVisitors}
              />
              <MetricCard label="Vistas de página" value={analytics.lastDay.pageViews} />
              <MetricCard
                label="Carga inicial promedio"
                value={formatLoadTime(analytics.lastDay.averageLoadMs)}
              />
            </div>

            <h3 className="mt-5 text-sm font-bold uppercase tracking-wide text-slate-600">
              Últimos 7 días
            </h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <MetricCard
                label="Visitantes únicos"
                value={analytics.lastSevenDays.uniqueVisitors}
              />
              <MetricCard
                label="Vistas de página"
                value={analytics.lastSevenDays.pageViews}
              />
              <MetricCard
                label="Carga inicial promedio"
                value={formatLoadTime(analytics.lastSevenDays.averageLoadMs)}
              />
            </div>
          </>
        )}

        <p className="mt-5 rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-900 ring-1 ring-amber-200">
          Los límites de usuarios simultáneos y la capacidad contratada de
          hosting o base de datos no están disponibles para esta aplicación; se
          consultan desde los paneles del proveedor. Estas cifras reflejan
          actividad observada, no el máximo técnico.
        </p>
      </section>
    </div>
  );
}
