import { MessageCircle } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { whatsappLink } from "@/config/brand";
import { cn } from "@/lib/utils";

/** Botón de WhatsApp reutilizable con mensaje prellenado. */
export function WhatsAppButton({
  message,
  label = "Reservar por WhatsApp",
  className,
  size = "md",
  variant = "glass",
}: {
  message: string;
  label?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "premium" | "gold" | "glass" | "outline" | "ghost";
}) {
  return (
    <LinkButton
      href={whatsappLink(message)}
      target="_blank"
      rel="noopener noreferrer"
      size={size}
      variant={variant}
      className={cn("group", className)}
    >
      <MessageCircle className="size-4 text-[#25D366] transition group-hover:scale-110" />
      {label}
    </LinkButton>
  );
}
