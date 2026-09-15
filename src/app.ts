import { Capacitor } from "@capacitor/core";
import { TextToSpeech } from "@capacitor-community/text-to-speech";
import {
  COLORS,
  createSpinner,
  LIMBS,
  type RandomFn,
  type SpinResult,
  type Spinner,
} from "./engine/spinner.js";
import { getDict, LANGS, type LangCode } from "./i18n/index.js";
import { playTick } from "./sound.js";

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
const TICK_STORAGE_KEY = "twister.tick";
const AUTO_INTERVALS = [10, 15, 20, 30] as const;
const DEFAULT_SECONDS = 15;

/**
 * Animación de la ruleta: la secuencia recorre las casillas del tapete
 * (16 = 4 extremidades × 4 colores) y frena con easing cúbico sobre la
 * real. La DURACIÓN crece con el número de pasos pero se acota (~2,7 s):
 * delay(60 ms) → delay(375 ms) por paso.
 */
const SPIN_STEPS_EXTRA_MAX = 5;
const SPIN_MIN_DELAY_MS = 55;
const SPIN_MAX_DELAY_MS = 320;

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
  settingsButton: HTMLButtonElement;
  settingsPanel: HTMLElement;
  settingsTitle: HTMLElement;
  settingsClose: HTMLButtonElement;
  tickToggle: HTMLInputElement;
  tickToggleLabel: HTMLElement;
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
  let spinTimer: ReturnType<typeof setTimeout> | null = null;
  let animando = false;
  let tickEnabled = loadTickEnabled();

  root.replaceChildren();
  const els = buildDom(root);
  els.tickToggle.checked = tickEnabled;
  restoreSavedSeconds(els.autoSeconds);

  function loadLang(): LangCode {
    const stored = getStorage()?.getItem(LANG_STORAGE_KEY) ?? null;
    return isLangCode(stored) ? stored : "es";
  }

  function isLangCode(value: unknown): value is LangCode {
    return value === "es" || value === "ca" || value === "eu" || value === "en";
  }

  /** El tic está activado salvo que el usuario lo apagase explícitamente. */
  function loadTickEnabled(): boolean {
    return getStorage()?.getItem(TICK_STORAGE_KEY) !== "off";
  }

  function applyDict(): void {
    safeSet(getStorage(), LANG_STORAGE_KEY, lang);
    document.documentElement.lang = lang;
    document.title = dict.appName;
    setText(els.spinButton, dict.spin);
    setText(els.voiceToggleLabel, dict.voiceLabel);
    setText(els.tickToggleLabel, dict.tickLabel);
    setText(els.autoToggleLabel, dict.autoLabel);
    els.settingsButton.setAttribute("aria-label", dict.settingsTitle);
    els.settingsClose.setAttribute("aria-label", dict.settingsClose);
    setText(els.settingsTitle, dict.settingsTitle);
    els.autoSeconds.setAttribute("aria-label", dict.autoSeconds);
    els.resultHint.textContent = dict.colorFullHint;
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
    if (animando) return; // un giro mientras la ruleta corre: ignorado
    lastResult = spinner.spin();
    if (prefersReducedMotion()) {
      renderResult();
      if (els.voiceToggle.checked) speak();
      return;
    }
    animateSpin(lastResult);
  }

  /** El usuario pide menos movimiento: resultado directo, sin animación. */
  function prefersReducedMotion(): boolean {
    return (
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  /**
   * Efecto "ruleta que se frena": recorre las casillas del tapete en orden
   * (rápido al principio, cada vez más lento con easing cúbico) y clava la
   * última en el resultado REAL, que ya se decidió en doSpin(). La voz y el
   * resultado final solo al terminar: la secuencia intermedia es cosmética.
   */
  function animateSpin(final: SpinResult): void {
    const limbCount = LIMBS.length;
    const colorCount = COLORS.length;
    const total = limbCount * colorCount;
    const finalIndex =
      LIMBS.indexOf(final.limb) * colorCount + COLORS.indexOf(final.color);
    const steps = total + Math.floor(Math.random() * SPIN_STEPS_EXTRA_MAX);

    animando = true;
    els.spinButton.disabled = true;

    let paso = 0;
    const tick = (): void => {
      if (paso >= steps) {
        spinTimer = null;
        animando = false;
        els.spinButton.disabled = false;
        renderResult();
        if (els.voiceToggle.checked) speak();
        return;
      }
      const idx = (((finalIndex - steps + paso) % total) + total) % total;
      const limb = LIMBS[idx % limbCount];
      const color = COLORS[Math.floor(idx / limbCount) % colorCount];
      setText(els.resultLimb, dict.limbs[limb]);
      setText(els.resultColor, dict.colors[color]);
      els.result.style.backgroundColor = COLOR_HEX[color];
      els.result.classList.toggle("dark-text", DARK_TEXT.has(color));
      if (tickEnabled) playTick(); // un tic por casilla: la cadencia la marca el easing
      paso++;
      const progreso = paso / steps;
      spinTimer = setTimeout(
        tick,
        SPIN_MIN_DELAY_MS +
          SPIN_MAX_DELAY_MS * progreso * progreso * progreso,
      );
    };
    tick();
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

  function toggleSettings(abrir?: boolean): void {
    const abrirAhora = abrir ?? els.settingsPanel.hidden;
    els.settingsPanel.hidden = !abrirAhora;
    els.settingsButton.setAttribute("aria-expanded", String(abrirAhora));
  }

  // --- eventos ---
  els.spinButton.addEventListener("click", () => {
    doSpin();
    if (els.autoToggle.checked) startTimer();
  });

  els.settingsButton.addEventListener("click", () => toggleSettings());
  els.settingsClose.addEventListener("click", () => toggleSettings(false));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !els.settingsPanel.hidden) {
      toggleSettings(false);
    }
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

  els.tickToggle.addEventListener("change", () => {
    tickEnabled = els.tickToggle.checked;
    safeSet(getStorage(), TICK_STORAGE_KEY, tickEnabled ? "on" : "off");
  });

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

  window.addEventListener("pagehide", () => {
    stopTimer();
    if (spinTimer !== null) {
      clearTimeout(spinTimer);
      spinTimer = null;
      animando = false;
      els.spinButton.disabled = false;
    }
  });

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

const GEAR_SVG =
  '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2z"/></svg>';

const GEAR_CLOSE_SVG =
  '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>';

function createSettingsButton(): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.testid = "settings-button";
  button.className = "gear-button";
  button.setAttribute("aria-expanded", "false");
  button.innerHTML = GEAR_SVG;
  return button;
}

/** Mini logo de la app: la rueda con los cuatro colores del tapete. */
function createLogo(): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 64 64");
  svg.setAttribute("width", "30");
  svg.setAttribute("height", "30");
  svg.setAttribute("aria-hidden", "true");
  svg.classList.add("app-logo");
  const cuadrantes: ReadonlyArray<readonly [string, string]> = [
    ["M32 32V4a28 28 0 0 1 28 28Z", "#c8102e"],
    ["M32 32h28a28 28 0 0 1-28 28Z", "#f6be00"],
    ["M32 32v28A28 28 0 0 1 4 32Z", "#009a44"],
    ["M32 32H4A28 28 0 0 1 32 4Z", "#0057b8"],
  ];
  for (const [d, fill] of cuadrantes) {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", d);
    path.setAttribute("fill", fill);
    svg.appendChild(path);
  }
  const centro = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  centro.setAttribute("cx", "32");
  centro.setAttribute("cy", "32");
  centro.setAttribute("r", "11");
  centro.setAttribute("fill", "#ffffff");
  const flecha = document.createElementNS("http://www.w3.org/2000/svg", "path");
  flecha.setAttribute("d", "M32 32L42 20 27 24Z");
  flecha.setAttribute("fill", "#1a1a1a");
  svg.append(centro, flecha);
  return svg;
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

  // --- cabecera: logo de colores y engranaje de ajustes ---
  const header = document.createElement("header");
  header.className = "app-header";
  const settingsButton = createSettingsButton();
  header.append(createLogo(), settingsButton);

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

  const spinButton = document.createElement("button");
  spinButton.type = "button";
  spinButton.dataset.testid = "spin";
  spinButton.className = "spin-button";

  // --- panel de ajustes ---
  const settingsPanel = document.createElement("section");
  settingsPanel.dataset.testid = "settings-panel";
  settingsPanel.className = "settings-panel";
  settingsPanel.hidden = true;
  const settingsCard = document.createElement("div");
  settingsCard.className = "settings-card";
  const settingsTitle = document.createElement("h2");
  settingsTitle.dataset.testid = "settings-title";
  settingsTitle.className = "settings-title";
  const settingsClose = document.createElement("button");
  settingsClose.type = "button";
  settingsClose.dataset.testid = "settings-close";
  settingsClose.className = "settings-close";
  settingsClose.innerHTML = GEAR_CLOSE_SVG;
  const resultHint = document.createElement("p");
  resultHint.dataset.testid = "result-hint";
  resultHint.className = "result-hint";

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

  const tickRow = document.createElement("div");
  tickRow.className = "option-row";
  const tickToggle = document.createElement("input");
  tickToggle.type = "checkbox";
  tickToggle.role = "switch";
  tickToggle.dataset.testid = "tick-toggle";
  tickToggle.id = "tick-toggle";
  const tickToggleLabel = document.createElement("label");
  tickToggleLabel.htmlFor = "tick-toggle";
  tickToggleLabel.dataset.testid = "tick-toggle-label";
  tickRow.append(tickToggle, tickToggleLabel);

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

  settingsCard.append(
    settingsClose,
    settingsTitle,
    langBar,
    voiceRow,
    voiceWarning,
    tickRow,
    autoRow,
    resultHint,
  );
  settingsPanel.append(settingsCard);

  root.append(header, result, spinButton, settingsPanel);
  return {
    result,
    resultLimb,
    resultColor,
    resultHint,
    spinButton,
    settingsButton,
    settingsPanel,
    settingsTitle,
    settingsClose,
    tickToggle,
    tickToggleLabel,
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
