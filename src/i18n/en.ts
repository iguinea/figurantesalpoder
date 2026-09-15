import type { Dictionary } from "./types.js";

export const en: Dictionary = {
  appName: "Twister Spinner",
  spin: "Spin!",
  limbs: {
    leftHand: "left hand",
    rightHand: "right hand",
    leftFoot: "left foot",
    rightFoot: "right foot",
  },
  colors: {
    red: "red",
    yellow: "yellow",
    green: "green",
    blue: "blue",
  },
  phraseTemplate: "{limb}, {color}",
  autoSeconds: "Auto-spin (seconds)",
  voiceLabel: "Voice",
  tickLabel: "Wheel tick sound",
  autoLabel: "Auto-spin",
  autoOn: "Auto-spin on",
  autoOff: "Auto-spin off",
  voiceUnavailable: "No voice for this language on this device: text only.",
  colorFullHint:
    "If all six circles of that color are occupied, spin again (official rule).",
  settingsTitle: "Settings",
  settingsClose: "Close settings",
  voiceLang: "en-US",
};
