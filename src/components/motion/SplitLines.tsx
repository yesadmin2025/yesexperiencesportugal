import { createElement, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useInView } from "./useInView";

/**
 * SplitLines — reveals intentional editorial lines through an ink-like
 * horizontal mask. It never measures or rewrites browser-wrapped text.
 * Provide manual line breaks with `lines`; plain `text` remains supported.
 */
interface SplitLinesProps {
  text?: string;
  lines?: ReactNode[];
  as?: "h1" | "h2" | "h3" | "h4" | "p" | "span";
  className?: string;
  lineClassName?: string;
}

export function SplitLines({ text, lines, as = "h2", className, lineClassName }: SplitLinesProps) {
  const [ref, inView] = useInView<HTMLElement>();
  const parts = lines ?? (text ? text.split(/\n+/) : []);
  return createElement(
    as,
    {
      ref,
      className: cn("motion-split editorial-title-safe", inView && "is-visible", className),
    },
    parts.map((line, i) =>
      createElement(
        "span",
        {
          key: i,
          className: cn("motion-split-line", lineClassName),
          style: { ["--split-index" as string]: String(i) },
        },
        line,
      ),
    ),
  );
}
