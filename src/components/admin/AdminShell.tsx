/**
 * AdminShell — the calm frame around the four primary admin destinations:
 * Today · Bookings · Guides · Settings.
 *
 * `AdminFrame` is mounted once by the /admin layout route, so every admin
 * page (old or new) sits inside the same menu. Pages that use `AdminShell`
 * only add their editorial header; the frame supplies navigation and the
 * front-door admin check. Server functions still enforce admin access on
 * every call — this is only the front-door check.
 */
import { Link, useNavigate } from "@tanstack/react-router";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { CalendarDays, Home, Settings, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const NAV = [
  { to: "/admin", label: "Today", icon: Home, exact: true },
  { to: "/admin/bookings", label: "Bookings", icon: CalendarDays, exact: false },
  { to: "/admin/guides", label: "Guides", icon: Users, exact: false },
  { to: "/admin/settings", label: "Settings", icon: Settings, exact: false },
] as const;

type Gate = "checking" | "ok" | "denied";

const FrameContext = createContext(false);

function useAdminGate(): Gate {
  const navigate = useNavigate();
  const [gate, setGate] = useState<Gate>("checking");
  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (!user) {
        if (active) setGate("denied");
        navigate({ to: "/auth" });
        return;
      }
      const { data: isAdmin, error } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      if (!active) return;
      if (error || isAdmin !== true) {
        setGate("denied");
        navigate({ to: "/auth" });
        return;
      }
      setGate("ok");
    })();
    return () => {
      active = false;
    };
  }, [navigate]);
  return gate;
}

/** Mounted once by src/routes/admin.tsx around every admin page. */
export function AdminFrame({ children }: { children: ReactNode }) {
  const gate = useAdminGate();
  return (
    <FrameContext.Provider value={true}>
      <div className="min-h-[100dvh] bg-[color:var(--ivory)] text-[color:var(--charcoal)]">
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-56 flex-col border-r border-[color:var(--charcoal)]/[0.08] bg-[color:var(--ivory)] px-5 py-8 md:flex">
          <Link to="/admin" className="font-[family-name:var(--font-editorial)] text-[19px] text-[color:var(--charcoal)]">
            YES <span className="text-[color:var(--teal)]">Operations</span>
          </Link>
          <nav aria-label="Admin" className="mt-10 flex flex-col gap-1">
            {NAV.map(({ to, label, icon: Icon, exact }) => (
              <Link
                key={to}
                to={to}
                activeOptions={{ exact }}
                className="flex min-h-11 items-center gap-3 rounded-md px-3 text-[13.5px] text-[color:var(--charcoal-soft)] transition-colors duration-150 hover:text-[color:var(--charcoal)] data-[status=active]:bg-[color:var(--sand)] data-[status=active]:text-[color:var(--charcoal)]"
              >
                <Icon size={16} strokeWidth={1.6} aria-hidden />
                {label}
              </Link>
            ))}
          </nav>
          <Link to="/" className="mt-auto text-[11px] uppercase tracking-[0.18em] text-[color:var(--charcoal-soft)]">
            View website
          </Link>
        </aside>

        <div className="pb-24 md:ml-56 md:pb-0">
          {gate === "ok" ? (
            children
          ) : (
            <p className="px-4 pt-10 text-sm text-[color:var(--charcoal-soft)] md:px-10">
              {gate === "checking" ? "Checking your access…" : "Taking you to sign in…"}
            </p>
          )}
        </div>

        <nav
          aria-label="Admin"
          className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-[color:var(--charcoal)]/[0.08] bg-[color:var(--ivory)]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
        >
          {NAV.map(({ to, label, icon: Icon, exact }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact }}
              className="flex min-h-14 flex-col items-center justify-center gap-1 text-[10.5px] uppercase tracking-[0.12em] text-[color:var(--charcoal-soft)] data-[status=active]:text-[color:var(--teal)]"
            >
              <Icon size={18} strokeWidth={1.6} aria-hidden />
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </FrameContext.Provider>
  );
}

export function AdminShell({
  title,
  eyebrow,
  actions,
  children,
}: {
  title: string;
  eyebrow?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const inFrame = useContext(FrameContext);
  const body = (
    <main className="px-4 pb-8 pt-8 md:px-10 md:pb-16 md:pt-12">
      <div className="mx-auto max-w-4xl">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            {eyebrow ? <p className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--gold)]">{eyebrow}</p> : null}
            <h1 className="mt-1 font-[family-name:var(--font-editorial)] text-[28px] leading-tight md:text-[34px]">
              {title}
            </h1>
          </div>
          {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
        </header>
        <div className="mt-6">{children}</div>
      </div>
    </main>
  );
  return inFrame ? body : <AdminFrame>{body}</AdminFrame>;
}

/** A quiet section heading used across the four primary screens. */
export function AdminSectionTitle({ children, count }: { children: ReactNode; count?: number }) {
  return (
    <h2 className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--charcoal-soft)]">
      {children}
      {typeof count === "number" ? <span className="ml-2 text-[color:var(--charcoal)]">{count}</span> : null}
    </h2>
  );
}
