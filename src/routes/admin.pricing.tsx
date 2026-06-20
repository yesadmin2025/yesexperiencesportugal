// Admin price-tier editor.
//
// Source of truth: the `tour_price_tiers` table in Supabase. Public site
// reads via `useTourPriceTiers()`. This page lets any signed-in user
// upsert the per-pax EUR tiers for guest counts 1..8 per tour. The code
// file `signatureToursViator.ts` no longer needs hand-edits for pricing.

import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Save, RefreshCw, AlertTriangle, Check, Eye, EyeOff } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { supabase } from "@/integrations/supabase/client";
import { signatureTours, type SignatureTour } from "@/data/signatureTours";
import {
  TOUR_PRICE_TIERS_QUERY_KEY,
  useTourPriceTiers,
  type TourPriceTiersMap,
} from "@/hooks/use-tour-price-tiers";
import type { PriceTiersEUR } from "@/data/signatureToursViator";
import { SignaturePriceCard } from "@/components/studio-v3/SignaturePriceCard";

export const Route = createFileRoute("/admin/pricing")({
  head: () => ({
    meta: [
      { title: "Price tier editor — YES Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminPricingPage,
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <SiteLayout>
        <section className="pt-32 pb-20">
          <div className="container-x max-w-2xl">
            <h1 className="text-2xl">Pricing editor failed</h1>
            <p className="mt-3 text-sm text-[color:var(--charcoal-soft)]">
              {error.message}
            </p>
            <button
              type="button"
              onClick={() => {
                router.invalidate();
                reset();
              }}
              className="mt-5 inline-flex items-center gap-2 border border-[color:var(--border)] px-4 py-2 text-sm hover:border-[color:var(--gold)]"
            >
              <RefreshCw size={14} /> Retry
            </button>
          </div>
        </section>
      </SiteLayout>
    );
  },
  notFoundComponent: () => (
    <SiteLayout>
      <section className="pt-32 pb-20 container-x max-w-2xl">
        <h1>Not found</h1>
      </section>
    </SiteLayout>
  ),
});

const TIERS: ReadonlyArray<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8> = [1, 2, 3, 4, 5, 6, 7, 8];

type TierFormState = Record<string, string>; // "1".."8" → input string

function toFormState(tiers: PriceTiersEUR | undefined): TierFormState {
  const out: TierFormState = {};
  for (const k of TIERS) {
    const v = tiers?.[k];
    out[String(k)] = typeof v === "number" && v > 0 ? String(v) : "";
  }
  return out;
}

function parseFormState(state: TierFormState): PriceTiersEUR {
  const out: PriceTiersEUR = {};
  for (const k of TIERS) {
    const raw = state[String(k)]?.trim();
    if (!raw) continue;
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) continue;
    (out as Record<string, number>)[String(k)] = Math.round(n);
  }
  return out;
}

function tiersEqual(a: PriceTiersEUR | undefined, b: PriceTiersEUR): boolean {
  for (const k of TIERS) {
    const av = a?.[k];
    const bv = b[k];
    if ((av ?? null) !== (bv ?? null)) return false;
  }
  return true;
}

function AdminPricingPage() {
  const queryClient = useQueryClient();
  const { data: overrides, isLoading, refetch } = useTourPriceTiers();
  const [session, setSession] = useState<{ email?: string | null } | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ? { email: data.session.user.email } : null);
      setAuthChecked(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
      setSession(s ? { email: s.user.email } : null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const tours = useMemo(
    () => [...signatureTours].sort((a, b) => a.title.localeCompare(b.title)),
    [],
  );

  if (!authChecked || isLoading) {
    return (
      <SiteLayout>
        <section className="pt-28 pb-20 container-x max-w-5xl">
          <p className="text-sm text-[color:var(--charcoal-soft)]">Loading…</p>
        </section>
      </SiteLayout>
    );
  }

  if (!session) {
    return (
      <SiteLayout>
        <section className="pt-28 pb-20 container-x max-w-2xl">
          <h1 className="text-3xl">Price tier editor</h1>
          <p className="mt-3 text-sm text-[color:var(--charcoal-soft)]">
            Sign in to edit price tiers.
          </p>
          <Link
            to="/auth"
            className="mt-6 inline-flex items-center gap-2 bg-[color:var(--charcoal)] text-[color:var(--ivory)] px-5 py-2.5 text-sm hover:bg-black"
          >
            Sign in
          </Link>
        </section>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <section className="pt-28 pb-24">
        <div className="container-x max-w-5xl">
          <header className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-3xl tracking-tight">Price tier editor</h1>
              <p className="mt-2 text-sm text-[color:var(--charcoal-soft)] max-w-xl">
                Real per-pax EUR price by group size (1–8). Tier 8 is the
                public &ldquo;from&rdquo; anchor. Leave a cell blank to clear
                that tier. Changes go live as soon as you save.
              </p>
            </div>
            <div className="text-xs text-[color:var(--charcoal-soft)]">
              Signed in as {session.email ?? "—"}{" "}
              <button
                type="button"
                onClick={async () => {
                  await supabase.auth.signOut();
                }}
                className="ml-2 underline hover:no-underline"
              >
                Sign out
              </button>
            </div>
          </header>

          <div className="mt-8 space-y-5">
            {tours.map((tour) => (
              <TourRow
                key={tour.id}
                tour={tour}
                initialTiers={overrides?.[tour.id]}
                onSaved={async () => {
                  await queryClient.invalidateQueries({
                    queryKey: TOUR_PRICE_TIERS_QUERY_KEY,
                  });
                  await refetch();
                }}
              />
            ))}
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}

function TourRow({
  tourId,
  title,
  region,
  priceFrom,
  initialTiers,
  onSaved,
}: {
  tourId: string;
  title: string;
  region: string;
  priceFrom: number;
  initialTiers: PriceTiersEUR | undefined;
  onSaved: () => Promise<void> | void;
}) {
  const [form, setForm] = useState<TierFormState>(() => toFormState(initialTiers));
  const [busy, setBusy] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  // Keep the form in sync when the cached query refetches.
  useEffect(() => {
    setForm(toFormState(initialTiers));
  }, [initialTiers]);

  const parsed = useMemo(() => parseFormState(form), [form]);
  const dirty = !tiersEqual(initialTiers, parsed);

  const tier8 = parsed[8];
  const anchorMismatch =
    typeof tier8 === "number" && tier8 !== priceFrom;

  async function save() {
    setBusy(true);
    try {
      const payload: PriceTiersEUR = parsed;
      const { error } = await supabase
        .from("tour_price_tiers")
        .upsert(
          {
            tour_id: tourId,
            tiers: payload as unknown as Record<string, number>,
          },
          { onConflict: "tour_id" },
        );
      if (error) throw error;
      toast.success(`Saved ${title}`);
      setJustSaved(true);
      window.setTimeout(() => setJustSaved(false), 1500);
      await onSaved();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(`Save failed: ${msg}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="border border-[color:var(--border)] bg-white p-5">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-base font-semibold leading-snug">{title}</h2>
          <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-[color:var(--charcoal-soft)]">
            {region} · id: {tourId} · priceFrom €{priceFrom}
          </p>
        </div>
        <button
          type="button"
          disabled={!dirty || busy}
          onClick={save}
          className="inline-flex items-center gap-2 bg-[color:var(--charcoal)] text-[color:var(--ivory)] px-4 py-2 text-xs uppercase tracking-[0.18em] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-black"
        >
          {justSaved ? <Check size={14} /> : <Save size={14} />}
          {busy ? "Saving…" : justSaved ? "Saved" : "Save"}
        </button>
      </header>

      <div className="mt-4 grid grid-cols-4 sm:grid-cols-8 gap-2">
        {TIERS.map((tier) => (
          <label key={tier} className="block">
            <span className="block text-[10px] uppercase tracking-[0.18em] text-[color:var(--charcoal-soft)]">
              {tier} pax
            </span>
            <div className="mt-1 relative">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-[color:var(--charcoal-soft)]">
                €
              </span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                value={form[String(tier)] ?? ""}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, [String(tier)]: e.target.value }))
                }
                placeholder="—"
                className="w-full border border-[color:var(--border)] bg-white pl-5 pr-2 py-1.5 text-sm tabular-nums focus:outline-none focus:border-[color:var(--gold)]"
              />
            </div>
          </label>
        ))}
      </div>

      {anchorMismatch ? (
        <p className="mt-3 inline-flex items-center gap-2 text-[11px] text-amber-700">
          <AlertTriangle size={12} />
          Tier 8 (€{tier8}) differs from the public &ldquo;from&rdquo; anchor
          (€{priceFrom}). Update the tour&rsquo;s `priceFrom` in code to match,
          or set tier 8 to €{priceFrom}.
        </p>
      ) : null}
    </article>
  );
}
