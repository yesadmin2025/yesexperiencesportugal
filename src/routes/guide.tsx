/**
 * /guide — the Guide App shell. Separate from Admin: its own sign-in, a
 * bottom tab bar, and only the signed-in guide's own data.
 */
import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bell, ClipboardList, User, CalendarCheck, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { db, errMsg } from "@/components/guide/guide-data";
import { GuideInstallButton } from "@/components/guide/GuideInstallButton";
import { GuideRefreshContext } from "@/components/guide/guide-refresh";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/guide")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "YES Guide" },
      { name: "robots", content: "noindex, nofollow" },
      { name: "theme-color", content: "var(--teal)" },
      { name: "application-name", content: "YES Guide" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-title", content: "YES Guide" },
    ],
    links: [{ rel: "manifest", href: "/guide.webmanifest" }],
  }),
  component: GuideLayout,
});

type Gate = "checking" | "signed-out" | "not-guide" | "ok";

const TABS = [
  { to: "/guide", label: "Tours", icon: ClipboardList, exact: true },
  { to: "/guide/calendar", label: "Calendar", icon: CalendarDays, exact: false },
  { to: "/guide/availability", label: "Availability", icon: CalendarCheck, exact: false },
  { to: "/guide/profile", label: "Profile", icon: User, exact: false },
] as const;

