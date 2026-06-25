import Image from "next/image";
import Link from "next/link";
import { Calendar, Clock, MapPin, ArrowRight } from "lucide-react";
import { EventStatusBadge } from "@/components/ui/badge";
import {
  priceFrom,
  eventLimitedInventory,
  urgencyForAvailable,
  type EventWithTickets,
} from "@/lib/sessions";
import { formatColones, formatEventDate } from "@/lib/utils";

export function SessionEventCard({ event }: { event: EventWithTickets }) {
  const from = priceFrom(event.ticketTypes);
  const inv = eventLimitedInventory(event.ticketTypes);
  const urgency = inv.hasLimited ? urgencyForAvailable(inv.available) : null;
  const showUrgency =
    urgency && (urgency.level === "last" || urgency.level === "almost");

  return (
    <Link
      href={`/sessions/${event.slug}`}
      className="group relative flex flex-col overflow-hidden rounded-2xl glass transition hover:-translate-y-1 hover:shadow-2xl hover:shadow-emerald/10"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        {event.imageUrl ? (
          <Image
            src={event.imageUrl}
            alt={event.title}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover transition duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="size-full bg-gradient-to-br from-forest to-forest-deep" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
        <div className="absolute left-4 top-4">
          <EventStatusBadge status={event.status} date={event.date} />
        </div>
        {event.featured && (
          <div className="absolute right-4 top-4 rounded-full bg-gold/90 px-3 py-1 text-xs font-bold text-[#1a1305]">
            Destacado
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <h3 className="font-display text-xl font-semibold leading-tight text-foreground">
          {event.title}
        </h3>

        <div className="space-y-1.5 text-sm text-muted">
          <p className="flex items-center gap-2 capitalize">
            <Calendar className="size-4 text-emerald-soft" />
            {formatEventDate(event.date)}
          </p>
          <p className="flex items-center gap-2">
            <Clock className="size-4 text-emerald-soft" />
            {event.startTime} – {event.endTime}
          </p>
          <p className="flex items-center gap-2">
            <MapPin className="size-4 text-emerald-soft" />
            <span className="line-clamp-1">{event.location}</span>
          </p>
        </div>

        {/* Indicador de disponibilidad (preventa con tope) */}
        {inv.hasLimited && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span
                className={
                  showUrgency
                    ? urgency!.level === "almost"
                      ? "font-semibold text-orange-300"
                      : "font-semibold text-gold-soft"
                    : "text-muted"
                }
              >
                {inv.available > 0
                  ? `Quedan ${inv.available} de ${inv.totalCapacity}`
                  : "Preventa agotada"}
              </span>
              <span className="text-muted">{inv.percentSold}% vendido</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full rounded-full ${
                  inv.available <= 0
                    ? "bg-red-500"
                    : showUrgency
                      ? "bg-gradient-to-r from-orange-500 to-gold-soft"
                      : "bg-gradient-to-r from-emerald to-emerald-soft"
                }`}
                style={{ width: `${Math.max(inv.percentSold, inv.available > 0 ? 4 : 100)}%` }}
              />
            </div>
          </div>
        )}

        <div className="mt-auto flex items-center justify-between pt-3">
          <div>
            {from !== null ? (
              <>
                <span className="text-xs text-muted">Desde</span>
                <p className="font-display text-lg font-bold text-gold-soft">
                  {formatColones(from)}
                </p>
              </>
            ) : (
              <span className="text-sm text-muted">Próximamente</span>
            )}
          </div>
          <span className="flex items-center gap-1.5 text-sm font-semibold text-emerald-soft transition group-hover:gap-2.5">
            Ver evento
            <ArrowRight className="size-4" />
          </span>
        </div>
      </div>
    </Link>
  );
}
