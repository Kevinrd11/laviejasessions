import Link from "next/link";
import { redirect } from "next/navigation";
import { Calendar, ArrowLeft, ShoppingBag } from "lucide-react";
import { Container } from "@/components/ui/container";
import { SessionOrderSummary } from "@/components/sessions/order-summary";
import { SessionCheckoutForm } from "@/components/sessions/checkout-form";
import { CountdownTimer } from "@/components/sessions/countdown-timer";
import { WhatsAppButton } from "@/components/brand/whatsapp-button";
import { getOrderFull } from "@/lib/services/orders";
import { formatEventDate } from "@/lib/utils";
import { whatsappEventMessage } from "@/config/brand";

export const dynamic = "force-dynamic";
export const metadata = { title: "Checkout" };

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order: orderId } = await searchParams;
  if (!orderId) redirect("/sessions");

  const order = await getOrderFull(orderId);
  if (!order) redirect("/sessions");

  // Si ya fue pagada o está en revisión, ir a la pantalla de éxito/estado.
  if (["paid", "pending_review"].includes(order.status)) {
    redirect(`/sessions/success?order=${order.id}`);
  }

  // Server component: lectura de tiempo por request (no es un render reactivo).
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const isExpired =
    order.status !== "pending" ||
    (order.expiresAt ? order.expiresAt.getTime() < now : false);

  const lines = order.items.map((it) => ({
    name: it.ticketType.name,
    quantity: it.quantity,
    unitPrice: it.unitPrice,
  }));

  return (
    <Container className="py-10 sm:py-14">
      <Link
        href={`/sessions/${order.event.slug}`}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Volver al evento
      </Link>

      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
          Finaliza tu compra
        </h1>
        <p className="mt-2 flex items-center gap-2 capitalize text-muted">
          <Calendar className="size-4 text-emerald-soft" />
          {order.event.title} · {formatEventDate(order.event.date)}
        </p>
      </div>

      {isExpired ? (
        <div className="rounded-3xl glass-strong p-10 text-center">
          <p className="text-lg font-semibold">Tu reserva expiró</p>
          <p className="mt-2 text-muted">
            Los cupos se liberaron. Vuelve al evento para intentar de nuevo.
          </p>
          <Link
            href={`/sessions/${order.event.slug}`}
            className="btn-premium mt-6 inline-flex h-11 items-center rounded-full px-6 font-semibold text-white"
          >
            Volver al evento
          </Link>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
          {/* Formulario */}
          <div className="order-2 lg:order-1">
            <div className="rounded-3xl glass-strong p-6 sm:p-8">
              <SessionCheckoutForm
                orderId={order.id}
                orderCode={order.code}
                expired={isExpired}
              />
            </div>
          </div>

          {/* Resumen */}
          <aside className="order-1 space-y-4 lg:order-2 lg:sticky lg:top-24 lg:h-fit">
            {order.expiresAt && (
              <CountdownTimer expiresAt={order.expiresAt.toISOString()} />
            )}
            <div className="rounded-3xl glass-strong p-6">
              <div className="mb-4 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="size-5 text-gold-soft" />
                  <h2 className="font-display text-lg font-semibold">Tu orden</h2>
                </div>
                <span className="font-mono text-xs tracking-widest text-muted">
                  {order.code}
                </span>
              </div>
              <SessionOrderSummary lines={lines} serviceFee={order.serviceFee} compact />
            </div>

            <div className="rounded-3xl glass p-5 text-center">
              <p className="mb-3 text-sm text-muted">¿Dudas antes de pagar?</p>
              <WhatsAppButton
                message={whatsappEventMessage(order.event.title)}
                label="Escríbenos por WhatsApp"
                variant="outline"
                className="w-full"
              />
            </div>
          </aside>
        </div>
      )}
    </Container>
  );
}
