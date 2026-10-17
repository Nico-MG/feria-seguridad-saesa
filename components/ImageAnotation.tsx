
"use client";

import { useEffect, useRef, useState } from "react";

type Tool = "pen" | "arrow" | "circle" | "rect" | "text";

type Point = {
  x: number;
  y: number;
};

type Annotation = {
  id: number;
  tool: Tool;
  points: Point[];
  color: string;
  text?: string;
};

function drawAnnotation(
  ctx: CanvasRenderingContext2D,
  item: Annotation,
  width: number,
  height: number
) {
  const p = item.points;
  if (!p.length) return;

  const x = (v: number) => v * width;
  const y = (v: number) => v * height;

  ctx.strokeStyle = item.color;
  ctx.fillStyle = item.color;
  ctx.lineWidth = Math.max(2, width * 0.003);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (item.tool === "text") {
    ctx.font = `bold ${Math.max(14, width * 0.025)}px sans-serif`;
    ctx.shadowColor = "white";
    ctx.shadowBlur = 3;
    ctx.fillText(item.text ?? "", x(p[0].x), y(p[0].y));
    ctx.shadowBlur = 0;
    return;
  }

  ctx.beginPath();
  ctx.moveTo(x(p[0].x), y(p[0].y));

  if (item.tool === "pen") {
    for (const point of p.slice(1)) {
      ctx.lineTo(x(point.x), y(point.y));
    }
    ctx.stroke();
    return;
  }

  if (p.length < 2) return;

  const a = p[0];
  const b = p[p.length - 1];
  const ax = x(a.x);
  const ay = y(a.y);
  const bx = x(b.x);
  const by = y(b.y);

  if (item.tool === "rect") {
    ctx.strokeRect(ax, ay, bx - ax, by - ay);
  } else if (item.tool === "circle") {
    ctx.ellipse(
      (ax + bx) / 2,
      (ay + by) / 2,
      Math.abs(bx - ax) / 2,
      Math.abs(by - ay) / 2,
      0,
      0,
      Math.PI * 2
    );
    ctx.stroke();
  } else if (item.tool === "arrow") {
    ctx.lineTo(bx, by);
    ctx.stroke();

    const angle = Math.atan2(by - ay, bx - ax);
    const head = Math.max(10, width * 0.018);

    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(
      bx - head * Math.cos(angle - Math.PI / 6),
      by - head * Math.sin(angle - Math.PI / 6)
    );
    ctx.moveTo(bx, by);
    ctx.lineTo(
      bx - head * Math.cos(angle + Math.PI / 6),
      by - head * Math.sin(angle + Math.PI / 6)
    );
    ctx.stroke();
  }
}

