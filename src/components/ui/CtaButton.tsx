import * as React from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { Link, type LinkProps } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { useInView } from "@/components/motion/useInView";
import {
  P14_YOUR_DAY_CTA_TEST_ID,
  p14YourDayCtaLabelForVariant,
  readStoredP14YourDayCtaVariant,
} from "@/lib/studio-v3/experiments";

/**
 * CtaButton — site-wide primary / ghost CTA, with the canonical arrow
 * colour ramp locked in.
 *
 *   primary: smoked charcoal, warm-gold keyline, champagne text and arrow
 *   ghost:   transparent warm-gold hairline with charcoal text
 *
 * Both variants share spacing (px-7 py-3.5, min-h-[48px]), Inter 12.5/13px
 * uppercase 0.18em, rounded-[2px], focus ring on --gold offset --ivory,
 * subtle hover -1px lift, 300ms editorial easing, group/translate-x-1 on the arrow.
 *
 * `to` renders a TanStack <Link>; `href` renders an <a>. Pass `icon` to
 * replace the trailing arrow (e.g. <MessageCircle/> for a "talk to us" CTA);
 * pass `iconLeading` to render an icon BEFORE the label.
 */

type Variant = "primary" | "ghost" | "ghostDark" | "hairline";
type Size = "md" | "sm";

interface CommonProps {
  variant?: Variant;
  size?: Size;
  /** Replace the trailing ArrowRight with a custom icon. Pass `null` to hide. */
  icon?: React.ReactNode | null;
  /** Render an icon BEFORE the label (used by "Talk to a Local" style CTAs). */
  iconLeading?: React.ReactNode;
  /** Loading state — swaps arrow for spinner, sets aria-busy, freezes interactions. */
  loading?: boolean;
  /** Optional label shown while loading (defaults to children). */
  loadingLabel?: React.ReactNode;
  /**
   * Error state — plays a one-shot nudge animation and paints a warm-red ring
   * for ~1.4s so the failure is felt without recolouring the entire button.
   * Toggle to a fresh truthy value (e.g. Date.now()) to replay.
   */
  error?: boolean | number | null;
  className?: string;
  onClick?: React.MouseEventHandler<HTMLAnchorElement | HTMLButtonElement>;
  children: React.ReactNode;
}

type LinkCtaProps = CommonProps &
  Omit<LinkProps, "children" | "className"> & {
    to: LinkProps["to"];
    href?: never;
  };

type AnchorCtaProps = CommonProps &
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "children" | "className"> & {
    href: string;
    to?: never;
  };

type ButtonCtaProps = CommonProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children" | "className"> & {
    href?: never;
    to?: never;
  };

export type CtaButtonProps = LinkCtaProps | AnchorCtaProps | ButtonCtaProps;

// Restrained editorial scale, matched to the homepage hero CTAs:
// smaller type, wider tracking, generous horizontal breathing room.
const sizeClasses: Record<Size, string> = {
  md: "px-7 py-[15px] min-h-[54px] text-[11.5px] sm:text-[12px] tracking-[0.16em]",
  sm: "px-6 py-3 min-h-[46px] text-[11px] tracking-[0.16em]",
};

const baseClasses =
  "premium-cta t-button group relative isolate inline-flex items-center rounded-[2px] overflow-hidden transition-[background-color,color,border-color,transform,box-shadow] duration-[var(--dur-base)] ease-[var(--ease-scene)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--ivory)] active:scale-[0.985] active:transition-transform active:duration-[var(--dur-tap)] disabled:cursor-not-allowed disabled:pointer-events-none disabled:opacity-55 disabled:shadow-none aria-busy:cursor-progress data-[cta-error]:animate-[ctaNudge_360ms_ease-in-out]";
const baseLayoutWithTrailing = "justify-between gap-6";
const baseLayoutNoTrailing = "justify-center gap-2.5";

