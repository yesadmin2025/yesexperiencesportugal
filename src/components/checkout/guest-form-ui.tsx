/**
 * Shared guest-form primitives for every checkout surface (Signature dialog,
 * Tailor, Studio V3). Mobile-first legibility: labels are sentence-scale
 * rather than 10px all-caps micro-type, inputs are 16px so iOS never zooms,
 * and every control clears the 48px touch target.
 */
import type React from "react";

export const guestInputClass =
  "w-full min-h-[48px] border border-[color:var(--border)] bg-[color:var(--ivory)] px-3.5 py-3 text-[16px] leading-snug text-[color:var(--charcoal)] placeholder:text-[color:var(--charcoal-soft)] focus:border-[color:var(--gold)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]/35 sm:text-[15px]";

export function GuestFieldGroup({
  title,
  optional,
  subtitle,
  children,
}: {
  title: string;
  optional?: boolean;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3">
        <h3 className="min-w-0 text-[11px] uppercase tracking-[0.2em] text-[color:var(--charcoal)]">
          {title}
        </h3>
        {optional ? (
          <span className="shrink-0 text-[10.5px] uppercase tracking-[0.18em] text-[color:var(--charcoal-soft)]">
            Optional
          </span>
        ) : null}
      </div>
      {subtitle ? (
        <p className="text-[13px] leading-relaxed text-[color:var(--charcoal-soft)]">{subtitle}</p>
      ) : null}
      <div className="space-y-4">{children}</div>
    </div>
  );
}

export function GuestRow({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>;
}

export function GuestField({
  label,
  required,
  hint,
  error,
  errorId,
  children,
  as = "label",
}: {
  label: string;
  required?: boolean;
  hint?: string;
  /** Inline validation message. Rendered with role="alert" and links to the control via errorId. */
  error?: string | null;
  errorId?: string;
  children: React.ReactNode;
  /** Use "div" when the control is a button group rather than a single input. */
  as?: "label" | "div";
}) {
  const Wrapper = as;
  return (
    <Wrapper className="block">
      <span className="mb-2 block text-[13.5px] font-medium leading-snug text-[color:var(--charcoal)]">
        {label}
        {required ? (
          <span className="ml-1 text-[color:var(--teal)]" aria-hidden>
            *
          </span>
        ) : null}
        {required ? <span className="sr-only"> (required)</span> : null}
      </span>
      {hint ? (
        <span className="mb-2 block text-[12.5px] leading-snug text-[color:var(--charcoal-soft)]">
          {hint}
        </span>
      ) : null}
      {children}
      {error ? (
        <span
          id={errorId}
          role="alert"
          className="mt-1.5 block text-[12.5px] font-medium leading-snug text-[color:var(--destructive,#9B2C2C)]"
        >
          {error}
        </span>
      ) : null}
    </Wrapper>
  );
}
