"use client";

import { FormEvent, useEffect, useState } from "react";

import {
  getParticipant,
  saveParticipant,
} from "@/lib/participant";

type ParticipantFormProps = {
  onRegistered?: () => void;
};

export default function ParticipantForm({
  onRegistered,
}: ParticipantFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [loaded, setLoaded] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const existingParticipant =
      getParticipant();

    if (existingParticipant) {
      setName(existingParticipant.name);
      setEmail(existingParticipant.email);
      setPhone(existingParticipant.phone);
      setSubmitted(true);
    }

    setLoaded(true);
  }, []);

  function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const existingParticipant =
      getParticipant();

    const participant = {
      id:
        existingParticipant?.id ??
        crypto.randomUUID(),

      name: name.trim(),

      email: email.trim(),

      phone: phone.trim(),

      registeredAt:
        existingParticipant?.registeredAt ??
        new Date().toISOString(),
    };

    saveParticipant(participant);

    setSubmitted(true);

    onRegistered?.();
  }

  if (!loaded) {
    return (
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <p className="text-sm text-slate-500">
          Cargando...
        </p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="rounded-2xl bg-green-50 p-6 ring-1 ring-green-200">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-green-100 text-xl">
            ✓
          </div>

          <div>
            <h3 className="font-bold text-green-900">
              ¡Ya estás registrado!
            </h3>

            <p className="mt-1 text-sm text-green-700">
              Hola {name}. Ya puedes comenzar a
              visitar los stands.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
    >
      <div>
        <label className="text-sm font-semibold text-slate-700">
          Nombre completo
        </label>

        <input
          required
          value={name}
          onChange={(event) =>
            setName(event.target.value)
          }
          className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-500"
          placeholder="Juan Pérez"
        />
      </div>

      <div>
        <label className="text-sm font-semibold text-slate-700">
          Correo electrónico
        </label>

        <input
          required
          type="email"
          value={email}
          onChange={(event) =>
            setEmail(event.target.value)
          }
          className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-500"
          placeholder="juan@empresa.cl"
        />
      </div>

      <div>
        <label className="text-sm font-semibold text-slate-700">
          Teléfono
        </label>

        <input
          required
          type="tel"
          value={phone}
          onChange={(event) =>
            setPhone(event.target.value)
          }
          className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-sky-500"
          placeholder="+56 9 1234 5678"
        />
      </div>

      <button
        type="submit"
        className="w-full rounded-xl bg-slate-950 px-4 py-4 font-bold text-white transition hover:bg-slate-800"
      >
        🎯 Comenzar a participar
      </button>
    </form>
  );
}