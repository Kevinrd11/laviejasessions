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

  // --- Cancelada o vencida ---
  if (order.status === "cancelled" || order.status === "expired") {
    return (
      <Container className="flex min-h-[70vh] flex-col items-center justify-center py-16 text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-white/10 text-muted">
          <Clock3 className="size-8" />
        </span>
        <h1 className="mt-6 font-display text-3xl font-bold sm:text-4xl">
          {order.status === "cancelled" ? "Orden cancelada" : "Solicitud vencida"}
        </h1>
        <p className="mt-3 max-w-lg text-muted">
          Esta solicitud ya no está activa. Si aún querés tus entradas, podés
          iniciar una nueva desde el evento.
        </p>
        <Link
          href={`/sessions/${order.event.slug}`}
          className="btn-premium mt-6 inline-flex h-11 items-center rounded-full px-6 font-semibold text-white"
        >
          Volver al evento
        </Link>
      </Container>
    );
  }

  // --- Pendiente de pago (solicitud registrada, esperando validación) ---
  if (order.status === "pending_payment") {
    // Si todavía no completó el formulario, llevarlo al checkout.
    if (!order.customerEmail) {
      redirect(`/sessions/checkout?order=${order.id}`);
    }
    return (
      <Container className="flex min-h-[70vh] flex-col items-center justify-center py-16 text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-warning/15 text-warning">
          <Clock3 className="size-8" />
        </span>
        <h1 className="mt-6 font-display text-3xl font-bold sm:text-4xl">
          ¡Solicitud registrada!
        </h1>
        <p className="mt-3 max-w-xl text-muted">
          Tu solicitud fue registrada. Para confirmar tus entradas, realizá el
          pago por SINPE y enviá el comprobante por WhatsApp. Tus entradas serán
          confirmadas únicamente después de validar el pago.
        </p>

        <div className="mt-6 rounded-2xl border border-emerald/30 bg-emerald/10 px-6 py-4">
          <p className="text-xs uppercase tracking-wide text-muted">
            Código de tu orden
          </p>
          <p className="font-mono text-2xl font-bold tracking-widest text-emerald-soft">
            {order.code}
          </p>
          <p className="mt-1 text-xs text-muted">
            Escribilo en la descripción de tu comprobante SINPE.
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

  // --- Cortesía pendiente de aprobación ---
  if (order.status === "pending_courtesy") {
    if (!order.customerEmail) {
      redirect(`/sessions/checkout?order=${order.id}`);
    }
    return (
      <Container className="flex min-h-[70vh] flex-col items-center justify-center py-16 text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-gold/15 text-gold-soft">
          <Clock3 className="size-8" />
        </span>
        <h1 className="mt-6 font-display text-3xl font-bold sm:text-4xl">
          ¡Cortesía registrada!
        </h1>
        <p className="mt-3 max-w-xl text-muted">
          Tu entrada de cortesía fue registrada. La organización validará tu
          cortesía y confirmará tu entrada.
        </p>

        <div className="mt-6 rounded-2xl border border-gold/30 bg-gold/10 px-6 py-4">
          <p className="text-xs uppercase tracking-wide text-muted">
            Código de tu orden
          </p>
          <p className="font-mono text-2xl font-bold tracking-widest text-gold-soft">
            {order.code}
          </p>
        </div>

        <div className="mt-8">
          <WhatsAppButton
            message={`${whatsappEventMessage(order.event.title)} Registré una entrada de cortesía. Código de orden: ${order.code}.`}
            label="Confirmar por WhatsApp"
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

  // --- Pagada o cortesía aprobada: mostrar entradas con QR ---
  const isCourtesyApproved = order.status === "courtesy_approved";
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
          {isCourtesyApproved
            ? "¡Tu cortesía está confirmada!"
            : "¡Tu compra está confirmada!"}
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
