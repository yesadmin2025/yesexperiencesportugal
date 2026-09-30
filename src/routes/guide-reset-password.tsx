import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/guide-reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Reset password · YES Guide" },
      { name: "description", content: "Choose a new password for the YES Guide App." },
      { property: "og:title", content: "Reset password · YES Guide" },
      { property: "og:description", content: "Choose a new password for the YES Guide App." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [{ rel: "manifest", href: "/guide.webmanifest" }],
  }),
  component: GuideResetPassword,
});

function GuideResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const isRecovery = window.location.hash.includes("type=recovery");
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    void supabase.auth.getSession().then(({ data }) => { if (data.session && isRecovery) setReady(true); else if (data.session) setReady(true); });
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Password updated.");
    void navigate({ to: "/guide", replace: true });
  };

  return (
    <div className="min-h-screen grid place-items-center p-6">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4">
        <p className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--gold)]">YES Guide</p>
        <h1 className="font-[family-name:var(--font-editorial)] text-[32px] leading-tight">Choose a new password</h1>
        {ready ? (
          <>
            <input type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New password (8+ characters)" className="w-full min-h-12 border border-border px-3 bg-background" />
            <button disabled={busy} className="w-full min-h-12 bg-[color:var(--teal)] text-primary-foreground text-[12px] uppercase tracking-[0.18em] disabled:opacity-50">
              {busy ? "Saving…" : "Save password"}
            </button>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Open this page from the reset link in your email. If the link expired, request a new one from the Guide sign-in.</p>
        )}
      </form>
    </div>
  );
}
