import type {
  Announcement,
  Company,
  Event,
  Product,
  Stand,
  Talk,
} from "@/types/event";

export const event: Event = {
  id: 1,
  name: "Feria de Seguridad SAESA",
  date: "2026-10-25",
  location: "Centro de Eventos SAESA",
};

export const companies: Company[] = [
  {
    id: 1,
    name: "Empresa ABC",
    description:
      "Soluciones de seguridad industrial y tecnologías para prevención de accidentes.",
    category: "Seguridad industrial",
    logo: "🏢",
  },
  {
    id: 2,
    name: "Empresa XYZ",
    description:
      "Equipos de protección personal y soluciones para trabajo seguro.",
    category: "Protección personal",
    logo: "🦺",
  },
];

export const stands: Stand[] = [
  {
    id: 1,
    eventId: 1,
    companyId: 1,
    number: "A01",
    location: "Sector A · Stand 01",
    slug: "empresa-abc",
    contestRequired: true,
  },
  {
    id: 2,
    eventId: 1,
    companyId: 2,
    number: "A02",
    location: "Sector A · Stand 02",
    slug: "empresa-xyz",
    contestRequired: true,
  },
];

export const products: Product[] = [
  {
    id: 1,
    companyId: 1,
    name: "Sistema de detección",
    description:
      "Sistema inteligente para detección temprana de riesgos.",
  },
  {
    id: 2,
    companyId: 1,
    name: "Kit de seguridad",
    description:
      "Equipamiento para trabajos seguros en terreno.",
  },
  {
    id: 3,
    companyId: 2,
    name: "Casco de seguridad",
    description:
      "Protección para trabajos en ambientes industriales.",
  },
  {
    id: 4,
    companyId: 2,
    name: "Arnés de seguridad",
    description:
      "Sistema de protección para trabajos en altura.",
  },
];

export const talks: Talk[] = [
  {
    id: 1,
    eventId: 1,
    title: "Seguridad eléctrica en terreno",
    speaker: "Juan Pérez",
    companyId: 1,
    start: "2026-10-25T10:00:00",
    end: "2026-10-25T10:45:00",
    location: "Auditorio Principal",
  },
  {
    id: 2,
    eventId: 1,
    title: "Prevención de accidentes",
    speaker: "María González",
    companyId: 2,
    start: "2026-10-25T11:00:00",
    end: "2026-10-25T11:45:00",
    location: "Auditorio Principal",
  },
  {
    id: 3,
    eventId: 1,
    title: "Innovación y seguridad",
    speaker: "Pedro Soto",
    companyId: 1,
    start: "2026-10-25T12:00:00",
    end: "2026-10-25T12:45:00",
    location: "Auditorio Principal",
  },
];

export const announcements: Announcement[] = [
  {
    id: 1,
    eventId: 1,
    title: "Bienvenidos a la Feria de Seguridad",
    message:
      "Recuerda visitar los stands y participar en las actividades.",
    createdAt: "2026-10-25T09:00:00",
    active: true,
  },
];