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
import { Button } from "@/components/ui/button";

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
      className="fixed inset-x-0 bottom-0 z-[70] pointer-events-none px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6 sm:pb-6"
    >
      <div
        className="cookie-consent-card pointer-events-auto mx-auto max-w-[620px] overflow-hidden rounded-[8px] border border-[color:var(--charcoal)]/[0.1] bg-[color:var(--ivory)] shadow-[var(--shadow-elevated)]"
      >
        <div data-cookie-card className="p-4 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <p
                id="cookie-consent-title"
                className="font-[family-name:var(--font-display)] text-[16px] leading-[1.3] text-[color:var(--charcoal)] sm:text-[17px]"
                style={{ fontWeight: 500 }}
              >
                We use cookies to shape your journey
              </p>
              <p className="mt-1.5 max-w-[52ch] font-[family-name:var(--font-sans)] text-[12px] leading-[1.55] text-[color:var(--charcoal-soft)] sm:text-[13px]">
                Essential cookies keep the site working. Analytics help us improve your experience.{" "}
                <a
                  href="/cookies"
                  className="underline decoration-[color:var(--gold-warm)]/60 underline-offset-[3px] hover:text-[color:var(--charcoal)]"
                >
                  Cookie policy
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

          <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
            {!customize ? (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setCustomize(true)}
                  className="tap order-3 col-span-2 min-h-11 rounded-sm px-3 text-[10px] uppercase tracking-[0.18em] text-[color:var(--charcoal-soft)] hover:bg-transparent hover:text-[color:var(--teal)] sm:order-1 sm:col-auto sm:text-[11px]"
                >
                  Customise
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => commit({ analytics: "denied", ads: "denied" }, "essential_only")}
                  className="tap order-1 min-h-11 rounded-sm border-[color:var(--charcoal)]/[0.18] bg-transparent px-3 text-[10px] uppercase tracking-[0.12em] text-[color:var(--charcoal)] shadow-none hover:border-[color:var(--teal)] hover:bg-transparent hover:text-[color:var(--teal)] sm:order-2 sm:text-[11px] sm:tracking-[0.16em]"
                >
                  Essential only
                </Button>
                <Button
                  type="button"
                  onClick={() => commit({ analytics: "granted", ads: "granted" }, "accept_all")}
                  className="tap order-2 min-h-11 rounded-sm bg-[color:var(--teal)] px-3 text-[10px] uppercase tracking-[0.14em] text-[color:var(--ivory)] shadow-none hover:bg-[color:var(--teal-2)] sm:order-3 sm:text-[11px] sm:tracking-[0.18em]"
                >
                  Accept all
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setCustomize(false)}
                  className="tap min-h-11 rounded-sm text-[10px] uppercase tracking-[0.18em] text-[color:var(--charcoal-soft)]"
                >
                  Back
                </Button>
                <Button
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
                  className="tap min-h-11 rounded-sm bg-[color:var(--teal)] px-4 text-[10px] uppercase tracking-[0.14em] text-[color:var(--ivory)] shadow-none hover:bg-[color:var(--teal-2)]"
                >
                  Save preferences
                </Button>
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
