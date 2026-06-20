import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteLayout } from "@/components/SiteLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Eyebrow } from "@/components/ui/Eyebrow";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — YES experiences Portugal" },
      { property: "og:url", content: "https://yesexperiencesportugal.com/auth" },
    ],
    links: [{ rel: "canonical", href: "https://yesexperiencesportugal.com/auth" }],
  }),

  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  // Already signed in? Bounce to admin.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/admin/import-tours" });
    });
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Signed in");
        navigate({ to: "/admin/import-tours" });
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth` },
        });
        if (error) throw error;
        toast.success("Account created — check your email to confirm.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Auth failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SiteLayout>
      <section className="pt-32 pb-20 min-h-[80vh] flex items-center">
        <div className="container-x max-w-md mx-auto w-full">
          <Eyebrow>Studio Access</Eyebrow>
          <h1 className="serif text-4xl mt-4">
            {mode === "signin" ? "Sign in" : "Create account"}
          </h1>
          <p className="mt-3 text-sm text-[color:var(--charcoal-soft)]">
            Admin access for the tour importer and internal tools.
          </p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            <label className="block">
              <span className="text-xs uppercase tracking-[0.22em] text-[color:var(--charcoal-soft)]">
                Email
              </span>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2 w-full border border-[color:var(--border)] bg-[color:var(--card)] px-4 py-3 text-[color:var(--charcoal)] focus:outline-none focus:border-[color:var(--gold)]"
              />
            </label>

            <label className="block">
              <span className="text-xs uppercase tracking-[0.22em] text-[color:var(--charcoal-soft)]">
                Password
              </span>
              <input
                type="password"
                required
                minLength={6}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-2 w-full border border-[color:var(--border)] bg-[color:var(--card)] px-4 py-3 text-[color:var(--charcoal)] focus:outline-none focus:border-[color:var(--gold)]"
              />
            </label>

            <button
              type="submit"
              disabled={busy}
              className="w-full bg-[color:var(--teal)] hover:bg-[color:var(--teal-2)] disabled:opacity-60 text-[color:var(--ivory)] px-5 py-3 text-sm tracking-wide transition-all"
            >
              {busy ? "Working…" : mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>

          <div className="mt-6 flex items-center justify-between text-sm">
            <button
              type="button"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="text-[color:var(--teal)] hover:text-[color:var(--teal-2)]"
            >
              {mode === "signin" ? "Need an account?" : "Have an account?"}
            </button>
            <Link
              to="/"
              className="text-[color:var(--charcoal-soft)] hover:text-[color:var(--charcoal)]"
            >
              ← Back home
            </Link>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
