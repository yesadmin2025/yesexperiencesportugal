import { createElement } from "react";
import { cn } from "@/lib/utils";
import { useInView } from "./useInView";

/**
 * SplitLines — splits a string into line elements that rise from below a
 * mask on entry. Only accepts a plain string to avoid runtime measurement
 * cost. Provide manual line breaks by passing `lines` instead.
 */
interface SplitLinesProps {
  text?: string;
  lines?: string[];
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
      className: cn("motion-split", inView && "is-visible", className),
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
