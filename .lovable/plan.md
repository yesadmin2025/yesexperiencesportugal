# Fix Google product snippet warnings

## Change
- Connect each Signature page’s existing verified first-party review bundle to its Product structured data.
- Emit `aggregateRating` and `review` only when genuine, published first-party tour reviews exist.
- Keep third-party and site-wide review totals out of Product/Organization markup, avoiding invented or policy-ineligible ratings.

## Validation
- Add or update a focused regression test proving tour Product markup uses the verified first-party bundle.
- Run the relevant structured-data tests and confirm the preview builds cleanly.
- Do not publish automatically; Google’s warning clears only after deployment and recrawl.
