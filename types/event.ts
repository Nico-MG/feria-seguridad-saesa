export type Event = {
  id: number;
  name: string;
  date: string;
  location: string;
};

export type Talk = {
  id: number;
  eventId: number;
  title: string;
  speaker: string;
  companyId: number;
  company?: Company | null;
  start: string;
  end: string;
  location: string;
};

export type Company = {
  id: number;
  name: string;
  description: string;
  category: string;
  logo: string;
};

export type Stand = {
  id: number;
  eventId: number;
  companyId: number;
  number: string;
  location: string;
  slug: string;
  contestRequired: boolean;
  mapArea?: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
};

export type Product = {
  id: number;
  companyId: number;
  name: string;
  description: string;
};

export type Participant = {
  id: string;
  name: string;
  email: string;
  phone: string;
  registeredAt: string;
};

export type StandVisit = {
  id: string;
  participantId: string;
  standId: number;
  visitedAt: string;
};

export type ContestEntry = {
  id: string;
  participantId: string;
  createdAt: string;
};

export type Announcement = {
  id: number;
  eventId: number;
  title: string;
  message: string;
  createdAt: string;
  active: boolean;
};

export type LocalParticipant = {
  id: string;
  name: string;
  email: string;
  phone: string;
  registeredAt: string;
};
