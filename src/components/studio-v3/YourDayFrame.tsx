/**
 * YourDayFrame — the shared framing that makes map, storyboard and refine
 * read as ONE surface called `Your Day`.
 *
 * Internally these are still separate phases (kept for compatibility with
 * the phase machine, analytics and the E2E walker), but the guest must never
 * feel promoted through three more wizard steps after their answers are in.
 * Same eyebrow, same title treatment, same rhythm on all three.
 */

interface Props {
  /** Small-caps line above the title. Defaults to the surface name. */
  eyebrow?: string;
  title: React.ReactNode;
  /** Optional single supporting line. Keep it factual. */
  support?: React.ReactNode;
  className?: string;
}

export const YOUR_DAY_EYEBROW = "Your day";

export function YourDayFrame({ eyebrow = YOUR_DAY_EYEBROW, title, support, className }: Props) {
  return (
    <header
      data-testid="studio-v3-your-day-frame"
      className={`w-full text-center ${className ?? ""}`}
      style={{ animation: "studioV3RiseIn 620ms ease-out both" }}
    >
      <p
        className="text-[10px] uppercase tracking-[0.3em] font-semibold"
        style={{ color: "color-mix(in oklab, var(--charcoal) 55%, transparent)" }}
      >
        <span style={{ color: "var(--gold)" }}>—</span> {eyebrow}
      </p>
      <h2
        className="mx-auto mt-3 max-w-[520px] text-balance text-[27px] sm:text-[30px] leading-[1.12] sm:leading-[1.15] tracking-[-0.012em] font-medium"
        style={{ fontFamily: "var(--font-editorial)", color: "var(--charcoal)" }}
      >
        {title}
      </h2>
      {support ? (
        <p
          className="mx-auto mt-3 max-w-[440px] text-[14px] sm:text-[13px] leading-[1.6] sm:leading-relaxed [text-wrap:pretty]"
          style={{
            fontFamily: "var(--font-body)",
            color: "color-mix(in oklab, var(--charcoal) 70%, transparent)",
          }}
        >
          {support}
        </p>
      ) : null}
    </header>
  );
}
