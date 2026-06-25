import { db } from "@/lib/db";
import { markOrderPaidAndIssueTickets, OrderError } from "@/lib/services/orders";
import type { PaymentMethod } from "@/generated/prisma";

export type PaymentResult =
  | { outcome: "paid" }
  | { outcome: "pending_review" }
  | { outcome: "failed"; reason?: string };

/**
 * Procesa el pago de una orden según el método elegido.
 *
 * - `simulated`: aprueba al instante (MVP) y emite entradas.
 * - `sinpe`: queda en revisión manual (`pending_review`) hasta que el admin lo apruebe.
 * - `card` / `link`: registra el intento como pendiente; la confirmación real
 *   llegará por webhook de la pasarela (ver /api/webhooks/payment/[provider]).
 *
 * Esta función es el único punto de entrada; cambiar de pasarela real
 * implica reemplazar las ramas `card`/`link` sin tocar el resto del flujo.
 */
export async function processPayment(
  orderId: string,
  method: PaymentMethod,
  opts?: { proofImageUrl?: string; paymentReference?: string },
): Promise<PaymentResult> {
  const order = await db.sessionOrder.findUnique({ where: { id: orderId } });
  if (!order) throw new OrderError("Orden no encontrada.");
  if (order.status !== "pending") {
    throw new OrderError("Esta orden ya no se puede pagar.");
  }
  if (order.expiresAt && order.expiresAt.getTime() < Date.now()) {
    throw new OrderError("La reserva expiró. Vuelve a iniciar la compra.");
  }

  switch (method) {
    case "simulated": {
      await db.sessionPayment.create({
        data: {
          orderId,
          provider: "simulated",
          providerTransactionId: `sim_${Date.now()}`,
          status: "succeeded",
          amount: order.total,
          currency: "CRC",
          rawResponse: { simulated: true },
        },
      });
      await markOrderPaidAndIssueTickets(orderId, {
        paymentReference: `SIM-${orderId.slice(-6).toUpperCase()}`,
      });
      return { outcome: "paid" };
    }

    case "sinpe": {
      await db.sessionPayment.create({
        data: {
          orderId,
          provider: "sinpe",
          status: "pending",
          amount: order.total,
          currency: "CRC",
        },
      });
      await db.sessionOrder.update({
        where: { id: orderId },
        data: {
          status: "pending_review",
          paymentMethod: "sinpe",
          proofImageUrl: opts?.proofImageUrl,
          paymentReference: opts?.paymentReference,
          expiresAt: null, // ya no expira: queda esperando aprobación
        },
      });
      return { outcome: "pending_review" };
    }

    case "card":
    case "link": {
      // Stub: en producción aquí se crea la sesión de pago y se redirige a la
      // pasarela; la confirmación llega por webhook. Para el MVP lo dejamos
      // como pendiente de webhook.
      await db.sessionPayment.create({
        data: {
          orderId,
          provider: method,
          status: "pending",
          amount: order.total,
          currency: "CRC",
        },
      });
      await db.sessionOrder.update({
        where: { id: orderId },
        data: { paymentMethod: method },
      });
      return { outcome: "pending_review" };
    }
  }
}
