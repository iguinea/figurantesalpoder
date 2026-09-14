import type { Dictionary } from "./types.js";

export const es: Dictionary = {
  appName: "Ruleta Twister",
  spin: "¡Gira!",
  limbs: {
    leftHand: "mano izquierda",
    rightHand: "mano derecha",
    leftFoot: "pie izquierdo",
    rightFoot: "pie derecho",
  },
  colors: {
    red: "rojo",
    yellow: "amarillo",
    green: "verde",
    blue: "azul",
  },
  phraseTemplate: "{limb}, {color}",
  autoSeconds: "Auto-giro (segundos)",
  voiceLabel: "Voz",
  autoLabel: "Auto-giro",
  autoOn: "Auto-giro activado",
  autoOff: "Auto-giro desactivado",
  voiceUnavailable:
    "No hay voz de este idioma en este dispositivo: solo texto.",
  colorFullHint:
    "Si los seis círculos de ese color ya están ocupados, se vuelve a girar (regla oficial).",
  voiceLang: "es-ES",
};
