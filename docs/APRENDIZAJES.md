# Aprendizajes del proyecto — FigurantesAlPoder

> Registro vivo de lecciones aprendidas publicando la primera app en el App Store
> (sept. 2026). Cada entrada fue pagada con tiempo real. Si un día se repite el
> problema, la solución está aquí.

---

## 1. App Review — Guideline 5.6 (Developer Code of Conduct)

**Lo que pasó.** La versión 1.0 (build 5) fue rechazada por *"pattern of unusual
behavior… commonly associated with fraudulent activity… features that appear to have
been intentionally hidden during the review process"*.

**Causa probable.** En un solo día se hicieron **3 submissions con 2 retiradas**
(build 3 → retirada por el icono, build 4 → retirada para meter la 5). Aunque cada
retirada tenía una razón técnica legítima, ese patrón "enviar-retirar-reenviar en
ráfaga" dispara las heurísticas antifraude de Apple.

**Regla aprendida.** NUNCA retirar y re-enviar en ráfaga. Si una build es rechazada o
hay que mejorarla antes de la revisión, lo correcto es: responder en el Resolution
Center y/o esperar la revisión en curso. Una retirada rápida puede costar un rechazo
5.6 que bloquea toda la submission.

**Cómo se respondió.** Mensaje en el Resolution Center explicando (1) que el panel de
ajustes no es funcionalidad oculta (engranaje visible en la primera pantalla, captura
en la ficha), (2) el porqué técnico de las retiradas, (3) qué es la app (utilidad sin
datos ni servidor) y (4) ofreciendo screencast. Apple responde en 1-3 días.

**Nunca re-enviar a ciegas con un 5.6 activo**: puede derivar en investigación de
cuenta. Primero responder, luego re-enviar.

---

## 2. Build numbers: cada build subida consume su número

Aunque App Review **rechace** una build, su número queda consumido para siempre
("Redundant Binary Upload. You've already uploaded a build with build number 'N'").

- Incrementar `CURRENT_PROJECT_VERSION` en `ios/App/App.xcodeproj/project.pbxproj`
  (todas las configuraciones) antes de cada re-archivo.
- Cuidado con "Manage build number automatically" en el diálogo de Distribute: puede
  reutilizar un número ya quemado.

---

## 3. Icono de la app: sin canal alpha

El análisis de App Store Connect rechaza el icono 1024 si tiene transparencia
("Invalid large app icon… can't be transparent or contain an alpha channel").

- Fix: `magick icon.png -background white -flatten -alpha off icon.png`
- Verificar con `sips -g hasAlpha` → debe decir `no`.
- Si se cambia el icono, **re-archivar**: el archive copia el icono dentro del bundle.

---

## 4. Developer Mode (iOS): solo aparece tras un intento de deploy

La opción **Ajustes → Privacidad y seguridad → Modo desarrollador** no existe en el
iPhone hasta que un Mac con Xcode intenta instalar algo. Tras activarla el iPhone se
reinicia. Si no aparece: reiniciar el iPhone CON el cable puesto.

---

## 5. Personal Team vs Developer Program

Todo Apple ID tiene un **Personal Team** gratuito con su propio Team ID. Con él se
puede desarrollar e instalar en el propio iPhone, pero **no distribuir**
(TestFlight/App Store → "Team … is not enrolled").

- El Team ID correcto se ve SIN ambigüedad en developer.apple.com/account →
  **Membership details** (el Personal Team no aparece ahí).
- Por CLI no se puede leer de forma fiable: no perder el tiempo.

---

## 6. Xcode 26 se instala sin la plataforma iOS

Xcode moderno permite instalarse sin SDKs de plataforma. Síntoma: "Supported platforms
for the buildables in the current scheme is empty" y destinos solo como ineligible.

- Fix: `xcodebuild -downloadPlatform iOS` (~8,5 GB). Habilita dispositivos físicos Y
  simuladores.

---

## 7. El procesado de builds tarda: verificar en TestFlight antes de Add Build

Tras "Upload successful" la build está **procesando 10-60 min**. El modal Add Build NO
lista builds aún procesando (parece que no existe). Verificar el estado real en
ASC → TestFlight → Builds ("Version 1.0, Build (N) Complete").

---

## 8. Automatizar App Store Connect con navegador: por fases cortas

Los formularios de ASC son React con shadow DOM y componentes caprichosos:

- **Fases cortas**: snapshot → click por uid → verificar. Los mega-scripts con polling
  interno dan timeout del MCP y dejan la página a medio hacer.
- Los clicks sintéticos de `evaluate` a veces NO registran en radios/React: usar uids
  del snapshot.
- Botones con `aria-label` y sin texto visible (p. ej. "Delete" de la build): buscar
  por atributo, no por textContent.
- Diálogos `position:fixed` → `offsetParent` es null: filtrar visibilidad con
  `getClientRects().length`.
- Diálogos con shadow DOM: walk recursivo por `shadowRoot`.
- **Hay dos botones "Save"** (diálogo + página de fondo): siempre el del diálogo.
- Los cambios de texto **se pierden si se navega fuera sin Save** (beforeunload).
  "Save" disabled = autoguardado ya hecho.
- Pulsar "Done" en Add Build sin seleccionar re-asocia la build previa recordada.
- Si el navegador MCP se reinicia, la sesión de ASC muere → re-login del usuario.

---

## 9. Audio en iOS: el AudioContext zombi tras segundo plano

iOS suspende el AudioContext al ir la app a segundo plano y `resume()` falla fuera de
un gesto reciente → los sonidos dejan de sonar al volver (bug reportado y arreglado).

**Fix probado** (`src/sound.ts`): en cada uso, si `contexto.state !== "running"`,
cerrar el contexto y crear uno NUEVO dentro del gesto del botón (arranca siempre),
más `resume()` en `visibilitychange` a visible.

---

## 10. Web Speech API en WKWebView: no es fiable

`speechSynthesis` dentro de la app nativa es errático. Solución: plugin nativo
`@capacitor-community/text-to-speech` (AVSpeechSynthesizer) con `isNativePlatform()`
como interruptor. Interrumpir con `stop()` (no existe `cancel()`).

Voces: es/ca/en garantizadas; **euskera sin voz en Android** (y por confirmar en
iOS): la app avisa y degrada a solo texto.

---

## 11. Service Worker: solo en web

WKWebView no soporta service workers en esquemas `capacitor://` (WebKit bug 206741) y
el bundle ya va embebido: registrar el SW solo si `!Capacitor.isNativePlatform()`.

---

## 12. GitHub Pages: desplegar el BUILD, no el fuente

Pages sirviendo la rama con el fuente = página en blanco (el `index.html` carga
`/src/main.ts`, TypeScript que el navegador no ejecuta).

**Solución**: workflow de GitHub Actions (`npm ci` → `npm run build` → deploy de
`dist/`) con `base: "./"` en Vite (rutas relativas para el subpath). Ojo: un run
legacy en marcha puede pisar el primer deploy del workflow — re-ejecutarlo.

---

## 13. Localización y fichas

- App Store admite locales **ca y es, pero NO eu** (la app sí puede estar en euskera).
- La app universal (iPhone+iPad) **exige capturas de iPad 13"** (2048×2732).
- Tamaños de captura: iPhone 6.9" = 1320×2868; sin canal alpha.

---

## 14. Cuentas y costes

- Apple Developer: 99 USD/año. Play Store: 25 USD **alta única** (pero cuentas
  personales nuevas exigen 12 testers × 14 días en closed testing antes de producción).
- Gratis = sin Paid Apps Agreement ni comisiones.
