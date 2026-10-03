const STORAGE_KEY =
  "feria_stands_visitados";

export function getVisitedStands(): string[] {
  if (typeof window === "undefined") {
    return [];
  }

  const stored =
    localStorage.getItem(STORAGE_KEY);

  if (!stored) {
    return [];
  }

  try {
    const visits = JSON.parse(stored);

    if (!Array.isArray(visits)) {
      return [];
    }

    return visits.filter(
      (visit): visit is string =>
        typeof visit === "string"
    );
  } catch {
    return [];
  }
}

export function hasVisitedStand(
  standSlug: string
): boolean {
  return getVisitedStands().includes(
    standSlug
  );
}

export function registerStandVisit(
  standSlug: string
): string[] {
  const visits = getVisitedStands();

  if (!visits.includes(standSlug)) {
    visits.push(standSlug);
  }

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(visits)
  );

  window.dispatchEvent(
    new Event("stand-visit-registered")
  );

  return visits;
}

export function getVisitCount(): number {
  return getVisitedStands().length;
}