/**
 * Cookie consent banner — RGPD + Google Consent Mode v2.
 *
 * Consent Mode v2 is already booted in `src/routes/__root.tsx` with all
 * signals denied by default. This component captures the user's choice
 * and calls `gtag('consent','update', …)` accordingly. Choice is
 * persisted in localStorage so the banner never reappears once decided.
 *
 * The footer surfaces a "Cookie preferences" link that dispatches
 * `yes:open-cookie-consent` to let guests revise their choice later.
 */

import * as React from "react";
import { useHydrated } from "@/hooks/use-hydrated";
import { trackEvent, setAnalyticsConsent } from "@/lib/analytics-events";

const STORAGE_KEY = "yes.cookieConsent.v1";
const OPEN_EVENT = "yes:open-cookie-consent";

type ConsentState = "granted" | "denied";

interface ConsentChoice {
  analytics: ConsentState;
  ads: ConsentState;
  decidedAt: string;
  version: 1;
}

function applyConsent(choice: Pick<ConsentChoice, "analytics" | "ads">) {
  const g = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
  if (typeof g === "function") {
    g("consent", "update", {
      analytics_storage: choice.analytics,
      ad_storage: choice.ads,
      ad_user_data: choice.ads,
      ad_personalization: choice.ads,
    });
  }
}

function persist(choice: ConsentChoice) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(choice));
    document.cookie = `${STORAGE_KEY}=1; path=/; max-age=${60 * 60 * 24 * 180}; SameSite=Lax`;
  } catch {
    /* no-op */
  }
}

function readStored(): ConsentChoice | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ConsentChoice;
  } catch {
    return null;
  }
}

