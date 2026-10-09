"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase";
import { ensureAnonymousSession } from "@/lib/auth";

type RegisterVisitButtonProps = {
  standId: number;
};

export default function RegisterVisitButton({
  standId,
}: RegisterVisitButtonProps) {
  const router = useRouter();

  const [registered, setRegistered] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    async function checkVisit() {
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
          setLoading(false);
          return;
        }

        const { data: visit, error: visitError } =
          await supabase
            .from("stand_visits")
            .select("id")
            .eq(
              "participant_id",
              session.user.id
            )
            .eq("stand_id", standId)
            .maybeSingle();

        if (visitError) {
          throw visitError;
        }

        setRegistered(!!visit);
      } catch (error) {
        console.error(error);

        setError(
          "No fue posible verificar tu visita."
        );
      } finally {
        setLoading(false);
      }
    }

    checkVisit();
  }, [standId]);

  async function handleRegister() {
    setSaving(true);
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
        router.push("/concurso");
        return;
      }

      const { error: visitError } =
        await supabase
          .from("stand_visits")
          .insert({
            participant_id:
              session.user.id,
            stand_id: standId,
          });

      if (visitError) {
        if (visitError.code === "23505") {
          setRegistered(true);
          return;
        }

        throw visitError;
      }

      setRegistered(true);
    } catch (error) {
      console.error(error);

      setError(
        "No fue posible registrar la visita."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <button
        disabled
        className="w-full rounded-xl bg-slate-700 px-4 py-4 font-bold text-slate-400"
      >
        Verificando...
      </button>
    );
  }

  if (registered) {
    return (
      <button
        disabled
        className="w-full rounded-xl bg-green-100 px-4 py-4 font-bold text-green-700"
      >
        ✓ Visita registrada
      </button>
    );
  }

  return (
    <div>
      <button
        onClick={handleRegister}
        disabled={saving}
        className="w-full rounded-xl bg-white px-4 py-4 font-bold text-slate-900 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving
          ? "Registrando..."
          : "🎯 Registrar visita"}
      </button>

      {error && (
        <p className="mt-3 text-center text-sm text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}