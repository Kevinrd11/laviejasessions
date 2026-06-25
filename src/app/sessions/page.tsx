import {
  Sunset,
  Moon,
  Coffee,
  Music,
  UtensilsCrossed,
  Lock,
  Mountain,
  Users,
  ShieldCheck,
  MapPin,
  ParkingSquare,
  Bath,
  MessageCircle,
  QrCode,
  CalendarDays,
} from "lucide-react";
import { Container, Section } from "@/components/ui/container";
import { SessionsHero } from "@/components/sessions/sessions-hero";
import { SessionEventCard } from "@/components/sessions/session-event-card";
import { WhatsAppButton } from "@/components/brand/whatsapp-button";
import { getPublishedEvents } from "@/lib/sessions";
import { whatsappGeneralMessage } from "@/config/brand";

export const dynamic = "force-dynamic";

const eventTypes = [
  { icon: Sunset, name: "Sunset Sessions", desc: "Atardeceres con música y café local." },
  { icon: Moon, name: "Night Sessions", desc: "Experiencias nocturnas guiadas en el bosque." },
  { icon: Coffee, name: "Coffee & Nature Sessions", desc: "Café, naturaleza y música acústica." },
  { icon: Music, name: "Music in the Mountain", desc: "Sonido en vivo entre montañas." },
  { icon: UtensilsCrossed, name: "Gastronomic Sessions", desc: "Sabores locales en entornos únicos." },
  { icon: Lock, name: "Private Sessions", desc: "Encuentros privados y exclusivos." },
  { icon: Mountain, name: "Adventure Sessions", desc: "Aventura y naturaleza en su máxima expresión." },
];

const trustItems = [
  { icon: Users, label: "Cupos limitados" },
  { icon: ShieldCheck, label: "Ubicación segura" },
  { icon: MapPin, label: "Organización local" },
  { icon: ParkingSquare, label: "Parqueo disponible" },
  { icon: Bath, label: "Baños disponibles" },
  { icon: MessageCircle, label: "Atención por WhatsApp" },
  { icon: QrCode, label: "Validación por QR" },
];

export default async function SessionsPage() {
  const events = await getPublishedEvents();

  return (
    <>
      <SessionsHero />

      {/* Próximos eventos */}
      <Section id="eventos">
        <Container>
          <div className="mb-10 flex flex-col gap-3">
            <span className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-soft">
              <CalendarDays className="mr-2 inline size-4" />
              Próximos eventos
            </span>
            <h2 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
              Sesiones que no te puedes perder
            </h2>
          </div>

          {events.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((event) => (
                <SessionEventCard key={event.id} event={event} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl glass p-12 text-center">
              <p className="text-lg text-muted">
                Pronto anunciaremos nuevas sesiones. Escríbenos por WhatsApp para
                enterarte de primero.
              </p>
              <div className="mt-6 flex justify-center">
                <WhatsAppButton message={whatsappGeneralMessage} variant="premium" />
              </div>
            </div>
          )}
        </Container>
      </Section>

      {/* Concepto */}
      <Section id="concepto" className="border-y border-white/5 bg-surface/30">
        <Container className="max-w-3xl text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            ¿Qué es <span className="text-gradient">La Vieja Sessions</span>?
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-muted">
            La Vieja Sessions reúne eventos especiales creados por La Vieja
            Adventures para conectar personas con la naturaleza, la música, la
            cultura local y la energía de Sucre. Cada sesión es limitada, curada
            y diseñada para vivirse como una experiencia única.
          </p>
        </Container>
      </Section>

      {/* Tipos de eventos */}
      <Section id="tipos">
        <Container>
          <div className="mb-10 text-center">
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Tipos de sesiones
            </h2>
            <p className="mt-3 text-muted">
              Cada formato, una forma distinta de vivir la montaña.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {eventTypes.map(({ icon: Icon, name, desc }) => (
              <div
                key={name}
                className="group flex items-start gap-4 rounded-2xl glass p-6 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald/10"
              >
                <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald/20 to-forest/30 text-emerald-soft">
                  <Icon className="size-6" />
                </span>
                <div>
                  <h3 className="font-display text-lg font-semibold">{name}</h3>
                  <p className="mt-1 text-sm text-muted">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      {/* Confianza */}
      <Section className="border-t border-white/5 bg-surface/30">
        <Container>
          <h2 className="mb-10 text-center font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Una experiencia segura y curada
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {trustItems.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex flex-col items-center gap-3 rounded-2xl glass p-6 text-center"
              >
                <span className="flex size-12 items-center justify-center rounded-full bg-gold/10 text-gold-soft">
                  <Icon className="size-6" />
                </span>
                <span className="text-sm font-medium text-foreground">{label}</span>
              </div>
            ))}
          </div>

          <div className="mt-12 flex flex-col items-center gap-4 text-center">
            <p className="text-muted">¿Dudas antes de reservar? Hablemos.</p>
            <WhatsAppButton
              message={whatsappGeneralMessage}
              label="Reservar por WhatsApp"
              size="lg"
              variant="premium"
            />
          </div>
        </Container>
      </Section>
    </>
  );
}
