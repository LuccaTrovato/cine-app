/** Utilidades de layout de sala: 20 filas (A-T) x 14 butacas (2 + 10 + 2). */

export const FILAS = Array.from({ length: 20 }, (_, i) => String.fromCharCode(65 + i)); // A..T
export const BUTACAS_POR_FILA = 14;
export const BLOQUES = { izquierda: 2, centro: 10, derecha: 2 };
export const FILAS_VIP = ['R', 'S', 'T'];
export const FILAS_ACCESIBLES = ['J', 'K'];

export function esFilaVip(fila: string): boolean {
  return FILAS_VIP.includes(fila.toUpperCase());
}

export function esFilaAccesible(fila: string): boolean {
  return FILAS_ACCESIBLES.includes(fila.toUpperCase());
}

export interface ColumnaInfo {
  columna: number;
  bloque: 'izquierda' | 'centro' | 'derecha';
}

/** Devuelve las 28 columnas de una fila con su bloque asociado, en orden de izquierda a derecha. */
export function columnasDeFila(): ColumnaInfo[] {
  const columnas: ColumnaInfo[] = [];
  let n = 1;
  for (let i = 0; i < BLOQUES.izquierda; i++) columnas.push({ columna: n++, bloque: 'izquierda' });
  for (let i = 0; i < BLOQUES.centro; i++) columnas.push({ columna: n++, bloque: 'centro' });
  for (let i = 0; i < BLOQUES.derecha; i++) columnas.push({ columna: n++, bloque: 'derecha' });
  return columnas;
}
