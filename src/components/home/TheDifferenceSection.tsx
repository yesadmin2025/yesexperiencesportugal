/**
 * The Difference — editorial two-column section.
 *
 * Shows what makes YES different in functional terms, without comparing
 * to competitors (per brand guardrails). Two columns on tablet+, stacked
 * on mobile, separated by a hairline gold divider.
 *
 * Lives between the Why YES manifesto and the "Pick your path" decision
 * block, giving the page a calm transitional moment that explains how
 * the design process actually works before asking the user to pick.
 */
import { Check } from "lucide-react";

const processSteps = [
  "Design your experience in real time.",
  "Watch your journey evolve on an interactive map.",
  "Adjust every detail to match your rhythm.",
  "See your story, timeline and pricing update instantly.",
  "Confirm and secure your experience immediately.",
] as const;

const benefits = [
  "Completely personalised journey.",
  "Real-time customisation as you design.",
  "Instant confirmation and booking.",
  "Private, local guide support.",
  "Human help available whenever you need it.",
  "No templates. No generic itineraries. Your story.",
] as const;

export function TheDifferenceSection() {
  return (
    <section
      id="the-difference"
      className="section-y bg-[color:var(--ivory)] border-b border-[color:var(--border)] scroll-mt-24 md:scroll-mt-28"
      aria-labelledby="difference-title"
    >
      <div className="container-x">
        <div className="reveal max-w-2xl mx-auto text-center mb-12 md:mb-16">
          <span className="he-eyebrow-bar mb-5">The difference</span>
          <h2
            id="difference-title"
            className="serif mt-3 text-[2rem] sm:text-[2.4rem] md:text-[3.6rem] leading-[1.1] md:leading-[1.0] tracking-[-0.018em] text-[color:var(--charcoal)] font-medium"
          >
            How YES <span className="italic font-normal text-[color:var(--teal)]">approaches</span>{" "}
            your day.
          </h2>
          <p className="mt-5 text-[15.5px] md:text-[17px] text-[color:var(--charcoal)] leading-[1.65] max-w-md mx-auto">
            Personalised travel design, made simple.
          </p>
        </div>

        <div className="reveal max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-14 relative">
          {/* Vertical hairline gold divider — desktop only */}
          <div
            aria-hidden="true"
            className="hidden md:block absolute top-2 bottom-2 left-1/2 w-px bg-gradient-to-b from-transparent via-[color:var(--gold)]/55 to-transparent"
          />

          {/* LEFT — process */}
          <div>
            <h3 className="text-[1.1rem] md:text-[1.2rem] font-bold uppercase tracking-[0.18em] text-[color:var(--charcoal-deep)]">
              Your design process
            </h3>
            <ol className="mt-5 space-y-3.5 list-none p-0">
              {processSteps.map((step, i) => (
                <li
                  key={step}
                  className="flex items-start gap-3 text-[14.5px] leading-[1.65] text-[color:var(--charcoal)] transition-all duration-200 hover:text-[color:var(--teal)] hover:translate-x-1"
                >
                  <span
                    aria-hidden="true"
                    className="shrink-0 mt-[3px] inline-flex items-center justify-center w-5 h-5 rounded-full bg-[color:var(--teal)]/10 text-[10px] font-bold text-[color:var(--teal)] tabular-nums"
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* RIGHT — benefits */}
          <div>
            <h3 className="text-[1.1rem] md:text-[1.2rem] font-bold uppercase tracking-[0.18em] text-[color:var(--charcoal-deep)]">
              What you get
            </h3>
            <ul className="mt-5 space-y-3.5 list-none p-0">
              {benefits.map((benefit) => (
                <li
                  key={benefit}
                  className="flex items-start gap-3 text-[14.5px] leading-[1.65] text-[color:var(--charcoal)] transition-all duration-200 hover:text-[color:var(--teal)] hover:translate-x-1"
                >
                  <Check
                    size={16}
                    aria-hidden="true"
                    className="shrink-0 mt-[3px] text-[color:var(--teal)]"
                    strokeWidth={2.5}
                  />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="reveal mt-10 md:mt-14 text-center text-[13px] italic text-[color:var(--teal)]">
          Ready to design? Start below.
        </p>
      </div>
    </section>
  );
}
