import { describe, expect, it } from "vitest";
import { COLORS, LIMBS } from "../engine/spinner.js";
import { DICTS, LANGS, getDict } from "./index.js";
import type { Dictionary, LangCode } from "./types.js";

const EXPECTED_CODES: readonly LangCode[] = ["es", "ca", "eu", "en"];

function collectStrings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (value !== null && typeof value === "object") {
    return Object.values(value).flatMap(collectStrings);
  }
  return [];
}

describe("DICTS", () => {
  it('tiene exactamente las claves "es"|"ca"|"eu"|"en"', () => {
    expect(Object.keys(DICTS).sort()).toEqual([...EXPECTED_CODES].sort());
  });

  for (const code of EXPECTED_CODES) {
    describe(`diccionario ${code}`, () => {
      const dict: Dictionary = DICTS[code];

      it('phraseTemplate contiene "{limb}" y "{color}"', () => {
        expect(dict.phraseTemplate).toContain("{limb}");
        expect(dict.phraseTemplate).toContain("{color}");
      });

      it("limbs cubre exactamente las 4 extremidades del motor", () => {
        expect(Object.keys(dict.limbs).sort()).toEqual([...LIMBS].sort());
      });

      it("colors cubre exactamente los 4 colores del tapete", () => {
        expect(Object.keys(dict.colors).sort()).toEqual([...COLORS].sort());
      });

      it("todos los textos del diccionario son cadenas no vacías", () => {
        const strings = collectStrings(dict);
        expect(strings.length).toBeGreaterThan(0);
        for (const s of strings) expect(s.length).toBeGreaterThan(0);
      });

      it("voiceLang empieza por el código de idioma", () => {
        expect(dict.voiceLang.startsWith(code)).toBe(true);
      });
    });
  }
});

describe("LANGS", () => {
  it("tiene 4 entradas", () => {
    expect(LANGS).toHaveLength(4);
  });

  it("los códigos coinciden con las claves de DICTS", () => {
    expect(LANGS.map((entry) => entry.code).sort()).toEqual(
      [...EXPECTED_CODES].sort(),
    );
  });

  it("las etiquetas son distintas entre sí", () => {
    const labels = LANGS.map((entry) => entry.label);
    expect(new Set(labels).size).toBe(4);
  });
});

describe("getDict", () => {
  it('getDict("eu") devuelve appName "Twister Ruleta"', () => {
    expect(getDict("eu").appName).toBe("Twister Ruleta");
  });
});
