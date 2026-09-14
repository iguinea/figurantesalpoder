import { Capacitor } from "@capacitor/core";
import { TextToSpeech } from "@capacitor-community/text-to-speech";
import {
  createSpinner,
  type RandomFn,
  type SpinResult,
  type Spinner,
} from "./engine/spinner.js";
import { getDict, LANGS, type LangCode } from "./i18n/index.js";

/** Colores del tapete (los mismos del icono/manifest). */
const COLOR_HEX: Readonly<Record<SpinResult["color"], string>> = {
  red: "#c8102e",
  yellow: "#f6be00",
  green: "#009a44",
  blue: "#0057b8",
};

/**
 * Colores con texto oscuro por contraste: el amarillo (10.2:1 con #1a1a1a
 * frente a 1.6:1 con blanco) y el verde (4.7:1 con oscuro frente a 3.7:1 con
 * blanco). Rojo y azul mantienen texto blanco (5.9 y 6.9:1).
 */
const DARK_TEXT: ReadonlySet<SpinResult["color"]> = new Set(["yellow", "green"]);

const LANG_STORAGE_KEY = "twister.lang";
const SECONDS_STORAGE_KEY = "twister.autoSeconds";
const AUTO_INTERVALS = [10, 15, 20, 30] as const;
const DEFAULT_SECONDS = 15;

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/**
 * localStorage tolerante: en navegadores con almacenamiento bloqueado
 * (p. ej. modo privado estricto) y en el entorno de tests puede no estar
 * disponible; la app degrada a sin persistencia en lugar de fallar.
 */
function getStorage(): StorageLike | null {
  try {
    return window.localStorage ?? null;
  } catch {
    return null;
  }
}

/** Escritura que no revienta ni con el storage lleno o bloqueado. */
function safeSet(storage: StorageLike | null, key: string, value: string): void {
  try {
    storage?.setItem(key, value);
  } catch {
    // sin persistencia: la app funciona igual en esta sesión
  }
}

export interface AppOptions {
  /** Ruleta inyectable (tests). Por defecto, la real con cryptoRandom. */
  readonly spinner?: Spinner;
  /** Aleatoriedad inyectable alternativa a `spinner`. */
  readonly random?: RandomFn;
}

interface AppElements {
  result: HTMLElement;
  resultLimb: HTMLElement;
  resultColor: HTMLElement;
  resultHint: HTMLElement;
  spinButton: HTMLButtonElement;
  voiceToggle: HTMLInputElement;
  voiceToggleLabel: HTMLElement;
  voiceWarning: HTMLElement;
  autoToggle: HTMLInputElement;
  autoToggleLabel: HTMLElement;
  autoState: HTMLElement;
  autoSeconds: HTMLSelectElement;
  langButtons: ReadonlyMap<LangCode, HTMLButtonElement>;
}

/**
 * Monta la app dentro de `root`. El resultado se anuncia visualmente
 * (fondo del color, texto enorme) y opcionalmente por voz (Web Speech API),
 * con detección en runtime: si no hay voz para el idioma, se avisa y queda
 * el modo solo texto.
 */
