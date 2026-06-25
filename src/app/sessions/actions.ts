"use server";

import { redirect } from "next/navigation";
import { createOrder, getOrderFull, OrderError } from "@/lib/services/orders";
import { processPayment } from "@/lib/payments";
import { createOrderSchema, checkoutSchema } from "@/lib/validations";

export type ActionState = { error?: string };

/** Crea la orden (reserva cupos) y lleva al checkout. */
export async function createOrderAction(input: unknown): Promise<ActionState> {
  const parsed = createOrderSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  let orderId: string;
  try {
    const result = await createOrder(parsed.data);
    orderId = result.orderId;
  } catch (e) {
    if (e instanceof OrderError) return { error: e.message };
    console.error("createOrder error", e);
    return { error: "No se pudo crear la orden. Intenta de nuevo." };
  }

  redirect(`/sessions/checkout?order=${orderId}`);
}

/** Guarda datos del comprador y procesa el pago. */
export async function confirmCheckoutAction(input: unknown): Promise<ActionState> {
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa los datos." };
  }
  const data = parsed.data;

  const order = await getOrderFull(data.orderId);
  if (!order) return { error: "Orden no encontrada." };
  if (order.status !== "pending") {
    return { error: "Esta orden ya fue procesada o expiró." };
  }

  // Guardar datos del comprador antes de procesar el pago.
  const { db } = await import("@/lib/db");
  await db.sessionOrder.update({
    where: { id: order.id },
    data: {
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      customerPhone: data.customerPhone,
      customerIdNumber: data.customerIdNumber || null,
      paymentMethod: data.paymentMethod,
    },
  });

  // Propagar el nombre del comprador a las entradas que se emitan.
  // (las entradas se crean dentro de processPayment usando customerName)
  try {
    await processPayment(order.id, data.paymentMethod);
  } catch (e) {
    if (e instanceof OrderError) return { error: e.message };
    console.error("processPayment error", e);
    return { error: "No se pudo procesar el pago. Intenta de nuevo." };
  }

  redirect(`/sessions/success?order=${order.id}`);
}
