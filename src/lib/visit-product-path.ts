/** Shared route classification for new visits and read-only historical views. */
export function visitProductPath(path: string): string | null {
  const pathname = path.split(/[?#]/)[0];
  if (/^\/tours\/[^/]+\/tailor\/?$/.test(pathname)) return "tailor";
  if (/^\/tours\/[^/]+\/?$/.test(pathname)) return "signature";
  if (pathname.startsWith("/studio") || pathname.includes("tailor")) return "studio";
  if (pathname.startsWith("/experiences") || pathname.startsWith("/signature")) return "signature";
  if (pathname.startsWith("/portugal-travel-designer")) return "travel_designer";
  if (pathname.startsWith("/proposal") || pathname.startsWith("/moments")) return "moments";
  if (pathname.startsWith("/corporate")) return "corporate";
  return null;
}