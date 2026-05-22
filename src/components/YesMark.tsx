/**
 * YesMark — standalone handwritten "YES" wordmark on transparent background.
 *
 * Used as the cinematic logo state at the top of the homepage hero. As soon as
 * the user begins scrolling, the navbar crossfades to the full lockup (<Logo />).
 *
 * Asset: refined brush-script "YES" in brand teal (var(--teal)), transparent PNG.
 */

import yesMarkAsset from "@/assets/yes-mark-refined.png";

export function YesMark({
  className = "block h-[58px] md:h-[64px] lg:h-[70px] w-auto select-none",
  ariaLabel = "YES",
}: {
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <img
      src={yesMarkAsset}
      alt={ariaLabel}
      className={className}
      decoding="async"
      loading="eager"
    />
  );
}

export default YesMark;
