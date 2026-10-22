"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import AdminGameEditor from "@/components/AdminGameEditor";
import AdminStandMapEditor from "@/components/AdminStandMapEditor";
import CompanyLogo from "@/components/CompanyLogo";

type Company = {
  id: number;
  name: string;
  description: string;
  category: string;
  logo: string;
  websiteUrl: string;
  instagramUrl: string;
  facebookUrl: string;
  linkedinUrl: string;
  youtubeUrl: string;
};

type Stand = {
  id: number;
  eventId: number;
  companyId: number;
  number: string;
  location: string;
  slug: string;
  contestRequired: boolean;
  mapArea: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
};

type Talk = {
  id: number;
  eventId: number;
  title: string;
  speaker: string;
  companyId: number;
  start: string;
  end: string;
  location: string;
};

type AdminData = {
  event: { id: number; name: string };
  companies: Company[];
  stands: Stand[];
  talks: Talk[];
};

type StandDraft = {
  companyId: string;
  number: string;
  location: string;
  slug: string;
  contestRequired: boolean;
};

type TalkDraft = {
  companyId: string;
  title: string;
  speaker: string;
  start: string;
  end: string;
  location: string;
};

type CompanyDraft = Omit<Company, "id">;

type AdminTab = "empresas" | "stands" | "programa" | "juego";

const emptyCompany: CompanyDraft = {
  name: "",
  description: "",
  category: "",
  logo: "",
  websiteUrl: "",
  instagramUrl: "",
  facebookUrl: "",
  linkedinUrl: "",
  youtubeUrl: "",
};

const emptyStand: StandDraft = {
  companyId: "",
  number: "",
  location: "",
  slug: "",
  contestRequired: true,
};

const emptyTalk: TalkDraft = {
  companyId: "",
  title: "",
  speaker: "",
  start: "",
  end: "",
  location: "",
};

async function readResponse(response: Response) {
  const body = (await response.json()) as {
    error?: string;
  };

  if (!response.ok) {
    throw new Error(body.error ?? "La operación no se pudo completar.");
  }
}

async function requestAdminData(): Promise<AdminData> {
  const response = await fetch("/api/admin/data", {
    cache: "no-store",
  });
  const result = (await response.json()) as AdminData & {
    error?: string;
  };
  if (!response.ok) {
    throw new Error(result.error ?? "No fue posible cargar la feria.");
  }
  return result;
}

