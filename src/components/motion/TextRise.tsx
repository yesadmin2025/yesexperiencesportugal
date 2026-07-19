import { createElement } from "react";
import { cn } from "@/lib/utils";
import { useInView } from "./useInView";

/**
 * TextRise — Motion v4 upgraded SplitLines.
 * Splits a string into lines (or words) that rise from a mask on entry.
 * Configurable stagger. Server-rendered as plain text-in-spans; animation
 * gated post-hydration to avoid layout shift.
 */
interface TextRiseProps {
  text?: string;
  lines?: string[];
  mode?: "lines" | "words";
  stagger?: number; // ms
  as?: "h1" | "h2" | "h3" | "h4" | "p" | "span";
  className?: string;
  lineClassName?: string;
}

export function TextRise({
  text,
  lines,
  mode = "lines",
  stagger = 60,
  as = "h2",
  className,
  lineClassName,
}: TextRiseProps) {
  const [ref, inView] = useInView<HTMLElement>();
  let parts: string[] = [];
  if (lines) parts = lines;
  else if (text) parts = mode === "words" ? text.split(/\s+/) : text.split(/\n+/);
  return createElement(
    as,
    {
      ref,
      className: cn("motion-rise", `mode-${mode}`, inView && "is-visible", className),
      style: { ["--rise-stagger" as string]: `${stagger}ms` },
    },
    parts.map((p, i) =>
      createElement(
        "span",
        {
          key: i,
          className: cn("motion-rise-part", lineClassName),
          style: { ["--rise-index" as string]: String(i) },
        },
        mode === "words" ? p + (i < parts.length - 1 ? " " : "") : p,
      ),
    ),
  );
}
