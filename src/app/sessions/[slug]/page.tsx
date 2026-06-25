import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  Calendar,
  Clock,
  MapPin,
  ShieldAlert,
  Check,
  Backpack,
  ScrollText,
  Navigation,
  ArrowLeft,
} from "lucide-react";
import { Container } from "@/components/ui/container";
import { EventStatusBadge } from "@/components/ui/badge";
import { WhatsAppButton } from "@/components/brand/whatsapp-button";
import {
  SessionTicketSelector,
  type SelectableTicket,
} from "@/components/sessions/ticket-selector";
import { EventAvailability } from "@/components/sessions/event-availability";
import {
  getEventBySlug,
  availableQuantity,
  isTicketTypeSoldOut,
  isLockedBeforeStart,
  eventLimitedInventory,
  eventHasPurchasable,
} from "@/lib/sessions";
import { formatEventDate } from "@/lib/utils";
import { whatsappEventMessage } from "@/config/brand";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) return { title: "Evento no encontrado" };
  return {
    title: event.title,
    description: event.subtitle ?? event.description.slice(0, 150),
    openGraph: { images: event.imageUrl ? [event.imageUrl] : [] },
  };
}

export default async function EventPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) notFound();

  const now = new Date();
  const tickets: SelectableTicket[] = event.ticketTypes.map((t) => {
    const locked = isLockedBeforeStart(t, now);
    const avail = t.unlimited ? 0 : availableQuantity(t);
    return {
      id: t.id,
      name: t.name,
      description: t.description,
      price: t.price,
      maxPerOrder: t.maxPerOrder,
      unlimited: t.unlimited,
      available: avail,
      soldOut: isTicketTypeSoldOut(t),
      locked,
      lockedUntilLabel: locked && t.salesStart ? formatEventDate(t.salesStart) : null,
    };
  });

  const inventory = eventLimitedInventory(event.ticketTypes);
  const canSell =
    event.status === "published" && eventHasPurchasable(event.ticketTypes, now);
  // Hay tipos que abren más adelante (ej. entrada del día del evento).
  const hasLockedTypes = event.ticketTypes.some((t) => isLockedBeforeStart(t, now));
  const waMessage = whatsappEventMessage(event.title);

  return (
    <article>
      {/* Hero */}
      <div className="relative h-[52vh] min-h-80 w-full overflow-hidden sm:h-[60vh]">
        {event.imageUrl ? (
          <Image
            src={event.imageUrl}
            alt={event.title}
            fill
            priority
            className="object-cover"
          />
        ) : (
          <div className="size-full bg-gradient-to-br from-forest to-forest-deep" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-background/20" />
        <Container className="relative flex h-full flex-col justify-end pb-10">
          <Link
            href="/sessions"
            className="mb-4 inline-flex w-fit items-center gap-1.5 text-sm text-muted transition hover:text-foreground"
          >
            <ArrowLeft className="size-4" /> Volver a Sessions
          </Link>
          <EventStatusBadge status={event.status} date={event.date} />
          <h1 className="mt-3 max-w-3xl font-display text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
            {event.title}
          </h1>
          {event.subtitle && (
            <p className="mt-3 max-w-2xl text-lg text-foreground/80">
              {event.subtitle}
            </p>
          )}
        </Container>
      </div>

      <Container className="grid gap-10 py-12 lg:grid-cols-[1fr_400px]">
        {/* Columna principal */}
        <div className="space-y-10">
          {/* Datos rápidos */}
          <div className="grid gap-3 sm:grid-cols-2">
            <InfoRow icon={Calendar} label="Fecha" value={formatEventDate(event.date)} capitalize />
            <InfoRow icon={Clock} label="Horario" value={`${event.startTime} – ${event.endTime}`} />
            <InfoRow icon={MapPin} label="Ubicación" value={event.location} />
            {event.minAge && (
              <InfoRow icon={ShieldAlert} label="Edad mínima" value={`${event.minAge} años`} />
            )}
          </div>

          <Block title="Sobre la experiencia">
            <p className="whitespace-pre-line leading-relaxed text-muted">
              {event.description}
            </p>
          </Block>

          {event.includes.length > 0 && (
            <Block title="Qué incluye" icon={Check}>
              <ul className="grid gap-2 sm:grid-cols-2">
                {event.includes.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-muted">
                    <Check className="mt-0.5 size-4 shrink-0 text-emerald-soft" />
                    {item}
                  </li>
                ))}
              </ul>
            </Block>
          )}

          {event.bring.length > 0 && (
            <Block title="Qué llevar" icon={Backpack}>
              <ul className="grid gap-2 sm:grid-cols-2">
                {event.bring.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-muted">
                    <Backpack className="mt-0.5 size-4 shrink-0 text-gold-soft" />
                    {item}
                  </li>
                ))}
              </ul>
            </Block>
          )}

          {event.policies.length > 0 && (
            <Block title="Políticas del evento" icon={ScrollText}>
              <ul className="space-y-2">
                {event.policies.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-muted">
                    <ScrollText className="mt-0.5 size-4 shrink-0 text-muted" />
                    {item}
                  </li>
                ))}
              </ul>
            </Block>
          )}

          {/* Mapa / cómo llegar */}
          <Block title="Cómo llegar" icon={Navigation}>
            <div className="flex flex-wrap gap-3">
              {event.googleMapsUrl && (
                <a
                  href={event.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full glass px-4 py-2 text-sm font-medium transition hover:bg-white/10"
                >
                  <MapPin className="size-4 text-emerald-soft" /> Google Maps
                </a>
              )}
              {event.wazeUrl && (
                <a
                  href={event.wazeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full glass px-4 py-2 text-sm font-medium transition hover:bg-white/10"
                >
                  <Navigation className="size-4 text-emerald-soft" /> Waze
                </a>
              )}
            </div>
          </Block>
        </div>

        {/* Columna de compra (sticky) */}
        <aside className="lg:sticky lg:top-24 lg:h-fit space-y-4">
          {/* Contador público de inventario (entradas con tope, ej. Preventa) */}
          {inventory.hasLimited && (
            <EventAvailability
              available={inventory.available}
              total={inventory.totalCapacity}
              percentSold={inventory.percentSold}
              label="Preventa"
            />
          )}

          <div className="rounded-3xl glass-strong p-6">
            <h2 className="mb-4 font-display text-2xl font-bold">Entradas</h2>
            {canSell ? (
              <SessionTicketSelector eventId={event.id} tickets={tickets} />
            ) : (
              <div className="space-y-4">
                <p className="rounded-2xl bg-white/5 p-4 text-center text-muted">
                  {event.status === "sold_out" || inventory.available <= 0
                    ? hasLockedTypes
                      ? "Preventa agotada. Las entradas estarán disponibles el día del evento."
                      : "Este evento ya agotó todas sus entradas disponibles."
                    : "Las entradas no están disponibles por ahora."}
                </p>
              </div>
            )}

            <div className="mt-5 border-t border-white/10 pt-5">
              <p className="mb-3 text-center text-sm text-muted">
                ¿Dudas antes de comprar?
              </p>
              <WhatsAppButton
                message={waMessage}
                label="Consultar por WhatsApp"
                variant="outline"
                className="w-full"
              />
            </div>
          </div>
        </aside>
      </Container>
    </article>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
  capitalize,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  capitalize?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl glass p-4">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald/10 text-emerald-soft">
        <Icon className="size-5" />
      </span>
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
        <p className={`truncate font-medium ${capitalize ? "capitalize" : ""}`}>
          {value}
        </p>
      </div>
    </div>
  );
}

function Block({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-4 flex items-center gap-2 font-display text-2xl font-bold tracking-tight">
        {Icon && <Icon className="size-5 text-emerald-soft" />}
        {title}
      </h2>
      {children}
    </section>
  );
}
