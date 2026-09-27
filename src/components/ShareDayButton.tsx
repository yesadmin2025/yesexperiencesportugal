import { useEffect, useRef, useState } from "react";
import { Share2, Check } from "lucide-react";
import { track } from "@/lib/analytics";

const ORIGIN = "https://yesexperiencesportugal.com";

export function buildShareUrl(path: string, source: string) {
  const u = new URL(path, ORIGIN);
  u.searchParams.set("utm_source", source);
  u.searchParams.set("utm_medium", "social");
  u.searchParams.set("utm_campaign", "signature_share");
  return u.toString();
}

type Props = { path: string; title: string; experienceId: string };

/**
 * Quiet "Share this day" action. Native share sheet on phones; small
 * fallback menu elsewhere. Links carry UTM tags; canonical stays clean.
 */
export function ShareDayButton({ path, title, experienceId }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const log = (method: string) =>
    track("share", { method, content_type: "signature", item_id: experienceId });

  const onClick = async () => {
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
    if (nav.share && window.matchMedia("(pointer: coarse)").matches) {
      try {
        await nav.share({ title, url: buildShareUrl(path, "native_share") });
        log("native");
      } catch {
        /* user cancelled */
      }
      return;
    }
    setOpen((v) => !v);
  };

  const text = `${title} — YES Experiences Portugal`;
  const items = [
    { k: "whatsapp", label: "WhatsApp", href: `https://wa.me/?text=${encodeURIComponent(`${text} ${buildShareUrl(path, "whatsapp")}`)}` },
    { k: "facebook", label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(buildShareUrl(path, "facebook"))}` },
    { k: "email", label: "Email", href: `mailto:?subject=${encodeURIComponent(text)}&body=${encodeURIComponent(buildShareUrl(path, "email"))}` },
  ];

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(buildShareUrl(path, "copy_link"));
      setCopied(true);
      log("copy_link");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  };

  const itemCls =
    "block w-full px-4 py-3 text-left font-sans text-[12px] uppercase tracking-[0.14em] text-[color:var(--charcoal)] transition-colors duration-150 hover:bg-[color:var(--sand)] focus-visible:outline-none focus-visible:bg-[color:var(--sand)]";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={onClick}
        aria-expanded={open}
        aria-haspopup="menu"
        className="inline-flex min-h-[44px] items-center gap-2 font-sans text-[11px] font-medium uppercase tracking-[0.16em] text-[color:var(--charcoal-soft)] transition-colors duration-150 hover:text-[color:var(--teal)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
      >
        <Share2 size={14} aria-hidden="true" className="text-[color:var(--gold)]" />
        Share this day
      </button>
      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full z-30 mt-1 min-w-[200px] overflow-hidden rounded-[6px] border border-[color:var(--gold)]/40 bg-[color:var(--ivory)] shadow-sm"
        >
          {items.map((i) => (
            <a
              key={i.k}
              role="menuitem"
              href={i.href}
              target={i.k === "email" ? undefined : "_blank"}
              rel="noopener noreferrer"
              className={itemCls}
              onClick={() => {
                log(i.k);
                setOpen(false);
              }}
            >
              {i.label}
            </a>
          ))}
          <button type="button" role="menuitem" onClick={copy} className={itemCls}>
            {copied ? (
              <span className="inline-flex items-center gap-2">
                <Check size={13} aria-hidden="true" /> Link copied
              </span>
            ) : (
              "Copy link"
            )}
          </button>
        </div>
      )}
    </div>
  );
}
