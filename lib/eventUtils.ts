import type { Talk } from "@/types/event";

export type EventStatus =
  | "live"
  | "upcoming"
  | "finished";

export function getEventStatus(
  event: Talk,
  now = new Date()
): EventStatus {
  const start = new Date(event.start);
  const end = new Date(event.end);

  if (now >= start && now < end) {
    return "live";
  }

  if (now < start) {
    return "upcoming";
  }

  return "finished";
}