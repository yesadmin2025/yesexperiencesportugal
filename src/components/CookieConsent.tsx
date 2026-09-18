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
  // A modal (guest details, checkout) must never be blocked by the consent
  // bar: on small screens the bar sits exactly over the modal's primary
  // action and intercepts the tap. Yield while any modal dialog is open.
  const [modalOpen, setModalOpen] = React.useState(false);

  React.useEffect(() => {
    if (!hydrated) return;
    const sync = () =>
      setModalOpen(
        document.querySelectorAll('[role="dialog"][data-state="open"], [data-radix-dialog-content]')
          .length > 0,
      );
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["data-state"],
    });
    return () => observer.disconnect();
  }, [hydrated]);

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
      className="fixed inset-x-0 bottom-0 z-[70] pointer-events-none px-0 pb-0 sm:px-5 sm:pb-4"
    >
      <div
        className="cookie-consent-card pointer-events-auto mx-auto max-w-none overflow-hidden rounded-t-[8px] border-t border-[color:var(--charcoal)]/[0.1] bg-[color:var(--ivory)] shadow-[var(--shadow-elevated)] sm:max-w-[980px] sm:rounded-[6px] sm:border"
      >
        <div
          data-cookie-card
          className={
            customize
              ? "px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5 sm:py-4"
              : "px-3 pt-2 pb-[max(0.4rem,env(safe-area-inset-bottom))] sm:flex sm:items-center sm:gap-5 sm:px-5 sm:py-2.5"
          }
        >
          <div className={customize ? undefined : "sm:flex-1"}>
            <p
              id="cookie-consent-title"
              className="t-h3 text-[12px] leading-[1.15] text-[color:var(--charcoal)] sm:text-[15px]"
            >
              We use cookies
            </p>
            <p className="mt-0.5 max-w-[62ch] font-sans text-[10px] leading-[1.25] text-[color:var(--charcoal-soft)] sm:text-[12px] sm:leading-[1.42]">
              Essential cookies keep the site working. Analytics help us improve.{" "}
              <a
                href="/cookies"
                className="underline decoration-[color:var(--gold-warm)]/60 underline-offset-[3px] hover:text-[color:var(--charcoal)]"
              >
                Cookie policy
              </a>
              .
            </p>
          </div>

          {customize && (
            <div className="mt-3 space-y-2.5 rounded-md bg-[color:var(--sand,rgba(201,169,106,0.06))] p-3">
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

          <div
            className={
              customize
                ? "mt-3 flex items-center justify-end gap-2"
                : "mt-1 flex items-center gap-1 sm:mt-0 sm:shrink-0 sm:gap-2"
            }
          >
            {!customize ? (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setCustomize(true)}
                  className="tap min-h-11 shrink-0 rounded-sm px-1.5 text-[9px] uppercase tracking-[0.12em] text-[color:var(--charcoal-soft)] hover:bg-transparent hover:text-[color:var(--teal)] sm:px-3 sm:text-[10.5px] sm:tracking-[0.16em]"
                >
                  Customise
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => commit({ analytics: "denied", ads: "denied" }, "essential_only")}
                  className="tap min-h-11 flex-1 rounded-sm border-[color:var(--charcoal)]/[0.18] bg-transparent px-1.5 text-[9px] uppercase tracking-[0.08em] text-[color:var(--charcoal)] shadow-none hover:border-[color:var(--teal)] hover:bg-transparent hover:text-[color:var(--teal)] sm:flex-none sm:px-3 sm:text-[10.5px] sm:tracking-[0.14em]"
                >
                  Essential only
                </Button>
                <Button
                  type="button"
                  onClick={() => commit({ analytics: "granted", ads: "granted" }, "accept_all")}
                  className="tap min-h-11 flex-1 rounded-sm bg-[color:var(--teal)] px-1.5 text-[9px] uppercase tracking-[0.1em] text-[color:var(--ivory)] shadow-none hover:bg-[color:var(--teal-2)] sm:flex-none sm:px-4 sm:text-[10.5px] sm:tracking-[0.16em]"
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
