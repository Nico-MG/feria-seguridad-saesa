
export type StandMapPosition = {
  x: number;
  y: number;
};

/**
 * Posiciones expresadas como porcentaje de la imagen.
 * La clave corresponde al campo `number` de la tabla stands.
 *
 * Ajusta estos valores cuando tengas abierta la fotografía real.
 */
export const standMapPositions: Record<
  string,
  StandMapPosition
> = {
  "1": { x: 30, y: 35 },
  "2": { x: 48, y: 35 },
  "3": { x: 66, y: 35 },
  "4": { x: 30, y: 58 },
  "5": { x: 48, y: 58 },
  "6": { x: 66, y: 58 },
};
