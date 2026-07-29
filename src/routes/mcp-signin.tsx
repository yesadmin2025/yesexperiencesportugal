/**
 * MCP sign-in — dedicated auth landing for the OAuth consent flow.
 *
 * Kept separate from /auth (which enforces an admin-only role gate) so any
 * traveller can sign in or sign up when an external MCP client redirects
 * them through consent. Preserves `next` on every path — password sign-in,
 * signup emailRedirectTo, and Google OAuth redirect_uri — so users always
 * land back on /.lovable/oauth/consent with the same authorization_id.
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteLayout } from "@/components/SiteLayout";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { toast } from "sonner";

function safeNext(raw: string | undefined): string {
  // Only same-origin relative paths — never an absolute URL.
  if (!raw) return "/";
  try {
    if (!raw.startsWith("/") || raw.startsWith("//")) return "/";
    return raw;
  } catch {
    return "/";
  }
}

export const Route = createFileRoute("/mcp-signin")({
  head: () => ({
    meta: [
      { title: "Sign in to connect · YES Experiences" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) => ({
    next: typeof s.next === "string" ? s.next : "/",
  }),
  component: McpSignInPage,
});

function McpSignInPage() {
  const navigate = useNavigate();
  const { next } = Route.useSearch();
  const nextPath = safeNext(next);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Already signed in? Go straight to the consent route.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        navigate({ to: nextPath });
      }
    });
  }, [navigate, nextPath]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrorMsg(null);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: nextPath });
      } else {
        const emailRedirectTo = `${window.location.origin}${nextPath}`;
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo },
        });
        if (error) throw error;
        toast.success("Check your email to confirm your account, then continue the connection.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Sign-in failed.";
      setErrorMsg(msg);
    } finally {
      setBusy(false);
    }
  };

  const signInWithGoogle = async () => {
    setGoogleBusy(true);
    setErrorMsg(null);
    try {
      // Full same-origin URL required for the OAuth broker — send Google back
      // to the consent route so the authorization_id is preserved.
      const redirectUri = `${window.location.origin}${nextPath}`;
      const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: redirectUri });
      if (result.error) {
        setErrorMsg(result.error.message ?? "Google sign-in failed.");
        setGoogleBusy(false);
        return;
      }
      if (result.redirected) return;
      // Popup path — session already set.
      navigate({ to: nextPath });
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Google sign-in failed.");
      setGoogleBusy(false);
    }
  };

  return (
    <SiteLayout>
      <main className="min-h-[80vh] flex items-center justify-center px-6 py-16">
        <div
          className="w-full max-w-[440px] border p-8"
          style={{
            borderColor: "color-mix(in oklab, var(--charcoal) 12%, transparent)",
            background: "var(--ivory)",
          }}
        >
          <Eyebrow>Sign in to continue</Eyebrow>
          <h1
            className="mt-3 text-[24px] leading-[1.2]"
            style={{
              fontFamily: "var(--font-editorial)",
              color: "var(--charcoal)",
              fontWeight: 500,
            }}
          >
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </h1>
          <p
            className="mt-3 text-[13.5px]"
            style={{ color: "color-mix(in oklab, var(--charcoal) 72%, transparent)" }}
          >
            Sign in with the account you used to save your Signature journey, then approve the
            connection on the next screen.
          </p>

          <button
            type="button"
            onClick={signInWithGoogle}
            disabled={googleBusy || busy}
            className="mt-6 w-full h-11 border text-[13.5px] disabled:opacity-60"
            style={{
              borderColor: "color-mix(in oklab, var(--charcoal) 18%, transparent)",
              color: "var(--charcoal)",
              background: "var(--ivory)",
            }}
          >
            {googleBusy ? "Opening Google…" : "Continue with Google"}
          </button>

          <div
            className="my-5 flex items-center gap-3 text-[10.5px] uppercase tracking-[0.22em]"
            style={{ color: "color-mix(in oklab, var(--charcoal) 50%, transparent)" }}
          >
            <div
              className="h-px flex-1"
              style={{ background: "color-mix(in oklab, var(--charcoal) 12%, transparent)" }}
            />
            <span>or email</span>
            <div
              className="h-px flex-1"
              style={{ background: "color-mix(in oklab, var(--charcoal) 12%, transparent)" }}
            />
          </div>

          <form onSubmit={submit} className="space-y-3">
            <input
              type="email"
              required
              autoComplete="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-11 px-3 border text-[14px]"
              style={{
                borderColor: "color-mix(in oklab, var(--charcoal) 18%, transparent)",
                background: "white",
              }}
            />
            <input
              type="password"
              required
              minLength={6}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-11 px-3 border text-[14px]"
              style={{
                borderColor: "color-mix(in oklab, var(--charcoal) 18%, transparent)",
                background: "white",
              }}
            />
            {errorMsg ? (
              <p role="alert" className="text-[13px]" style={{ color: "#B4341E" }}>
                {errorMsg}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={busy || googleBusy}
              className="w-full h-11 text-[13.5px] uppercase tracking-[0.22em] disabled:opacity-60"
              style={{ background: "var(--charcoal)", color: "var(--ivory)" }}
            >
              {busy
                ? mode === "signin"
                  ? "Signing in…"
                  : "Creating account…"
                : mode === "signin"
                  ? "Sign in"
                  : "Create account"}
            </button>
          </form>

          <button
            type="button"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="mt-5 w-full text-center text-[12.5px] underline"
            style={{ color: "color-mix(in oklab, var(--charcoal) 70%, transparent)" }}
          >
            {mode === "signin" ? "New here? Create an account" : "Already have an account? Sign in"}
          </button>
        </div>
      </main>
    </SiteLayout>
  );
}
