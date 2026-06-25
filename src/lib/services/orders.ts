import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma";
import { generateTicketCode, generateOrderCode } from "@/lib/services/qr";
import { RESERVATION_MINUTES, computeServiceFee } from "@/config/orders";
import type { CreateOrderInput } from "@/lib/validations";

export class OrderError extends Error {}

/**
 * Libera reservas vencidas de un evento (órdenes `pending` expiradas).
 * Se ejecuta dentro de la transacción de compra para que la disponibilidad
 * sea exacta en tiempo real, sin depender de un cron frecuente.
 */
async function releaseExpiredForEvent(
  tx: Prisma.TransactionClient,
  eventId: string,
) {
  const stale = await tx.sessionOrder.findMany({
    where: { eventId, status: "pending", expiresAt: { lt: new Date() } },
    include: { items: true },
  });
  for (const order of stale) {
    for (const item of order.items) {
      await tx.sessionTicketType.update({
        where: { id: item.ticketTypeId },
        data: { quantitySold: { decrement: item.quantity } },
      });
    }
    await tx.sessionOrder.update({
      where: { id: order.id },
      data: { status: "expired" },
    });
  }
}

/** Genera un código de orden único, reintentando si hay colisión. */
async function uniqueOrderCode(tx: Prisma.TransactionClient) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateOrderCode();
    const existing = await tx.sessionOrder.findUnique({ where: { code } });
    if (!existing) return code;
  }
  throw new OrderError("No se pudo generar el código de la orden. Intenta de nuevo.");
}

/**
 * Crea una orden `pending` reservando los cupos de forma atómica.
 * Usa una transacción + actualización condicional de `quantitySold`
 * para evitar sobreventa ante compras simultáneas.
 */
export async function createOrder(input: CreateOrderInput) {
  return db.$transaction(async (tx) => {
    // Libera primero los cupos de reservas vencidas de este evento.
    await releaseExpiredForEvent(tx, input.eventId);

    const event = await tx.sessionEvent.findUnique({
      where: { id: input.eventId },
      include: { ticketTypes: true },
    });

    if (!event) throw new OrderError("El evento no existe.");
    if (event.status !== "published") {
      throw new OrderError("Este evento no está disponible para la venta.");
    }

    let subtotal = 0;
    const itemsData: {
      ticketTypeId: string;
      quantity: number;
      unitPrice: number;
      total: number;
    }[] = [];

    for (const item of input.items) {
      const tt = event.ticketTypes.find((t) => t.id === item.ticketTypeId);
      if (!tt) throw new OrderError("Tipo de entrada inválido.");
      if (tt.status !== "active") {
        throw new OrderError(`"${tt.name}" no está disponible.`);
      }
      if (item.quantity > tt.maxPerOrder) {
        throw new OrderError(
          `Máximo ${tt.maxPerOrder} por orden para "${tt.name}".`,
        );
      }

      // Reserva atómica: solo incrementa si aún hay cupo suficiente.
      const reserved = await tx.sessionTicketType.updateMany({
        where: {
          id: tt.id,
          quantitySold: { lte: tt.quantityTotal - item.quantity },
        },
        data: { quantitySold: { increment: item.quantity } },
      });

      if (reserved.count === 0) {
        throw new OrderError(
          `No hay suficientes cupos para "${tt.name}". Intenta con menos entradas.`,
        );
      }

      const lineTotal = tt.price * item.quantity;
      subtotal += lineTotal;
      itemsData.push({
        ticketTypeId: tt.id,
        quantity: item.quantity,
        unitPrice: tt.price,
        total: lineTotal,
      });
    }

    const serviceFee = computeServiceFee(subtotal);
    const total = subtotal + serviceFee;
    const expiresAt = new Date(Date.now() + RESERVATION_MINUTES * 60 * 1000);
    const code = await uniqueOrderCode(tx);

    const order = await tx.sessionOrder.create({
      data: {
        code,
        eventId: event.id,
        customerName: "",
        customerEmail: "",
        customerPhone: "",
        status: "pending",
        subtotal,
        serviceFee,
        total,
        expiresAt,
        items: { create: itemsData },
      },
    });

    return { orderId: order.id, code: order.code, total, expiresAt };
  });
}

