## Audit: `yesexperiences.customwebsitedesigns.org`

### Current behaviour (verified live)

- **Host:** Hostinger (`server: hcdn`, `platform: hostinger`, `panel: hpanel`). **Not Lovable.** DNS and files sit on a third-party account (likely an old web-agency staging slot — "customwebsitedesigns.org" is the vendor's parent domain).
- **HTTP:** `200 OK` on `/`, publicly reachable, no auth.
- **Body:** Tiny 410-byte HTML stub. `<title>Yes Experiences Portugal</title>`. No `<link rel="canonical">`, no `<meta name="robots">`, no `og:url`, no JSON-LD.
- **`/robots.txt`:** 200 but returns the site's HTML (SPA/404 fallback) — i.e. **no real robots.txt**. Crawlers treat missing robots as "crawl everything".
- **`/sitemap.xml`:** 404. Not listed anywhere in this project's `sitemap.xml` or code (searched, zero references to `customwebsitedesigns`).
- **Relationship to production:** brand-name collision only; not linked from `yesexperiencesportugal.com`, not in our sitemap, no shared infra.

### Risk

- **Duplicate brand entity in Google's index.** Same `<title>` as production → Google may show the staging URL for brand queries ("Yes Experiences Portugal") and split brand authority.
- **No canonical → no signal** telling Google the production domain is the master. Currently the two URLs look like independent sites.
- **Low content-cannibalisation risk right now** (staging is a 410-byte stub, not a full duplicate), but the risk becomes severe the moment that stub is replaced with real content.
- **Reputation risk:** an unrelated third party controls a domain that ranks for the brand name.

### What is / is NOT fixable inside Lovable

- **Not fixable in Lovable / this repo.** Every remediation lever (robots.txt, `noindex`, HTTP auth, canonical, DNS, taking the site down) lives on the **Hostinger account that owns `customwebsitedesigns.org`**, not on our Cloudflare-fronted Lovable deploy. No file in this project affects that host.
- Only lever available on our side = **Google Search Console removal request** for the staging URL (temporary, ~6 months) using the production account. That does not remove the page — it hides it from Google results while the real fix is done on Hostinger.

### Recommended final state

- Staging domain either **taken offline** (best) or **HTTP-auth protected + `noindex, nofollow` + `Disallow: /` robots.txt + `<link rel="canonical" href="https://yesexperiencesportugal.com/">`**.
- No public sitemap on the staging host.
- Production `yesexperiencesportugal.com` remains the sole canonical public domain (already true in our repo — no reference to the staging host anywhere).

### Exact remediation steps (executed OUTSIDE Lovable, in Hostinger)

Preferred — take it down:
1. Log into the Hostinger account hosting `customwebsitedesigns.org` (owned by the previous web-design vendor).
2. Delete the `yesexperiences` subdomain OR remove its DNS `A`/`CNAME` record so it stops resolving.
3. Confirm: `curl -I https://yesexperiences.customwebsitedesigns.org/` → `NXDOMAIN` or `410/404`.

If it must stay online (fallback):
1. Add HTTP Basic Auth on the subdomain (hPanel → Website → Password Protect Directories) — this alone deindexes over time because Googlebot gets 401.
2. Add a real `/robots.txt` served as `text/plain`:
   ```
   User-agent: *
   Disallow: /
   ```
3. Add to every page's `<head>`:
   ```html
   <meta name="robots" content="noindex, nofollow">
   <link rel="canonical" href="https://yesexperiencesportugal.com/">
   ```
4. Do NOT publish a sitemap on the staging host.

### Search Console removal (do from our production GSC property; independent of Hostinger)

1. Open Search Console for `https://yesexperiencesportugal.com/`. The staging domain is on a different property, but Google's **Removals** tool accepts any URL you own; if the staging property isn't verified under our account, we can only submit an **"Outdated Content"** report at https://search.google.com/search-console/remove-outdated-content — usable by anyone once the URL returns 401/404/noindex.
2. If we can verify the staging property (needs DNS/meta access on Hostinger): add `https://yesexperiences.customwebsitedesigns.org/` as a URL-prefix property → Removals → New request → Temporarily remove URL → "Remove all URLs with this prefix" (valid ~6 months, which is enough for the 401/noindex to consolidate deindexation).
3. Also submit an **URL Inspection → Request Indexing** on our canonical `https://yesexperiencesportugal.com/` so Google re-crawls it while the staging URL is suppressed.

### Affected files/config

- **Lovable project:** none. Confirmed with `rg "customwebsitedesigns"` → zero matches. Nothing in `robots.txt`, `sitemap.xml`, `legacy-domain-redirect.ts`, or route configs needs to change. Adding a `Disallow` for a host we don't serve would have no effect (robots.txt is per-host).
- **Hostinger account for `customwebsitedesigns.org`:** DNS zone, subdomain filesystem, and optional Password Protect Directories setting.
- **Google Search Console:** production property (Removals / Outdated Content); optionally a new property for the staging domain if we can verify it.

### Implementation risk

- **In Lovable:** none — nothing to change here, so nothing to break.
- **In Hostinger:** low, provided we (or the vendor) touch only the `yesexperiences` subdomain and not the root `customwebsitedesigns.org` site. Removing the subdomain is fully reversible via DNS.

### What I need from you before I can do anything

Because the fix lives entirely on a third-party Hostinger account, please confirm one of:
1. **You (or the previous vendor) have access to that Hostinger account** — in which case I'll write you a step-by-step ticket to send them (or execute yourself).
2. **You do not have access** — in which case the only lever we can pull ourselves is the Google "Outdated Content" removal request once the staging page returns 401/404/noindex, which requires vendor cooperation first.

No file changes will be made in this project as part of this task — remediation is out-of-band.
