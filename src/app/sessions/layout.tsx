import { SiteHeader } from "@/components/brand/site-header";
import { SiteFooter } from "@/components/brand/site-footer";
import { WhatsAppFloat } from "@/components/brand/whatsapp-float";

export default function SessionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="print:hidden">
        <SiteHeader />
      </div>
      <main className="flex-1">{children}</main>
      <div className="print:hidden">
        <SiteFooter />
        <WhatsAppFloat />
      </div>
    </>
  );
}
