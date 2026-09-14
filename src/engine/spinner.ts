/**
 * Motor de la ruleta del Twister (edición europea clásica).
 *
 * La ruleta original de Milton Bradley tiene 16 casillas iguales:
 * 4 extremidades × 4 colores, cada una con probabilidad 1/16.
 * Fuente: instrucciones oficiales de Hasbro (producto 98831) y reglas
 * clásicas de Milton Bradley.
 */

export type Limb = "leftHand" | "rightHand" | "leftFoot" | "rightFoot";
export type GameColor = "red" | "yellow" | "green" | "blue";

export interface SpinResult {
  readonly limb: Limb;
  readonly color: GameColor;
}

export const LIMBS: readonly Limb[] = [
  "leftHand",
  "rightHand",
  "leftFoot",
  "rightFoot",
];

export const COLORS: readonly GameColor[] = [
  "red",
  "yellow",
  "green",
  "blue",
];

/** Función de aleatoriedad inyectable: devuelve un número en [0, 1). */
export type RandomFn = () => number;

/**
 * Aleatoriedad criptográfica (uniforme en [0, 1)), para que ninguna
 * combinación tenga más probabilidad que otra de forma sesgada.
 */
export function cryptoRandom(): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] / 2 ** 32;
}

export interface Spinner {
  spin(): SpinResult;
}

/**
 * Crea la ruleta. 16 casillas equiprobables: el número aleatorio r ∈ [0, 1)
 * se mapea a floor(r * 16), y el índice se reparte como
 * extremidad = índice % 4, color = ⌊índice / 4⌋.
 *
 * `random` es inyectable para tests deterministas.
 */
export function createSpinner(random: RandomFn = cryptoRandom): Spinner {
  return {
    spin(): SpinResult {
      const index = Math.floor(random() * LIMBS.length * COLORS.length);
      const limb = LIMBS[index % LIMBS.length];
      const color = COLORS[Math.floor(index / LIMBS.length) % COLORS.length];
      return { limb, color };
    },
  };
}
