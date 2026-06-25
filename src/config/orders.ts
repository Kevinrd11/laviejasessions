/** Parámetros del flujo de órdenes. */

/**
 * Horas tras las cuales una orden `pending_payment` sin confirmar se marca
 * como `expired` (limpieza). No afecta el inventario: las pendientes nunca
 * descuentan entradas; el inventario solo baja al confirmar el pago.
 */
export const ORDER_EXPIRY_HOURS = 48;

/**
 * Comisión de servicio (opcional). 0 = sin comisión.
 * Ej: 0.05 para un 5%. Se redondea a colones enteros.
 */
export const SERVICE_FEE_RATE = 0;

export function computeServiceFee(subtotal: number) {
  return Math.round(subtotal * SERVICE_FEE_RATE);
}
