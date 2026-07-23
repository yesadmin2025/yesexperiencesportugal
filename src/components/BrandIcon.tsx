import {
  FaInstagram,
  FaFacebookF,
  FaTripadvisor,
  FaWhatsapp,
} from "react-icons/fa";
import type { ComponentType, SVGProps } from "react";

type IconProps = { size?: number; className?: string; title?: string };

const Monogram = ({
  label,
  size = 16,
  className,
  title,
}: {
  label: string;
  size?: number;
  className?: string;
  title?: string;
}) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    className={className}
    aria-hidden={title ? undefined : "true"}
    aria-label={title}
    role={title ? "img" : undefined}
    focusable="false"
  >
    {title && <title>{title}</title>}
    <text
      x="50%"
      y="52%"
      dominantBaseline="middle"
      textAnchor="middle"
      fontFamily="var(--font-display), Georgia, serif"
      fontSize={label.length > 2 ? 9 : 12}
      fontWeight={600}
      letterSpacing="0.02em"
      fill="currentColor"
    >
      {label}
    </text>
  </svg>
);

const wrap = (Icon: ComponentType<SVGProps<SVGSVGElement>>): ComponentType<IconProps> =>
  ({ size = 16, className, title }: IconProps) => (
    <Icon
      width={size}
      height={size}
      className={className}
      aria-hidden={title ? undefined : "true"}
      aria-label={title}
      role={title ? "img" : undefined}
      focusable="false"
    >
      {title && <title>{title}</title>}
    </Icon>
  );

export const InstagramIcon = wrap(FaInstagram as ComponentType<SVGProps<SVGSVGElement>>);
export const FacebookIcon = wrap(FaFacebookF as ComponentType<SVGProps<SVGSVGElement>>);
export const TripadvisorIcon = wrap(FaTripadvisor as ComponentType<SVGProps<SVGSVGElement>>);
export const WhatsAppIcon = wrap(FaWhatsapp as ComponentType<SVGProps<SVGSVGElement>>);

export const ViatorIcon = ({ size, className }: IconProps) => (
  <Monogram label="V" size={size} className={className} />
);
export const GetYourGuideIcon = ({ size, className }: IconProps) => (
  <Monogram label="GYG" size={size} className={className} />
);
