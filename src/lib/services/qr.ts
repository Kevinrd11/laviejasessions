import { customAlphabet } from "nanoid";
import QRCode from "qrcode";

// Token opaco e impredecible para cada entrada (no se puede adivinar).
const nano = customAlphabet(
  "ABCDEFGHJKLMNPQRSTUVWXYZ23456789",
  16,
);

/** Genera un código QR único para una entrada, ej. "LVS-XXXX...". */
export function generateTicketCode() {
  return `LVS-${nano()}`;
}

// Código de orden corto y legible para el comprobante/SINPE, ej. "LVS-7K2P-9QXM".
const orderNano = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 8);

export function generateOrderCode() {
  const raw = orderNano();
  return `LVS-${raw.slice(0, 4)}-${raw.slice(4)}`;
}

/** Devuelve una imagen del QR como data URL (PNG base64). */
export async function qrDataUrl(code: string) {
  return QRCode.toDataURL(code, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 480,
    color: { dark: "#070b09", light: "#ffffff" },
  });
}
