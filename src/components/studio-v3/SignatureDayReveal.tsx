/**
 * SignatureDayReveal — the final cinematic Signature reveal shown at the
 * end of the Studio V3 flow.
 *
 * Step 5 of the post-builder journey plan introduces this component as the
 * new module boundary for the reveal surface. The implementation currently
 * lives inside `StudioV3.tsx` as `StoryboardHandoff` (the pre-plan name);
 * this file re-exports it under the plan's canonical name so that:
 *
 *   - callers can import { SignatureDayReveal } going forward,
 *   - Steps 6–9 (editorial sections, mobile stop-card, progressive
 *     disclosure, approval state machine) can carve real sub-components
 *     out of the reveal body without another cross-file rename churn,
 *   - existing behavior is byte-identical (pure refactor, no snapshot risk).
 *
 * When the reveal body is physically hoisted in a later step, only this
 * file's implementation changes — call sites already point at the new name.
 */
export { StoryboardHandoff as SignatureDayReveal } from "./StudioV3";
