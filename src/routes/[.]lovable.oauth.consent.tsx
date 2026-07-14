import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Local typed wrapper for the beta supabase.auth.oauth namespace.
type OAuthDetails = {
  client?: { name?: string; redirect_uris?: string[] } | null;
  scope?: string;
  redirect_url?: string;
  redirect_to?: string;
};
type OAuthResult = { redirect_url?: string; redirect_to?: string };
type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<{ data: OAuthDetails | null; error: { message: string } | null }>;
  approveAuthorization: (id: string) => Promise<{ data: OAuthResult | null; error: { message: string } | null }>;
  denyAuthorization: (id: string) => Promise<{ data: OAuthResult | null; error: { message: string } | null }>;
};
const oauth = (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      const next = location.pathname + location.searchStr;
      throw redirect({ to: "/auth", search: { next } as never });
    }
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await oauth.getAuthorizationDetails(authorizationId);
    if (error) throw new Error(error.message);
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main style={{ padding: "3rem 1.5rem", maxWidth: 560, margin: "0 auto", fontFamily: "Inter, system-ui" }}>
      <h1 style={{ fontFamily: "Fraunces, serif", fontSize: "1.5rem" }}>Authorization error</h1>
      <p>{String((error as Error)?.message ?? error)}</p>
    </main>
  ),
});

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const { data, error } = approve
      ? await oauth.approveAuthorization(authorization_id)
      : await oauth.denyAuthorization(authorization_id);
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("No redirect returned by the authorization server.");
      return;
    }
    window.location.href = target;
  }

  const clientName = details?.client?.name ?? "an external app";

  return (
    <main
      style={{
        padding: "3rem 1.5rem",
        maxWidth: 560,
        margin: "0 auto",
        fontFamily: "Inter, system-ui",
        color: "var(--charcoal)",
      }}
    >
      <p
        style={{
          fontSize: 11,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "var(--gold)",
          marginBottom: 16,
        }}
      >
        Authorize connection
      </p>
      <h1 style={{ fontFamily: "Fraunces, serif", fontSize: "1.75rem", lineHeight: 1.15, marginBottom: 12 }}>
        Connect {clientName} to your YES account
      </h1>
      <p style={{ marginBottom: 8 }}>This lets {clientName} use YES Experiences as you.</p>
      <p style={{ marginBottom: 24, color: "#555" }}>
        It does not bypass this app's permissions — your role and RLS policies still apply.
      </p>

      {error && (
        <p role="alert" style={{ color: "#b00020", marginBottom: 16 }}>
          {error}
        </p>
      )}

      <div style={{ display: "flex", gap: 12 }}>
        <button
          type="button"
          disabled={busy}
          onClick={() => decide(true)}
          style={{
            background: "var(--teal)",
            color: "var(--ivory)",
            border: 0,
            padding: "12px 20px",
            borderRadius: 4,
            fontWeight: 600,
            cursor: busy ? "not-allowed" : "pointer",
          }}
        >
          {busy ? "Working…" : "Approve"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => decide(false)}
          style={{
            background: "transparent",
            color: "var(--charcoal)",
            border: "1px solid var(--charcoal)",
            padding: "12px 20px",
            borderRadius: 4,
            cursor: busy ? "not-allowed" : "pointer",
          }}
        >
          Cancel connection
        </button>
      </div>
    </main>
  );
}
