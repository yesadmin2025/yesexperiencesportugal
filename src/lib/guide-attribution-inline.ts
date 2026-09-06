/**
 * Guide attribution — pre-hydration safety net.
 *
 * Internal guide → tour/studio links are clean canonical URLs; attribution is
 * persisted at click time by a React onClick. A tap that lands before React
 * has hydrated (slow mobile networks, first paint) is a plain browser
 * navigation and that handler never runs. To make sure the booking is still
 * attributed, every tracked link also carries `data-guide-slug` /
 * `data-guide-slot`, and a tiny inline listener installed from the document
 * head (before any bundle) writes the identical storage snapshot.
 *
 * This module has NO imports so it is safe to reference from `__root.tsx`
 * without pulling the browser database client into the shell.
 */

/** Storage key shared with `guide-attribution.ts` — keep both in sync. */
export const GUIDE_REF_STORAGE_KEY = "yes.guideref.v1";

export const GUIDE_SLUG_ATTR = "data-guide-slug";
export const GUIDE_SLOT_ATTR = "data-guide-slot";

/** Attributes to spread on a tracked guide link. */
export function guideRefDataAttrs(
  guideSlug: string,
  slot: string,
): { [GUIDE_SLUG_ATTR]: string; [GUIDE_SLOT_ATTR]: string } {
  return { [GUIDE_SLUG_ATTR]: guideSlug, [GUIDE_SLOT_ATTR]: slot };
}

/**
 * Inline script body (CSP already allows inline scripts — see public/_headers).
 * Capture phase so it runs regardless of what the hydrated handler does;
 * writes the same `{ guide_slug, slot, ts }` shape `getGuideRef()` reads.
 */
export const GUIDE_REF_INLINE_CAPTURE_SCRIPT =
  "(function(d,k){if(!d||!d.addEventListener)return;d.addEventListener('click',function(e){" +
  "var t=e.target;if(!t||!t.closest)return;var a=t.closest('a[" +
  GUIDE_SLUG_ATTR +
  "]');if(!a)return;var s=a.getAttribute('" +
  GUIDE_SLUG_ATTR +
  "');if(!s)return;var v=JSON.stringify({guide_slug:s.slice(0,120),slot:(a.getAttribute('" +
  GUIDE_SLOT_ATTR +
  "')||'unknown').slice(0,60),ts:Date.now()});" +
  "try{window.sessionStorage.setItem(k,v);}catch(_){}try{window.localStorage.setItem(k,v);}catch(_){}" +
  "},true);})(typeof document!=='undefined'?document:null," +
  JSON.stringify(GUIDE_REF_STORAGE_KEY) +
  ");";
