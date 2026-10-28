import type { Stand } from "@/types/event";

type Props = {
  stand: Pick<Stand, "number" | "mapArea">;
};

export default function StandLocationMap({ stand }: Props) {
  if (!stand.mapArea) {
    return (
      <div className="mt-4 rounded-xl bg-slate-100 p-5 text-sm text-slate-600">
        La ubicación de este stand todavía no está marcada en el plano.
      </div>
    );
  }

  const area = stand.mapArea;

  return (
    <div className="relative mt-4 overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
      <img
        src="/images/mapa-feria.jpg"
        alt={`Plano del recinto con el stand ${stand.number} resaltado`}
        className="block h-auto w-full"
      />
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
      >
        <rect
          x={area.x}
          y={area.y}
          width={area.width}
          height={area.height}
          rx="0.7"
          fill="rgba(250, 204, 21, 0.88)"
          stroke="#d6a92d"
          strokeWidth="0.7"
          vectorEffect="non-scaling-stroke"
        />
        <text
          x={area.x + area.width / 2}
          y={area.y + area.height / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fill="#211a08"
          fontSize="2"
          fontWeight="700"
        >
          {stand.number}
        </text>
      </svg>
    </div>
  );
}
