import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { ImageOff, Loader2 } from "lucide-react";

/**
 * Renders an auth-protected image served by MC. A plain <img src> can't send the
 * Bearer token, so we fetch the bytes via apiFetch and render an object URL.
 *
 * Lazy: the (often large) bytes are only fetched once the element scrolls near the
 * viewport — so a page with many images (e.g. 21 wiring SVGs ~200KB each) shows
 * immediately instead of blocking on ~4MB of up-front fetches. Pass `minH` so the
 * placeholder reserves vertical space (otherwise every collapsed placeholder is
 * "near the viewport" at once and lazy-loading is defeated).
 */
export default function AuthImage({
  src,
  alt = "photo",
  className,
  onClick,
  minH,
}: {
  src: string;
  alt?: string;
  className?: string;
  onClick?: () => void;
  minH?: number;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [err, setErr] = useState(false);
  const [visible, setVisible] = useState(false);
  const holder = useRef<HTMLDivElement | null>(null);

  // Reveal once the placeholder scrolls within 600px of the viewport.
  useEffect(() => {
    if (visible) return;
    const el = holder.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") { setVisible(true); return; }
    const io = new IntersectionObserver(
      (entries) => { if (entries.some((e) => e.isIntersecting)) { setVisible(true); io.disconnect(); } },
      { rootMargin: "600px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible]);

  // Fetch the protected bytes only after the element is visible.
  useEffect(() => {
    if (!visible) return;
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
  }, [src, visible]);

  const ph = minH ? { minHeight: minH } : undefined;
  if (err) {
    return <div ref={holder} style={ph} className={`flex items-center justify-center bg-muted text-muted-foreground ${className ?? ""}`}><ImageOff className="h-4 w-4" /></div>;
  }
  if (!url) {
    return <div ref={holder} style={ph} className={`flex items-center justify-center bg-muted ${className ?? ""}`}><Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" /></div>;
  }
  return <img src={url} alt={alt} className={className} onClick={onClick} loading="lazy" />;
}