/** Libera los cupos reservados de una orden (al expirar, fallar o cancelar). */
async function releaseSeats(
  tx: Prisma.TransactionClient,
  orderId: string,
) {
  const items = await tx.sessionOrderItem.findMany({ where: { orderId } });
  for (const item of items) {
    await tx.sessionTicketType.update({
      where: { id: item.ticketTypeId },
      data: { quantitySold: { decrement: item.quantity } },
    });
  }
}

/**
 * Expira las órdenes `pending` vencidas y libera sus cupos.
 * Lo invoca el cron. Devuelve cuántas órdenes se expiraron.
 */
export async function expirePendingOrders() {
  const expired = await db.sessionOrder.findMany({
    where: { status: "pending", expiresAt: { lt: new Date() } },
    select: { id: true },
  });

  for (const { id } of expired) {
    await db.$transaction(async (tx) => {
      const fresh = await tx.sessionOrder.findUnique({ where: { id } });
      if (!fresh || fresh.status !== "pending") return;
      await releaseSeats(tx, id);
      await tx.sessionOrder.update({
        where: { id },
        data: { status: "expired" },
      });
    });
  }

  return expired.length;
}

/** Cancela una orden y libera cupos (uso admin o usuario que abandona). */
export async function cancelOrder(orderId: string) {
  return db.$transaction(async (tx) => {
    const order = await tx.sessionOrder.findUnique({ where: { id: orderId } });
    if (!order) throw new OrderError("Orden no encontrada.");
    if (order.status === "paid") {
      throw new OrderError("No se puede cancelar una orden ya pagada.");
    }
    if (["pending", "pending_review"].includes(order.status)) {
      await releaseSeats(tx, orderId);
    }
    await tx.sessionOrder.update({
      where: { id: orderId },
      data: { status: "cancelled" },
    });
  });
}

/**
 * Marca una orden como pagada y genera las entradas (una por ticket).
 * Idempotente: si ya está pagada, no duplica entradas.
 */
export async function markOrderPaidAndIssueTickets(
  orderId: string,
  opts?: { paymentReference?: string },
) {
  return db.$transaction(async (tx) => {
    const order = await tx.sessionOrder.findUnique({
      where: { id: orderId },
      include: { items: true, tickets: true },
    });
    if (!order) throw new OrderError("Orden no encontrada.");
    if (order.status === "paid" && order.tickets.length > 0) {
      return order; // ya emitida
    }
    if (!["pending", "pending_review"].includes(order.status)) {
      throw new OrderError("La orden no está en un estado pagable.");
    }

    // Generar una entrada por cada unidad comprada.
    for (const item of order.items) {
      for (let i = 0; i < item.quantity; i++) {
        await tx.sessionTicket.create({
          data: {
            orderId: order.id,
            eventId: order.eventId,
            ticketTypeId: item.ticketTypeId,
            qrCode: generateTicketCode(),
            attendeeName: order.customerName,
            status: "valid",
          },
        });
      }
    }

    return tx.sessionOrder.update({
      where: { id: order.id },
      data: {
        status: "paid",
        paymentReference: opts?.paymentReference ?? order.paymentReference,
        expiresAt: null,
      },
    });
  });
}

/** Carga una orden con todo lo necesario para checkout/success. */
export async function getOrderFull(orderId: string) {
  return db.sessionOrder.findUnique({
    where: { id: orderId },
    include: {
      event: true,
      items: { include: { ticketType: true } },
      tickets: { include: { ticketType: true }, orderBy: { createdAt: "asc" } },
    },
  });
}
