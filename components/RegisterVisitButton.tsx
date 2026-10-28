"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { supabase } from "@/lib/supabase";
import { ensureAnonymousSession } from "@/lib/auth";

type RegisterVisitButtonProps = {
  standId: number;
  standSlug: string;
};

export default function RegisterVisitButton({
  standId,
  standSlug,
}: RegisterVisitButtonProps) {
  const [registered, setRegistered] = useState(false);
  const [hasParticipant, setHasParticipant] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let active = true;

    async function registerVisit() {
      try {
        const session = await ensureAnonymousSession();

        const { data: participant, error: participantError } = await supabase
          .from("participants")
          .select("id")
          .eq("id", session.user.id)
          .maybeSingle();

        if (participantError) {
          throw participantError;
        }

        if (!participant) {
          if (active) setHasParticipant(false);
          return;
        }

        if (active) setHasParticipant(true);

        const { data: visit, error: visitError } = await supabase
          .from("stand_visits")
          .select("id")
          .eq("participant_id", session.user.id)
          .eq("stand_id", standId)
          .maybeSingle();

        if (visitError) {
          throw visitError;
        }

        if (!visit) {
          const { error: insertError } = await supabase
            .from("stand_visits")
            .insert({
              participant_id: session.user.id,
              stand_id: standId,
            });

          if (insertError && insertError.code !== "23505") {
            throw insertError;
          }
        }

        if (active) setRegistered(true);
      } catch (visitError) {
        console.error(visitError);

        if (active) {
          setError("No fue posible registrar tu visita.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void registerVisit();

    return () => {
      active = false;
    };
  }, [standId, retryCount]);

  if (loading) {
    return <p className="text-sm text-slate-300">Registrando tu visita...</p>;
  }

  if (registered) {
    return (
      <div>
        <p className="font-semibold text-green-300">
          ✓ Tu visita ya quedó registrada
        </p>
        <Link
          href="/concurso"
          className="mt-2 inline-block text-sm font-semibold text-sky-300 underline underline-offset-2 hover:text-white"
        >
          Revisa tu pasaporte en la sección de concurso
        </Link>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div>
          <p role="alert" className="text-sm text-red-300">
            {error}
          </p>
          <button
            type="button"
            onClick={() => {
              setError(null);
              setLoading(true);
              setRetryCount((count) => count + 1);
            }}
            className="mt-3 text-sm font-semibold text-white underline underline-offset-2"
          >
            Reintentar
          </button>
        </div>
      )}

      {!hasParticipant && !error && (
        <div>
          <p className="text-sm leading-6 text-slate-300">
            Inscríbete en el concurso para registrar tu visita en el pasaporte.
          </p>
          <Link
            href={`/concurso?stand=${encodeURIComponent(standSlug)}#registro-participante`}
            className="mt-3 inline-block text-sm font-semibold text-sky-300 underline underline-offset-2 hover:text-white"
          >
            Inscribirme y registrar la visita
          </Link>
        </div>
      )}
    </div>
  );
}
