// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { initApp } from "./app.js";
import { createSpinner, type SpinResult, type Spinner } from "./engine/spinner.js";
import { DICTS, getDict } from "./i18n/index.js";

function makeRoot(): HTMLElement {
  const root = document.createElement("div");
  document.body.appendChild(root);
  return root;
}

function get(root: HTMLElement, testid: string): HTMLElement {
  const el = root.querySelector(`[data-testid="${testid}"]`);
  if (!(el instanceof HTMLElement)) {
    throw new Error(`no existe [data-testid="${testid}"]`);
  }
  return el;
}

function getButton(root: HTMLElement, testid: string): HTMLButtonElement {
  const el = get(root, testid);
  if (!(el instanceof HTMLButtonElement)) {
    throw new Error(`[data-testid="${testid}"] no es un botón`);
  }
  return el;
}

const MOCK_RESULT = { limb: "rightHand", color: "blue" } as const;

let storage: Map<string, string>;

/** jsdom+Node 26 no expone localStorage sin flags: instalamos uno simulado. */
function installStorage(): void {
  storage = new Map<string, string>();
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    get: () => ({
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, String(value));
      },
      clear: () => storage.clear(),
    }),
  });
}

/** matchMedia simulado para las pruebas de prefers-reduced-motion. */
function installMatchMedia(matches: boolean): void {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      matches,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  });
}

beforeEach(() => {
  installStorage();
  document.body.replaceChildren();
  vi.useRealTimers();
});

