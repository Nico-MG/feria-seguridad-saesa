import type { LocalParticipant } from "@/types/event";

const PARTICIPANT_KEY =
  "feria_participante";

export function getParticipant():
  | LocalParticipant
  | null {
  if (typeof window === "undefined") {
    return null;
  }

  const stored =
    localStorage.getItem(PARTICIPANT_KEY);

  if (!stored) {
    return null;
  }

  try {
    const participant = JSON.parse(
      stored
    ) as LocalParticipant;

    if (
      !participant.id ||
      !participant.name
    ) {
      return null;
    }

    return participant;
  } catch {
    return null;
  }
}

export function saveParticipant(
  participant: LocalParticipant
) {
  localStorage.setItem(
    PARTICIPANT_KEY,
    JSON.stringify(participant)
  );
}