export function initApp(root: HTMLElement, options: AppOptions = {}): void {
  const spinner = options.spinner ?? createSpinner(options.random);

  const initialLang = loadLang();
  let dict = getDict(initialLang);
  let lang: LangCode = initialLang;
  let lastResult: SpinResult | null = null;
  let timer: ReturnType<typeof setInterval> | null = null;

  root.replaceChildren();
  const els = buildDom(root);
  restoreSavedSeconds(els.autoSeconds);

  function loadLang(): LangCode {
    const stored = getStorage()?.getItem(LANG_STORAGE_KEY) ?? null;
    return isLangCode(stored) ? stored : "es";
  }

  function isLangCode(value: unknown): value is LangCode {
    return value === "es" || value === "ca" || value === "eu" || value === "en";
  }

  function applyDict(): void {
    safeSet(getStorage(), LANG_STORAGE_KEY, lang);
    document.documentElement.lang = lang;
    document.title = dict.appName;
    setText(els.spinButton, dict.spin);
    setText(els.voiceToggleLabel, dict.voiceLabel);
    setText(els.autoToggleLabel, dict.autoLabel);
    els.autoSeconds.setAttribute("aria-label", dict.autoSeconds);
    setText(els.resultHint, dict.colorFullHint);
    for (const [code, button] of els.langButtons) {
      button.setAttribute("aria-pressed", String(code === lang));
      setText(button, LANGS.find((l) => l.code === code)?.label ?? code);
    }
    els.voiceWarning.textContent = dict.voiceUnavailable;
    renderResult();
    updateVoiceWarningVisibility();
  }

  function renderResult(): void {
    if (!lastResult) {
      els.resultLimb.textContent = "";
      els.resultColor.textContent = "";
      els.result.style.removeProperty("background-color");
      return;
    }
    setText(els.resultLimb, dict.limbs[lastResult.limb]);
    setText(els.resultColor, dict.colors[lastResult.color]);
    els.result.style.backgroundColor = COLOR_HEX[lastResult.color];
    els.result.classList.toggle("dark-text", DARK_TEXT.has(lastResult.color));
  }

  function doSpin(): void {
    lastResult = spinner.spin();
    renderResult();
    if (els.voiceToggle.checked) speak();
  }

  function speak(): void {
    if (!lastResult) return;
    const limb = dict.limbs[lastResult.limb];
    const color = dict.colors[lastResult.color];
    const phrase = dict.phraseTemplate
      .replace("{limb}", limb)
      .replace("{color}", color);

    // En la app nativa el motor de voz es el plugin (AVSpeechSynthesizer):
    // speechSynthesis no es fiable en WKWebView. En la web, Web Speech API.
    if (Capacitor.isNativePlatform()) {
      TextToSpeech.stop()
        .catch(() => {})
        .then(() =>
          TextToSpeech.speak({
            text: phrase,
            lang: dict.voiceLang,
            rate: 1,
            pitch: 1,
            volume: 1,
            category: "ambient",
          }),
        )
        .catch(() => {});
      return;
    }

    if (!("speechSynthesis" in window)) return;
    const utterance = new SpeechSynthesisUtterance(phrase);
    utterance.lang = dict.voiceLang;
    const voices = window.speechSynthesis.getVoices();
    const voice =
      voices.find((v) => v.lang === dict.voiceLang) ??
      voices.find((v) => v.lang.startsWith(lang));
    if (voice) {
      utterance.voice = voice;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    }
    updateVoiceWarningVisibility();
  }

  function voiceAvailable(): boolean {
    if (!("speechSynthesis" in window)) return false;
    return window.speechSynthesis
      .getVoices()
      .some((v) => v.lang === dict.voiceLang || v.lang.startsWith(lang));
  }

  function updateVoiceWarningVisibility(): void {
    if (!els.voiceToggle.checked) {
      els.voiceWarning.hidden = true;
      return;
    }
    // En nativo la disponibilidad se pregunta al motor del sistema (async).
    if (Capacitor.isNativePlatform()) {
      TextToSpeech.isLanguageSupported({ lang: dict.voiceLang })
        .then((result) => {
          els.voiceWarning.hidden = Boolean(result.supported);
        })
        .catch(() => {
          els.voiceWarning.hidden = false;
        });
      return;
    }
    els.voiceWarning.hidden = !voiceAvailable();
  }

  function startTimer(): void {
    stopTimer();
    timer = setInterval(doSpin, Number(els.autoSeconds.value) * 1000);
  }

  function stopTimer(): void {
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  }

  // --- eventos ---
  els.spinButton.addEventListener("click", () => {
    doSpin();
    if (els.autoToggle.checked) startTimer();
  });

  for (const [code, button] of els.langButtons) {
    button.addEventListener("click", () => {
      if (code === lang) return;
      window.speechSynthesis?.cancel();
      dict = getDict(code);
      lang = code;
      applyDict();
    });
  }

  els.voiceToggle.addEventListener("change", updateVoiceWarningVisibility);

  els.autoToggle.addEventListener("change", () => {
    els.autoState.textContent = els.autoToggle.checked ? dict.autoOn : dict.autoOff;
    if (els.autoToggle.checked) startTimer();
    else stopTimer();
  });

  els.autoSeconds.addEventListener("change", () => {
    safeSet(getStorage(), SECONDS_STORAGE_KEY, els.autoSeconds.value);
    if (els.autoToggle.checked) startTimer();
  });

  // En Chrome getVoices() llega vacío hasta que el sistema carga las voces
  // (solo web; el plugin nativo consulta su estado en cada uso).
  if (!Capacitor.isNativePlatform()) {
    window.speechSynthesis?.addEventListener?.("voiceschanged", () => {
      if (els.voiceToggle.checked && lastResult) speak();
      updateVoiceWarningVisibility();
    });
  }

  window.addEventListener("pagehide", stopTimer);

  applyDict();
}

