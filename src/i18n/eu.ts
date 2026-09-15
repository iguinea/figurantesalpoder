import type { Dictionary } from "./types.js";

export const eu: Dictionary = {
  appName: "Twister Ruleta",
  spin: "Biratu!",
  limbs: {
    leftHand: "ezkerreko eskua",
    rightHand: "eskuineko eskua",
    leftFoot: "ezkerreko oina",
    rightFoot: "eskuineko oina",
  },
  colors: {
    red: "gorria",
    yellow: "horia",
    green: "berdea",
    blue: "urdina",
  },
  phraseTemplate: "{limb}: {color}",
  autoSeconds: "Biraketa automatikoa (segundo)",
  voiceLabel: "Ahotsa",
  autoLabel: "Biraketa automatikoa",
  autoOn: "Biraketa automatikoa aktibatuta",
  autoOff: "Biraketa automatikoa desaktibatuta",
  voiceUnavailable:
    "Gailu honek ez du hizkuntza honetarako ahotsik: testua soilik.",
  colorFullHint:
    "Kolore horretako sei zirkuluak okupatuta badaude, berriro biratzen da (arau ofiziala).",
  settingsTitle: "Ezarpenak",
  settingsClose: "Itxi ezarpenak",
  voiceLang: "eu-ES",
};
