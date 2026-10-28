"use client";

import { useState } from "react";

import { supabase } from "@/lib/supabase";
import { ensureAnonymousSession } from "@/lib/auth";

type ContestFormProps = {
  visitedCount: number;
  registered: boolean;
};

export default function ContestForm({
  visitedCount,
  registered,
}: ContestFormProps) {
  const [loading, setLoading] =
    useState(false);

  const [submitted, setSubmitted] =
    useState(registered);

  const [error, setError] =
    useState<string | null>(null);

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setLoading(true);
    setError(null);

    try {
      const session =
        await ensureAnonymousSession();

      const { data: participant, error: participantError } =
        await supabase
          .from("participants")
          .select("id")
          .eq("id", session.user.id)
          .maybeSingle();

      if (participantError) {
        throw participantError;
      }

      if (!participant) {
        throw new Error(
          "No existe un participante registrado."
        );
      }

      const { error: contestError } =
        await supabase
          .from("contest_entries")
          .insert({
            participant_id:
              session.user.id,
          });

      if (contestError) {
        if (
          contestError.code === "23505"
        ) {
          setSubmitted(true);
          return;
        }

        throw contestError;
      }

      setSubmitted(true);
    } catch (error) {
      console.error(error);

      setError(
        "No fue posible registrar tu participación."
      );
    } finally {
      setLoading(false);
    }
  }

  if (visitedCount === 0 && !submitted) {
    return (
      <div className="rounded-2xl bg-slate-100 p-6 text-center">
        <div className="text-3xl">
          📷
        </div>

        <h3 className="mt-3 font-bold text-slate-900">
          Escanea un stand para participar
        </h3>

        <p className="mt-2 text-sm text-slate-500">
          No necesitas completar todos los stands. Cada visita registrada
          suma una oportunidad para el sorteo.
        </p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="rounded-2xl bg-green-50 p-6 text-center ring-1 ring-green-200">
        <div className="text-4xl">
          🎉
        </div>

        <h3 className="mt-3 text-xl font-bold text-green-900">
          ¡Participación registrada!
        </h3>

        <p className="mt-2 text-sm text-green-700">
          Tu participación está registrada y tienes {visitedCount}{" "}
          {visitedCount === 1 ? "oportunidad" : "oportunidades"} en el sorteo.
        </p>

        <div className="mt-5 rounded-xl bg-white p-4 text-sm text-slate-600">
          Cada nuevo stand que escanees sumará otra oportunidad
          automáticamente. ¡Mucha suerte!
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
    >
      <div className="text-center">
        <div className="text-4xl">
          🎉
        </div>

        <h3 className="mt-3 text-xl font-bold text-slate-900">
          ¡Participa en el sorteo!
        </h3>

        <p className="mt-2 text-sm text-slate-500">
          Ya registraste {visitedCount}{" "}
          {visitedCount === 1 ? "stand" : "stands"}. Registra tu participación
          y cada nuevo stand que escanees aumentará tus oportunidades de ganar.
        </p>
      </div>

      {error && (
        <div className="mt-5 rounded-xl bg-red-50 p-3 text-center text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="mt-6 w-full rounded-xl bg-slate-950 px-4 py-4 font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading
          ? "Registrando..."
          : "🎁 Participar en el sorteo"}
      </button>
    </form>
  );
}