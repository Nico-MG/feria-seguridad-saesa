"use client";

import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";
import { ensureAnonymousSession } from "@/lib/auth";

type RegisterVisitButtonProps = {
  standId: number;
};

export default function RegisterVisitButton({
  standId,
}: RegisterVisitButtonProps) {
  const [registered, setRegistered] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkVisit() {
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
          setLoading(false);
          return;
        }

        const { data: visit, error: visitError } = await supabase
          .from("stand_visits")
          .select("id")
          .eq("participant_id", session.user.id)
          .eq("stand_id", standId)
          .maybeSingle();

        if (visitError) {
          throw visitError;
        }

        setRegistered(!!visit);
      } catch (error) {
        console.error(error);

        setError("No fue posible verificar tu visita.");
      } finally {
        setLoading(false);
      }
    }

    checkVisit();
  }, [standId]);

  if (loading) {
    return <p className="text-sm text-slate-300">Verificando visita...</p>;
  }

  if (registered) {
    return <p className="font-semibold text-green-300">✓ Visita registrada</p>;
  }

  return (
    <div>
      <p className="text-sm leading-6 text-slate-300">
        Escanea el código QR de este stand para registrar tu visita en el
        concurso.
      </p>

      {error && (
        <p role="alert" className="mt-3 text-center text-sm text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
