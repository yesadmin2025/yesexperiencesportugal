import * as React from "react";
import { ArrowRight } from "lucide-react";
import { Link, type LinkProps } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

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
  md: "px-7 py-3.5 min-h-[48px] text-[11px] sm:text-[11.5px] tracking-[0.25em]",
  sm: "px-5 py-3 min-h-[44px] text-[11px] tracking-[0.22em]",
};

const baseClasses =
  "group relative inline-flex items-center justify-between gap-6 font-sans uppercase font-semibold rounded-[2px] overflow-visible transition-all duration-500 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--ivory)] active:scale-[0.99] disabled:pointer-events-none disabled:opacity-40";

const hairlineBaseClasses =
  "group inline-flex items-center gap-3 rounded-[2px] font-sans uppercase font-semibold text-[11px] tracking-[0.25em] py-2 text-[color:var(--charcoal)] transition-opacity duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--teal)] focus-visible:ring-offset-4 focus-visible:ring-offset-[color:var(--ivory)] disabled:pointer-events-none disabled:opacity-40";

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-[color:var(--teal)] text-[color:var(--ivory)] hover:bg-[color:var(--charcoal)]",
  ghost:
    "bg-transparent text-[color:var(--charcoal)] hover:bg-[color:var(--teal)] hover:text-[color:var(--ivory)]",
  ghostDark:
    "bg-transparent text-[color:var(--ivory)] hover:bg-[color:var(--ivory)]/[0.08]",
  hairline: "opacity-80 hover:opacity-100 focus-visible:opacity-100",
};

const variantStyle: Record<Variant, React.CSSProperties | undefined> = {
  primary: {
    boxShadow:
      "0 10px 26px -14px color-mix(in oklab, var(--charcoal-deep) 55%, transparent)",
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
        className="pointer-events-none absolute right-[-14px] h-8 w-14 rounded-full opacity-0 blur-[6px] transition-opacity duration-500 group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:hidden"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, color-mix(in oklab, var(--gold) 22%, transparent) 55%, color-mix(in oklab, var(--gold) 42%, transparent) 100%)",
        }}
      />
      <ArrowRight
        size={18}
        strokeWidth={1.5}
        className="relative transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:translate-x-2 group-focus-visible:translate-x-2"
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
      className="pointer-events-none absolute bottom-0 left-0 h-[1px] w-0 bg-[color:var(--gold)] opacity-50 transition-[width] duration-700 ease-in-out group-hover:w-full group-focus-visible:w-full motion-reduce:hidden"
    />
  );
}

export function CtaButton(props: CtaButtonProps) {
  const { variant = "primary", size = "md", icon, iconLeading, className, children } = props;

  const isHairline = variant === "hairline";
  const isKinetic = variant === "primary" || variant === "ghostDark";

  const trailing =
    icon === null
      ? null
      : isHairline
        ? (icon ?? (
            <span aria-hidden="true" className="flex items-center">
              <span className="block h-[1px] w-5 bg-[color:var(--gold)] transition-all duration-300 group-hover:w-8 group-focus-visible:w-8" />
              <ArrowRight
                size={12}
                className="ml-1 text-[color:var(--gold)] transition-transform duration-300 group-hover:translate-x-0.5 group-focus-visible:translate-x-0.5"
              />
            </span>
          ))
        : (icon ?? (
            <KineticArrow tone={variant === "primary" ? "gold" : "goldSoft"} />
          ));

  const content = (
    <>
      {iconLeading}
      <span className="cta-label relative">{children}</span>
      {trailing}
      {isKinetic ? <GoldSweep /> : null}
    </>
  );

  const sharedClassName = isHairline
    ? cn(hairlineBaseClasses, className)
    : cn(baseClasses, sizeClasses[size], variantClasses[variant], className);
  const sharedStyle =
    isHairline || className?.includes("hero-cta-button") ? undefined : variantStyle[variant];



  if ("href" in props && props.href !== undefined) {
    const {
      href,
      variant: _v,
      size: _s,
      icon: _i,
      iconLeading: _il,
      className: _c,
      children: _ch,
      ...rest
    } = props;
    return (
      <a href={href} className={sharedClassName} style={sharedStyle} {...rest}>
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
      className: _c,
      children: _ch,
      ...rest
    } = props;
    return (
      <Link to={to} className={sharedClassName} style={sharedStyle} {...(rest as object)}>
        {content}
      </Link>
    );
  }

  const {
    variant: _v,
    size: _s,
    icon: _i,
    iconLeading: _il,
    className: _c,
    children: _ch,
    ...rest
  } = props;
  return (
    <button className={sharedClassName} style={sharedStyle} {...rest}>
      {content}
    </button>
  );
}

export default CtaButton;
