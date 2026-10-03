"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  hasVisitedStand,
  registerStandVisit,
} from "@/lib/contest";

import { getParticipant } from "@/lib/participant";

type RegisterVisitButtonProps = {
  standSlug: string;
};

export default function RegisterVisitButton({
  standSlug,
}: RegisterVisitButtonProps) {
  const router = useRouter();

  const [registered, setRegistered] =
    useState(false);

  const [loaded, setLoaded] =
    useState(false);

  useEffect(() => {
    setRegistered(
      hasVisitedStand(standSlug)
    );

    setLoaded(true);
  }, [standSlug]);

  function handleRegister() {
    const participant =
      getParticipant();

    if (!participant) {
      router.push("/concurso");

      return;
    }

    registerStandVisit(standSlug);

    setRegistered(true);
  }

  if (!loaded) {
    return (
      <button
        disabled
        className="w-full rounded-xl bg-slate-700 px-4 py-4 font-bold text-slate-400"
      >
        Cargando...
      </button>
    );
  }

  return (
    <button
      onClick={handleRegister}
      disabled={registered}
      className={`w-full rounded-xl px-4 py-4 font-bold transition ${
        registered
          ? "bg-green-100 text-green-700"
          : "bg-white text-slate-900 hover:bg-slate-100"
      }`}
    >
      {registered
        ? "✓ Visita registrada"
        : "🎯 Registrar visita"}
    </button>
  );
}