"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import Header from "@/components/Header";
import ParticipantForm from "@/components/ParticipantForm";
import ContestForm from "@/components/ContestForm";
import GameRanking from "@/components/GameRanking";
import Link from "next/link";

import { supabase } from "@/lib/supabase";
import { ensureAnonymousSession } from "@/lib/auth";

import { getActiveEvent, getContestStands } from "@/lib/supabaseData";

import type { Event, Stand } from "@/types/event";

type Participant = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
};

const subscribeToContestLocation = (callback: () => void) => {
  window.addEventListener("popstate", callback);
  return () => window.removeEventListener("popstate", callback);
};

const getScannedStandSlug = () =>
  new URLSearchParams(window.location.search).get("stand")?.trim() || null;

const getServerScannedStandSlug = () => null;

export default function ConcursoPage() {
  const [event, setEvent] = useState<Event | null>(null);

  const [contestStands, setContestStands] = useState<Stand[]>([]);

  const [visitedStandIds, setVisitedStandIds] = useState<number[]>([]);
  const [scanNotice, setScanNotice] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  const [participant, setParticipant] = useState<Participant | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);
  const handledScan = useRef<string | null>(null);
  const scannedStandSlug = useSyncExternalStore(
    subscribeToContestLocation,
    getScannedStandSlug,
    getServerScannedStandSlug,
  );

  const fetchContestData = useCallback(async () => {
    const session = await ensureAnonymousSession();
    const activeEvent = await getActiveEvent();

    if (!activeEvent) {
      throw new Error("No hay una feria activa.");
    }

    const stands = await getContestStands(activeEvent.id);
    const { data: participantData, error: participantError } = await supabase
      .from("participants")
      .select("*")
      .eq("id", session.user.id)
      .maybeSingle();

    if (participantError) throw participantError;

    let visitedStandIds: number[] = [];
    if (participantData) {
      const { data: visits, error: visitsError } = await supabase
        .from("stand_visits")
        .select("stand_id")
        .eq("participant_id", session.user.id);

      if (visitsError) throw visitsError;
      visitedStandIds = (visits ?? []).map((visit) => visit.stand_id);
    }

    return {
      event: activeEvent,
      stands,
      participant: participantData as Participant | null,
      visitedStandIds,
    };
  }, []);

  const applyContestData = useCallback(
    (result: Awaited<ReturnType<typeof fetchContestData>>) => {
      setEvent(result.event);
      setContestStands(result.stands);
      setParticipant(result.participant);
      setVisitedStandIds(result.visitedStandIds);
    },
    [],
  );

  async function loadContest() {
    setLoading(true);
    setError(null);

    try {
      applyContestData(await fetchContestData());
    } catch (error) {
      console.error(error);

      setError("No fue posible cargar el concurso.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    void fetchContestData()
      .then((result) => {
        if (active) applyContestData(result);
      })
      .catch((loadError: unknown) => {
        console.error(loadError);
        if (active) setError("No fue posible cargar el concurso.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [applyContestData, fetchContestData]);

  useEffect(() => {
    if (loading || !scannedStandSlug) return;

    const stand = contestStands.find((item) => item.slug === scannedStandSlug);
    if (!stand || !participant) return;

    const participantId = participant.id;
    const standId = stand.id;
    const standNumber = stand.number;
    const scanKey = `${participantId}:${standId}`;
    if (handledScan.current === scanKey) return;
    handledScan.current = scanKey;

    if (visitedStandIds.includes(standId)) return;

    async function recordScannedVisit() {
      try {
        const { error: visitError } = await supabase
          .from("stand_visits")
          .insert({
            participant_id: participantId,
            stand_id: standId,
          });

        if (visitError && visitError.code !== "23505") throw visitError;
        setVisitedStandIds((current) =>
          current.includes(standId) ? current : [...current, standId],
        );
        setScanNotice(`Visita al stand ${standNumber} registrada. ¡Gracias!`);
      } catch (visitError) {
        console.error(
          "No fue posible registrar la visita escaneada:",
          visitError,
        );
        handledScan.current = null;
        setScanError(
          "No fue posible registrar la visita. Vuelve a escanear el código o reintenta.",
        );
      }
    }

    void recordScannedVisit();
  }, [loading, participant, scannedStandSlug, contestStands, visitedStandIds]);

  const scannedStand = scannedStandSlug
    ? (contestStands.find((stand) => stand.slug === scannedStandSlug) ?? null)
    : null;
  const invalidScannedStand =
    !loading && Boolean(scannedStandSlug) && !scannedStand;
  const visibleScanNotice =
    scanNotice ??
    (scannedStand && visitedStandIds.includes(scannedStand.id)
      ? `Ya tienes registrada tu visita al stand ${scannedStand.number}.`
      : null);

  const visitedCount = contestStands.filter((stand) =>
    visitedStandIds.includes(stand.id),
  ).length;

  const totalStands = contestStands.length;

  const progress =
    totalStands === 0 ? 0 : Math.round((visitedCount / totalStands) * 100);

  const completed = totalStands > 0 && visitedCount === totalStands;

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50">
        <Header />

        <div className="mx-auto max-w-4xl px-5 py-16 text-center">
          <p className="text-sm text-slate-500">Cargando concurso...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-slate-50">
        <Header />

        <div className="mx-auto max-w-4xl px-5 py-16">
          <div className="rounded-2xl bg-red-50 p-6 text-center ring-1 ring-red-200">
            <h1 className="font-bold text-red-900">Ocurrió un problema</h1>

            <p className="mt-2 text-sm text-red-700">{error}</p>

            <button
              onClick={loadContest}
              className="mt-5 rounded-xl bg-red-600 px-5 py-3 font-semibold text-white"
            >
              Reintentar
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <Header />

      <div className="mx-auto max-w-4xl px-5 py-8">
        {/* HEADER */}

        <section>
          <p className="text-sm font-semibold text-sky-600">CONCURSO</p>

          <h1 className="mt-1 text-3xl font-bold text-slate-900">
            Pasaporte de seguridad
          </h1>

          <p className="mt-3 leading-7 text-slate-500">
            Escanea el código QR de cada stand participante para registrar tus
            visitas y completar el pasaporte.
          </p>
        </section>

        {/* REGISTRO */}

        {!participant && !scannedStandSlug && (
          <section className="mt-8 rounded-2xl bg-sky-50 p-6 ring-1 ring-sky-200">
            <h2 className="text-xl font-bold text-sky-950">
              Escanea el QR de un stand para participar
            </h2>
            <p className="mt-2 text-sm leading-6 text-sky-900">
              El registro se inicia desde el código QR de un stand participante.
              Cuando lo escanees, podrás completar tus datos y sumar esa visita
              a tu pasaporte.
            </p>
            <Link
              href="/stands"
              className="mt-4 inline-flex font-semibold text-sky-800 underline"
            >
              Ver stands participantes
            </Link>
          </section>
        )}

        {!participant && scannedStandSlug && (
          <section id="registro-participante" className="mt-8 scroll-mt-6">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-slate-900">
                Primero, regístrate
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {scannedStand
                  ? `Escaneaste el QR del stand ${scannedStand.number}. Al completar el registro, guardaremos esta visita.`
                  : "Estamos verificando el stand asociado al código QR."}
              </p>
            </div>

            {scannedStand ? (
              <ParticipantForm onRegistered={loadContest} />
            ) : loading ? (
              <p className="rounded-xl bg-white p-5 text-sm text-slate-500">
                Verificando el código del stand...
              </p>
            ) : invalidScannedStand ? (
              <p
                role="alert"
                className="rounded-xl bg-red-50 p-5 text-sm text-red-700"
              >
                {scanError ??
                  "Este código no corresponde a un stand participante del concurso."}
              </p>
            ) : null}
            <p className="mt-4 text-sm text-slate-600">
              Después de registrarte, podrás jugar{" "}
              <Link
                href="/imagen"
                className="font-semibold text-sky-700 underline"
              >
                Detectives de seguridad
              </Link>{" "}
              y aparecer en el ranking.
            </p>
          </section>
        )}

        {/* PARTICIPANTE */}

        {participant && (
          <>
            {visibleScanNotice && (
              <p
                role="status"
                className="mt-5 rounded-xl bg-green-50 p-4 text-sm font-semibold text-green-800 ring-1 ring-green-200"
              >
                {visibleScanNotice}
              </p>
            )}
            {scanError && (
              <p
                role="alert"
                className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-800 ring-1 ring-red-200"
              >
                {scanError}
              </p>
            )}
            <section className="mt-8">
              <div className="rounded-2xl bg-green-50 p-5 ring-1 ring-green-200">
                <p className="text-sm font-semibold text-green-700">
                  Participante
                </p>

                <p className="mt-1 text-lg font-bold text-green-900">
                  {participant.name}
                </p>

                <p className="mt-1 text-sm text-green-700">
                  Tus visitas se están guardando automáticamente.
                </p>
              </div>
            </section>

            <section className="mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <p className="text-sm font-semibold text-sky-600">
                JUEGO DE IMÁGENES
              </p>
              <h2 className="mt-1 text-xl font-bold text-slate-900">
                Detectives de seguridad
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Encuentra los riesgos, completa el desafío y compite por el
                mejor puntaje. Se permite un intento por participante.
              </p>
              <Link
                href="/imagen"
                className="mt-5 inline-flex rounded-xl bg-slate-950 px-5 py-3 font-semibold text-white"
              >
                Ir al juego
              </Link>
            </section>

            {/* PROGRESO */}

            <section className="mt-8">
              <div className="rounded-3xl bg-slate-950 p-6 text-white">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-sky-300">
                      TU PROGRESO
                    </p>

                    <p className="mt-2 text-4xl font-bold">{progress}%</p>
                  </div>

                  <p className="text-sm text-slate-300">
                    {visitedCount} de {totalStands} stands
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

                <p className="mt-4 text-sm text-slate-300">
                  {completed
                    ? "🎉 ¡Completaste todos los stands!"
                    : `Te faltan ${totalStands - visitedCount} stands.`}
                </p>
              </div>
            </section>

            {/* STANDS */}

            <section className="mt-8">
              <div className="mb-4">
                <p className="text-sm font-semibold text-sky-600">PASAPORTE</p>

                <h2 className="mt-1 text-2xl font-bold text-slate-900">
                  Tus visitas
                </h2>
              </div>

              <div className="space-y-3">
                {contestStands.map((stand) => {
                  const visited = visitedStandIds.includes(stand.id);

                  return (
                    <div
                      key={stand.id}
                      className={`flex items-center justify-between rounded-2xl bg-white p-5 ring-1 ${
                        visited ? "ring-green-200" : "ring-slate-200"
                      }`}
                    >
                      <div>
                        <p className="text-xs font-bold text-sky-600">
                          STAND {stand.number}
                        </p>

                        <p className="mt-1 font-bold text-slate-900">
                          {stand.location}
                        </p>
                      </div>

                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full text-lg ${
                          visited
                            ? "bg-green-100 text-green-700"
                            : "bg-slate-100 text-slate-400"
                        }`}
                      >
                        {visited ? "✓" : "○"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* CONCURSO */}

            <section className="mt-8">
              <ContestForm completed={completed} />
            </section>
          </>
        )}

        {/* EVENTO */}

        {event && (
          <p className="mt-8 text-center text-xs text-slate-400">
            {event.name}
          </p>
        )}

        <GameRanking />
      </div>
    </main>
  );
}
