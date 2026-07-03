import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { SiteLayout } from "@/components/SiteLayout";
import { supabase } from "@/integrations/supabase/client";
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
