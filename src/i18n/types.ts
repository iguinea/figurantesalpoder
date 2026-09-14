import type { GameColor, Limb } from "../engine/spinner.js";

export type LangCode = "es" | "ca" | "eu" | "en";

export interface Dictionary {
  /** Nombre de la app. */
  readonly appName: string;
  /** Texto del botón de girar. */
  readonly spin: string;
  /** Etiqueta del selector del intervalo de auto-giro. */
  readonly autoSeconds: string;
  /** Etiqueta del interruptor de voz. */
  readonly voiceLabel: string;
  /** Etiqueta del interruptor de auto-giro. */
  readonly autoLabel: string;
  /** Aviso cuando el auto-giro se activa. */
  readonly autoOn: string;
  /** Aviso cuando el auto-giro se desactiva. */
  readonly autoOff: string;
  /** Aviso cuando el dispositivo no tiene voz para el idioma elegido. */
  readonly voiceUnavailable: string;
  /** Regla oficial mostrada junto al resultado. */
  readonly colorFullHint: string;
  /** Plantilla del anuncio del turno; debe contener "{limb}" y "{color}". */
  readonly phraseTemplate: string;
  readonly limbs: Readonly<Record<Limb, string>>;
  readonly colors: Readonly<Record<GameColor, string>>;
  /** Etiqueta BCP 47 para Web Speech API. */
  readonly voiceLang: string;
}

export interface LangEntry {
  readonly code: LangCode;
  readonly label: string;
}
