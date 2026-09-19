import {
  forwardRef,
  useCallback,
  useRef,
  type ElementType,
  type ComponentPropsWithoutRef,
  type ReactElement,
  type Ref,
} from "react";

import { activateSceneReveal, type UseSceneRevealOptions } from "@/lib/motion/useSceneReveal";
import { cn } from "@/lib/utils";

/**
 * Scene — polymorphic wrapper that opts a block of markup into the
 * progressive-enhancement reveal system.
 *
 * Contract:
 *  • Content is visible by default. Reveal styles apply ONLY when
 *    child elements carry `.scene-title`, `.scene-body`, `.scene-cta`,
 *    `.scene-item`, or `.scene-atmosphere` classes AND the Scene has
 *    been marked ready by `useSceneReveal`.
 *  • Does NOT default to `<section>`. `as` defaults to `"div"` so
 *    callers already inside a `<section>` do not produce nested
 *    landmarks. Pass `as="section"` explicitly when standalone.
 *  • Never modifies heading order.
 *  • No new runtime dependency — plain polymorphic component; there
 *    is no `asChild` / Slot mode (Radix Slot is not installed).
 */
type SceneOwnProps<E extends ElementType> = {
  as?: E;
  className?: string;
  scene?: UseSceneRevealOptions;
};

type SceneProps<E extends ElementType> = SceneOwnProps<E> &
  Omit<ComponentPropsWithoutRef<E>, keyof SceneOwnProps<E>>;

function SceneImpl<E extends ElementType = "div">(
  { as, className, scene, children, ...rest }: SceneProps<E>,
  forwardedRef: Ref<Element>,
): ReactElement {
  const Component = (as || "div") as ElementType;
  const localRef = useRef<HTMLElement | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  const setRef = useCallback((node: HTMLElement | null) => {
    cleanupRef.current?.();
    cleanupRef.current = null;
    localRef.current = node;
    if (node) cleanupRef.current = activateSceneReveal(node, scene);
    if (typeof forwardedRef === "function") forwardedRef(node);
    else if (forwardedRef) (forwardedRef as { current: Element | null }).current = node;
  }, [forwardedRef, scene]);

  return (
    <Component ref={setRef} className={cn(className)} {...rest}>
      {children}
    </Component>
  );
}

export const Scene = forwardRef(SceneImpl) as <E extends ElementType = "div">(
  props: SceneProps<E> & { ref?: Ref<Element> },
) => ReactElement;
