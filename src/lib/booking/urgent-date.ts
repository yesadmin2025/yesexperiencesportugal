/** True when a YYYY-MM-DD travel date starts within the next two days (local midnight). */
export function isWithin48Hours(dateIso: string, now: Date = new Date()): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) return false;
  const [y, m, d] = dateIso.split("-").map(Number);
  const start = new Date(y, m - 1, d).getTime();
  const diff = start - now.getTime();
  return diff < 48 * 3600 * 1000 && start + 24 * 3600 * 1000 > now.getTime();
}
