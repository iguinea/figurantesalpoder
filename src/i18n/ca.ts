import type { Dictionary } from "./types.js";

export const ca: Dictionary = {
  appName: "Ruleta Twister",
  spin: "Gira!",
  limbs: {
    leftHand: "mà esquerra",
    rightHand: "mà dreta",
    leftFoot: "peu esquerre",
    rightFoot: "peu dret",
  },
  colors: {
    red: "vermell",
    yellow: "groc",
    green: "verd",
    blue: "blau",
  },
  phraseTemplate: "{limb}, {color}",
  autoSeconds: "Gir automàtic (segons)",
  voiceLabel: "Veu",
  tickLabel: "So de la ruleta",
  autoLabel: "Gir automàtic",
  autoOn: "Gir automàtic activat",
  autoOff: "Gir automàtic desactivat",
  voiceUnavailable:
    "Aquest dispositiu no té veu per a aquest idioma: només text.",
  colorFullHint:
    "Si els sis cercles d'aquest color ja estan ocupats, es torna a girar (regla oficial).",
  settingsTitle: "Ajustos",
  settingsClose: "Tanca els ajustos",
  voiceLang: "ca-ES",
};
