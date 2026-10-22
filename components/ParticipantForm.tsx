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
};

export default function ParticipantForm({
  onRegistered,
}: ParticipantFormProps) {
  const [name, setName] = useState("");

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
            .select("id, name")
            .eq("id", session.user.id)
            .maybeSingle();

        if (error) {
          throw error;
        }

        if (data) {
          const participant =
            data as Participant;

          setName(participant.name);
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
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Ingresa tu nombre.");
      return;
    }

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
            name: trimmedName,
          });

      if (error) {
        if (error.code === "23505") {
          setError("Ese nombre ya está registrado. Ingresa otro nombre.");
          return;
        }
        throw error;
      }

      setSubmitted(true);

      onRegistered?.();
    } catch (error) {
      console.error(error);

      setError(
        "No fue posible guardar tu registro. Inténtalo nuevamente."
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
          Nombre
        </label>

        <input
          required
          maxLength={200}
          value={name}
          onChange={(event) =>
            setName(event.target.value)
          }
          className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-500/30"
          placeholder="Juan Pérez"
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