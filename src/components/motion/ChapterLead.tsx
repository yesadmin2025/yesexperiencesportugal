import { createElement, type ReactNode } from "react";

import { Eyebrow } from "@/components/ui/Eyebrow";
import { cn } from "@/lib/utils";

/**
 * ChapterLead — the shared eyebrow + gold rule + heading opener used
 * before every major narrative section. Wire the outer `Scene` yourself
 * on the containing block; this component only supplies the reveal-
 * ready classes (`scene-atmosphere`, `scene-title`, `scene-body`).
 *
 * `titleAs` respects the caller's heading order — never assume h2.
 */
interface ChapterLeadProps {
  eyebrow?: ReactNode;
  title: ReactNode;
  body?: ReactNode;
  titleAs?: "h1" | "h2" | "h3" | "h4";
  align?: "left" | "center";
  className?: string;
  titleClassName?: string;
  bodyClassName?: string;
}

export function ChapterLead({
  eyebrow,
  title,
  body,
  titleAs = "h2",
  align = "left",
  className,
  titleClassName,
  bodyClassName,
}: ChapterLeadProps) {
  const alignCls = align === "center" ? "text-center items-center" : "text-left items-start";

  return (
    <div className={cn("flex flex-col", alignCls, className)}>
      {eyebrow ? (
        <div className="scene-atmosphere">
          <Eyebrow>{eyebrow}</Eyebrow>
        </div>
      ) : null}
      {createElement(
        titleAs,
        {
          className: cn(
            "scene-title mt-3 font-[family-name:var(--font-editorial)] text-[color:var(--charcoal)] leading-[1.1] tracking-[-0.01em]",
            titleClassName,
          ),
        },
        title,
      )}
      {body ? (
        <div
          className={cn(
            "scene-body mt-4 text-[15px] md:text-[16px] leading-relaxed text-[color:var(--charcoal-soft)] max-w-[62ch]",
            bodyClassName,
          )}
        >
          {body}
        </div>
      ) : null}
    </div>
  );
}