const hairlineBaseClasses =
  "group relative inline-flex items-center gap-3 rounded-[2px] font-sans uppercase font-semibold text-[13px] tracking-[0.1em] py-2.5 min-h-[44px] text-[color:var(--charcoal)] transition-opacity duration-[var(--dur-quick)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] focus-visible:ring-offset-4 focus-visible:ring-offset-[color:var(--ivory)] active:scale-[0.985] active:transition-transform active:duration-[var(--dur-tap)] disabled:pointer-events-none disabled:opacity-40 before:content-[''] before:absolute before:left-0 before:right-0 before:-bottom-0.5 before:h-px before:bg-[color:var(--gold)] before:opacity-60 before:transition-opacity before:duration-[var(--dur-quick)] hover:before:opacity-100 focus-visible:before:opacity-100 active:before:opacity-100";

const variantClasses: Record<Variant, string> = {
  primary:
    "premium-cta--primary bg-[color:var(--teal)] text-[color:var(--ivory)]",
  ghost:
    "premium-cta--ghost bg-transparent text-[color:var(--charcoal)]",
  ghostDark:
    "premium-cta--dark bg-transparent text-[color:var(--gold-soft)]",
  hairline: "opacity-100",
};

const variantStyle: Record<Variant, React.CSSProperties | undefined> = {
  primary: undefined,
  ghost: undefined,
  ghostDark: undefined,
  hairline: undefined,
};

/**
 * Kinetic Luxury trailing block: gold arrow that translates on hover
 * with a restrained directional response. Used for all filled/ghost
 * conversion CTAs so the arrow micro-interaction stays canonical.
 */
function KineticArrow({ tone = "gold" }: { tone?: "gold" | "goldSoft" }) {
  const color = tone === "goldSoft" ? "var(--gold-soft)" : "var(--gold)";
  const [ref, inView] = useInView<HTMLSpanElement>({ rootMargin: "0px 0px -8% 0px", threshold: 0.01 });
  return (
    <span
      ref={ref}
      aria-hidden="true"
      className={cn("cta-arrow-stage relative flex items-center", inView && "is-visible")}
    >
      <span className="cta-arrow-line" />
      <ArrowRight
        size={16}
        strokeWidth={1.3}
        className="cta-arrow-cue relative transition-transform duration-[var(--dur-quick)] ease-[var(--ease-scene)] group-hover:translate-x-1 group-focus-visible:translate-x-1 group-active:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
        style={{ color }}
      />
    </span>
  );
}

/** Bottom gold underline sweep — decorative, primary/ghostDark only. */
function GoldSweep() {
  return (
    <span
      aria-hidden="true"
      className="premium-cta__sheen pointer-events-none absolute inset-0 motion-reduce:hidden"
    />
  );
}

/** Spinner shown in loading state — inherits currentColor. */
function CtaSpinner() {
  return (
    <Loader2
      size={18}
      strokeWidth={1.6}
      aria-hidden="true"
      className="animate-spin motion-reduce:animate-none"
    />
  );
}

