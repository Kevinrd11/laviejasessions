import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, Clock3, Mail, ArrowLeft } from "lucide-react";
import { Container } from "@/components/ui/container";
import {
  SessionSuccessTicket,
  type SuccessTicketData,
} from "@/components/sessions/success-ticket";
import { TicketActions } from "@/components/sessions/ticket-actions";
import { WhatsAppButton } from "@/components/brand/whatsapp-button";
import { getOrderFull } from "@/lib/services/orders";
import { qrDataUrl } from "@/lib/services/qr";
import { whatsappEventMessage } from "@/config/brand";

export const dynamic = "force-dynamic";
export const metadata = { title: "¡Listo!" };

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order: orderId } = await searchParams;
  if (!orderId) redirect("/sessions");

  const order = await getOrderFull(orderId);
  if (!order) redirect("/sessions");

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const shareUrl = `${siteUrl}/sessions/${order.event.slug}`;

  // --- Pago en revisión (SINPE manual / pasarela pendiente) ---
  if (order.status === "pending_review") {
    return (
      <Container className="flex min-h-[70vh] flex-col items-center justify-center py-16 text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-warning/15 text-warning">
          <Clock3 className="size-8" />
        </span>
        <h1 className="mt-6 font-display text-3xl font-bold sm:text-4xl">
          Pago en revisión
        </h1>
        <p className="mt-3 max-w-lg text-muted">
          Recibimos tu orden para{" "}
          <strong className="text-foreground">{order.event.title}</strong>.
          Estamos verificando tu pago por SINPE. Apenas lo confirmemos, te
          enviaremos tus entradas con código QR.
        </p>

        <div className="mt-6 rounded-2xl border border-emerald/30 bg-emerald/10 px-6 py-4">
          <p className="text-xs uppercase tracking-wide text-muted">
            Código de tu orden
          </p>
          <p className="font-mono text-2xl font-bold tracking-widest text-emerald-soft">
            {order.code}
          </p>
          <p className="mt-1 text-xs text-muted">
            Debe aparecer en la descripción de tu comprobante SINPE.
          </p>
        </div>

        <div className="mt-8">
          <WhatsAppButton
            message={`${whatsappEventMessage(order.event.title)} Ya hice el pago por SINPE. Código de orden: ${order.code}.`}
            label="Enviar comprobante por WhatsApp"
            variant="premium"
            size="lg"
          />
        </div>
        <Link
          href="/sessions"
          className="mt-6 inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Volver a Sessions
        </Link>
      </Container>
    );
  }

  // --- Pendiente / expirada: volver al checkout ---
  if (order.status !== "paid") {
    redirect(`/sessions/checkout?order=${order.id}`);
  }

  // --- Pagada: mostrar entradas con QR ---
  const tickets: SuccessTicketData[] = await Promise.all(
    order.tickets.map(async (t, i) => ({
      code: t.qrCode,
      qrDataUrl: await qrDataUrl(t.qrCode),
      attendeeName: t.attendeeName || order.customerName,
      ticketTypeName: t.ticketType.name,
      status: t.status,
      eventTitle: order.event.title,
      eventDate: order.event.date,
      startTime: order.event.startTime,
      endTime: order.event.endTime,
      location: order.event.location,
      index: i + 1,
      total: order.tickets.length,
    })),
  );

  return (
    <Container className="py-12 sm:py-16">
      <div className="mb-10 text-center">
        <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald/15 text-emerald-soft">
          <CheckCircle2 className="size-9" />
        </span>
        <h1 className="mt-6 font-display text-3xl font-bold sm:text-4xl">
          ¡Tu compra está confirmada!
        </h1>
        <p className="mt-3 text-muted">
          {order.tickets.length}{" "}
          {order.tickets.length === 1 ? "entrada generada" : "entradas generadas"}{" "}
          para <strong className="text-foreground">{order.event.title}</strong>.
        </p>
        <p className="mt-1 flex items-center justify-center gap-1.5 text-sm text-muted">
          <Mail className="size-4" /> Enviaremos una copia a {order.customerEmail}
        </p>
      </div>

      <div className="mx-auto max-w-2xl space-y-6">
        <TicketActions eventTitle={order.event.title} shareUrl={shareUrl} />

        <div className="space-y-5">
          {tickets.map((t) => (
            <SessionSuccessTicket key={t.code} ticket={t} />
          ))}
        </div>

        <div className="rounded-3xl glass p-5 text-center print:hidden">
          <p className="mb-3 text-sm text-muted">
            ¿Algo no salió bien o tienes dudas?
          </p>
          <WhatsAppButton
            message={whatsappEventMessage(order.event.title)}
            label="Escríbenos por WhatsApp"
            variant="outline"
          />
        </div>
      </div>
    </Container>
  );
}