function formatDateTimeInput(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState<AdminTab>("stands");
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [standDraft, setStandDraft] = useState<StandDraft>(emptyStand);
  const [editingStand, setEditingStand] = useState<number | null>(null);
  const [mapEditorStandId, setMapEditorStandId] = useState<number | null>(null);
  const [talkDraft, setTalkDraft] = useState<TalkDraft>(emptyTalk);
  const [editingTalk, setEditingTalk] = useState<number | null>(null);
  const [companyDraft, setCompanyDraft] = useState<CompanyDraft>(emptyCompany);
  const [editingCompany, setEditingCompany] = useState<number | null>(null);
  const [companyLogoFile, setCompanyLogoFile] = useState<File | null>(null);
  const companyLogoInputRef = useRef<HTMLInputElement>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await requestAdminData());
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "No fue posible cargar la feria.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    void requestAdminData()
      .then((result) => {
        if (active) {
          setError(null);
          setData(result);
        }
      })
      .catch((loadError: unknown) => {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "No fue posible cargar la feria.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  async function submitStand(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!standDraft.companyId) {
      setError("Selecciona una empresa para el stand.");
      return;
    }

    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch(
        editingStand
          ? `/api/admin/stands/${editingStand}`
          : "/api/admin/stands",
        {
          method: editingStand ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...standDraft,
            companyId: Number(standDraft.companyId),
          }),
        },
      );
      await readResponse(response);
      setStandDraft(emptyStand);
      setEditingStand(null);
      setNotice(editingStand ? "Stand modificado." : "Stand agregado.");
      await loadData();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "No fue posible guardar el stand.",
      );
    } finally {
      setSaving(false);
    }
  }

  function editStand(stand: Stand) {
    setEditingStand(stand.id);
    setStandDraft({
      companyId: String(stand.companyId),
      number: stand.number,
      location: stand.location,
      slug: stand.slug,
      contestRequired: stand.contestRequired,
    });
    setError(null);
    setNotice(null);
  }

  async function deleteStand(stand: Stand) {
    if (!window.confirm(`¿Eliminar el stand ${stand.number}?`)) return;
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/admin/stands/${stand.id}`, {
        method: "DELETE",
      });
      await readResponse(response);
      setNotice("Stand eliminado.");
      if (editingStand === stand.id) {
        setEditingStand(null);
        setStandDraft(emptyStand);
      }
      await loadData();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "No fue posible eliminar el stand.",
      );
    }
  }

  async function submitTalk(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!talkDraft.companyId) {
      setError("Selecciona una empresa para la actividad.");
      return;
    }
    if (
      !talkDraft.start ||
      !talkDraft.end ||
      new Date(talkDraft.end) <= new Date(talkDraft.start)
    ) {
      setError("La hora de término debe ser posterior al inicio.");
      return;
    }

    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(
        editingTalk ? `/api/admin/talks/${editingTalk}` : "/api/admin/talks",
        {
          method: editingTalk ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...talkDraft,
            companyId: Number(talkDraft.companyId),
            start: new Date(talkDraft.start).toISOString(),
            end: new Date(talkDraft.end).toISOString(),
          }),
        },
      );
      await readResponse(response);
      setTalkDraft(emptyTalk);
      setEditingTalk(null);
      setNotice(editingTalk ? "Actividad modificada." : "Actividad agregada.");
      await loadData();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "No fue posible guardar la actividad.",
      );
    } finally {
      setSaving(false);
    }
  }

  function editTalk(talk: Talk) {
    setEditingTalk(talk.id);
    setTalkDraft({
      companyId: String(talk.companyId),
      title: talk.title,
      speaker: talk.speaker,
      start: formatDateTimeInput(talk.start),
      end: formatDateTimeInput(talk.end),
      location: talk.location,
    });
    setError(null);
    setNotice(null);
  }

  async function deleteTalk(talk: Talk) {
    if (!window.confirm(`¿Eliminar la actividad "${talk.title}"?`)) return;
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/admin/talks/${talk.id}`, {
        method: "DELETE",
      });
      await readResponse(response);
      setNotice("Actividad eliminada.");
      if (editingTalk === talk.id) {
        setEditingTalk(null);
        setTalkDraft(emptyTalk);
      }
      await loadData();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "No fue posible eliminar la actividad.",
      );
    }
  }

  async function submitCompany(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      const formData = new FormData();
      formData.append(
        "company",
        JSON.stringify({
          name: companyDraft.name,
          description: companyDraft.description,
          category: companyDraft.category,
          website_url: companyDraft.websiteUrl,
          instagram_url: companyDraft.instagramUrl,
          facebook_url: companyDraft.facebookUrl,
          linkedin_url: companyDraft.linkedinUrl,
          youtube_url: companyDraft.youtubeUrl,
        }),
      );
      if (companyLogoFile) formData.append("logo", companyLogoFile);

      const response = await fetch(
        editingCompany
          ? `/api/admin/companies/${editingCompany}`
          : "/api/admin/companies",
        {
          method: editingCompany ? "PATCH" : "POST",
          body: formData,
        },
      );
      await readResponse(response);
      setCompanyDraft(emptyCompany);
      setCompanyLogoFile(null);
      if (companyLogoInputRef.current) {
        companyLogoInputRef.current.value = "";
      }
      setEditingCompany(null);
      setNotice(editingCompany ? "Empresa modificada." : "Empresa agregada.");
      await loadData();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "No fue posible guardar la empresa.",
      );
    } finally {
      setSaving(false);
    }
  }

  function editCompany(company: Company) {
    setEditingCompany(company.id);
    setCompanyDraft({
      name: company.name,
      description: company.description,
      category: company.category,
      logo: company.logo,
      websiteUrl: company.websiteUrl,
      instagramUrl: company.instagramUrl,
      facebookUrl: company.facebookUrl,
      linkedinUrl: company.linkedinUrl ?? "",
      youtubeUrl: company.youtubeUrl,
    });
    setCompanyLogoFile(null);
    if (companyLogoInputRef.current) {
      companyLogoInputRef.current.value = "";
    }
    setError(null);
    setNotice(null);
  }

  async function deleteCompany(company: Company) {
    if (!window.confirm(`¿Eliminar la empresa "${company.name}"?`)) return;
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/admin/companies/${company.id}`, {
        method: "DELETE",
      });
      await readResponse(response);
      setNotice("Empresa eliminada.");
      if (editingCompany === company.id) {
        setEditingCompany(null);
        setCompanyDraft(emptyCompany);
        setCompanyLogoFile(null);
        if (companyLogoInputRef.current) {
          companyLogoInputRef.current.value = "";
        }
      }
      await loadData();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "No fue posible eliminar la empresa.",
      );
    }
  }

  async function logout() {
    try {
      const response = await fetch("/api/admin/login", {
        method: "DELETE",
      });
      await readResponse(response);
      window.location.reload();
    } catch (logoutError) {
      setError(
        logoutError instanceof Error
          ? logoutError.message
          : "No fue posible cerrar la sesión.",
      );
    }
  }

  const companyName = (companyId: number) =>
    data?.companies.find((company) => company.id === companyId)?.name ??
    "Empresa no disponible";

  return (
    <main className="min-h-screen bg-slate-100">
      <header className="bg-slate-950 text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-sky-300">
              Panel privado
            </p>
            <h1 className="mt-1 text-2xl font-bold">Administración de feria</h1>
            {data && (
              <p className="mt-1 text-sm text-slate-300">{data.event.name}</p>
            )}
          </div>
          <button
            onClick={logout}
            className="rounded-xl border border-white/20 px-4 py-2 text-sm font-semibold transition hover:bg-white/10"
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-8">
        <nav
          className="mb-6 flex flex-wrap gap-2"
          aria-label="Secciones de administración"
        >
          {(
            [
              ["empresas", "Empresas"],
              ["stands", "Stands"],
              ["programa", "Programa"],
              ["juego", "Juego de imágenes"],
            ] as const
          ).map(([tab, label]) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setError(null);
                setNotice(null);
              }}
              aria-current={activeTab === tab ? "page" : undefined}
              className={`rounded-xl px-4 py-3 text-sm font-semibold ${
                activeTab === tab
                  ? "bg-slate-950 text-white"
                  : "bg-white text-slate-700 ring-1 ring-slate-200"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>

        {error && (
          <p
            role="alert"
            className="mb-5 rounded-xl bg-red-50 p-4 text-sm font-medium text-red-800 ring-1 ring-red-200"
          >
            {error}
          </p>
        )}
        {notice && (
          <p
            role="status"
            className="mb-5 rounded-xl bg-green-50 p-4 text-sm font-medium text-green-800 ring-1 ring-green-200"
          >
            {notice}
          </p>
        )}

        {activeTab === "juego" ? (
          <AdminGameEditor />
        ) : loading ? (
          <div className="rounded-2xl bg-white p-8 text-center text-slate-500">
            Cargando datos de la feria...
          </div>
        ) : !data ? (
          <div className="rounded-2xl bg-white p-8 text-center text-slate-600">
            No fue posible mostrar el panel.
            <button
              onClick={() => void loadData()}
              className="ml-2 font-semibold text-sky-700 underline"
            >
              Reintentar
            </button>
          </div>
        ) : activeTab === "empresas" ? (
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <h2 className="text-xl font-bold text-slate-900">
                {editingCompany ? "Modificar empresa" : "Agregar empresa"}
              </h2>
              <form onSubmit={submitCompany} className="mt-5 space-y-4">
                <label className="block text-sm font-semibold text-slate-700">
                  Nombre
                  <input
                    required
                    maxLength={200}
                    value={companyDraft.name}
                    onChange={(event) =>
                      setCompanyDraft({
                        ...companyDraft,
                        name: event.target.value,
                      })
                    }
                    className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3"
                  />
                </label>
                <label className="block text-sm font-semibold text-slate-700">
                  Descripción
                  <textarea
                    maxLength={5000}
                    rows={4}
                    value={companyDraft.description}
                    onChange={(event) =>
                      setCompanyDraft({
                        ...companyDraft,
                        description: event.target.value,
                      })
                    }
                    className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3"
                  />
                </label>
                <label className="block text-sm font-semibold text-slate-700">
                  Categoría
                  <input
                    maxLength={200}
                    value={companyDraft.category}
                    onChange={(event) =>
                      setCompanyDraft({
                        ...companyDraft,
                        category: event.target.value,
                      })
                    }
                    className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3"
                  />
                </label>
                {(
                  [
                    ["websiteUrl", "Página web"],
                    ["instagramUrl", "Instagram"],
                    ["facebookUrl", "Facebook"],
                    ["linkedinUrl", "LinkedIn"],
                    ["youtubeUrl", "YouTube"],
                  ] as const
                ).map(([field, label]) => (
                  <label
                    key={field}
                    className="block text-sm font-semibold text-slate-700"
                  >
                    {label}
                    <input
                      type="url"
                      maxLength={2048}
                      value={companyDraft[field]}
                      onChange={(event) =>
                        setCompanyDraft({
                          ...companyDraft,
                          [field]: event.target.value,
                        })
                      }
                      placeholder="https://"
                      className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3"
                    />
                  </label>
                ))}
                <label className="block text-sm font-semibold text-slate-700">
                  Logo de la empresa
                  <input
                    ref={companyLogoInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(event) =>
                      setCompanyLogoFile(event.target.files?.[0] ?? null)
                    }
                    className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3 file:mr-3 file:rounded-lg file:border-0 file:bg-sky-50 file:px-3 file:py-2 file:font-semibold file:text-sky-800"
                  />
                  <span className="mt-1 block text-xs font-normal text-slate-500">
                    JPG, PNG o WebP; máximo 5 MB.
                    {companyLogoFile
                      ? ` Archivo seleccionado: ${companyLogoFile.name}`
                      : editingCompany && companyDraft.logo
                        ? " Deja el campo vacío para conservar el logo actual."
                        : ""}
                  </span>
                </label>
                <div className="flex flex-wrap gap-3">
                  <button
                    disabled={saving}
                    className="rounded-xl bg-slate-950 px-5 py-3 font-semibold text-white disabled:opacity-50"
                  >
                    {saving
                      ? "Guardando..."
                      : editingCompany
                        ? "Guardar cambios"
                        : "Agregar empresa"}
                  </button>
                  {editingCompany && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCompany(null);
                        setCompanyDraft(emptyCompany);
                        setCompanyLogoFile(null);
                        if (companyLogoInputRef.current) {
                          companyLogoInputRef.current.value = "";
                        }
                      }}
                      className="rounded-xl bg-slate-100 px-5 py-3 font-semibold text-slate-700"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </form>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-900">
                Empresas registradas ({data.companies.length})
              </h2>
              {data.companies.length === 0 ? (
                <p className="rounded-2xl bg-white p-6 text-sm text-slate-500">
                  Todavía no hay empresas registradas.
                </p>
              ) : (
                data.companies.map((company) => (
                  <article
                    key={company.id}
                    className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
                  >
                    <div className="flex items-center gap-4">
                      <CompanyLogo
                        logo={company.logo}
                        name={company.name}
                        className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-sky-50"
                      />
                      <div>
                        <h3 className="font-bold text-slate-900">
                          {company.name}
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                          {company.category || "Sin categoría"}
                        </p>
                        {company.description && (
                          <p className="mt-1 max-w-xl text-sm text-slate-600">
                            {company.description}
                          </p>
                        )}
                        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm">
                          {(
                            [
                              ["websiteUrl", "Página web"],
                              ["instagramUrl", "Instagram"],
                              ["facebookUrl", "Facebook"],
                              ["linkedinUrl", "LinkedIn"],
                              ["youtubeUrl", "YouTube"],
                            ] as const
                          ).map(([field, label]) =>
                            company[field] ? (
                              <a
                                key={field}
                                href={company[field]}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-semibold text-sky-700 underline"
                              >
                                {label}
                              </a>
                            ) : null,
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => editCompany(company)}
                        className="rounded-lg bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-800"
                      >
                        Modificar
                      </button>
                      <button
                        onClick={() => void deleteCompany(company)}
                        className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700"
                      >
                        Eliminar
                      </button>
                    </div>
                  </article>
                ))
              )}
            </section>
          </div>
        ) : activeTab === "stands" ? (
          <>
            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
              <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                <h2 className="text-xl font-bold text-slate-900">
                  {editingStand ? "Modificar stand" : "Agregar stand"}
                </h2>
                <form onSubmit={submitStand} className="mt-5 space-y-4">
                  <label className="block text-sm font-semibold text-slate-700">
                    Empresa
                    <select
                      required
                      value={standDraft.companyId}
                      onChange={(event) =>
                        setStandDraft({
                          ...standDraft,
                          companyId: event.target.value,
                        })
                      }
                      className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3"
                    >
                      <option value="">Seleccionar empresa</option>
                      {data.companies.map((company) => (
                        <option key={company.id} value={company.id}>
                          {company.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block text-sm font-semibold text-slate-700">
                      Número
                      <input
                        required
                        value={standDraft.number}
                        onChange={(event) =>
                          setStandDraft({
                            ...standDraft,
                            number: event.target.value,
                          })
                        }
                        placeholder="A01"
                        className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3"
                      />
                    </label>
                    <label className="block text-sm font-semibold text-slate-700">
                      Enlace (slug)
                      <input
                        required
                        pattern="[a-z0-9]+(-[a-z0-9]+)*"
                        value={standDraft.slug}
                        onChange={(event) =>
                          setStandDraft({
                            ...standDraft,
                            slug: event.target.value
                              .toLowerCase()
                              .replace(/[^a-z0-9-]/g, ""),
                          })
                        }
                        placeholder="empresa-ejemplo"
                        className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3"
                      />
                    </label>
                  </div>
                  <label className="block text-sm font-semibold text-slate-700">
                    Ubicación
                    <input
                      required
                      value={standDraft.location}
                      onChange={(event) =>
                        setStandDraft({
                          ...standDraft,
                          location: event.target.value,
                        })
                      }
                      placeholder="Sector A · Stand 01"
                      className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3"
                    />
                  </label>
                  <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={standDraft.contestRequired}
                      onChange={(event) =>
                        setStandDraft({
                          ...standDraft,
                          contestRequired: event.target.checked,
                        })
                      }
                      className="h-4 w-4 accent-sky-600"
                    />
                    Requerido para completar el concurso
                  </label>
                  <div className="flex flex-wrap gap-3">
                    <button
                      disabled={saving || data.companies.length === 0}
                      className="rounded-xl bg-slate-950 px-5 py-3 font-semibold text-white disabled:opacity-50"
                    >
                      {saving
                        ? "Guardando..."
                        : editingStand
                          ? "Guardar cambios"
                          : "Agregar stand"}
                    </button>
                    {editingStand && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingStand(null);
                          setStandDraft(emptyStand);
                        }}
                        className="rounded-xl bg-slate-100 px-5 py-3 font-semibold text-slate-700"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                  {data.companies.length === 0 && (
                    <p className="text-sm text-amber-800">
                      No hay empresas registradas para asociar a un stand.
                    </p>
                  )}
                </form>
              </section>

              <section className="space-y-3">
                <h2 className="text-xl font-bold text-slate-900">
                  Stands registrados ({data.stands.length})
                </h2>
                {data.stands.length === 0 ? (
                  <p className="rounded-2xl bg-white p-6 text-sm text-slate-500">
                    Todavía no hay stands para esta feria.
                  </p>
                ) : (
                  data.stands.map((stand) => (
                    <article
                      key={stand.id}
                      className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
                    >
                      <div>
                        <h3 className="font-bold text-slate-900">
                          {stand.number} · {companyName(stand.companyId)}
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                          {stand.location} · /stands/{stand.slug}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {stand.contestRequired
                            ? "Participa en el concurso"
                            : "No requerido para el concurso"}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            setMapEditorStandId((current) =>
                              current === stand.id ? null : stand.id,
                            )
                          }
                          className="rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800"
                        >
                          {mapEditorStandId === stand.id
                            ? "Cerrar plano"
                            : stand.mapArea
                              ? "Editar ubicación"
                              : "Ubicar en plano"}
                        </button>
                        <button
                          onClick={() => editStand(stand)}
                          className="rounded-lg bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-800"
                        >
                          Modificar
                        </button>
                        <button
                          onClick={() => void deleteStand(stand)}
                          className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700"
                        >
                          Eliminar
                        </button>
                      </div>
                    </article>
                  ))
                )}
              </section>
            </div>
            {mapEditorStandId !== null &&
              (() => {
                const selectedStand = data.stands.find(
                  (stand) => stand.id === mapEditorStandId,
                );
                return selectedStand ? (
                  <div className="mt-6">
                    <AdminStandMapEditor
                      key={selectedStand.id}
                      stands={data.stands}
                      selectedStand={selectedStand}
                      onSaved={loadData}
                    />
                  </div>
                ) : null;
              })()}
          </>
        ) : (
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <h2 className="text-xl font-bold text-slate-900">
                {editingTalk ? "Modificar actividad" : "Agregar actividad"}
              </h2>
              <form onSubmit={submitTalk} className="mt-5 space-y-4">
                <label className="block text-sm font-semibold text-slate-700">
                  Título
                  <input
                    required
                    value={talkDraft.title}
                    onChange={(event) =>
                      setTalkDraft({
                        ...talkDraft,
                        title: event.target.value,
                      })
                    }
                    className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3"
                  />
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-semibold text-slate-700">
                    Expositor/a
                    <input
                      required
                      value={talkDraft.speaker}
                      onChange={(event) =>
                        setTalkDraft({
                          ...talkDraft,
                          speaker: event.target.value,
                        })
                      }
                      className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3"
                    />
                  </label>
                  <label className="block text-sm font-semibold text-slate-700">
                    Empresa
                    <select
                      required
                      value={talkDraft.companyId}
                      onChange={(event) =>
                        setTalkDraft({
                          ...talkDraft,
                          companyId: event.target.value,
                        })
                      }
                      className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3"
                    >
                      <option value="">Seleccionar empresa</option>
                      {data.companies.map((company) => (
                        <option key={company.id} value={company.id}>
                          {company.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-semibold text-slate-700">
                    Inicio
                    <input
                      required
                      type="datetime-local"
                      value={talkDraft.start}
                      onChange={(event) =>
                        setTalkDraft({
                          ...talkDraft,
                          start: event.target.value,
                        })
                      }
                      className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3"
                    />
                  </label>
                  <label className="block text-sm font-semibold text-slate-700">
                    Término
                    <input
                      required
                      type="datetime-local"
                      value={talkDraft.end}
                      onChange={(event) =>
                        setTalkDraft({
                          ...talkDraft,
                          end: event.target.value,
                        })
                      }
                      className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3"
                    />
                  </label>
                </div>
                <label className="block text-sm font-semibold text-slate-700">
                  Lugar
                  <input
                    required
                    value={talkDraft.location}
                    onChange={(event) =>
                      setTalkDraft({
                        ...talkDraft,
                        location: event.target.value,
                      })
                    }
                    placeholder="Auditorio Principal"
                    className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3"
                  />
                </label>
                <div className="flex flex-wrap gap-3">
                  <button
                    disabled={saving || data.companies.length === 0}
                    className="rounded-xl bg-slate-950 px-5 py-3 font-semibold text-white disabled:opacity-50"
                  >
                    {saving
                      ? "Guardando..."
                      : editingTalk
                        ? "Guardar cambios"
                        : "Agregar actividad"}
                  </button>
                  {editingTalk && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTalk(null);
                        setTalkDraft(emptyTalk);
                      }}
                      className="rounded-xl bg-slate-100 px-5 py-3 font-semibold text-slate-700"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </form>
            </section>

            <section className="space-y-3">
              <h2 className="text-xl font-bold text-slate-900">
                Programa ({data.talks.length})
              </h2>
              {data.talks.length === 0 ? (
                <p className="rounded-2xl bg-white p-6 text-sm text-slate-500">
                  Todavía no hay actividades para esta feria.
                </p>
              ) : (
                data.talks.map((talk) => (
                  <article
                    key={talk.id}
                    className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
                  >
                    <div>
                      <h3 className="font-bold text-slate-900">{talk.title}</h3>
                      <p className="mt-1 text-sm text-slate-600">
                        {talk.speaker} · {companyName(talk.companyId)}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {formatDateTime(talk.start)} –{" "}
                        {formatDateTime(talk.end)} · {talk.location}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => editTalk(talk)}
                        className="rounded-lg bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-800"
                      >
                        Modificar
                      </button>
                      <button
                        onClick={() => void deleteTalk(talk)}
                        className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700"
                      >
                        Eliminar
                      </button>
                    </div>
                  </article>
                ))
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