export function CtaButton(props: CtaButtonProps) {
  const {
    variant = "primary",
    size = "md",
    icon,
    iconLeading,
    loading = false,
    loadingLabel,
    error = false,
    className,
    children,
  } = props;

  const testId = (props as { "data-testid"?: string })["data-testid"];
  const isP14YourDayTarget = testId === P14_YOUR_DAY_CTA_TEST_ID;
  const p14Variant = isP14YourDayTarget ? readStoredP14YourDayCtaVariant() : null;
  const isP14ExperimentActive = isP14YourDayTarget && p14Variant !== null;
  const p14Label = isP14ExperimentActive ? p14YourDayCtaLabelForVariant(p14Variant) : null;

  const isHairline = variant === "hairline";
  const isKinetic = variant === "primary" || variant === "ghostDark" || variant === "ghost";

  // Replay the error animation whenever `error` changes to a fresh truthy value.
  const [errorPlaying, setErrorPlaying] = React.useState(false);
  const errorKey = typeof error === "number" ? error : error ? 1 : 0;
  React.useEffect(() => {
    if (!errorKey) return;
    setErrorPlaying(true);
    const t = window.setTimeout(() => setErrorPlaying(false), 1400);
    return () => window.clearTimeout(t);
  }, [errorKey]);

  const trailing =
    loading && !isHairline ? (
      <CtaSpinner />
    ) : icon === null ? null : isHairline ? (
      (icon ?? (
        <span aria-hidden="true" className="flex items-center">
          <span className="block h-[1px] w-5 bg-[color:var(--gold)] transition-all duration-[var(--dur-base)] group-hover:w-8 group-focus-visible:w-8 group-active:w-8" />
          <ArrowRight
            size={12}
            className="ml-1 text-[color:var(--gold)] transition-transform duration-[var(--dur-base)] group-hover:translate-x-0.5 group-focus-visible:translate-x-0.5 group-active:translate-x-0.5"
          />
        </span>
      ))
    ) : (
      (icon ?? <KineticArrow tone={variant === "primary" ? "gold" : "goldSoft"} />)
    );

  const baseLabelNode = loading && loadingLabel !== undefined ? loadingLabel : children;
  // FINAL CLOSURE — the YOUR DAY primary action has ONE canonical label
  // ("Reserve your day", owned by the caller). The P14 experiment keeps its
  // assignment + click telemetry but no longer rewrites the copy.
  void p14Label;
  const labelNode = baseLabelNode;

  const content = (
    <>
      {loading && isHairline ? (
        <span className="mr-1 inline-flex items-center">
          <CtaSpinner />
        </span>
      ) : (
        iconLeading
      )}
      <span className="cta-label relative">{labelNode}</span>
      {trailing}
      {isKinetic ? <GoldSweep /> : null}
    </>
  );

  const sharedClassName = cn(
    isHairline
      ? cn(hairlineBaseClasses, loading && "cursor-progress")
      : cn(
          baseClasses,
          trailing ? baseLayoutWithTrailing : baseLayoutNoTrailing,
          sizeClasses[size],
          variantClasses[variant],
        ),
    errorPlaying && "he-cta-error",
    className,
  );
  const sharedStyle =
    isHairline || className?.includes("hero-cta-button") ? undefined : variantStyle[variant];

  const stateAttrs: Record<string, unknown> = {};
  if (loading) stateAttrs["aria-busy"] = true;
  if (errorPlaying) stateAttrs["data-cta-error"] = "";

  if ("href" in props && props.href !== undefined) {
    const {
      href,
      variant: _v,
      size: _s,
      icon: _i,
      iconLeading: _il,
      loading: _l,
      loadingLabel: _ll,
      error: _e,
      className: _c,
      children: _ch,
      onClick,
      ...rest
    } = props;
    const inert = loading;
    return (
      <a
        href={inert ? undefined : href}
        className={sharedClassName}
        style={sharedStyle}
        onClick={inert ? (e) => e.preventDefault() : onClick}
        aria-disabled={inert || undefined}
        {...stateAttrs}
        {...rest}
      >
        {content}
      </a>
    );
  }

  if ("to" in props && props.to !== undefined) {
    const {
      to,
      variant: _v,
      size: _s,
      icon: _i,
      iconLeading: _il,
      loading: _l,
      loadingLabel: _ll,
      error: _e,
      className: _c,
      children: _ch,
      onClick,
      ...rest
    } = props;
    const inert = loading;
    return (
      <Link
        to={to}
        className={sharedClassName}
        style={sharedStyle}
        onClick={inert ? (e) => e.preventDefault() : onClick}
        aria-disabled={inert || undefined}
        {...stateAttrs}
        {...(rest as object)}
      >
        {content}
      </Link>
    );
  }

  const {
    variant: _v,
    size: _s,
    icon: _i,
    iconLeading: _il,
    loading: _l,
    loadingLabel: _ll,
    error: _e,
    className: _c,
    children: _ch,
    disabled: disabledProp,
    onClick,
    ...rest
  } = props;

  const experimentAttrs = {};

  return (
    <button
      className={sharedClassName}
      style={sharedStyle}
      disabled={disabledProp || loading}
      {...stateAttrs}
      {...rest}
      {...experimentAttrs}
      onClick={(event) => {
        if (isP14ExperimentActive) {
          void import("@/lib/studio-v3/experimentRuntime")
            .then(({ trackP14YourDayCtaClick }) => trackP14YourDayCtaClick())
            .catch(() => undefined);
        }
        onClick?.(event);
      }}
    >
      {content}
    </button>
  );
}

export default CtaButton;
