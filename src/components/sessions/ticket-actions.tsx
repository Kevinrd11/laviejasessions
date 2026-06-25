"use client";

import { Download, Share2 } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { whatsappLink } from "@/config/brand";

/** Acciones de la pantalla de éxito: descargar (imprimir/PDF) y compartir. */
export function TicketActions({
  eventTitle,
  shareUrl,
}: {
  eventTitle: string;
  shareUrl: string;
}) {
  const shareMsg = `¡Tengo mi entrada para ${eventTitle} de La Vieja Sessions! 🎟️🌿 ${shareUrl}`;

  return (
    <div className="flex flex-col gap-3 sm:flex-row print:hidden">
      <button
        onClick={() => window.print()}
        className="btn-gold flex h-12 flex-1 items-center justify-center gap-2 rounded-full font-semibold"
      >
        <Download className="size-5" /> Descargar / Imprimir entradas
      </button>
      <LinkButton
        href={whatsappLink(shareMsg)}
        target="_blank"
        rel="noopener noreferrer"
        variant="glass"
        size="lg"
        className="flex-1"
      >
        <Share2 className="size-5" /> Compartir por WhatsApp
      </LinkButton>
    </div>
  );
}
