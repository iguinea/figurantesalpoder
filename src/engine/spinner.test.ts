import { describe, expect, it } from "vitest";
import {
  COLORS,
  LIMBS,
  cryptoRandom,
  createSpinner,
  type GameColor,
  type Limb,
  type SpinResult,
} from "./spinner.js";

const EXPECTED_LIMBS: readonly Limb[] = [
  "leftHand",
  "rightHand",
  "leftFoot",
  "rightFoot",
];
const EXPECTED_COLORS: readonly GameColor[] = [
  "red",
  "yellow",
  "green",
  "blue",
];

describe("dominio del juego (ruleta europea clásica)", () => {
  it("expone exactamente las 4 extremidades del Twister", () => {
    expect([...LIMBS].sort()).toEqual([...EXPECTED_LIMBS].sort());
  });

  it("expone exactamente los 4 colores del tapete", () => {
    expect([...COLORS].sort()).toEqual([...EXPECTED_COLORS].sort());
  });
});

describe("createSpinner", () => {
  it("produce únicamente combinaciones del dominio (4×4 = 16)", () => {
    const spinner = createSpinner(cryptoRandom);
    for (let i = 0; i < 500; i++) {
      const r = spinner.spin();
      expect(EXPECTED_LIMBS).toContain(r.limb);
      expect(EXPECTED_COLORS).toContain(r.color);
    }
  });

  it("es determinista con un RandomFn inyectado (constante 0 → mano izquierda roja)", () => {
    const spinner = createSpinner(() => 0);
    expect(spinner.spin()).toEqual<SpinResult>({
      limb: "leftHand",
      color: "red",
    });
  });

  it("con random → 1-ε cae en la última casilla (pie derecho azul)", () => {
    const spinner = createSpinner(() => 1 - 1e-12);
    expect(spinner.spin()).toEqual<SpinResult>({
      limb: "rightFoot",
      color: "blue",
    });
  });

  it("16 tiradas con un barrido uniforme cubren las 16 combinaciones, una vez cada una", () => {
    let call = 0;
    const spinner = createSpinner(() => call++ / 16);
    const seen = new Map<string, number>();
    for (let i = 0; i < 16; i++) {
      const { limb, color } = spinner.spin();
      const key = `${limb}|${color}`;
      seen.set(key, (seen.get(key) ?? 0) + 1);
    }
    expect(seen.size).toBe(16);
    for (const count of seen.values()) expect(count).toBe(1);
  });

  it("distribución uniforme con patrón cíclico: 1600 tiradas → 100 por combinación", () => {
    let call = 0;
    const spinner = createSpinner(() => (call++ % 16) / 16);
    const counts = new Map<string, number>();
    for (let i = 0; i < 1600; i++) {
      const { limb, color } = spinner.spin();
      const key = `${limb}|${color}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    expect(counts.size).toBe(16);
    for (const count of counts.values()) expect(count).toBe(100);
  });
});

describe("cryptoRandom", () => {
  it("devuelve valores en [0, 1)", () => {
    for (let i = 0; i < 1000; i++) {
      const v = cryptoRandom();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("no es constante (10 llamadas producen más de un valor distinto)", () => {
    const values = new Set<number>();
    for (let i = 0; i < 10; i++) values.add(cryptoRandom());
    expect(values.size).toBeGreaterThan(1);
  });
});
