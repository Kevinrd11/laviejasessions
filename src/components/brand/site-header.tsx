"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Logo } from "./logo";
import { WhatsAppButton } from "./whatsapp-button";
import { brand, whatsappGeneralMessage } from "@/config/brand";
import { cn } from "@/lib/utils";

// El header replica la navegación de La Vieja Adventures e integra "Sessions".
const navItems = [
  { label: "Inicio", href: brand.website, external: true },
  { label: "Experiencias", href: `${brand.website}/tours`, external: true },
  { label: "Sessions", href: "/sessions", external: false },
  { label: "Contacto", href: `${brand.website}/contacto`, external: true },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
        <Logo />

        <nav className="hidden items-center gap-8 md:flex">
          {navItems.map((item) =>
            item.external ? (
              <a
                key={item.label}
                href={item.href}
                className="text-sm font-medium text-muted transition hover:text-foreground"
              >
                {item.label}
              </a>
            ) : (
              <Link
                key={item.label}
                href={item.href}
                className="text-sm font-semibold text-emerald-soft transition hover:text-emerald"
              >
                {item.label}
              </Link>
            ),
          )}
        </nav>

        <div className="hidden md:block">
          <WhatsAppButton
            message={whatsappGeneralMessage}
            label="WhatsApp"
            size="sm"
            variant="outline"
          />
        </div>

        <button
          className="md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Abrir menú"
        >
          {open ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </div>

      <div
        className={cn(
          "overflow-hidden border-t border-white/5 transition-all md:hidden",
          open ? "max-h-96" : "max-h-0",
        )}
      >
        <div className="flex flex-col gap-1 px-5 py-4">
          {navItems.map((item) =>
            item.external ? (
              <a
                key={item.label}
                href={item.href}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted hover:bg-white/5"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </a>
            ) : (
              <Link
                key={item.label}
                href={item.href}
                className="rounded-lg px-3 py-2.5 text-sm font-semibold text-emerald-soft hover:bg-white/5"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </Link>
            ),
          )}
          <div className="mt-2">
            <WhatsAppButton
              message={whatsappGeneralMessage}
              label="Escríbenos por WhatsApp"
              size="sm"
              variant="outline"
              className="w-full"
            />
          </div>
        </div>
      </div>
    </header>
  );
}
