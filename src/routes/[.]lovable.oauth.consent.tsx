/**
 * OAuth 2.1 consent route for the app-hosted MCP server.
 *
 * Called by managed Supabase Auth at /.lovable/oauth/consent?authorization_id=...
 * when an external MCP client (ChatGPT, Claude, Cursor…) asks the traveller
 * to authorize access. Unauthenticated visitors are bounced to /mcp-signin
 * with `next` preserved so they land back here with the same authorization_id.
 *
 * File name uses `[.]` to escape the literal dot in the URL segment — a
 * filename that literally starts with `.` would be treated as hidden and
 * silently skipped by the route generator.
 */
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { CtaButton } from "@/components/ui/CtaButton";

// Local typed shim for the beta supabase.auth.oauth namespace so we don't
// grep node_modules or hand-roll /oauth/authorizations calls.
type OAuthResult = {
  data: {
    client?: { name?: string; redirect_uri?: string } | null;
    requested_scopes?: string[] | null;
    redirect_url?: string | null;
    redirect_to?: string | null;
  } | null;
  error: { message: string } | null;
};
type AuthOAuth = {
  getAuthorizationDetails(id: string): Promise<OAuthResult>;
  approveAuthorization(id: string): Promise<OAuthResult>;
  denyAuthorization(id: string): Promise<OAuthResult>;
};
const oauth = (supabase.auth as unknown as { oauth: AuthOAuth }).oauth;

export const Route = createFileRoute("/.lovable/oauth/consent")({
  // Browser-only: supabase client reads its session from localStorage, absent
  // during SSR — without this, getSession() is null on the server and bounces
  // signed-in users straight to sign-in.
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id:
      typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      const next = location.pathname + location.searchStr;
      throw redirect({ to: "/mcp-signin", search: { next } });
    }
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get(
      "authorization_id",
    )!;
    const { data, error } = await oauth.getAuthorizationDetails(authorizationId);
    if (error) throw new Error(error.message);
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="min-h-[60vh] flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <Eyebrow>Authorization</Eyebrow>
        <h1
          className="mt-3 text-[22px] leading-[1.25]"
          style={{ fontFamily: "var(--font-editorial)", color: "var(--charcoal)" }}
        >
          Couldn't load this authorization request
        </h1>
        <p className="mt-3 text-[13.5px]" style={{ color: "color-mix(in oklab, var(--charcoal) 72%, transparent)" }}>
          {String((error as Error)?.message ?? error)}
        </p>
      </div>
    </main>
  ),
});

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState<"approve" | "deny" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function decide(approve: boolean) {
    setBusy(approve ? "approve" : "deny");
    setError(null);
    const { data, error } = approve
      ? await oauth.approveAuthorization(authorization_id)
      : await oauth.denyAuthorization(authorization_id);
    if (error) {
      setBusy(null);
      setError(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(null);
      setError("No redirect returned by the authorization server.");
      return;
    }
    window.location.href = target;
  }

  const clientName = details?.client?.name ?? "an external app";
  const redirectUri = details?.client?.redirect_uri ?? null;

  return (
    <main className="min-h-[80vh] flex items-center justify-center px-6 py-16">
      <div
        className="w-full max-w-[520px] border p-8"
        style={{
          borderColor: "color-mix(in oklab, var(--charcoal) 12%, transparent)",
          background: "var(--ivory)",
        }}
      >
        <Eyebrow>Connect an app</Eyebrow>
        <h1
          className="mt-3 text-[24px] leading-[1.2] [text-wrap:balance]"
          style={{ fontFamily: "var(--font-editorial)", color: "var(--charcoal)", fontWeight: 500 }}
        >
          Connect {clientName} to YES Experiences
        </h1>
        <p
          className="mt-4 text-[14px]"
          style={{ color: "color-mix(in oklab, var(--charcoal) 78%, transparent)" }}
        >
          This lets {clientName} use YES Experiences Portugal as you — reading only your own saved Signature journeys through the tools we've published. It does not bypass this site's permissions or backend policies.
        </p>

        {redirectUri ? (
          <p
            className="mt-4 text-[12px] break-all"
            style={{ color: "color-mix(in oklab, var(--charcoal) 55%, transparent)" }}
          >
            Return URL: <span className="font-mono">{redirectUri}</span>
          </p>
        ) : null}

        <ul
          className="mt-6 space-y-1.5 text-[13.5px]"
          style={{ color: "var(--charcoal)" }}
        >
          <li>· Share your basic profile</li>
          <li>· Share your email address</li>
          <li>· Read your own saved Signature journeys</li>
        </ul>

        {error ? (
          <p
            role="alert"
            className="mt-6 text-[13px]"
            style={{ color: "#B4341E" }}
          >
            {error}
          </p>
        ) : null}

        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <CtaButton
            type="button"
            variant="primary"
            size="md"
            className="w-full sm:flex-1"
            disabled={busy !== null}
            onClick={() => decide(true)}
          >
            {busy === "approve" ? "Connecting…" : "Approve"}
          </CtaButton>
          <CtaButton
            type="button"
            variant="ghost"
            size="md"
            className="w-full sm:flex-1"
            disabled={busy !== null}
            onClick={() => decide(false)}
          >
            {busy === "deny" ? "Cancelling…" : "Cancel"}
          </CtaButton>
        </div>
      </div>
    </main>
  );
}
