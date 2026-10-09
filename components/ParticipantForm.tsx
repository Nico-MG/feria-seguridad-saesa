"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import { supabase } from "@/lib/supabase";
import { ensureAnonymousSession } from "@/lib/auth";

type ParticipantFormProps = {
  onRegistered?: () => void;
};

type Participant = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  registered_at: string;
};

export default function ParticipantForm({
  onRegistered,
}: ParticipantFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(
    null
  );

  useEffect(() => {
    async function loadParticipant() {
      try {
        const session =
          await ensureAnonymousSession();

        const { data, error } =
          await supabase
            .from("participants")
            .select("*")
            .eq("id", session.user.id)
            .maybeSingle();

        if (error) {
          throw error;
        }

        if (data) {
          const participant =
            data as Participant;

          setName(participant.name);
          setEmail(participant.email);
          setPhone(participant.phone ?? "");
          setSubmitted(true);
        }
      } catch (error) {
        console.error(error);

        setError(
          "No fue posible cargar tu registro."
        );
      } finally {
        setLoading(false);
      }
    }

    loadParticipant();
  }, []);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setSaving(true);
    setError(null);

    try {
      const session =
        await ensureAnonymousSession();

      const { error } =
        await supabase
          .from("participants")
          .upsert({
            id: session.user.id,
            name: name.trim(),
            email: email.trim(),
            phone: phone.trim(),
          });

      if (error) {
        throw error;
      }

      setSubmitted(true);

      onRegistered?.();
    } catch (error) {
      console.error(error);

      setError(
        "No fue posible guardar tus datos. Inténtalo nuevamente."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <p className="text-sm text-slate-500">
          Preparando tu registro...
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

      {error && (
        <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-xl bg-slate-950 px-4 py-4 font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving
          ? "Guardando..."
          : "🎯 Comenzar a participar"}
      </button>
    </form>
  );
}