/**
 * Configuración central de marca de La Vieja Adventures / La Vieja Sessions.
 * Un solo lugar para teléfono, WhatsApp, contacto y ubicación en Sucre.
 */

export const brand = {
  company: "La Vieja Adventures",
  product: "La Vieja Sessions",
  tagline:
    "Eventos especiales entre montaña, naturaleza y experiencias memorables.",
  website: "https://www.laviejaadventures.com",

  // Contacto
  whatsappNumber: "50684519537", // número oficial (formato internacional, sin +)
  // Número para SINPE Móvil (formato nacional CR, 8 dígitos)
  sinpeNumber: "84519537",
  sinpeDisplay: "8451 9537",
  email: "info@laviejaadventures.com",
  instagram: "https://www.instagram.com/laviejaadventures",

  // Ubicación
  location: {
    short: "Sucre, Ciudad Quesada",
    full: "Sucre, Ciudad Quesada, San Carlos, Alajuela, Costa Rica",
    googleMapsUrl: "https://maps.google.com/?q=La+Vieja+Adventures+Sucre+Ciudad+Quesada",
    wazeUrl: "https://waze.com/ul?q=La%20Vieja%20Adventures%20Sucre",
  },

  // Moneda
  currency: "CRC",
  currencySymbol: "₡",
} as const;

/** Construye un enlace de WhatsApp con mensaje prellenado. */
export function whatsappLink(message: string, phone: string = brand.whatsappNumber) {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

/** Mensaje sugerido de WhatsApp para un evento. */
export function whatsappEventMessage(eventName: string) {
  return `Hola, quiero información sobre La Vieja Sessions y el evento ${eventName}.`;
}

export const whatsappGeneralMessage =
  "Hola, quiero información sobre La Vieja Sessions.";
