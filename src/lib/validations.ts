import { z } from "zod";

export const cartItemSchema = z.object({
  ticketTypeId: z.string().min(1),
  quantity: z.number().int().min(1).max(20),
});

export const createOrderSchema = z.object({
  eventId: z.string().min(1),
  items: z.array(cartItemSchema).min(1, "Selecciona al menos una entrada"),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export const checkoutSchema = z.object({
  orderId: z.string().min(1),
  customerName: z.string().min(3, "Ingresa tu nombre completo").max(120),
  customerEmail: z.string().email("Correo inválido"),
  customerPhone: z
    .string()
    .min(8, "Número de WhatsApp inválido")
    .max(20)
    .regex(/^[0-9+\-\s()]+$/, "Número de WhatsApp inválido"),
  customerIdNumber: z.string().max(30).optional().or(z.literal("")),
  paymentMethod: z.enum(["simulated", "sinpe", "card", "link"]),
  courtesyCode: z.string().max(40).optional(),
  acceptTerms: z.literal(true, {
    message: "Debes aceptar los términos",
  }),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
