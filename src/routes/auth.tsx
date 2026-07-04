import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteLayout } from "@/components/SiteLayout";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";
import { Eyebrow } from "@/components/ui/Eyebrow";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Admin — YES experiences Portugal" },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:url", content: "https://yesexperiencesportugal.com/auth" },
    ],
    links: [{ rel: "canonical", href: "https://yesexperiencesportugal.com/auth" }],
  }),

  component: AuthPage,
});

async function routeByRole(userId: string, navigate: ReturnType<typeof useNavigate>) {
  // Use the security-definer RPC so this never trips on RLS edge cases.
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });

  // eslint-disable-next-line no-console
  console.log("[auth] has_role result", { userId, data, error });

  if (error) {
    toast.error(`Não foi possível verificar as permissões: ${error.message}`);
    return;
  }

  if (data === true) {
    toast.success("Bem-vindo. A abrir o painel admin…");
    navigate({ to: "/admin" });
  } else {
    toast.error("Esta conta não tem permissões de admin.");
    await supabase.auth.signOut();
  }
}

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Already signed in? Verify role and redirect.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        routeByRole(data.session.user.id, navigate);
      }
    });
  }, [navigate]);

  const translate = (msg: string) => {
    const m = msg.toLowerCase();
    if (m.includes("invalid login")) return "Email ou palavra-passe incorretos.";
    if (m.includes("email not confirmed")) return "Confirma o teu email antes de entrar.";
    if (m.includes("user already registered")) return "Esta conta já existe. Faz sign in.";
    if (m.includes("rate limit")) return "Demasiadas tentativas. Tenta novamente em breve.";
    return msg;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErrorMsg(null);
    try {
      if (mode === "signin") {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.user) await routeByRole(data.user.id, navigate);
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth` },
        });
        if (error) throw error;
        toast.success("Conta criada — confirma o email para continuar.");
        setMode("signin");
      }
    } catch (err) {
      const raw = err instanceof Error ? err.message : "Falha na autenticação.";
      const friendly = translate(raw);
      setErrorMsg(friendly);
      toast.error(friendly);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SiteLayout>
      <section className="pt-32 pb-20 min-h-[80vh] flex items-center">
        <div className="container-x max-w-md mx-auto w-full">
          <div className="inline-flex items-center gap-2 px-3 py-1 border border-[color:var(--gold)]/40 bg-[color:var(--gold)]/10 text-[color:var(--charcoal)] text-[10px] uppercase tracking-[0.24em]">
            <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--gold)]" />
            Admin area — restricted access
          </div>
          <Eyebrow className="mt-6">Studio Access</Eyebrow>
          <h1 className="serif text-4xl mt-4">
            {mode === "signin" ? "Entrar como admin" : "Criar conta admin"}
          </h1>
          <p className="mt-3 text-sm text-[color:var(--charcoal-soft)]">
            Esta página dá acesso ao painel <code className="text-[color:var(--teal)]">/admin</code>{" "}
            com reservas, mensagens e leads em tempo real. Apenas contas com o papel{" "}
            <strong className="font-medium text-[color:var(--charcoal)]">admin</strong> podem entrar.
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
                placeholder="yesexperiences@gmail.com"
                className="mt-2 w-full border border-[color:var(--border)] bg-[color:var(--card)] px-4 py-3 text-[color:var(--charcoal)] focus:outline-none focus:border-[color:var(--gold)]"
              />
            </label>

            <label className="block">
              <span className="text-xs uppercase tracking-[0.22em] text-[color:var(--charcoal-soft)]">
                Palavra-passe
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

            {errorMsg && (
              <div
                role="alert"
                className="border border-red-300 bg-red-50 text-red-800 text-sm px-3 py-2"
              >
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full bg-[color:var(--teal)] hover:bg-[color:var(--teal-2)] disabled:opacity-60 text-[color:var(--ivory)] px-5 py-3 text-sm tracking-wide transition-all"
            >
              {busy ? "A entrar…" : mode === "signin" ? "Entrar no painel admin" : "Criar conta"}
            </button>

            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-[color:var(--charcoal)]/10" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-[color:var(--ivory,#FAF8F3)] px-3 text-[10px] uppercase tracking-[0.24em] text-[color:var(--charcoal-soft)]">
                  ou
                </span>
              </div>
            </div>

            <button
              type="button"
              disabled={busy || googleBusy}
              aria-busy={googleBusy}
              onClick={async () => {
                setGoogleBusy(true);
                setErrorMsg(null);
                try {
                  const result = await lovable.auth.signInWithOAuth("google", {
                    redirect_uri: window.location.origin + "/auth",
                  });
                  if (result.error) {
                    const raw = result.error.message ?? "";
                    const m = raw.toLowerCase();
                    let friendly = raw || "Não foi possível iniciar sessão com Google.";
                    if (m.includes("popup") && m.includes("closed"))
                      friendly = "Janela do Google fechada antes de concluir. Tenta novamente.";
                    else if (m.includes("popup") && m.includes("block"))
                      friendly = "O browser bloqueou a janela do Google. Permite popups para este site.";
                    else if (m.includes("unsupported provider"))
                      friendly = "Google sign-in ainda não está ativo. Contacta o admin.";
                    else if (m.includes("network") || m.includes("fetch"))
                      friendly = "Sem ligação. Verifica a internet e tenta de novo.";
                    throw new Error(friendly);
                  }
                  if (result.redirected) return;
                  const { data, error } = await supabase.auth.getUser();
                  if (error) throw new Error("Sessão inválida após Google. Tenta novamente.");
                  if (data.user) await routeByRole(data.user.id, navigate);
                } catch (err) {
                  const msg = err instanceof Error ? err.message : "Falha no Google sign-in.";
                  setErrorMsg(msg);
                  toast.error(msg);
                } finally {
                  setGoogleBusy(false);
                }
              }}
              className="w-full inline-flex items-center justify-center gap-3 border border-[color:var(--charcoal)]/15 bg-white hover:bg-[color:var(--sand)] disabled:opacity-60 disabled:cursor-not-allowed text-[color:var(--charcoal)] px-5 py-3 text-sm tracking-wide transition-all"
            >
              {googleBusy ? (
                <>
                  <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" opacity="0.25"/>
                    <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round"/>
                  </svg>
                  A ligar ao Google…
                </>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                    <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
                    <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.583-5.036-3.71H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
                    <path fill="#FBBC05" d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"/>
                    <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z"/>
                  </svg>
                  Continuar com Google
                </>
              )}
            </button>
          </form>

          <div className="mt-6 flex items-center justify-between text-sm">
            <button
              type="button"
              onClick={() => {
                setMode(mode === "signin" ? "signup" : "signin");
                setErrorMsg(null);
              }}
              className="text-[color:var(--teal)] hover:text-[color:var(--teal-2)]"
            >
              {mode === "signin" ? "Criar conta admin" : "Já tenho conta"}
            </button>
            <Link
              to="/"
              className="text-[color:var(--charcoal-soft)] hover:text-[color:var(--charcoal)]"
            >
              ← Voltar ao site
            </Link>
          </div>

          <p className="mt-8 text-xs text-[color:var(--charcoal-soft)] leading-relaxed">
            Nota: o papel de admin é atribuído automaticamente à conta{" "}
            <strong className="font-medium text-[color:var(--charcoal)]">
              yesexperiences@gmail.com
            </strong>{" "}
            após confirmação do email. Se acabaste de criar a conta, confirma o email recebido e volta a entrar.
          </p>
        </div>
      </section>
    </SiteLayout>
  );
}