describe("initApp", () => {
  it("renderiza el botón de girar y el selector de idiomas", () => {
    const root = makeRoot();
    initApp(root);
    expect(get(root, "spin").textContent).toBe(DICTS.es.spin);
    for (const code of ["es", "ca", "eu", "en"]) {
      expect(root.querySelector(`[data-testid="lang-${code}"]`)).toBeTruthy();
    }
  });

  it("al girar: decide el resultado de una, anima y termina mostrándolo", () => {
    vi.useFakeTimers();
    const root = makeRoot();
    const mockSpinner: Spinner = {
      spin: vi.fn(() => MOCK_RESULT),
    };
    initApp(root, { spinner: mockSpinner });

    get(root, "spin").click();
    expect(mockSpinner.spin).toHaveBeenCalledTimes(1);
    expect(getButton(root, "spin").disabled).toBe(true);

    vi.advanceTimersByTime(6000);

    expect(mockSpinner.spin).toHaveBeenCalledTimes(1);
    expect(get(root, "result-limb").textContent).toBe("mano derecha");
    expect(get(root, "result-color").textContent).toBe("azul");
    // #0057b8 → rgb(0, 87, 184)
    expect(get(root, "result").style.backgroundColor).toBe("rgb(0, 87, 184)");
    expect(getButton(root, "spin").disabled).toBe(false);
  });

  it("durante la animación nunca se muestra el resultado final antes de tiempo", () => {
    vi.useFakeTimers();
    const root = makeRoot();
    initApp(root, { spinner: { spin: vi.fn(() => MOCK_RESULT) } });

    get(root, "spin").click();
    // la secuencia recorre las 16 casillas y solo la última es "azul"
    for (let i = 0; i < 3000; i += 100) {
      vi.advanceTimersByTime(100);
      if (i < 1900) {
        // todavía de sobra dentro de la animación: no puede ser el final
        expect(getButton(root, "spin").disabled).toBe(true);
      }
    }
    vi.advanceTimersByTime(3000);
    expect(get(root, "result-color").textContent).toBe("azul");
  });

  it("con prefers-reduced-motion no anima: resultado inmediato y botón activo", () => {
    installMatchMedia(true);
    const root = makeRoot();
    const mockSpinner: Spinner = { spin: vi.fn(() => MOCK_RESULT) };
    initApp(root, { spinner: mockSpinner });

    get(root, "spin").click();
    expect(mockSpinner.spin).toHaveBeenCalledTimes(1);
    expect(get(root, "result-limb").textContent).toBe("mano derecha");
    expect(get(root, "result-color").textContent).toBe("azul");
    expect(getButton(root, "spin").disabled).toBe(false);
  });

  it("cambiar el idioma a eu traduce botón y resultado", () => {
    vi.useFakeTimers();
    const root = makeRoot();
    const mockSpinner: Spinner = {
      spin: vi.fn((): SpinResult => ({ limb: "leftFoot", color: "green" })),
    };
    initApp(root, { spinner: mockSpinner });

    get(root, "lang-eu").click();
    expect(get(root, "spin").textContent).toBe(DICTS.eu.spin);
    get(root, "spin").click();
    vi.advanceTimersByTime(6000);
    expect(get(root, "result-limb").textContent).toBe("ezkerreko oina");
    expect(get(root, "result-color").textContent).toBe("berdea");
  });

  it("persiste el idioma elegido y arranca con él en el siguiente arranque", () => {
    const root = makeRoot();
    initApp(root);
    get(root, "lang-ca").click();
    expect(storage.get("twister.lang")).toBe("ca");

    const root2 = makeRoot();
    initApp(root2);
    expect(get(root2, "spin").textContent).toBe(DICTS.ca.spin);
  });

  it("auto-giro: lanza spins según el intervalo y se detiene al desactivarlo", () => {
    vi.useFakeTimers();
    const root = makeRoot();
    const mockSpinner: Spinner = {
      spin: vi.fn(() => MOCK_RESULT),
    };
    initApp(root, { spinner: mockSpinner });

    const toggle = get(root, "auto-toggle");
    expect(toggle).toBeInstanceOf(HTMLInputElement);
    (toggle as HTMLInputElement).checked = true;
    toggle.dispatchEvent(new Event("change"));

    vi.advanceTimersByTime(15000);
    expect(mockSpinner.spin).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(15000);
    expect(mockSpinner.spin).toHaveBeenCalledTimes(2);

    (toggle as HTMLInputElement).checked = false;
    toggle.dispatchEvent(new Event("change"));
    vi.advanceTimersByTime(60000);
    expect(mockSpinner.spin).toHaveBeenCalledTimes(2);
  });

  it("un giro manual con auto-giro activo reinicia el intervalo", () => {
    vi.useFakeTimers();
    const root = makeRoot();
    const mockSpinner: Spinner = {
      spin: vi.fn(() => MOCK_RESULT),
    };
    initApp(root, { spinner: mockSpinner });

    const toggle = get(root, "auto-toggle");
    (toggle as HTMLInputElement).checked = true;
    toggle.dispatchEvent(new Event("change"));

    vi.advanceTimersByTime(10000);
    get(root, "spin").click(); // manual a los 10 s
    vi.advanceTimersByTime(10000); // 10 s después del manual: aún no toca
    expect(mockSpinner.spin).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(5000); // 15 s desde el manual: toca
    expect(mockSpinner.spin).toHaveBeenCalledTimes(2);
  });

  it("activar la voz sin speechSynthesis muestra el aviso y no lanza", () => {
    const root = makeRoot();
    expect(() => initApp(root)).not.toThrow();

    const voiceToggle = get(root, "voice-toggle");
    (voiceToggle as HTMLInputElement).checked = true;
    voiceToggle.dispatchEvent(new Event("change"));

    expect(root.textContent).toContain(getDict("es").voiceUnavailable);
  });

  it("usa el spinner real por defecto (produce resultados del dominio)", () => {
    vi.useFakeTimers();
    const root = makeRoot();
    initApp(root, { spinner: createSpinner(() => 0) });
    get(root, "spin").click();
    vi.advanceTimersByTime(6000);
    expect(get(root, "result-limb").textContent).toBe(
      DICTS.es.limbs.leftHand,
    );
  });
});