function restoreSavedSeconds(select: HTMLSelectElement): void {
  const saved = getStorage()?.getItem(SECONDS_STORAGE_KEY) ?? null;
  if (saved && AUTO_INTERVALS.some((s) => String(s) === saved)) {
    select.value = saved;
  }
}

function setText(el: HTMLElement, text: string): void {
  el.textContent = text;
}

function buildDom(root: HTMLElement): AppElements {
  const langBar = document.createElement("nav");
  langBar.className = "lang-bar";
  const langButtons = new Map<LangCode, HTMLButtonElement>();
  for (const { code, label } of LANGS) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.testid = `lang-${code}`;
    button.classList.add("lang-button");
    button.setAttribute("aria-label", label);
    langButtons.set(code, button);
    langBar.appendChild(button);
  }

  const result = document.createElement("section");
  result.dataset.testid = "result";
  result.className = "result";
  result.setAttribute("aria-live", "assertive");
  result.setAttribute("aria-atomic", "true");
  const resultLimb = document.createElement("p");
  resultLimb.dataset.testid = "result-limb";
  resultLimb.className = "result-limb";
  const resultColor = document.createElement("p");
  resultColor.dataset.testid = "result-color";
  resultColor.className = "result-color";
  result.append(resultLimb, resultColor);

  const resultHint = document.createElement("p");
  resultHint.dataset.testid = "result-hint";
  resultHint.className = "result-hint";

  const spinButton = document.createElement("button");
  spinButton.type = "button";
  spinButton.dataset.testid = "spin";
  spinButton.className = "spin-button";

  const voiceRow = document.createElement("div");
  voiceRow.className = "option-row";
  const voiceToggle = document.createElement("input");
  voiceToggle.type = "checkbox";
  voiceToggle.role = "switch";
  voiceToggle.dataset.testid = "voice-toggle";
  voiceToggle.id = "voice-toggle";
  const voiceToggleLabel = document.createElement("label");
  voiceToggleLabel.htmlFor = "voice-toggle";
  voiceToggleLabel.dataset.testid = "voice-toggle-label";
  const voiceWarning = document.createElement("p");
  voiceWarning.dataset.testid = "voice-warning";
  voiceWarning.className = "voice-warning";
  voiceWarning.hidden = true;
  voiceRow.append(voiceToggle, voiceToggleLabel);

  const autoRow = document.createElement("div");
  autoRow.className = "option-row";
  const autoToggle = document.createElement("input");
  autoToggle.type = "checkbox";
  autoToggle.role = "switch";
  autoToggle.dataset.testid = "auto-toggle";
  autoToggle.id = "auto-toggle";
  const autoToggleLabel = document.createElement("label");
  autoToggleLabel.htmlFor = "auto-toggle";
  autoToggleLabel.dataset.testid = "auto-toggle-label";
  const autoState = document.createElement("span");
  autoState.className = "sr-only";
  autoState.setAttribute("aria-live", "polite");
  const autoSeconds = document.createElement("select");
  autoSeconds.dataset.testid = "auto-seconds";
  for (const seconds of AUTO_INTERVALS) {
    const option = document.createElement("option");
    option.value = String(seconds);
    option.textContent = `${seconds}`;
    if (seconds === DEFAULT_SECONDS) option.selected = true;
    autoSeconds.appendChild(option);
  }
  autoRow.append(autoToggle, autoToggleLabel, autoState, autoSeconds);

  const controls = document.createElement("div");
  controls.className = "controls";
  controls.append(spinButton, voiceRow, voiceWarning, autoRow);

  root.append(langBar, result, resultHint, controls);
  return {
    result,
    resultLimb,
    resultColor,
    resultHint,
    spinButton,
    voiceToggle,
    voiceToggleLabel,
    voiceWarning,
    autoToggle,
    autoToggleLabel,
    autoState,
    autoSeconds,
    langButtons,
  };
}
