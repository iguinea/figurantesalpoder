import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Bundle ID reversible SOLO hasta la primera subida a App Store Connect
 * (después ya no se puede cambiar). "eus.itzulbira" sigue el patrón
 * reverse-DNS del workspace; revisar antes de publicar.
 */
const config: CapacitorConfig = {
  appId: "eus.itzulbira.figurantesalpoder",
  appName: "FigurantesAlPoder",
  webDir: "dist",
};

export default config;
