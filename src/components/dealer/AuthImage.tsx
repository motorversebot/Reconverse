import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { ImageOff, Loader2 } from "lucide-react";

/**
 * Renders a dealer-scoped photo served by MC at an auth-protected URL.
 * A plain <img src> can't send the Bearer token, so we fetch the bytes via
 * apiFetch and render an object URL.
 */
export default function AuthImage({
  src,
  alt = "photo",
  className,
  onClick,
}: {
  src: string;
  alt?: string;
  className?: string;
  onClick?: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    let revoke: string | null = null;
    let on = true;
    setErr(false);
    setUrl(null);
    (async () => {
      try {
        const res = await apiFetch(src);
        if (!res.ok) throw new Error(String(res.status));
        const blob = await res.blob();
        if (!on) return;
        revoke = URL.createObjectURL(blob);
        setUrl(revoke);
      } catch {
        if (on) setErr(true);
      }
    })();
    return () => { on = false; if (revoke) URL.revokeObjectURL(revoke); };
  }, [src]);

  if (err) {
    return <div className={`flex items-center justify-center bg-muted text-muted-foreground ${className ?? ""}`}><ImageOff className="h-4 w-4" /></div>;
  }
  if (!url) {
    return <div className={`flex items-center justify-center bg-muted ${className ?? ""}`}><Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" /></div>;
  }
  return <img src={url} alt={alt} className={className} onClick={onClick} loading="lazy" />;
}
