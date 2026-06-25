import Image from "next/image";
import { ArrowDown } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { WhatsAppButton } from "@/components/brand/whatsapp-button";
import { Container } from "@/components/ui/container";
import { whatsappGeneralMessage } from "@/config/brand";

export function SessionsHero() {
  return (
    <section className="relative isolate overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <Image
          src="https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=2000&auto=format&fit=crop"
          alt="Bosque y montaña en Sucre"
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/80 to-background" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/90 to-transparent" />
      </div>

      <Container className="flex min-h-[88dvh] flex-col justify-center py-24">
        <div className="max-w-2xl animate-fade-up">
          <span className="inline-block rounded-full border border-gold/30 bg-gold/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.25em] text-gold-soft">
            La Vieja Adventures presenta
          </span>

          <h1 className="mt-6 font-display text-5xl font-bold leading-[1.05] tracking-tight sm:text-7xl">
            <span className="text-gradient">La Vieja Sessions</span>
          </h1>

          <p className="mt-5 text-xl font-medium text-foreground/90 sm:text-2xl">
            Eventos especiales entre montaña, naturaleza y experiencias
            memorables.
          </p>

          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted">
            Una nueva forma de vivir La Vieja Adventures: sesiones únicas,
            eventos privados, música, gastronomía, naturaleza y encuentros
            especiales en Sucre, San Carlos.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <LinkButton href="#eventos" size="lg" variant="premium">
              Ver próximos eventos
              <ArrowDown className="size-4" />
            </LinkButton>
            <WhatsAppButton
              message={whatsappGeneralMessage}
              label="Reservar por WhatsApp"
              size="lg"
              variant="glass"
            />
          </div>
        </div>
      </Container>
    </section>
  );
}
