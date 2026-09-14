import { ca } from "./ca.js";
import { en } from "./en.js";
import { es } from "./es.js";
import { eu } from "./eu.js";
import type { Dictionary, LangCode, LangEntry } from "./types.js";

export type { Dictionary, LangCode, LangEntry } from "./types.js";

export const DICTS: Readonly<Record<LangCode, Dictionary>> = {
  es,
  ca,
  eu,
  en,
};

export const LANGS: readonly LangEntry[] = [
  { code: "es", label: "Español" },
  { code: "ca", label: "Català" },
  { code: "eu", label: "Euskara" },
  { code: "en", label: "English" },
];

export function getDict(lang: LangCode): Dictionary {
  return DICTS[lang];
}