export default function ImageAnnotator() {
  const [imageUrl, setImageUrl] = useState("");
  const [imageSize, setImageSize] = useState({
    width: 0,
    height: 0,
  });
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState("#ef4444");
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [draft, setDraft] = useState<Annotation | null>(null);
  const [drawing, setDrawing] = useState(false);

  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<Annotation | null>(null);
  const nextId = useRef(1);

  const allAnnotations = draft
    ? [...annotations, draft]
    : annotations;

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas || !imageSize.width) return;

    const redraw = () => {
      const rect = container.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, rect.width, rect.height);

      allAnnotations.forEach((item) =>
        drawAnnotation(ctx, item, rect.width, rect.height)
      );
    };

    const observer = new ResizeObserver(redraw);
    observer.observe(container);
    redraw();

    return () => observer.disconnect();
  }, [allAnnotations, imageSize]);

  function loadImage(file?: File) {
    if (!file || !file.type.startsWith("image/")) return;

    const url = URL.createObjectURL(file);
    setImageUrl((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return url;
    });

    setAnnotations([]);
    setDraft(null);
    activeRef.current = null;
  }

  function getPoint(
    event: React.PointerEvent<HTMLCanvasElement>
  ): Point {
    const rect = event.currentTarget.getBoundingClientRect();

    return {
      x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)),
    };
  }

  function pointerDown(
    event: React.PointerEvent<HTMLCanvasElement>
  ) {
    if (!imageUrl) return;

    const point = getPoint(event);

    if (tool === "text") {
      const text = window.prompt("Escribe tu observación:");
      if (text?.trim()) {
        setAnnotations((previous) => [
          ...previous,
          {
            id: nextId.current++,
            tool,
            points: [point],
            color,
            text: text.trim(),
          },
        ]);
      }
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    setDrawing(true);

    const item: Annotation = {
      id: nextId.current++,
      tool,
      points: [point],
      color,
    };

    activeRef.current = item;
    setDraft(item);
  }

  function pointerMove(
    event: React.PointerEvent<HTMLCanvasElement>
  ) {
    if (!drawing || !activeRef.current) return;

    const point = getPoint(event);
    const current = activeRef.current;

    const updated: Annotation = {
      ...current,
      points:
        current.tool === "pen"
          ? [...current.points, point]
          : [current.points[0], point],
    };

    activeRef.current = updated;
    setDraft(updated);
  }

  function pointerUp() {
    const current = activeRef.current;

    if (current) {
      setAnnotations((previous) => [...previous, current]);
    }

    activeRef.current = null;
    setDraft(null);
    setDrawing(false);
  }

  function undo() {
    setAnnotations((previous) => previous.slice(0, -1));
  }

  function clearAll() {
    if (window.confirm("¿Eliminar todas las anotaciones?")) {
      setAnnotations([]);
      setDraft(null);
      activeRef.current = null;
      setDrawing(false);
    }
  }

  function downloadImage() {
    const image = imageRef.current;
    if (!image || !imageSize.width) return;

    const output = document.createElement("canvas");
    output.width = imageSize.width;
    output.height = imageSize.height;

    const ctx = output.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(image, 0, 0, output.width, output.height);

    const items = draft
      ? [...annotations, draft]
      : annotations;

    items.forEach((item) =>
      drawAnnotation(ctx, item, output.width, output.height)
    );

    const link = document.createElement("a");
    link.download = "imagen-anotada.png";
    link.href = output.toDataURL("image/png");
    link.click();
  }

  const tools: { id: Tool; label: string }[] = [
    { id: "pen", label: "Pluma" },
    { id: "arrow", label: "Flecha" },
    { id: "circle", label: "Círculo" },
    { id: "rect", label: "Rectángulo" },
    { id: "text", label: "Texto" },
  ];

  return (
    <main className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">
          Anotador de imágenes
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Marca zonas, señala elementos y agrega observaciones.
        </p>
      </header>

      <section className="flex flex-wrap items-center gap-2 rounded-xl border bg-white p-3">
        {tools.map((item) => (
          <button
            key={item.id}
            onClick={() => setTool(item.id)}
            className={`rounded-lg border px-3 py-2 text-sm ${
              tool === item.id
                ? "border-blue-600 bg-blue-50 text-blue-700"
                : "border-gray-200 hover:bg-gray-50"
            }`}
          >
            {item.label}
          </button>
        ))}

        <span className="mx-1 h-7 border-l" />

        <label className="flex cursor-pointer items-center gap-2 text-sm">
          Color
          <input
            type="color"
            value={color}
            onChange={(event) => setColor(event.target.value)}
            className="h-9 w-10 cursor-pointer"
          />
        </label>

        <div className="flex-1" />

        <button
          onClick={undo}
          disabled={!annotations.length}
          className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40"
        >
          Deshacer
        </button>

        <button
          onClick={clearAll}
          disabled={!annotations.length && !draft}
          className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40"
        >
          Limpiar
        </button>

        <button
          onClick={downloadImage}
          disabled={!imageUrl}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
        >
          Descargar PNG
        </button>
      </section>

      <section className="rounded-xl border bg-gray-50 p-3 sm:p-5">
        {!imageUrl ? (
          <label className="flex min-h-80 cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-gray-300 bg-white p-6 text-center hover:border-blue-400">
            <span className="text-4xl">＋</span>
            <span className="font-semibold">
              Selecciona una imagen
            </span>
            <span className="text-sm text-gray-500">
              JPG, PNG o WebP
            </span>
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(event) =>
                loadImage(event.target.files?.[0])
              }
            />
          </label>
        ) : (
          <div className="space-y-3">
            <div className="flex justify-end">
              <label className="cursor-pointer rounded-lg border bg-white px-3 py-2 text-sm hover:bg-gray-100">
                Cambiar imagen
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(event) =>
                    loadImage(event.target.files?.[0])
                  }
                />
              </label>
            </div>

            <div className="flex justify-center overflow-hidden">
              <div
                ref={containerRef}
                className="relative w-full touch-none select-none"
                style={{
                  aspectRatio: `${imageSize.width} / ${imageSize.height}`,
                  maxWidth: `min(100%, calc(65vh * ${imageSize.width / imageSize.height}))`,
                }}
              >
                <img
                  ref={imageRef}
                  src={imageUrl}
                  alt="Imagen para realizar anotaciones"
                  draggable={false}
                  onLoad={(event) =>
                    setImageSize({
                      width: event.currentTarget.naturalWidth,
                      height: event.currentTarget.naturalHeight,
                    })
                  }
                  className="absolute inset-0 h-full w-full select-none object-fill"
                />

                <canvas
                  ref={canvasRef}
                  onPointerDown={pointerDown}
                  onPointerMove={pointerMove}
                  onPointerUp={pointerUp}
                  onPointerCancel={pointerUp}
                  className="absolute inset-0 h-full w-full touch-none"
                  style={{
                    cursor: tool === "text" ? "text" : "crosshair",
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </section>

      <p className="text-sm text-gray-500">
        {annotations.length} anotación(es). Los dibujos se conservan
        mientras mantengas esta página abierta; descarga el PNG para
        guardar el resultado.
      </p>
    </main>
  );
}
