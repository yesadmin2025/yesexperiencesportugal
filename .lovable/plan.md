# Bring back the AI personal touches in Studio for guests, safely

## What's wrong
Earlier security work made the Studio's AI wording (the live story, question wording, and understanding of free-text wishes) work only for people who are signed in. Studio visitors never sign in, so every guest now sees the standard template text. Their free-text wishes are also only matched by keywords.

## The fix
Guests get the AI features again. Cost stays protected by limits the server controls, not by the visitor's own session ID, which they could fake.

1. Replace the "signed-in only" check with one shared guard that allows guests when all of these hold:
   - a per-visitor limit based on the network address (for example, 20 AI calls per 10 minutes)
   - a daily limit across the whole site for each AI feature (for example, 3,000 calls a day), so abuse cannot run up the bill
   - signed-in users keep their current, higher allowance
2. When any limit is reached, the visitor sees the same template text as today. Nothing breaks and nobody waits.
3. Apply the guard to all eleven AI helpers that currently use the sign-in check: Studio live story, question wording, free-text reading, Studio narrative, Builder engine, and the other helpers.
4. The existing per-session limits and output checks stay as they are: no invented stops, prices or places, and the negation rules still apply.

## Not changed
Prices, booking, Stripe, tour facts, the questions Studio decides to ask, the site's look, and the admin-only protections from the security work.

## Technical details
- Add `src/lib/aiGate.server.ts` exporting `allowAiCall(bucket)`. It returns the key or `undefined`. It uses `getVerifiedUserId()` for the signed-in path. For guests it reads `cf-connecting-ip` / `x-forwarded-for` from `getRequest()`, applies `rateLimit` keyed by hashed IP plus bucket, and adds a global daily counter bucket.
- Swap `(await __verify()) ? process.env.LOVABLE_API_KEY : undefined` for `await allowAiCall("<bucket>")` in the eleven files.
- Add a Vitest test for the gate: guest allowed under the cap, falls back over the IP cap and the global cap, and gets no key when the key is missing.
- Record the rule in AGENTS.md: guest AI is gated by server-side IP and global caps, never by client session IDs.
