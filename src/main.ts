import "./style.css";
import { Capacitor } from "@capacitor/core";
import { initApp } from "./app.js";

const root = document.getElementById("app");
if (root) {
  initApp(root);
}

// El service worker solo tiene sentido en la web: dentro de la app nativa
// WKWebView no soporta SW en esquemas capacitor:// (WebKit bug 206741) y el
// bundle ya viaja embebido tras `cap sync`.
if (
  !Capacitor.isNativePlatform() &&
  import.meta.env.PROD &&
  "serviceWorker" in navigator
) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .catch(() => {
        // Sin service worker la app funciona igual; solo pierde el modo offline.
      });
  });
}
