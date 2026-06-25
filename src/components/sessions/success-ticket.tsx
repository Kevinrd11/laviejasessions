import { Mountain, Calendar, Clock, MapPin, User } from "lucide-react";
import { SessionQRCode } from "./qr-code";
import { TicketStatus } from "@/generated/prisma";
import { formatEventDate } from "@/lib/utils";

export type SuccessTicketData = {
  code: string;
  qrDataUrl: string;
  attendeeName: string;
  ticketTypeName: string;
  status: TicketStatus;
  eventTitle: string;
  eventDate: Date | string;
  startTime: string;
  endTime: string;
  location: string;
  index: number;
  total: number;
};

const statusLabel: Record<TicketStatus, { text: string; cls: string }> = {
  valid: { text: "Válida", cls: "bg-emerald/15 text-emerald-soft" },
  used: { text: "Usada", cls: "bg-white/10 text-muted" },
  cancelled: { text: "Cancelada", cls: "bg-danger/15 text-red-300" },
};

/** Entrada individual con QR, estilo "boleto" premium. */
export function SessionSuccessTicket({ ticket }: { ticket: SuccessTicketData }) {
  const st = statusLabel[ticket.status];
  return (
    <div className="overflow-hidden rounded-3xl glass-strong">
      <div className="flex items-center justify-between bg-gradient-to-r from-forest/40 to-transparent px-6 py-4">
        <div className="flex items-center gap-2">
          <Mountain className="size-5 text-emerald-soft" />
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-soft">
            La Vieja Sessions
          </span>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${st.cls}`}>
          {st.text}
        </span>
      </div>

      <div className="grid gap-6 p-6 sm:grid-cols-[1fr_auto] sm:items-center">
        <div className="space-y-3">
          <div>
            <h3 className="font-display text-2xl font-bold leading-tight">
              {ticket.eventTitle}
            </h3>
            <p className="text-sm text-gold-soft">{ticket.ticketTypeName}</p>
          </div>

          <div className="space-y-1.5 text-sm text-muted">
            <p className="flex items-center gap-2 capitalize">
              <Calendar className="size-4 text-emerald-soft" />
              {formatEventDate(ticket.eventDate)}
            </p>
            <p className="flex items-center gap-2">
              <Clock className="size-4 text-emerald-soft" />
              {ticket.startTime} – {ticket.endTime}
            </p>
            <p className="flex items-center gap-2">
              <MapPin className="size-4 text-emerald-soft" />
              {ticket.location}
            </p>
            <p className="flex items-center gap-2">
              <User className="size-4 text-emerald-soft" />
              {ticket.attendeeName}
            </p>
          </div>

          <p className="text-xs text-muted">
            Entrada {ticket.index} de {ticket.total} · Presenta este QR en la
            entrada del evento.
          </p>
        </div>

        <SessionQRCode dataUrl={ticket.qrDataUrl} code={ticket.code} />
      </div>
    </div>
  );
}