function GuideLayout() {
  const [gate, setGate] = useState<Gate>("checking");

  const check = async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return setGate("signed-out");
    const { data: gid } = await db.rpc("guide_claim_account");
    if (!gid) return setGate("not-guide");
    setGate("ok");
  };

  useEffect(() => {
    void check();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") void check();
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Live updates: RLS limits events to this guide's own rows.
  const [version, setVersion] = useState(0);
  const [notifPerm, setNotifPerm] = useState<string>(() =>
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported",
  );
  useEffect(() => {
    if (gate !== "ok") return;
    let t: ReturnType<typeof setTimeout> | undefined;
    const bump = () => {
      clearTimeout(t);
      t = setTimeout(() => {
        setVersion((v) => v + 1);
      }, 400);
    };
    // Device notification for a brand-new alert while the app is open (foreground only).
    const onNewNotification = (payload: { new?: { title?: string; message?: string | null; assignment_id?: string | null } }) => {
      bump();
      const n = payload.new;
      if (!n?.title || typeof window === "undefined" || !("Notification" in window) || Notification.permission !== "granted") return;
      try {
        const note = new Notification(n.title, { body: n.message ?? undefined, tag: "yes-guide" });
        note.onclick = () => {
          window.focus();
          if (n.assignment_id) window.location.href = `/guide/tours/${n.assignment_id}`;
        };
      } catch {
        // Some mobile browsers require a service worker for notifications; in-app alert + email remain the guaranteed channels.
      }
    };
    const onFocus = () => { if (document.visibilityState === "visible") bump(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    const poll = setInterval(onFocus, 120000);
    const channel = supabase
      .channel("guide-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "tour_assignments" }, bump)
      .on("postgres_changes", { event: "*", schema: "public", table: "operational_notes" }, bump)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "ops_notifications" }, onNewNotification)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "ops_notifications" }, bump)
      .subscribe();
    return () => { clearTimeout(t); clearInterval(poll); window.removeEventListener("focus", onFocus); document.removeEventListener("visibilitychange", onFocus); void supabase.removeChannel(channel); };
  }, [gate]);

  const enableNotifications = async () => {
    if (!("Notification" in window)) return;
    const result = await Notification.requestPermission();
    setNotifPerm(result);
    if (result === "granted") toast.success("Notifications on. You'll also keep getting alerts inside the app and by email.");
    else if (result === "denied") toast.error("Notifications are blocked in this browser. You'll still see alerts inside the app and by email.");
  };

  if (gate === "checking") return <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">Loading…</div>;
  if (gate === "signed-out") return <GuideSignIn />;
  if (gate === "not-guide")
    return (
      <div className="min-h-screen grid place-items-center p-6 text-center">
        <GuideJoinRequest />

      </div>
    );

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-10 bg-background/95 border-b border-border px-4 h-14 flex items-center justify-between gap-2">
        <span className="font-[family-name:var(--font-editorial)] text-[19px] text-[color:var(--teal)]">YES Guide</span>
        <div className="flex items-center gap-2">
          {notifPerm === "default" && (
            <Button variant="ghost" className="h-9 px-2 text-xs" onClick={enableNotifications} aria-label="Enable notifications">
              <Bell className="h-4 w-4" aria-hidden />
            </Button>
          )}
          <GuideInstallButton className="h-9 px-3 text-xs" />
        </div>
      </header>
      <main className="px-4 py-5 max-w-xl mx-auto">
        <GuideRefreshContext.Provider value={version}><Outlet /></GuideRefreshContext.Provider>
      </main>
      <nav aria-label="Guide" className="fixed bottom-0 inset-x-0 z-10 bg-background border-t border-border grid grid-cols-4 pb-[env(safe-area-inset-bottom)]">
        {TABS.map(({ to, label, icon: Icon, exact }) => (
          <Link
            key={to}
            to={to}
            activeOptions={{ exact }}
            className="relative flex flex-col items-center justify-center gap-0.5 min-h-14 text-[11px] text-muted-foreground"
            activeProps={{ className: "text-[color:var(--teal)]" }}
          >
            <Icon className="h-5 w-5" aria-hidden />
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

/** Signed in, but this email is not linked to an active guide profile: no access is granted. */
function GuideJoinRequest() {
  const [pending, setPending] = useState<boolean | null>(null);
  const [email, setEmail] = useState<string>("");
  useEffect(() => {
    void db.rpc("guide_access_pending").then(({ data }: { data: boolean | null }) => setPending(!!data));
    void supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ""));
  }, []);
  if (pending === null) return null;
  return (
    <div className="w-full max-w-sm space-y-4">
      <p className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--gold)]">YES Guide</p>
      <h1 className="font-[family-name:var(--font-editorial)] text-[28px] leading-tight">{pending ? "Waiting for approval" : "Access not found"}</h1>
      <p className="text-sm text-muted-foreground">
        {pending
          ? "The office is reviewing your access. Your tours appear here once you're approved."
          : <>We couldn't find an active guide profile for <strong className="break-all text-foreground">{email || "this email"}</strong>. Please contact the office so they can add or correct your email, then sign in again.</>}
      </p>
      <button className="min-h-11 px-4 border border-border text-[12px] uppercase tracking-[0.18em]" onClick={() => supabase.auth.signOut()}>Sign out</button>
    </div>
  );
}

function GuideSignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup" | "reset">("signin");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/guide-reset-password` });
        if (error) throw error;
        toast.success("If this email has an account, a reset link is on its way.");
        setMode("signin");
      } else if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/guide` } });
        if (error) throw error;
        toast.success("Check your email and tap the confirmation link. If you already have an account, sign in instead.");
        setMode("signin");
      }
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center p-6">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4">
        <p className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--gold)]">YES Experiences</p>
        <h1 className="font-[family-name:var(--font-editorial)] text-[32px] leading-tight">
          {mode === "signin" ? "Guide sign-in" : mode === "reset" ? "Reset your password" : "Create Guide App access"}
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {mode === "signin"
            ? "Returning guide: use the email registered by the office and the password you created for the Guide App."
            : mode === "reset"
              ? "Enter your guide email and we'll send a link to choose a new password."
              : "First time here: use the exact email the office saved for you, then choose your own password. Only do this once — afterwards, sign in."}
        </p>
        <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full min-h-12 border border-border px-3 bg-background" />
        {mode !== "reset" ? <input type="password" required minLength={8} autoComplete={mode === "signin" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="w-full min-h-12 border border-border px-3 bg-background" /> : null}
        <button disabled={busy} className="w-full min-h-12 bg-[color:var(--teal)] text-primary-foreground text-[12px] uppercase tracking-[0.18em] disabled:opacity-50">
          {mode === "signin" ? "Sign in" : mode === "reset" ? "Send reset link" : "Create account"}
        </button>
        <button
          type="button"
          className="w-full min-h-12 border border-border text-[12px] uppercase tracking-[0.18em]"
          onClick={async () => {
            const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: `${window.location.origin}/guide` });
            if (r.error) toast.error(errMsg(r.error));
          }}
        >
          Continue with Google
        </button>
        <button type="button" className="w-full text-sm text-[color:var(--teal)] min-h-11" onClick={() => setMode(mode === "signin" ? "signup" : "signin")}>
          {mode === "signin" ? "First time? Create your password" : "Returning guide? Sign in"}
        </button>
        {mode === "signin" ? <button type="button" className="w-full text-sm text-muted-foreground min-h-11" onClick={() => setMode("reset")}>Forgot password?</button> : null}
      </form>
    </div>
  );
}
