# Ficha del App Store — FigurantesAlPoder

> Datos listos para copiar/pegar en App Store Connect. La ficha principal es
> Spanish (Spain); se pueden añadir después Catalán e Inglés (el euskera NO existe
> como locale de ficha del App Store; la app sí está traducida).

## Datos del registro de la app (App Store Connect → Apps → +)

| Campo | Valor |
|---|---|
| Name | `FigurantesAlPoder` |
| Primary Language | `Spanish (Spain)` |
| Bundle ID | `eus.itzulbira.figurantesalpoder` |
| SKU | `figurantesalpoder-001` |

## Ficha (es-ES)

**Subtitle (30 car. — exacto):**
```
Ruleta de colores para fiestas
```

**Promotional Text (170 car.):**
```
Gira y coloca: mano derecha en rojo, pie izquierdo en azul… La ruleta que faltaba
en tus noches de juego. Sin registro, sin anuncios, con voz y en 4 idiomas.
```

**Keywords (100 car.):**
```
ruleta,colores,fiesta,familia,spinner,cuerpo,mano,pie,partido,azar,turnos,tela,juego
```

**Description:**
```
La ruleta que faltaba en tu caja: FigurantesAlPoder genera en cada turno una
combinación al azar — extremidad y color — para que todos los jugadores la coloquen
sobre la tela de círculos de colores. Sin papeles, sin discusiones y sin depender de
que nadie recuerde girar la ruleta de cartón.

CÓMO FUNCIONA
· Pulsa el botón gigante y la app anuncia el turno: «mano derecha, rojo».
· Activa el giro automático (10, 15, 20 o 30 segundos) y deja que la app dirija la
  partida: es tu árbitro digital.
· El resultado ocupa toda la pantalla con el color de fondo, para verlo desde el suelo.

CON VOZ
Anuncia cada turno en voz alta con la voz de tu dispositivo: perfecto para dejar el
móvil en el centro de la mesa y jugar sin mirar la pantalla.

EN TU IDIOMA
Español, català, euskara e inglés, tanto la interfaz como el anuncio de voz.

SIN RODEOS
· Sin registro, sin anuncios y sin conexión: funciona siempre, también sin internet.
· No recoge ningún dato personal. Nada.
· Las preferencias (idioma y temporizador) se guardan solo en tu dispositivo.

REGLAS INCLUIDAS
La app recuerda la regla clásica: si todos los círculos de un color están ocupados,
se vuelve a girar. Del resto se encargan los… figurantes al poder.

Ideal para fiestas, cumpleaños y tardes de familia. El último en pie gana.
```

## Screenshots (subir 5-6 de estas, orden sugerido)

`appstore/screenshots/` — todas 1320×2868 (iPhone 6.9"), PNG sin alpha, verificadas:
1. `02-rojo.png` — resultado rojo (primera impresión)
2. `04-azul.png` — resultado azul
3. `03-amarillo.png` — resultado amarillo
4. `05-verde.png` — resultado verde
5. `06-voz-autogiro.png` — voz + auto-giro activados
6. `01-inicio.png` — inicio limpio (opcional, máx 10)

## Resto de la ficha

| Campo | Valor |
|---|---|
| Primary Category | Entertainment (secondary: Games) |
| Age rating | 4+ (cuestionario: todo "None"; NO marcar "Made for Kids") |
| Price | Gratis (Nivel 0) |
| Availability | 175 storefronts (por defecto) |
| App Privacy | «No, we do not collect data from this app» |
| Privacy Policy URL | la URL pública donde alojes `appstore/privacy-policy.html` |
| Support URL | la misma web mínima (o la del privacy) |
| Copyright | `© 2026 [TU-NOMBRE]` |
| Export compliance | App que solo usa cifrado estándar → exenta (respuesta estándar al subir) |
| DSA trader status | Obligatorio declararlo; hobby individual sin ánimo de lucro → normalmente "no trader" (decisión tuya) |

## Pasos que SOLO puedes hacer tú (web, ~15 min)

1. **appstoreconnect.apple.com → Business/Agreements**: si hay un acuerdo pendiente, acéptalo.
2. **Apps → + → New App**: Name `FigurantesAlPoder`, Language `Spanish (Spain)`,
   Bundle ID `eus.itzulbira.figurantesalpoder`, SKU `figurantesalpoder-001`.
3. **App Information → DSA**: declara tu condición de trader.
4. **Aloja la política de privacidad** (GitHub Pages: repo público → `privacy-policy.html`
   → Settings → Pages → rama main → la URL queda `https://tuusuario.github.io/repo/privacy-policy.html`)
   y rellena **Privacy Policy URL** y **Support URL** en App Information.
5. Edita la versión 1.0 con los textos de arriba y sube las capturas.
6. Cuando yo suba la build de TestFlight, la añades a la versión y **Submit for Review**.
