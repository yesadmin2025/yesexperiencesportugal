import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/SiteLayout";
import { Eyebrow } from "@/components/ui/Eyebrow";

// Beta API wrapper — the supabase-js types for `auth.oauth` are still
// stabilising, so we type the three methods we call locally.
type AuthorizationDetails = {
  client?: { name?: string; client_id?: string; redirect_uri?: string };
  scope?: string;
  redirect_url?: string;
  redirect_to?: string;
};
type OAuthClient = {
  getAuthorizationDetails: (
    id: string,
  ) => Promise<{ data: AuthorizationDetails | null; error: { message: string } | null }>;
  approveAuthorization: (
    id: string,
  ) => Promise<{
    data: { redirect_url?: string; redirect_to?: string } | null;
    error: { message: string } | null;
  }>;
  denyAuthorization: (
    id: string,
  ) => Promise<{
    data: { redirect_url?: string; redirect_to?: string } | null;
    error: { message: string } | null;
  }>;
};
function oauth(): OAuthClient {
  return (supabase.auth as unknown as { oauth: OAuthClient }).oauth;
}

export const Route = createFileRoute("/.lovable/oauth/consent")({
  // Browser-only: Supabase reads its session from localStorage, which SSR
  // cannot see. Without ssr: false, signed-in users bounce to /auth on the
  // first server-rendered pass.
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) {
      throw new Error("Missing authorization_id");
    }
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      const next = location.pathname + location.searchStr;
      throw redirect({ to: "/auth", search: { next } });
    }
  },
  loader: async ({ location }) => {
    const authorizationId =
      new URLSearchParams(location.search).get("authorization_id") ?? "";
    const { data, error } = await oauth().getAuthorizationDetails(authorizationId);
    if (error) throw new Error(error.message);
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) {
      throw redirect({ href: immediate });
    }
    return data;
  },
  component: ConsentPage,
  errorComponent: ({ error }) => (
    <SiteLayout>
      <section className="pt-32 pb-20 min-h-[60vh]">
        <div className="container-x max-w-md mx-auto">
          <Eyebrow>Authorization error</Eyebrow>
          <h1 className="serif text-3xl mt-4">Could not load this authorization request</h1>
          <p className="mt-4 text-sm text-[color:var(--charcoal-soft)]">
            {(error as Error)?.message ?? String(error)}
          </p>
        </div>
      </section>
    </SiteLayout>
  ),
});

function ConsentPage() {
  const details = Route.useLoaderData() as AuthorizationDetails | null;
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState<"approve" | "deny" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const clientName = details?.client?.name ?? "an app";
  const redirectUri = details?.client?.redirect_uri;
  const scope = (details?.scope ?? "").split(/\s+/).filter(Boolean);

  async function decide(approve: boolean) {
    setBusy(approve ? "approve" : "deny");
    setError(null);
    const { data, error } = approve
      ? await oauth().approveAuthorization(authorization_id)
      : await oauth().denyAuthorization(authorization_id);
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

  return (
    <SiteLayout>
      <section className="pt-32 pb-20 min-h-[80vh] flex items-center">
        <div className="container-x max-w-md mx-auto w-full">
          <Eyebrow>Connect an app</Eyebrow>
          <h1 className="serif text-3xl mt-4">
            Connect <span className="text-[color:var(--teal)]">{clientName}</span> to your account
          </h1>
          <p className="mt-4 text-sm text-[color:var(--charcoal-soft)]">
            This lets {clientName} use YES Experiences Portugal as you — reading your Signature
            catalog access and your own bookings through the site's MCP tools.
          </p>
          <p className="mt-3 text-xs text-[color:var(--charcoal-soft)]">
            This does not bypass this app's permissions or backend policies. You can revoke access
            at any time.
          </p>

          <div className="mt-6 border border-[color:var(--charcoal)]/10 bg-[color:var(--card)] p-4 space-y-2 text-sm">
            {redirectUri && (
              <div>
                <span className="text-[10px] uppercase tracking-[0.22em] text-[color:var(--charcoal-soft)]">
                  Redirect
                </span>
                <div className="mt-1 break-all font-mono text-xs">{redirectUri}</div>
              </div>
            )}
            {scope.length > 0 && (
              <div>
                <span className="text-[10px] uppercase tracking-[0.22em] text-[color:var(--charcoal-soft)]">
                  Requested access
                </span>
                <ul className="mt-1 list-disc pl-5 text-xs">
                  {scope.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {error && (
            <div
              role="alert"
              className="mt-4 border border-red-300 bg-red-50 text-red-800 text-sm px-3 py-2"
            >
              {error}
            </div>
          )}

          <div className="mt-8 grid grid-cols-2 gap-3">
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => decide(false)}
              className="border border-[color:var(--charcoal)]/20 bg-white hover:bg-[color:var(--sand)] disabled:opacity-60 text-[color:var(--charcoal)] px-5 py-3 text-sm tracking-wide transition-all"
            >
              {busy === "deny" ? "Cancelling…" : "Cancel connection"}
            </button>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => decide(true)}
              className="bg-[color:var(--teal)] hover:bg-[color:var(--teal-2)] disabled:opacity-60 text-[color:var(--ivory)] px-5 py-3 text-sm tracking-wide transition-all"
            >
              {busy === "approve" ? "Approving…" : "Approve"}
            </button>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
