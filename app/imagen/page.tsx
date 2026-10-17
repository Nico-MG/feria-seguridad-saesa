"use client";

import Link from "next/link";
import { MouseEvent, useEffect, useState } from "react";

import { ensureAnonymousSession } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

type Session = "morning" | "afternoon";
type PublicGameStatus = {
  activeSession: Session | null;
  sessionLabel: string | null;
  imageCount: number;
};

type GameImage = {
  id: string;
  image: string;
  imageWidth: number;
  imageHeight: number;
  findings?: Finding[];
  foundIds?: string[];
};

type Finding = {
  id: string;
  x: number;
  y: number;
  radius: number;
  title: string;
};

type Mark = {
  x: number;
  y: number;
  result: "correct" | "wrong";
};

type GameResult = {
  images: GameImage[];
  score: number;
  elapsed_ms: number;
  mistakes: number;
  found_count: number;
  total: number;
};

type StartResponse = {
  attemptId: string;
  session: Session;
  images: GameImage[];
  imageIndex: number;
  imageCount: number;
  foundCount: number;
  total: number;
  mistakes: number;
  resumed?: boolean;
};

async function readJson<T>(response: Response): Promise<T> {
  const body = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(body.error ?? "No fue posible completar la operación.");
  }
  return body;
}

export default function ImageGamePage() {
  const [status, setStatus] = useState<PublicGameStatus | null>(null);
  const [registered, setRegistered] = useState(false);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [currentImage, setCurrentImage] = useState<GameImage | null>(null);
  const [imageIndex, setImageIndex] = useState(0);
  const [imageCount, setImageCount] = useState(0);
  const [foundCount, setFoundCount] = useState(0);
  const [totalFindings, setTotalFindings] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [finalResult, setFinalResult] = useState<GameResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [sendingClick, setSendingClick] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function loadGame() {
      try {
        const [statusResponse, authSession] = await Promise.all([
          fetch("/api/game", { cache: "no-store" }),
          ensureAnonymousSession(),
        ]);
        const publicStatus = await readJson<PublicGameStatus>(statusResponse);
        const { data, error: participantError } = await supabase
          .from("participants")
          .select("id")
          .eq("id", authSession.user.id)
          .maybeSingle();

        if (participantError) throw participantError;
        if (active) {
          setStatus(publicStatus);
          setRegistered(Boolean(data));
        }
      } catch (loadError) {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "No fue posible cargar el juego.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadGame();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (status?.activeSession || attemptId || finalResult) return;

    const interval = window.setInterval(async () => {
      try {
        const response = await fetch("/api/game", {
          cache: "no-store",
        });
        if (!response.ok) return;
        const nextStatus = (await response.json()) as PublicGameStatus;
        setStatus(nextStatus);
      } catch (pollError) {
        console.error(
          "No fue posible actualizar el estado del juego:",
          pollError,
        );
      }
    }, 5000);

    return () => window.clearInterval(interval);
  }, [status?.activeSession, attemptId, finalResult]);

  async function startOrResumeGame() {
    setStarting(true);
    setError(null);
    setMessage("");

    try {
      const authSession = await ensureAnonymousSession();
      const response = await fetch("/api/game/attempt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authSession.access_token}`,
        },
        body: JSON.stringify({ action: "start" }),
      });
      const result = await readJson<StartResponse>(response);

      setAttemptId(result.attemptId);
      setSession(result.session);
      setCurrentImage(result.images[0] ?? null);
      setImageIndex(result.imageIndex);
      setImageCount(result.imageCount);
      setFoundCount(result.foundCount);
      setTotalFindings(result.total);
      setMistakes(result.mistakes);
      setMarks([]);
      setFinalResult(null);
      setMessage(
        result.resumed
          ? "Retomaste tu intento. El cronómetro siguió corriendo."
          : "Encuentra todos los hallazgos de la sesión.",
      );
    } catch (startError) {
      setError(
        startError instanceof Error
          ? startError.message
          : "No fue posible iniciar el intento.",
      );
    } finally {
      setStarting(false);
    }
  }

  async function selectSpot(event: MouseEvent<HTMLDivElement>) {
    if (!attemptId || !currentImage || sendingClick || finalResult) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    setSendingClick(true);
    setError(null);

    try {
      const authSession = await ensureAnonymousSession();
      const response = await fetch("/api/game/attempt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authSession.access_token}`,
        },
        body: JSON.stringify({ action: "click", attemptId, x, y }),
      });

      type ClickResponse = {
        status: "playing" | "completed";
        hit: boolean;
        image_changed?: boolean;
        image_index: number;
        image_count: number;
        image?: string;
        image_width?: number;
        image_height?: number;
        found_count: number;
        total: number;
        mistakes: number;
        score?: number;
        elapsed_ms?: number;
        images?: GameImage[];
      };
      const result = await readJson<ClickResponse>(response);

      setFoundCount(result.found_count);
      setTotalFindings(result.total);
      setMistakes(result.mistakes);
      setImageIndex(result.image_index);
      setImageCount(result.image_count);
      if (result.image_changed && result.image) {
        setCurrentImage({
          id: `image-${result.image_index}`,
          image: result.image,
          imageWidth: result.image_width ?? 1,
          imageHeight: result.image_height ?? 1,
        });
        setMarks([]);
      } else {
        setMarks((previous) => [
          ...previous,
          { x, y, result: result.hit ? "correct" : "wrong" },
        ]);
      }

      if (result.status === "completed") {
        setFinalResult({
          images: result.images ?? [],
          score: result.score ?? 0,
          elapsed_ms: result.elapsed_ms ?? 0,
          mistakes: result.mistakes,
          found_count: result.found_count,
          total: result.total,
        });
        setAttemptId(null);
        setMessage("¡Completaste todas las imágenes de la sesión!");
      } else if (result.image_changed) {
        setMessage(
          `¡Imagen ${result.image_index + 1} completada! Continúa con la siguiente.`,
        );
      } else {
        setMessage(
          result.hit
            ? "¡Hallazgo correcto!"
            : `Fallaste. Llevas ${result.mistakes} fallo${
                result.mistakes === 1 ? "" : "s"
              }.`,
        );
      }
    } catch (clickError) {
      setError(
        clickError instanceof Error
          ? clickError.message
          : "No fue posible registrar la selección.",
      );
    } finally {
      setSendingClick(false);
    }
  }

  const currentScore = Math.max(
    0,
    foundCount * 100 - Math.max(0, mistakes - 3) * 10,
  );

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-4 sm:p-8">
      <header>
        <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">
          Seguridad que nos conecta
        </p>
        <h1 className="mt-2 text-3xl font-bold">Detectives de seguridad</h1>
        <p className="mt-2 text-gray-600">
          Encuentra todos los riesgos ocultos y consigue el mayor puntaje en el
          menor tiempo.
        </p>
      </header>

      {loading ? (
        <p className="rounded-xl bg-white p-5 text-sm text-slate-600">
          Comprobando si el juego está habilitado...
        </p>
      ) : error && !status ? (
        <p
          role="alert"
          className="rounded-xl bg-red-50 p-5 text-sm text-red-800"
        >
          {error}
        </p>
      ) : !registered ? (
        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-xl font-bold text-slate-900">
            Regístrate antes de jugar
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Para guardar tu intento en el ranking, primero completa tu registro
            en la sección de concursos.
          </p>
          <Link
            href="/concurso#registro-participante"
            className="mt-5 inline-flex rounded-xl bg-slate-950 px-5 py-3 font-semibold text-white"
          >
            Ir a registrarme
          </Link>
        </section>
      ) : attemptId || finalResult ? (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-slate-900 p-4 text-white">
            <div>
              <p className="text-sm text-slate-300">
                Sesión de {session === "morning" ? "mañana" : "tarde"} · Imagen{" "}
                {imageIndex + 1} de {imageCount}
              </p>
              <p className="text-2xl font-bold">
                {finalResult?.score ?? currentScore} puntos
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-300">Hallazgos</p>
              <p className="text-2xl font-bold">
                {foundCount} / {totalFindings}
              </p>
            </div>
            <p className="w-full text-sm text-slate-300 sm:w-auto">
              Fallos: {mistakes} · primeros 3 sin penalización; luego −10 puntos
              por fallo
            </p>
          </div>

          {!finalResult && currentImage && (
            <>
              <p className="text-gray-600">
                Imagen {imageIndex + 1} de {imageCount}. Haz clic sobre los
                riesgos; el tiempo corre para toda la sesión.
              </p>
              <div
                onClick={(event) => void selectSpot(event)}
                className={`relative mx-auto w-full overflow-hidden rounded-xl ${
                  sendingClick ? "cursor-wait" : "cursor-crosshair"
                }`}
              >
                <img
                  src={currentImage.image}
                  alt={`Imagen ${imageIndex + 1} del desafío de seguridad`}
                  className="block h-auto w-full"
                  draggable={false}
                />
                {marks.map((mark, index) => (
                  <div
                    key={index}
                    className={`pointer-events-none absolute h-7 w-7 rounded-full border-2 ${
                      mark.result === "correct"
                        ? "border-green-500 bg-green-500/30"
                        : "border-orange-500 bg-orange-500/30"
                    }`}
                    style={{
                      left: `${mark.x * 100}%`,
                      top: `${mark.y * 100}%`,
                      transform: "translate(-50%, -50%)",
                    }}
                  />
                ))}
              </div>
            </>
          )}

          <p
            aria-live="polite"
            className="rounded-lg bg-blue-50 p-4 text-blue-900"
          >
            {sendingClick ? "Revisando..." : message}
          </p>

          {error && (
            <p
              role="alert"
              className="rounded-lg bg-red-50 p-4 text-sm text-red-800"
            >
              {error}
            </p>
          )}

          {finalResult && (
            <section className="space-y-5 rounded-xl border bg-white p-5">
              <div>
                <h2 className="text-xl font-bold">Resultado de la sesión</h2>
                <p className="mt-2 text-slate-700">
                  {finalResult.score} puntos ·{" "}
                  {(finalResult.elapsed_ms / 1000).toFixed(1)} segundos ·{" "}
                  {finalResult.mistakes} fallos
                </p>
              </div>
              {finalResult.images.map((image, index) => (
                <div key={image.id}>
                  <h3 className="mb-2 font-semibold">Imagen {index + 1}</h3>
                  <div className="relative overflow-hidden rounded-xl">
                    <img
                      src={image.image}
                      alt={`Resultado de la imagen ${index + 1}`}
                      className="block h-auto w-full"
                    />
                    {image.findings?.map((finding, findingIndex) => (
                      <div
                        key={finding.id}
                        title={finding.title}
                        className="pointer-events-none absolute flex aspect-square items-center justify-center rounded-full border-2 border-green-500 bg-green-500/25"
                        style={{
                          left: `${finding.x * 100}%`,
                          top: `${finding.y * 100}%`,
                          width: `${finding.radius * 200}%`,
                          transform: "translate(-50%, -50%)",
                        }}
                      >
                        <span className="rounded-full bg-green-700 px-2 py-1 text-xs font-bold text-white">
                          {findingIndex + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <p className="text-sm text-slate-500">
                Tu resultado quedó registrado. En esta sesión solo se permite un
                intento.
              </p>
            </section>
          )}
        </section>
      ) : status?.activeSession ? (
        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm font-semibold text-green-700">
            SESIÓN DE {status.sessionLabel?.toUpperCase()} ABIERTA
          </p>
          <h2 className="mt-2 text-xl font-bold text-slate-900">
            Hay {status.imageCount} imágenes en esta sesión
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Tu puntaje incluye todos los hallazgos de las imágenes asignadas y
            el tiempo total de la sesión.
          </p>
          <button
            onClick={() => void startOrResumeGame()}
            disabled={starting}
            className="mt-5 rounded-xl bg-slate-950 px-5 py-3 font-semibold text-white disabled:opacity-50"
          >
            {starting ? "Iniciando..." : "Comenzar juego"}
          </button>
          {error && (
            <p role="alert" className="mt-4 text-sm text-red-700">
              {error}
            </p>
          )}
        </section>
      ) : (
        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-xl font-bold text-slate-900">
            El juego está cerrado por ahora
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            El administrador habilitará la sesión de la mañana o de la tarde
            cuando corresponda. Esta página comprueba automáticamente si se abre
            una sesión.
          </p>
          <button
            onClick={() => void startOrResumeGame()}
            disabled={starting}
            className="mt-5 rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 disabled:opacity-50"
          >
            {starting ? "Comprobando..." : "Retomar un juego iniciado"}
          </button>
          {error && (
            <p role="alert" className="mt-4 text-sm text-slate-600">
              {error}
            </p>
          )}
        </section>
      )}
    </main>
  );
}
