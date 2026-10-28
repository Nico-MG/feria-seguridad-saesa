"use client";

import { useEffect, useState } from "react";

type ContestParticipant = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  contactSharingConsent: boolean;
  opportunities: number;
};

type RankingEntry = {
  position: number;
  name: string;
  session: string;
  score: number;
  elapsedMs: number;
};

type ScanSummary = {
  totalStands: number;
  participants: ContestParticipant[];
};

type CompanyOption = {
  id: number;
  name: string;
};

type ContactLead = {
  name: string;
  email: string | null;
  phone: string | null;
  standNumbers: string[];
  lastVisitedAt: string | null;
};

function csvCell(value: string) {
  const safeValue = /^[\s]*[=+\-@\t\r]/.test(value)
    ? `'${value}`
    : value;
  return `"${safeValue.replaceAll('"', '""')}"`;
}

function downloadContactCsv(companyName: string, leads: ContactLead[]) {
  const rows = [
    ["Nombre", "Correo electrónico", "Teléfono", "Stands visitados", "Última visita"],
    ...leads.map((lead) => [
      lead.name,
      lead.email ?? "",
      lead.phone ?? "",
      lead.standNumbers.join(", "),
      lead.lastVisitedAt
        ? new Date(lead.lastVisitedAt).toLocaleString("es-CL")
        : "",
    ]),
  ];
  const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const safeName = companyName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

  link.href = url;
  link.download = `contactos-autorizados-${safeName || "empresa"}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function AdminInsights() {
  const [scans, setScans] = useState<ScanSummary | null>(null);
  const [ranking, setRanking] = useState<RankingEntry[] | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [rankingError, setRankingError] = useState<string | null>(null);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [companiesError, setCompaniesError] = useState<string | null>(null);
  const [contactData, setContactData] = useState<{
    companyId: string;
    leads?: ContactLead[];
    error?: string;
  } | null>(null);

  useEffect(() => {
    let active = true;

    async function loadResults() {
      const [scansResult, rankingResult] = await Promise.allSettled([
        fetch("/api/admin/insights", { cache: "no-store" }).then(
          async (response) => {
            const result = (await response.json()) as ScanSummary & {
              error?: string;
            };
            if (!response.ok) {
              throw new Error(
                result.error ?? "No fue posible cargar los participantes del sorteo.",
              );
            }
            return result;
          },
        ),
        fetch("/api/game/ranking", { cache: "no-store" }).then(
          async (response) => {
            const result = (await response.json()) as {
              entries?: RankingEntry[];
              error?: string;
            };
            if (!response.ok) {
              throw new Error(
                result.error ?? "No fue posible cargar el ranking.",
              );
            }
            return result.entries ?? [];
          },
        ),
      ]);

      if (!active) return;

      if (scansResult.status === "fulfilled") {
        setScans(scansResult.value);
      } else {
        setScanError(
          scansResult.reason instanceof Error
            ? scansResult.reason.message
            : "No fue posible cargar los participantes del sorteo.",
        );
      }

      if (rankingResult.status === "fulfilled") {
        setRanking(rankingResult.value);
      } else {
        setRankingError(
          rankingResult.reason instanceof Error
            ? rankingResult.reason.message
            : "No fue posible cargar el ranking.",
        );
      }
    }

    void loadResults();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadCompanies() {
      try {
        const response = await fetch("/api/admin/contact-leads", {
          cache: "no-store",
        });
        const result = (await response.json()) as {
          companies?: CompanyOption[];
          error?: string;
        };
        if (!response.ok) {
          throw new Error(
            result.error ?? "No fue posible cargar las empresas.",
          );
        }

        if (active) {
          setCompanies(result.companies ?? []);
        }
      } catch (loadError) {
        if (active) {
          setCompaniesError(
            loadError instanceof Error
              ? loadError.message
              : "No fue posible cargar las empresas.",
          );
        }
      }
    }

    void loadCompanies();
    return () => {
      active = false;
    };
  }, []);

  const activeCompanyId =
    selectedCompanyId || (companies[0] ? String(companies[0].id) : "");

  useEffect(() => {
    if (!activeCompanyId) return;

    let active = true;

    async function loadContacts() {
      try {
        const response = await fetch(
          `/api/admin/contact-leads?companyId=${encodeURIComponent(activeCompanyId)}`,
          { cache: "no-store" },
        );
        const result = (await response.json()) as {
          leads?: ContactLead[];
          error?: string;
        };
        if (!response.ok) {
          throw new Error(
            result.error ?? "No fue posible cargar los contactos.",
          );
        }
        if (active) {
          setContactData({
            companyId: activeCompanyId,
            leads: result.leads ?? [],
          });
        }
      } catch (loadError) {
        if (active) {
          setContactData({
            companyId: activeCompanyId,
            error:
              loadError instanceof Error
                ? loadError.message
                : "No fue posible cargar los contactos.",
          });
        }
      }
    }

    void loadContacts();
    return () => {
      active = false;
    };
  }, [activeCompanyId]);

  const contacts =
    contactData?.companyId === activeCompanyId
      ? contactData.leads ?? null
      : null;
  const contactsError =
    contactData?.companyId === activeCompanyId
      ? contactData.error ?? null
      : null;
  const contactsLoading =
    Boolean(activeCompanyId) && contacts === null && contactsError === null;
  const selectedCompany = companies.find(
    (company) => String(company.id) === activeCompanyId,
  );

  return (
    <div className="grid items-start gap-6 xl:grid-cols-2">
      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-sky-700">CONCURSO</p>
            <h2 className="mt-1 text-xl font-bold text-slate-900">
              Participantes del sorteo
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Cada stand registrado equivale a una oportunidad
            </p>
          </div>
          {scans && (
            <p className="text-sm text-slate-600">
              {scans.totalStands} stands participantes
            </p>
          )}
        </div>

        {scanError ? (
          <p role="alert" className="mt-5 text-sm text-red-700">
            {scanError}
          </p>
        ) : !scans ? (
          <p className="mt-5 text-sm text-slate-500">
            Cargando participantes...
          </p>
        ) : scans.totalStands === 0 ? (
          <p className="mt-5 text-sm text-slate-500">
            No hay stands habilitados para el concurso.
          </p>
        ) : scans.participants.length === 0 ? (
          <p className="mt-5 text-sm text-slate-500">
            Aún no hay participantes registrados con visitas para el sorteo.
          </p>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th scope="col" className="px-3 py-3">
                    Participante
                  </th>
                  <th scope="col" className="px-3 py-3">
                    Correo
                  </th>
                  <th scope="col" className="px-3 py-3">
                    Teléfono
                  </th>
                  <th scope="col" className="px-3 py-3">
                    Permiso de contacto
                  </th>
                  <th scope="col" className="px-3 py-3 text-right">
                    Oportunidades
                  </th>
                </tr>
              </thead>
              <tbody>
                {scans.participants.map((participant) => (
                  <tr
                    key={participant.id}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="px-3 py-3 font-medium text-slate-900">
                      {participant.name}
                    </td>
                    <td className="px-3 py-3 text-slate-600">
                      {participant.email || "—"}
                    </td>
                    <td className="px-3 py-3 text-slate-600">
                      {participant.phone || "—"}
                    </td>
                    <td className="px-3 py-3 text-slate-600">
                      {participant.contactSharingConsent
                        ? "Autorizado"
                        : "No autorizado"}
                    </td>
                    <td className="px-3 py-3 text-right text-slate-600">
                      {participant.opportunities}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 xl:col-span-2">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold text-sky-700">CONTACTOS</p>
            <h2 className="mt-1 text-xl font-bold text-slate-900">
              Contactos autorizados por empresa
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
              Solo aparecen personas que proporcionaron datos de contacto,
              autorizaron compartirlos y escanearon un QR de esta empresa.
            </p>
          </div>
          <button
            type="button"
            disabled={!contacts?.length || contactsLoading || !selectedCompany}
            onClick={() =>
              selectedCompany &&
              contacts &&
              downloadContactCsv(selectedCompany.name, contacts)
            }
            className="shrink-0 rounded-xl bg-sky-800 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Descargar CSV
          </button>
        </div>

        <div className="mt-5 max-w-xl">
          <label
            htmlFor="contact-company"
            className="text-sm font-semibold text-slate-700"
          >
            Empresa
          </label>
          <select
            id="contact-company"
            value={activeCompanyId}
            onChange={(event) => setSelectedCompanyId(event.target.value)}
            disabled={companies.length === 0}
            className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 focus:border-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-700/20 disabled:bg-slate-100"
          >
            {companies.length === 0 ? (
              <option value="">No hay empresas con stands</option>
            ) : (
              companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))
            )}
          </select>
        </div>

        {companiesError ? (
          <p role="alert" className="mt-5 text-sm text-red-700">
            {companiesError}
          </p>
        ) : contactsError ? (
          <p role="alert" className="mt-5 text-sm text-red-700">
            {contactsError}
          </p>
        ) : contactsLoading ? (
          <p className="mt-5 text-sm text-slate-500">
            Cargando contactos autorizados...
          </p>
        ) : !activeCompanyId ? (
          <p className="mt-5 text-sm text-slate-500">
            No hay empresas asociadas a stands de la feria activa.
          </p>
        ) : contacts === null ? (
          <p className="mt-5 text-sm text-slate-500">
            Selecciona una empresa para consultar sus contactos autorizados.
          </p>
        ) : contacts.length === 0 ? (
          <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
            No hay contactos con autorización para esta empresa todavía.
          </p>
        ) : (
          <>
            <p className="mt-5 text-sm text-slate-600">
              {contacts.length}{" "}
              {contacts.length === 1
                ? "contacto autorizado"
                : "contactos autorizados"}
            </p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                    <th scope="col" className="px-3 py-3">Participante</th>
                    <th scope="col" className="px-3 py-3">Correo</th>
                    <th scope="col" className="px-3 py-3">Teléfono</th>
                    <th scope="col" className="px-3 py-3">Stand(s) visitado(s)</th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.map((contact) => (
                    <tr
                      key={`${contact.name}-${contact.email}-${contact.phone}`}
                      className="border-b border-slate-100 last:border-0"
                    >
                      <td className="px-3 py-3 font-medium text-slate-900">
                        {contact.name}
                      </td>
                      <td className="px-3 py-3 text-slate-600">
                        {contact.email || "—"}
                      </td>
                      <td className="px-3 py-3 text-slate-600">
                        {contact.phone || "—"}
                      </td>
                      <td className="px-3 py-3 text-slate-600">
                        {contact.standNumbers.join(", ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div>
          <p className="text-sm font-semibold text-sky-700">JUEGO DE IMÁGENES</p>
          <h2 className="mt-1 text-xl font-bold text-slate-900">
            Ranking de detectives
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Ordenado por puntaje y luego por menor tiempo
          </p>
        </div>

        {rankingError ? (
          <p role="alert" className="mt-5 text-sm text-red-700">
            {rankingError}
          </p>
        ) : ranking === null ? (
          <p className="mt-5 text-sm text-slate-500">Cargando ranking...</p>
        ) : ranking.length === 0 ? (
          <p className="mt-5 text-sm text-slate-500">
            Todavía no hay partidas completadas.
          </p>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[440px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th scope="col" className="px-3 py-3">
                    Puesto
                  </th>
                  <th scope="col" className="px-3 py-3">
                    Participante
                  </th>
                  <th scope="col" className="px-3 py-3">
                    Sesión
                  </th>
                  <th scope="col" className="px-3 py-3 text-right">
                    Puntaje
                  </th>
                  <th scope="col" className="px-3 py-3 text-right">
                    Tiempo
                  </th>
                </tr>
              </thead>
              <tbody>
                {ranking.map((entry) => (
                  <tr
                    key={`${entry.position}-${entry.name}`}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="px-3 py-3 font-bold text-slate-700">
                      {entry.position}
                    </td>
                    <td className="px-3 py-3 font-medium text-slate-900">
                      {entry.name}
                    </td>
                    <td className="px-3 py-3 text-slate-600">
                      {entry.session}
                    </td>
                    <td className="px-3 py-3 text-right font-semibold text-slate-900">
                      {entry.score}
                    </td>
                    <td className="px-3 py-3 text-right text-slate-600">
                      {(entry.elapsedMs / 1000).toFixed(1)} s
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
