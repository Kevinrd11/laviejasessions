import Link from "next/link";
import { MapPin, Mail, Camera, MessageCircle } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Logo } from "./logo";
import { brand, whatsappLink, whatsappGeneralMessage } from "@/config/brand";

export function SiteFooter() {
  return (
    <footer className="border-t border-white/5 bg-surface/40">
      <Container className="py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-4">
            <Logo />
            <p className="max-w-xs text-sm leading-relaxed text-muted">
              Eventos especiales de {brand.company}: naturaleza, música, cultura
              y experiencias memorables en Sucre, San Carlos.
            </p>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold text-foreground">Sessions</h4>
            <ul className="space-y-2 text-sm text-muted">
              <li><Link href="/sessions" className="hover:text-foreground">Próximos eventos</Link></li>
              <li><Link href="/sessions#concepto" className="hover:text-foreground">Qué es Sessions</Link></li>
              <li><Link href="/sessions#tipos" className="hover:text-foreground">Tipos de eventos</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold text-foreground">La Vieja Adventures</h4>
            <ul className="space-y-2 text-sm text-muted">
              <li><a href={brand.website} className="hover:text-foreground">Sitio oficial</a></li>
              <li><a href={`${brand.website}/tours`} className="hover:text-foreground">Experiencias</a></li>
              <li><a href={`${brand.website}/contacto`} className="hover:text-foreground">Contacto</a></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold text-foreground">Contacto</h4>
            <ul className="space-y-3 text-sm text-muted">
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 size-4 shrink-0 text-emerald-soft" />
                <span>{brand.location.full}</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="size-4 shrink-0 text-emerald-soft" />
                <a href={`mailto:${brand.email}`} className="hover:text-foreground">{brand.email}</a>
              </li>
              <li className="flex items-center gap-2">
                <MessageCircle className="size-4 shrink-0 text-[#25D366]" />
                <a href={whatsappLink(whatsappGeneralMessage)} target="_blank" rel="noopener noreferrer" className="hover:text-foreground">WhatsApp</a>
              </li>
              <li className="flex items-center gap-2">
                <Camera className="size-4 shrink-0 text-gold-soft" />
                <a href={brand.instagram} target="_blank" rel="noopener noreferrer" className="hover:text-foreground">Instagram</a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-white/5 pt-6 text-xs text-muted sm:flex-row">
          <p>© {new Date().getFullYear()} {brand.company}. Todos los derechos reservados.</p>
          <p>La Vieja Sessions · Una experiencia curada en Sucre 🌿</p>
        </div>
      </Container>
    </footer>
  );
}
