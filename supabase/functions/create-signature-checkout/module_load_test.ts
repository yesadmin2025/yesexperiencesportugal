/**
 * Parse-time smoke test for the create-signature-checkout edge function.
 *
 * Regression guard: a prior copy/paste left a duplicate
 * `interface StudioCreateSessionBody` + partial `handleStudioCreateSession`
 * block in `index.ts`, which prevented Deno from loading the module and
 * broke Studio, Signature, and Tailored checkout in production. Merely
 * importing the file would have failed.
 *
 * Stubs the env vars that `index.ts` reads so top-level initialisers
 * (Stripe client, Supabase publishable key) don't throw, then dynamically
 * imports the module and asserts it loaded.
 */
import { assert } from "https://deno.land/std@0.208.0/assert/mod.ts";

Deno.test("create-signature-checkout module parses and loads", async () => {
  Deno.env.set("STRIPE_SANDBOX_API_KEY", "sk_test_dummy");
  Deno.env.set("STRIPE_LIVE_API_KEY", "sk_live_dummy");
  Deno.env.set("STRIPE_SANDBOX_PUBLISHABLE_KEY", "pk_test_dummy");
  Deno.env.set("STRIPE_LIVE_PUBLISHABLE_KEY", "pk_live_dummy");
  Deno.env.set("STUDIO_QUOTE_SIGNING_SECRET", "test-signing-secret");
  Deno.env.set("SUPABASE_URL", "https://example.supabase.co");
  Deno.env.set("SUPABASE_PUBLISHABLE_KEY", "pk_dummy");
  Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "sr_dummy");

  const mod = await import(`./index.ts?cache=${Date.now()}`);
  assert(mod, "module import returned nothing");
});
