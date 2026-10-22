"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type AdminLoginProps = {
  configured: boolean;
};

export default function AdminLogin({
  configured,
}: AdminLoginProps) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const result = (await response.json()) as {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(result.error ?? "No fue posible iniciar sesión.");
      }

      router.refresh();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "No fue posible iniciar sesión."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="w-full max-w-md rounded-3xl bg-white p-8 shadow-lg ring-1 ring-slate-200">
      <p className="text-sm font-bold uppercase tracking-wide text-sky-600">
        Feria de Seguridad SAESA
      </p>
      <h1 className="mt-2 text-3xl font-bold text-slate-900">
        Administración
      </h1>
      <p className="mt-2 text-sm leading-6 text-slate-500">
        Ingresa tus credenciales para gestionar la feria.
      </p>

      {!configured && (
        <p className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
          El acceso aún no está configurado en el servidor. Define las
          variables ADMIN_USERNAME, ADMIN_PASSWORD y
          ADMIN_SESSION_SECRET.
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label
            htmlFor="admin-username"
            className="text-sm font-semibold text-slate-700"
          >
            Usuario
          </label>
          <input
            id="admin-username"
            autoComplete="username"
            required
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-500/30"
          />
        </div>

        <div>
          <label
            htmlFor="admin-password"
            className="text-sm font-semibold text-slate-700"
          >
            Contraseña
          </label>
          <input
            id="admin-password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-500/30"
          />
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-xl bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={saving || !configured}
          className="w-full rounded-xl bg-slate-950 px-4 py-3 font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Ingresando..." : "Iniciar sesión"}
        </button>
      </form>
    </section>
  );
}
