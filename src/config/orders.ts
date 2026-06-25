/** Parámetros del flujo de órdenes. */

/** Minutos que se reservan los cupos mientras se completa el pago. */
export const RESERVATION_MINUTES = 10;

/**
 * Comisión de servicio (opcional). 0 = sin comisión.
 * Ej: 0.05 para un 5%. Se redondea a colones enteros.
 */
export const SERVICE_FEE_RATE = 0;

export function computeServiceFee(subtotal: number) {
  return Math.round(subtotal * SERVICE_FEE_RATE);
}
