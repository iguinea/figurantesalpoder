/**
 * Tic de ruleta con Web Audio API: sin ficheros de audio (funciona offline,
 * en web y en WKWebView) y con tolerancia total a su ausencia — si no hay
 * AudioContext disponible la app simplemente gira en silencio.
 */

let contexto: AudioContext | null = null;

// Al volver de segundo plano iOS deja el contexto suspendido y el resume()
// puede fallar fuera de un gesto: recrearlo es lo fiable.
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState !== "visible" || !contexto) return;
  if (contexto.state !== "running") contexto.resume().catch(() => {});
});

function asegurarContexto(): AudioContext | null {
  const Ctor =
    window.AudioContext ??
    (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  // Contexto zombi (p. ej. tras volver de segundo plano en iOS): cerrarlo y
  // crear uno nuevo — el nuevo, creado dentro del gesto del botón, arranca.
  if (contexto && contexto.state !== "running") {
    try {
      contexto.close().catch(() => {});
    } catch {
      // nada que cerrar
    }
    contexto = null;
  }
  if (!contexto) contexto = new Ctor();
  // Políticas de autoplay (iOS/Chrome): el contexto se reanuda con el
  // gesto de usuario del botón GIRAR.
  if (contexto.state === "suspended") contexto.resume().catch(() => {});
  return contexto;
}

/** Tic corto de casilla, con ligera variación de tono para sonar mecánico. */
export function playTick(): void {
  try {
    const c = asegurarContexto();
    if (!c) return;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "triangle";
    osc.frequency.value = 1700 + Math.random() * 500;
    const t = c.currentTime;
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
    osc.connect(gain);
    gain.connect(c.destination);
    osc.start(t);
    osc.stop(t + 0.03);
  } catch {
    // sin audio disponible: silencio, la app sigue funcionando
  }
}