export function CookieConsent() {
  const hydrated = useHydrated();
  const [open, setOpen] = React.useState(false);
  const [customize, setCustomize] = React.useState(false);
  const [analytics, setAnalytics] = React.useState(true);
  const [ads, setAds] = React.useState(false);

  React.useEffect(() => {
    if (!hydrated) return;
    const existing = readStored();
    if (!existing) {
      // No decision yet — hold custom events in the queue until the guest
      // chooses (they flush automatically on "granted").
      setAnalyticsConsent("denied");
      setOpen(true);
    } else {
      // Re-apply on every mount so late-loading GTM sees the correct signals.
      applyConsent(existing);
      setAnalyticsConsent(existing.analytics);
    }
    const onOpen = () => {
      const cur = readStored();
      if (cur) {
        setAnalytics(cur.analytics === "granted");
        setAds(cur.ads === "granted");
      }
      setCustomize(true);
      setOpen(true);
    };
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, [hydrated]);

  const commit = React.useCallback(
    (choice: Pick<ConsentChoice, "analytics" | "ads">, source: string) => {
      const full: ConsentChoice = { ...choice, decidedAt: new Date().toISOString(), version: 1 };
      persist(full);
      applyConsent(full);
      setAnalyticsConsent(full.analytics);
      trackEvent("consent_choice", {
        source,
        analytics: full.analytics,
        ads: full.ads,
      });
      setOpen(false);
      setCustomize(false);
    },
    [],
  );

  if (!hydrated || !open) return null;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-consent-title"
      className="fixed inset-x-0 bottom-0 z-[70] pointer-events-none px-3 pb-3 sm:px-6 sm:pb-6"
    >
      <div
        className="pointer-events-auto mx-auto max-w-[640px] rounded-[14px] border border-[color:var(--charcoal)]/[0.08] bg-[color:var(--ivory,#FAF8F3)] shadow-[0_18px_48px_-18px_rgba(30,22,14,0.28)] backdrop-blur-sm"
        style={{ animation: "cookieFadeUp 320ms ease-out both" }}
      >
        <style>{`
          @keyframes cookieFadeUp {
            from { opacity: 0; transform: translateY(12px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          @media (prefers-reduced-motion: reduce) {
            [data-cookie-card] { animation: none !important; }
          }
        `}</style>

        <div data-cookie-card className="p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <p
                id="cookie-consent-title"
                className="font-[family-name:var(--font-display)] text-[15px] leading-[1.35] text-[color:var(--charcoal)]"
                style={{ fontWeight: 500 }}
              >
                We use cookies to shape your journey
              </p>
              <p className="mt-1.5 text-[13px] leading-[1.55] text-[color:var(--charcoal-soft)] font-[family-name:var(--font-sans)]">
                Essential cookies keep the site running. Analytics help us understand which
                experiences resonate. You can change your choice anytime from the footer.{" "}
                <a
                  href="/cookies"
                  className="underline decoration-[color:var(--gold-warm)]/60 underline-offset-[3px] hover:text-[color:var(--charcoal)]"
                >
                  Read our cookie policy
                </a>
                .
              </p>
            </div>
          </div>

          {customize && (
            <div className="mt-4 space-y-3 rounded-md bg-[color:var(--sand,rgba(201,169,106,0.06))] p-4">
              <ConsentRow
                label="Essential"
                hint="Required for the site to work. Always on."
                checked
                disabled
                onChange={() => {}}
              />
              <ConsentRow
                label="Analytics"
                hint="Anonymous usage metrics (GA4)."
                checked={analytics}
                onChange={setAnalytics}
              />
              <ConsentRow
                label="Marketing"
                hint="Personalised ads across partners."
                checked={ads}
                onChange={setAds}
              />
            </div>
          )}

          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            {!customize ? (
              <>
                <button
                  type="button"
                  onClick={() => setCustomize(true)}
                  className="tap inline-flex min-h-11 items-center justify-center text-[11px] uppercase tracking-[0.22em] text-[color:var(--charcoal-soft)] hover:text-[color:var(--charcoal)] transition-colors py-2 px-3 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--teal)]"
                >
                  Customise
                </button>
                <button
                  type="button"
                  onClick={() => commit({ analytics: "denied", ads: "denied" }, "essential_only")}
                  className="tap inline-flex min-h-11 items-center justify-center text-[11px] uppercase tracking-[0.22em] text-[color:var(--charcoal)] hover:text-[color:var(--teal)] transition-colors py-2.5 px-4 border border-[color:var(--charcoal)]/[0.14] rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--teal)]"
                >
                  Essential only
                </button>
                <button
                  type="button"
                  onClick={() => commit({ analytics: "granted", ads: "granted" }, "accept_all")}
                  className="tap inline-flex min-h-11 items-center justify-center text-[11px] uppercase tracking-[0.22em] text-[color:var(--ivory)] bg-[color:var(--teal)] hover:bg-[color:var(--teal-2,#1e4a4f)] transition-colors py-2.5 px-4 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--ivory,#FAF8F3)]"
                >
                  Accept all
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setCustomize(false)}
                  className="tap inline-flex min-h-11 items-center justify-center text-[11px] uppercase tracking-[0.22em] text-[color:var(--charcoal-soft)] hover:text-[color:var(--charcoal)] transition-colors py-2 px-3 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--teal)]"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() =>
                    commit(
                      {
                        analytics: analytics ? "granted" : "denied",
                        ads: ads ? "granted" : "denied",
                      },
                      "customise_save",
                    )
                  }
                  className="tap inline-flex min-h-11 items-center justify-center text-[11px] uppercase tracking-[0.22em] text-[color:var(--ivory)] bg-[color:var(--teal)] hover:bg-[color:var(--teal-2,#1e4a4f)] transition-colors py-2.5 px-4 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--ivory,#FAF8F3)]"
                >
                  Save preferences
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ConsentRow({
  label,
  hint,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label
      className={`flex items-start justify-between gap-4 ${disabled ? "opacity-70" : "cursor-pointer"}`}
    >
      <span className="flex-1">
        <span className="block text-[12px] uppercase tracking-[0.2em] text-[color:var(--charcoal)]">
          {label}
        </span>
        <span className="mt-1 block text-[12px] leading-[1.5] text-[color:var(--charcoal-soft)] font-[family-name:var(--font-sans)] normal-case tracking-normal">
          {hint}
        </span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 accent-[color:var(--teal)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--teal)]"
      />
    </label>
  );
}

/** Trigger the banner in "customise" mode from anywhere (e.g. footer link). */
export function openCookieConsent() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("yes:open-cookie-consent"));
}
