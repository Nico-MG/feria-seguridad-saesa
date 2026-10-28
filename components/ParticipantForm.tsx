"use client";

import { FormEvent, useEffect, useState } from "react";

import { supabase } from "@/lib/supabase";
import { ensureAnonymousSession } from "@/lib/auth";

type ParticipantFormProps = {
  onRegistered?: () => void;
};

type Participant = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  contact_sharing_consent: boolean;
};

type SavedContact = {
  email: string;
  phone: string;
  consent: boolean;
};

const inputClassName =
  "mt-2 w-full rounded-xl border border-slate-300 bg-slate-100 px-4 py-3 text-slate-900 outline-none placeholder:text-slate-400 focus:border-sky-700 focus:ring-2 focus:ring-sky-700/20";

export default function ParticipantForm({
  onRegistered,
}: ParticipantFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [contactSharingConsent, setContactSharingConsent] = useState(false);
  const [savedContact, setSavedContact] = useState<SavedContact>({
    email: "",
    phone: "",
    consent: false,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [editingContact, setEditingContact] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadParticipant() {
      try {
        const session = await ensureAnonymousSession();

        const { data, error } = await supabase
          .from("participants")
          .select("id, name, email, phone, contact_sharing_consent")
          .eq("id", session.user.id)
          .maybeSingle();

        if (error) {
          throw error;
        }

        if (data) {
          const participant = data as Participant;

          setName(participant.name);
          setEmail(participant.email ?? "");
          setPhone(participant.phone ?? "");
          setContactSharingConsent(
            participant.contact_sharing_consent ?? false,
          );
          setSavedContact({
            email: participant.email ?? "",
            phone: participant.phone ?? "",
            consent: participant.contact_sharing_consent ?? false,
          });
          setSubmitted(true);
        }
      } catch (error) {
        console.error(error);
        setError("No fue posible cargar tu registro.");
      } finally {
        setLoading(false);
      }
    }

    void loadParticipant();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedName) {
      setError("Ingresa tu nombre.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const session = await ensureAnonymousSession();
      const { error } = await supabase.from("participants").upsert({
        id: session.user.id,
        name: trimmedName,
        email: trimmedEmail || null,
        phone: trimmedPhone || null,
        contact_sharing_consent:
          Boolean(trimmedEmail || trimmedPhone) && contactSharingConsent,
      });

      if (error) {
        if (error.code === "23505") {
          setError("Ese nombre ya está registrado. Ingresa otro nombre.");
          return;
        }
        throw error;
      }

      setName(trimmedName);
      setEmail(trimmedEmail);
      setPhone(trimmedPhone);
      const savedConsent =
        Boolean(trimmedEmail || trimmedPhone) && contactSharingConsent;
      setContactSharingConsent(savedConsent);
      setSavedContact({
        email: trimmedEmail,
        phone: trimmedPhone,
        consent: savedConsent,
      });
      setSubmitted(true);
      setEditingContact(false);
      onRegistered?.();
    } catch (error) {
      console.error(error);
      setError(
        "No fue posible guardar tu registro. Inténtalo nuevamente.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <p className="text-sm text-slate-500">Preparando tu registro...</p>
      </div>
    );
  }

  if (submitted && !editingContact) {
    return (
      <div className="rounded-2xl bg-green-50 p-6 ring-1 ring-green-200">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-green-100 text-xl">
            ✓
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-green-900">
              ¡Ya estás registrado!
            </h3>

            <p className="mt-1 text-sm text-green-700">
              Hola {name}. Ya puedes comenzar a visitar los stands.
            </p>

            <div className="mt-4 space-y-1 text-sm text-green-900">
              <p>Correo: {email || "No proporcionado"}</p>
              <p>Teléfono: {phone || "No proporcionado"}</p>
              <p>
                Permiso para compartir con empresas:{" "}
                {contactSharingConsent ? "Autorizado" : "No autorizado"}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setError(null);
                setEditingContact(true);
              }}
              className="mt-4 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-green-900 ring-1 ring-green-300 transition hover:bg-green-100"
            >
              Actualizar datos de contacto
            </button>
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
      {!submitted && (
        <div>
          <label
            htmlFor="participant-name"
            className="text-sm font-semibold text-slate-700"
          >
            Nombre
          </label>

          <input
            id="participant-name"
            required
            maxLength={200}
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={inputClassName}
            placeholder="Juan Pérez"
          />
        </div>
      )}

      <div>
        <label
          htmlFor="participant-email"
          className="text-sm font-semibold text-slate-700"
        >
          Correo electrónico <span className="font-normal text-slate-500">(opcional)</span>
        </label>
        <input
          id="participant-email"
          type="email"
          maxLength={254}
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={inputClassName}
          placeholder="nombre@empresa.cl"
        />
      </div>

      <div>
        <label
          htmlFor="participant-phone"
          className="text-sm font-semibold text-slate-700"
        >
          Teléfono <span className="font-normal text-slate-500">(opcional)</span>
        </label>
        <input
          id="participant-phone"
          type="tel"
          maxLength={40}
          autoComplete="tel"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          className={inputClassName}
          placeholder="+56 9 1234 5678"
        />
      </div>

      <label className="flex items-start gap-3 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600 ring-1 ring-slate-200">
        <input
          type="checkbox"
          checked={contactSharingConsent}
          disabled={!email.trim() && !phone.trim()}
          onChange={(event) =>
            setContactSharingConsent(event.target.checked)
          }
          className="mt-1 h-4 w-4 shrink-0 accent-sky-700"
        />
        <span>
          Autorizo que se comparta mi correo y/o teléfono con las empresas cuyos
          stands visite para que puedan contactarme. Es opcional y puedo cambiar
          mi autorización. Actualmente, estos datos solo se guardan para la
          administración de la feria; la aplicación todavía no los comparte con
          las empresas.
        </span>
      </label>

      {error && (
        <div role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-xl bg-slate-950 px-4 py-4 font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving
            ? "Guardando..."
            : submitted
              ? "Guardar datos de contacto"
              : "🎯 Comenzar a participar"}
        </button>
        {submitted && (
          <button
            type="button"
            disabled={saving}
            onClick={() => {
              setEmail(savedContact.email);
              setPhone(savedContact.phone);
              setContactSharingConsent(savedContact.consent);
              setError(null);
              setEditingContact(false);
            }}
            className="w-full rounded-xl border border-slate-300 px-4 py-4 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
