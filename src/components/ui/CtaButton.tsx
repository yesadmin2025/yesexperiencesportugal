import * as React from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { Link, type LinkProps } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { P14_YOUR_DAY_CTA_TEST_ID } from "@/lib/studio-v3/experiments";
import {
  currentP14YourDayCtaLabel,
  trackP14YourDayCtaClick,
} from "@/lib/studio-v3/experimentRuntime";

/**
 * CtaButton — site-wide primary / ghost CTA, with the canonical arrow
 * colour ramp locked in.
 *
 *   primary: solid --teal, ivory text, gold-soft → gold arrow on hover
 *   ghost:   transparent w/ teal border, charcoal text, gold → gold-deep arrow on hover
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

const sizeClasses: Record<Size, string> = {
  md: "px-6 py-3.5 min-h-[52px] text-[13px] sm:text-[13.5px] tracking-[0.1em]",
  sm: "px-5 py-3 min-h-[46px] text-[13px] tracking-[0.1em]",
};

const baseClasses =
  "group relative inline-flex items-center font-sans uppercase font-semibold rounded-[2px] overflow-visible transition-[background-color,color,border-color,transform,box-shadow] duration-[var(--dur-quick)] ease-[cubic-bezier(0.22,0.61,0.36,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--ivory)] [@media(hover:hover)]:hover:-translate-y-[2px] active:translate-y-0 active:scale-[0.985] active:transition-transform active:duration-[var(--dur-tap)] disabled:cursor-not-allowed disabled:pointer-events-none disabled:opacity-55 disabled:shadow-none aria-busy:cursor-progress data-[cta-error]:animate-[ctaNudge_360ms_ease-in-out]";
const baseLayoutWithTrailing = "justify-between gap-6";
const baseLayoutNoTrailing = "justify-center gap-2.5";

const hairlineBaseClasses =
  "group relative inline-flex items-center gap-3 rounded-[2px] font-sans uppercase font-semibold text-[13px] tracking-[0.1em] py-2.5 min-h-[44px] text-[color:var(--charcoal)] transition-opacity duration-[var(--dur-quick)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] focus-visible:ring-offset-4 focus-visible:ring-offset-[color:var(--ivory)] active:scale-[0.985] active:transition-transform active:duration-[var(--dur-tap)] disabled:pointer-events-none disabled:opacity-40 before:content-[''] before:absolute before:left-0 before:right-0 before:-bottom-0.5 before:h-px before:bg-[color:var(--gold)] before:opacity-60 before:transition-opacity before:duration-[var(--dur-quick)] hover:before:opacity-100 focus-visible:before:opacity-100 active:before:opacity-100";

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-[color:var(--teal)] text-[color:var(--ivory)] hover:bg-[color:var(--charcoal)] active:bg-[color:var(--charcoal)]",
  ghost:
    "bg-transparent text-[color:var(--charcoal)] hover:bg-[color:var(--teal)] hover:text-[color:var(--ivory)] active:bg-[color:var(--teal)] active:text-[color:var(--ivory)]",
  ghostDark:
    "bg-transparent text-[color:var(--ivory)] hover:bg-[color:var(--ivory)]/[0.08] active:bg-[color:var(--ivory)]/[0.08]",
  hairline: "opacity-100",
};

const variantStyle: Record<Variant, React.CSSProperties | undefined> = {
  primary: {
    boxShadow: "0 10px 26px -14px color-mix(in oklab, var(--charcoal-deep) 55%, transparent)",
  },
  ghost: {
    border: "1px solid color-mix(in oklab, var(--teal) 55%, transparent)",
  },
  ghostDark: {
    border: "1px solid color-mix(in oklab, var(--gold) 62%, transparent)",
    boxShadow:
      "inset 0 0 0 1px color-mix(in oklab, var(--ivory) 10%, transparent), 0 8px 22px -14px color-mix(in oklab, var(--charcoal-deep) 55%, transparent)",
  },
  hairline: undefined,
};

/**
 * Kinetic Luxury trailing block: gold arrow that translates on hover
 * with a diffuse gold ramp glow behind it. Used for all filled/ghost
 * conversion CTAs so the arrow micro-interaction stays canonical.
 */
function KineticArrow({ tone = "gold" }: { tone?: "gold" | "goldSoft" }) {
  const color = tone === "goldSoft" ? "var(--gold-soft)" : "var(--gold)";
  return (
    <span aria-hidden="true" className="relative flex items-center">
      <span
        className="pointer-events-none absolute right-[-14px] h-8 w-14 rounded-full opacity-0 blur-[6px] transition-opacity duration-[var(--dur-base)] group-hover:opacity-100 group-focus-visible:opacity-100 group-active:opacity-100 motion-reduce:hidden"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, color-mix(in oklab, var(--gold) 22%, transparent) 55%, color-mix(in oklab, var(--gold) 42%, transparent) 100%)",
        }}
      />
      <ArrowRight
        size={18}
        strokeWidth={1.5}
        className="cta-arrow-idle relative transition-transform duration-[var(--dur-base)] ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:translate-x-2 group-focus-visible:translate-x-2 group-active:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
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
      className="pointer-events-none absolute bottom-0 left-0 h-[1px] w-0 bg-[color:var(--gold)] opacity-50 transition-[width] duration-[var(--dur-slow)] ease-in-out group-hover:w-full group-focus-visible:w-full group-active:w-full motion-reduce:hidden"
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
  const [p14Label, setP14Label] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isP14YourDayTarget) return;
    // Deliberately resolve after mount: server markup stays on the control
    // wording, while the browser session already has a stable funnel arm.
    setP14Label(currentP14YourDayCtaLabel());
  }, [isP14YourDayTarget]);

  const isHairline = variant === "hairline";
  const isKinetic = variant === "primary" || variant === "ghostDark";

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
  const labelNode = isP14YourDayTarget && !loading && p14Label ? p14Label : baseLabelNode;

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

  const experimentAttrs = isP14YourDayTarget
    ? { "aria-label": p14Label ?? "Continue to guest details" }
    : {};

  return (
    <button
      className={sharedClassName}
      style={sharedStyle}
      disabled={disabledProp || loading}
      {...stateAttrs}
      {...rest}
      {...experimentAttrs}
      onClick={(event) => {
        if (isP14YourDayTarget) trackP14YourDayCtaClick();
        onClick?.(event);
      }}
    >
      {content}
    </button>
  );
}

export default CtaButton;
