import { MessageCircle } from "lucide-react";
import { whatsappLink, whatsappGeneralMessage } from "@/config/brand";

/** Botón flotante de WhatsApp, presente en todas las páginas de Sessions. */
export function WhatsAppFloat({ message }: { message?: string }) {
  return (
    <a
      href={whatsappLink(message ?? whatsappGeneralMessage)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Escríbenos por WhatsApp"
      className="fixed bottom-5 right-5 z-50 flex size-14 items-center justify-center rounded-full bg-[#25D366] shadow-xl shadow-black/40 transition hover:scale-110"
    >
      <MessageCircle className="size-7 text-white" />
    </a>
  );
}
