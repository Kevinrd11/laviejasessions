"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma";
import {
  loginWithCredentials,
  startSession,
  endSession,
  requireAdmin,
} from "@/lib/auth";
import { confirmPayment, cancelOrder, OrderError } from "@/lib/services/orders";

export type AdminActionState = { error?: string };

/** Inicia sesión de administrador. */
export async function loginAction(input: {
  email: string;
  password: string;
}): Promise<AdminActionState> {
  const email = (input.email ?? "").trim();
  const password = input.password ?? "";
  if (!email || !password) return { error: "Ingresa tu correo y contraseña." };

  const user = await loginWithCredentials(email, password);
  if (!user) return { error: "Credenciales inválidas." };

  await startSession(user.id);
  redirect("/admin/sessions");
}

export async function logoutAction() {
  await endSession();
  redirect("/admin/login");
}

async function audit(
  adminUserId: string,
  action: string,
  entityId: string,
  meta?: Prisma.InputJsonValue,
) {
  await db.adminAuditLog.create({
    data: { adminUserId, action, entity: "order", entityId, meta: meta ?? {} },
  });
}

/** Confirma el pago de una orden (descuenta inventario y emite entradas). */
export async function adminConfirmPayment(orderId: string): Promise<AdminActionState> {
  const admin = await requireAdmin();
  try {
    await confirmPayment(orderId, { paymentReference: `ADMIN-${admin.name}` });
    await audit(admin.id, "order.confirm_payment", orderId);
  } catch (e) {
    if (e instanceof OrderError) return { error: e.message };
    console.error("adminConfirmPayment", e);
    return { error: "No se pudo confirmar el pago." };
  }
  revalidatePath("/admin/sessions");
  return {};
}

/** Cancela una orden (libera inventario si estaba pagada). */
export async function adminCancelOrder(orderId: string): Promise<AdminActionState> {
  const admin = await requireAdmin();
  try {
    await cancelOrder(orderId);
    await audit(admin.id, "order.cancel", orderId);
  } catch (e) {
    if (e instanceof OrderError) return { error: e.message };
    console.error("adminCancelOrder", e);
    return { error: "No se pudo cancelar la orden." };
  }
  revalidatePath("/admin/sessions");
  return {};
}
