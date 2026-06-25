"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createOrder, getOrderFull, OrderError } from "@/lib/services/orders";
import { createOrderSchema, checkoutSchema } from "@/lib/validations";

export type ActionState = { error?: string };

/** Crea la orden (pending_payment, sin descontar inventario) y lleva al checkout. */
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

/**
 * Guarda los datos del comprador y registra la solicitud.
 * NO procesa pago ni descuenta inventario: la orden queda en `pending_payment`
 * hasta que el administrador confirme el pago por SINPE manualmente.
 */
export async function confirmCheckoutAction(input: unknown): Promise<ActionState> {
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Revisa los datos." };
  }
  const data = parsed.data;

  const order = await getOrderFull(data.orderId);
  if (!order) return { error: "Orden no encontrada." };
  if (order.status !== "pending_payment") {
    return { error: "Esta solicitud ya fue procesada." };
  }

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

  // Registrar el intento de pago por SINPE (queda pendiente de validación manual).
  await db.sessionPayment.create({
    data: {
      orderId: order.id,
      provider: "sinpe",
      status: "pending",
      amount: order.total,
      currency: "CRC",
    },
  });

  redirect(`/sessions/success?order=${order.id}`);
}
