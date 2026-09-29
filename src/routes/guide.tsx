/**
 * /guide — the Guide App shell. Separate from Admin: its own sign-in, a
 * bottom tab bar, and only the signed-in guide's own data.
 */
import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bell, CalendarDays, ClipboardList, Home, User, CalendarCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { db, errMsg } from "@/components/guide/guide-data";

export const Route = createFileRoute("/guide")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "YES Guide" },
      { name: "robots", content: "noindex, nofollow" },
      { name: "theme-color", content: "var(--teal)" },
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
  { to: "/guide/tours", label: "Tours", icon: ClipboardList, exact: false },
  { to: "/guide/availability", label: "Availability", icon: CalendarCheck, exact: false },
  { to: "/guide/notifications", label: "Alerts", icon: Bell, exact: false },
  { to: "/guide/profile", label: "Profile", icon: User, exact: false },
] as const;

function GuideLayout() {
  const [gate, setGate] = useState<Gate>("checking");
  const [unread, setUnread] = useState(0);

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
    const channel = supabase
      .channel("guide-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "tour_assignments" }, bump)
      .on("postgres_changes", { event: "*", schema: "public", table: "operational_notes" }, bump)
      .on("postgres_changes", { event: "*", schema: "public", table: "ops_notifications" }, bump)
      .subscribe();
    return () => { clearTimeout(t); void supabase.removeChannel(channel); };
  }, [gate]);

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
      <header className="sticky top-0 z-10 bg-background/95 border-b border-border px-4 h-14 flex items-center justify-between">
        <span className="font-[family-name:var(--font-editorial)] text-[19px] text-[color:var(--teal)]">YES Guide</span>
      </header>
      <main className="px-4 py-5 max-w-xl mx-auto">
        <div key={version}><Outlet /></div>
      </main>
      <nav aria-label="Guide" className="fixed bottom-0 inset-x-0 z-10 bg-background border-t border-border grid grid-cols-6 pb-[env(safe-area-inset-bottom)]">
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
            {to === "/guide/notifications" && unread > 0 && (
              <span className="absolute top-1.5 right-[22%] min-w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[11px] leading-4 px-1">{unread}</span>
            )}
          </Link>
        ))}
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
        <h1 className="font-[family-name:var(--font-editorial)] text-[32px] leading-tight">Guide sign-in</h1>
        <p className="text-sm text-muted-foreground">Use the email the office has on file for you.</p>
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
          {mode === "signin" ? "First time? Create your account" : "Already have an account? Sign in"}
        </button>
      </form>
    </div>
  );
}
