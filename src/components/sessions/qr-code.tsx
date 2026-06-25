/* eslint-disable @next/next/no-img-element */
import { cn } from "@/lib/utils";

/** Muestra el QR de una entrada (data URL generado en el servidor). */
export function SessionQRCode({
  dataUrl,
  code,
  className,
}: {
  dataUrl: string;
  code: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <div className="rounded-2xl bg-white p-3 shadow-lg">
        <img src={dataUrl} alt={`Código QR ${code}`} className="size-44" />
      </div>
      <span className="font-mono text-xs tracking-widest text-muted">{code}</span>
    </div>
  );
}
