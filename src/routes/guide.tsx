/**
 * /guide — the Guide App shell. Separate from Admin: its own sign-in, a
 * bottom tab bar, and only the signed-in guide's own data.
 */
import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bell, CalendarDays, ClipboardList, Home, Menu, User, CalendarCheck, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { db, errMsg } from "@/components/guide/guide-data";
import { GuideInstallButton } from "@/components/guide/GuideInstallButton";
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
  { to: "/guide", label: "Today", icon: Home, exact: true },
  { to: "/guide/calendar", label: "Calendar", icon: CalendarDays, exact: false },
  { to: "/guide/availability", label: "Availability", icon: CalendarCheck, exact: false },
  { to: "/guide/tours", label: "All my tours", icon: ClipboardList, exact: false },
  { to: "/guide/notifications", label: "Alerts", icon: Bell, exact: false },
  { to: "/guide/profile", label: "Profile", icon: User, exact: false },
] as const;

const PRIMARY = ["/guide", "/guide/calendar", "/guide/availability"];

function GuideLayout() {
  const [gate, setGate] = useState<Gate>("checking");
  const [unread, setUnread] = useState(0);
  const [moreOpen, setMoreOpen] = useState(false);
  const primaryTabs = TABS.filter(({ to }) => PRIMARY.includes(to));
  const moreTabs = TABS.filter(({ to }) => !PRIMARY.includes(to));

  const check = async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return setGate("signed-out");
    const { data: gid } = await db.rpc("guide_claim_account");
    if (!gid) return setGate("not-guide");
    setGate("ok");
    const { count } = await db.from("ops_notifications").select("id", { count: "exact", head: true }).is("read_at", null);
    setUnread(count ?? 0);
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
        void db.from("ops_notifications").select("id", { count: "exact", head: true }).is("read_at", null)
          .then(({ count }: { count: number | null }) => setUnread(count ?? 0));
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
    const channel = supabase
      .channel("guide-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "tour_assignments" }, bump)
      .on("postgres_changes", { event: "*", schema: "public", table: "operational_notes" }, bump)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "ops_notifications" }, onNewNotification)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "ops_notifications" }, bump)
      .subscribe();
    return () => { clearTimeout(t); void supabase.removeChannel(channel); };
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
        <div className="max-w-sm space-y-4">
          <h1 className="font-[family-name:var(--font-editorial)] text-[28px]">No guide profile</h1>
          <p className="text-sm text-muted-foreground">This account isn't linked to a YES guide. Ask the office to add your email in the guides list, then sign in again.</p>
          <button className="min-h-11 px-4 border border-border text-[12px] uppercase tracking-[0.18em]" onClick={() => supabase.auth.signOut()}>Sign out</button>
        </div>
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
        <div key={version}><Outlet /></div>
      </main>
      {moreOpen ? (
        <div className="fixed inset-x-3 bottom-20 z-20 border border-border bg-background p-2 shadow-lg">
          <div className="flex items-center justify-between px-2 pb-2"><p className="text-[11px] uppercase text-muted-foreground">More</p><Button variant="ghost" size="icon" className="h-11 w-11" onClick={() => setMoreOpen(false)} aria-label="Close menu"><X aria-hidden /></Button></div>
          <nav aria-label="More guide pages" className="space-y-1">
            {moreTabs.map(({ to, label, icon: Icon, exact }) => (
              <Link key={to} to={to} activeOptions={{ exact }} onClick={() => setMoreOpen(false)} className="relative flex min-h-12 items-center gap-3 px-3 text-sm text-muted-foreground data-[status=active]:bg-muted data-[status=active]:text-primary">
                <Icon className="h-5 w-5" aria-hidden />{label}
                {to === "/guide/notifications" && unread > 0 ? <span className="ml-auto rounded-full bg-destructive px-2 py-0.5 text-xs text-destructive-foreground">{unread}</span> : null}
              </Link>
            ))}
          </nav>
        </div>
      ) : null}
      <nav aria-label="Guide" className="fixed bottom-0 inset-x-0 z-10 bg-background border-t border-border grid grid-cols-4 pb-[env(safe-area-inset-bottom)]">
        {primaryTabs.map(({ to, label, icon: Icon, exact }) => (
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
        <Button variant="ghost" className="relative h-auto min-h-14 rounded-none flex-col gap-0.5 px-1 text-[11px] text-muted-foreground" onClick={() => setMoreOpen((open) => !open)} aria-expanded={moreOpen} aria-label="More guide pages">
          <Menu className="h-5 w-5" aria-hidden />More
          {unread > 0 ? <span className="absolute right-[25%] top-1 min-w-4 rounded-full bg-destructive px-1 text-[11px] text-destructive-foreground">{unread}</span> : null}
        </Button>
      </nav>
    </div>
  );
}

function GuideSignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/guide` } });
        if (error) throw error;
        toast.success("Check your email to confirm your account.");
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
          {mode === "signin" ? "Guide sign-in" : "Create Guide App access"}
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {mode === "signin"
            ? "Returning guide: use the email registered by the office and the password you created for the Guide App."
            : "First time here: use the same email registered by the office, then choose your own password. Your existing guide profile is not yet a sign-in account."}
        </p>
        <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full min-h-12 border border-border px-3 bg-background" />
        <input type="password" required minLength={8} autoComplete={mode === "signin" ? "current-password" : "new-password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="w-full min-h-12 border border-border px-3 bg-background" />
        <button disabled={busy} className="w-full min-h-12 bg-[color:var(--teal)] text-primary-foreground text-[12px] uppercase tracking-[0.18em] disabled:opacity-50">
          {mode === "signin" ? "Sign in" : "Create account"}
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
          {mode === "signin" ? "First time? Create app access" : "Returning guide? Sign in"}
        </button>
      </form>
    </div>
  );
}
