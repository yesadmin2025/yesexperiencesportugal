import { useEffect, useState } from "react";

/**
 * InstallAppPrompt — quiet, dismissible invitation to install YES as a real app.
 *
 * Android / desktop Chromium: uses the native `beforeinstallprompt` event.
 * iOS Safari: no such event exists, so we show the exact Add to Home Screen
 * steps instead. Hidden entirely once the app runs standalone.
 */

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "yes-install-dismissed";

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function InstallAppPrompt() {
  const [deferred, setDeferred] = useState<InstallPromptEvent | null>(null);
  const [iosHint, setIosHint] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    if (localStorage.getItem(DISMISS_KEY) === "1") return;

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as InstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    const ua = window.navigator.userAgent;
    const isIos = /iPad|iPhone|iPod/.test(ua);
    const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
    if (isIos && isSafari) {
      const timer = window.setTimeout(() => {
        setIosHint(true);
        setVisible(true);
      }, 12_000);
      return () => {
        window.clearTimeout(timer);
        window.removeEventListener("beforeinstallprompt", onPrompt);
      };
    }

    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Install YES Experiences"
      data-testid="install-app-prompt"
      className="fixed inset-x-3 bottom-3 z-40 rounded-lg border border-[color:var(--border)] bg-[color:var(--ivory)] p-4 shadow-lg md:left-auto md:right-4 md:w-[22rem]"
    >
      <span className="block text-[11px] uppercase tracking-[0.22em] text-[color:var(--teal)]">
        Keep Portugal close
      </span>
      <p className="mt-2 text-[14.5px] leading-snug text-[color:var(--charcoal)]">
        {iosHint
          ? "Add YES to your Home Screen: tap Share, then Add to Home Screen."
          : "Install YES as an app — design and reserve your day without opening a browser."}
      </p>
      <div className="mt-4 flex items-center gap-3">
        {!iosHint && (
          <button
            type="button"
            onClick={install}
            className="min-h-11 rounded-full bg-[color:var(--teal)] px-5 text-[13px] text-[color:var(--ivory)]"
          >
            Install the app
          </button>
        )}
        <button
          type="button"
          onClick={dismiss}
          className="min-h-11 px-2 text-[13px] text-[color:var(--charcoal-soft)] underline underline-offset-4"
        >
          Not now
        </button>
      </div>
    </div>
  );
}

export default InstallAppPrompt;
