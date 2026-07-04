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
  "he-glow he-sheen group inline-flex items-center justify-center gap-2.5 font-sans uppercase font-semibold rounded-[2px] transition-all duration-300 ease-[cubic-bezier(0.22,0.61,0.36,1)] hover:-translate-y-[1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--ivory)] disabled:pointer-events-none disabled:opacity-40";

const hairlineBaseClasses =
  "group inline-flex items-center gap-3 rounded-[2px] font-sans uppercase font-semibold text-[11px] tracking-[0.25em] py-2 text-[color:var(--charcoal)] transition-opacity duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--teal)] focus-visible:ring-offset-4 focus-visible:ring-offset-[color:var(--ivory)] disabled:pointer-events-none disabled:opacity-40";

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-[color:var(--teal)] text-[color:var(--ivory)] hover:bg-[color:var(--teal-2)] he-cta-shift",
  ghost: "bg-transparent text-[color:var(--charcoal)] hover:bg-[color:var(--teal)]/[0.06]",
  ghostDark: "bg-transparent text-[color:var(--ivory)] hover:bg-[color:var(--ivory)]/[0.08]",
  hairline: "opacity-80 hover:opacity-100 focus-visible:opacity-100",
};

const variantStyle: Record<Variant, React.CSSProperties | undefined> = {
  primary: {
    border: "1px solid color-mix(in oklab, var(--gold-deep) 55%, transparent)",
    boxShadow:
      "inset 0 0 0 1px color-mix(in oklab, var(--gold) 22%, transparent), 0 8px 22px -10px color-mix(in oklab, var(--charcoal-deep) 35%, transparent)",
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

function arrowClasses(variant: Variant) {
  return cn(
    "transition-[transform,color] duration-300 ease-[cubic-bezier(0.22,0.61,0.36,1)] group-hover:translate-x-1.5 group-focus-visible:translate-x-1.5",
    variant === "primary"
      ? "text-[color:var(--gold-soft)] group-hover:text-[color:var(--gold)]"
      : variant === "ghostDark"
        ? "text-[color:var(--gold-soft)] group-hover:text-[color:var(--gold)]"
        : "text-[color:var(--gold)] group-hover:text-[color:var(--gold-deep)]",
  );
}


export function CtaButton(props: CtaButtonProps) {
  const { variant = "primary", size = "md", icon, iconLeading, className, children } = props;

  const isHairline = variant === "hairline";
  const arrowSize = variant === "primary" ? 14 : 12;

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
            <ArrowRight size={arrowSize} aria-hidden="true" className={arrowClasses(variant)} />
          ));

  const content = (
    <>
      {iconLeading}
      <span className="cta-label">{children}</span>
      {trailing}
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
