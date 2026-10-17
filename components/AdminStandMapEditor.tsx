"use client";

import { PointerEvent, useState } from "react";
import type { Stand } from "@/types/event";

type MapArea = NonNullable<Stand["mapArea"]>;

type Props = {
  stands: Stand[];
  selectedStand: Stand;
  onSaved: () => Promise<void>;
};

function pointFromEvent(event: PointerEvent<SVGSVGElement>): {
  x: number;
  y: number;
} {
  const bounds = event.currentTarget.getBoundingClientRect();
  return {
    x: Math.min(
      100,
      Math.max(0, ((event.clientX - bounds.left) / bounds.width) * 100),
    ),
    y: Math.min(
      100,
      Math.max(0, ((event.clientY - bounds.top) / bounds.height) * 100),
    ),
  };
}

function areaFromPoints(
  start: { x: number; y: number },
  end: { x: number; y: number },
): MapArea | null {
  const area = {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
  };
  return area.width >= 0.5 && area.height >= 0.5 ? area : null;
}

export default function AdminStandMapEditor({
  stands,
  selectedStand,
  onSaved,
}: Props) {
  const [draftArea, setDraftArea] = useState<MapArea | null>(
    selectedStand.mapArea ?? null,
  );
  const [drawing, setDrawing] = useState<{
    start: { x: number; y: number };
    end: { x: number; y: number };
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const displayedArea = drawing
    ? areaFromPoints(drawing.start, drawing.end)
    : draftArea;

  function startDrawing(event: PointerEvent<SVGSVGElement>) {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = pointFromEvent(event);
    setDrawing({ start: point, end: point });
    setDraftArea(null);
    setError(null);
    setNotice(null);
  }

  function updateDrawing(event: PointerEvent<SVGSVGElement>) {
    if (!drawing) return;
    setDrawing({ ...drawing, end: pointFromEvent(event) });
  }

  function finishDrawing(event: PointerEvent<SVGSVGElement>) {
    if (!drawing) return;
    const point = pointFromEvent(event);
    setDraftArea(areaFromPoints(drawing.start, point));
    setDrawing(null);
  }

  async function saveArea(area: MapArea | null) {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(
        `/api/admin/stands/${selectedStand.id}/map`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ area }),
        },
      );
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(result.error ?? "No fue posible guardar la ubicación.");
      }
      setDraftArea(area);
      setNotice(area ? "Ubicación guardada." : "Ubicación eliminada.");
      await onSaved();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "No fue posible guardar la ubicación.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-sky-700">
            UBICACIÓN EN EL PLANO
          </p>
          <h2 className="mt-1 text-xl font-bold text-slate-900">
            Stand {selectedStand.number}
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Arrastra sobre el plano para marcar el área completa del stand.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void saveArea(draftArea)}
            disabled={saving || !draftArea}
            className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Guardar ubicación"}
          </button>
          <button
            type="button"
            onClick={() => void saveArea(null)}
            disabled={saving || !selectedStand.mapArea}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Quitar ubicación
          </button>
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800"
        >
          {error}
        </p>
      )}
      {notice && (
        <p
          role="status"
          className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-800"
        >
          {notice}
        </p>
      )}
      {!displayedArea && !drawing && (
        <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          Haz clic y arrastra para dibujar el área del stand.
        </p>
      )}

      <div className="relative mt-5 overflow-hidden rounded-xl border border-slate-200">
        <img
          src="/images/mapa-feria.jpg"
          alt="Plano de distribución de stands"
          className="block h-auto w-full select-none"
          draggable={false}
        />
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full touch-none"
          onPointerDown={startDrawing}
          onPointerMove={updateDrawing}
          onPointerUp={finishDrawing}
          onPointerCancel={() => setDrawing(null)}
          aria-label="Área para marcar la ubicación del stand"
        >
          {stands.map((stand) => {
            const area = stand.mapArea;
            if (!area || stand.id === selectedStand.id) return null;
            return (
              <rect
                key={stand.id}
                x={area.x}
                y={area.y}
                width={area.width}
                height={area.height}
                fill="rgba(14, 116, 144, 0.22)"
                stroke="#0e7490"
                strokeWidth="0.35"
                vectorEffect="non-scaling-stroke"
                pointerEvents="none"
              />
            );
          })}
          {displayedArea && (
            <rect
              x={displayedArea.x}
              y={displayedArea.y}
              width={displayedArea.width}
              height={displayedArea.height}
              fill="rgba(245, 158, 11, 0.5)"
              stroke="#b45309"
              strokeWidth="0.5"
              vectorEffect="non-scaling-stroke"
              pointerEvents="none"
            />
          )}
        </svg>
      </div>
      <p className="mt-3 text-xs text-slate-500">
        Las áreas azules ya están asignadas. La zona amarilla corresponde al
        stand que estás ubicando; no se guardará hasta que confirmes.
      </p>
    </section>
  );
}
