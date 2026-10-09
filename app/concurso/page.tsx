"use client";

import {
  useEffect,
  useState,
} from "react";

import Header from "@/components/Header";
import ParticipantForm from "@/components/ParticipantForm";
import ContestForm from "@/components/ContestForm";

import { supabase } from "@/lib/supabase";
import { ensureAnonymousSession } from "@/lib/auth";

import {
  getActiveEvent,
  getContestStands,
} from "@/lib/supabaseData";

import type {
  Event,
  Stand,
} from "@/types/event";

type Participant = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
};

export default function ConcursoPage() {
  const [event, setEvent] =
    useState<Event | null>(null);

  const [contestStands, setContestStands] =
    useState<Stand[]>([]);

  const [visitedStandIds, setVisitedStandIds] =
    useState<number[]>([]);

  const [participant, setParticipant] =
    useState<Participant | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  async function loadContest() {
    try {
      setLoading(true);
      setError(null);

      const session =
        await ensureAnonymousSession();

      const activeEvent =
        await getActiveEvent();

      if (!activeEvent) {
        throw new Error(
          "No hay una feria activa."
        );
      }

      setEvent(activeEvent);

      const stands =
        await getContestStands(
          activeEvent.id
        );

      setContestStands(stands);

      const {
        data: participantData,
        error: participantError,
      } = await supabase
        .from("participants")
        .select("*")
        .eq("id", session.user.id)
        .maybeSingle();

      if (participantError) {
        throw participantError;
      }

      if (participantData) {
        setParticipant(
          participantData as Participant
        );

        const {
          data: visits,
          error: visitsError,
        } = await supabase
          .from("stand_visits")
          .select("stand_id")
          .eq(
            "participant_id",
            session.user.id
          );

        if (visitsError) {
          throw visitsError;
        }

        setVisitedStandIds(
          (visits ?? []).map(
            (visit) => visit.stand_id
          )
        );
      } else {
        setParticipant(null);
        setVisitedStandIds([]);
      }
    } catch (error) {
      console.error(error);

      setError(
        "No fue posible cargar el concurso."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadContest();
  }, []);

  const visitedCount =
    contestStands.filter((stand) =>
      visitedStandIds.includes(
        stand.id
      )
    ).length;

  const totalStands =
    contestStands.length;

  const progress =
    totalStands === 0
      ? 0
      : Math.round(
          (visitedCount /
            totalStands) *
            100
        );

  const completed =
    totalStands > 0 &&
    visitedCount === totalStands;

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50">
        <Header />

        <div className="mx-auto max-w-4xl px-5 py-16 text-center">
          <p className="text-sm text-slate-500">
            Cargando concurso...
          </p>
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
            <h1 className="font-bold text-red-900">
              Ocurrió un problema
            </h1>

            <p className="mt-2 text-sm text-red-700">
              {error}
            </p>

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
          <p className="text-sm font-semibold text-sky-600">
            CONCURSO
          </p>

          <h1 className="mt-1 text-3xl font-bold text-slate-900">
            Pasaporte de seguridad
          </h1>

          <p className="mt-3 leading-7 text-slate-500">
            Visita los stands participantes y
            registra cada visita para completar
            tu pasaporte.
          </p>
        </section>

        {/* REGISTRO */}

        {!participant && (
          <section className="mt-8">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-slate-900">
                Primero, regístrate
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Necesitamos tus datos para guardar
                tus visitas.
              </p>
            </div>

            <ParticipantForm
              onRegistered={loadContest}
            />
          </section>
        )}

        {/* PARTICIPANTE */}

        {participant && (
          <>
            <section className="mt-8">
              <div className="rounded-2xl bg-green-50 p-5 ring-1 ring-green-200">
                <p className="text-sm font-semibold text-green-700">
                  Participante
                </p>

                <p className="mt-1 text-lg font-bold text-green-900">
                  {participant.name}
                </p>

                <p className="mt-1 text-sm text-green-700">
                  Tus visitas se están guardando
                  automáticamente.
                </p>
              </div>
            </section>

            {/* PROGRESO */}

            <section className="mt-8">
              <div className="rounded-3xl bg-slate-950 p-6 text-white">

                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-sky-300">
                      TU PROGRESO
                    </p>

                    <p className="mt-2 text-4xl font-bold">
                      {progress}%
                    </p>
                  </div>

                  <p className="text-sm text-slate-300">
                    {visitedCount} de{" "}
                    {totalStands} stands
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
                    : `Te faltan ${
                        totalStands -
                        visitedCount
                      } stands.`}
                </p>
              </div>
            </section>

            {/* STANDS */}

            <section className="mt-8">
              <div className="mb-4">
                <p className="text-sm font-semibold text-sky-600">
                  PASAPORTE
                </p>

                <h2 className="mt-1 text-2xl font-bold text-slate-900">
                  Tus visitas
                </h2>
              </div>

              <div className="space-y-3">
                {contestStands.map(
                  (stand) => {
                    const visited =
                      visitedStandIds.includes(
                        stand.id
                      );

                    return (
                      <div
                        key={stand.id}
                        className={`flex items-center justify-between rounded-2xl bg-white p-5 ring-1 ${
                          visited
                            ? "ring-green-200"
                            : "ring-slate-200"
                        }`}
                      >
                        <div>
                          <p className="text-xs font-bold text-sky-600">
                            STAND{" "}
                            {stand.number}
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
                          {visited
                            ? "✓"
                            : "○"}
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            </section>

            {/* CONCURSO */}

            <section className="mt-8">
              <ContestForm
                completed={completed}
              />
            </section>
          </>
        )}

        {/* EVENTO */}

        {event && (
          <p className="mt-8 text-center text-xs text-slate-400">
            {event.name}
          </p>
        )}
      </div>
    </main>
  );
}