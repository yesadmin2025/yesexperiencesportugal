/**
 * Phone identity helpers shared by the WhatsApp evidence pipeline.
 *
 * Pure and browser-safe: normalisation to E.164 where the number is
 * unambiguous, and a conservative comparison used for identity matching.
 * A number we cannot normalise stays null — we never guess a country.
 */

/** Portugal, because that is where the operation and its numbers live. */
const DEFAULT_COUNTRY = "351";

/** "+351 912 345 678", "00351912345678", "912345678" -> "+351912345678". */
export function normalizePhone(
  raw: string | null | undefined,
  defaultCountry: string = DEFAULT_COUNTRY,
): string | null {
  if (raw == null) return null;
  const text = String(raw).trim();
  if (!text) return null;
  const hadPlus = text.startsWith("+");
  let digits = text.replace(/\D/g, "");
  if (!digits) return null;

  if (!hadPlus && digits.startsWith("00")) digits = digits.slice(2);
  // A bare 9-digit Portuguese number (mobile 9x, landline 2x) only.
  if (!hadPlus && digits.length === 9 && /^[92]/.test(digits)) digits = `${defaultCountry}${digits}`;

  if (digits.length < 8 || digits.length > 15) return null;
  return `+${digits}`;
}

/** Digits only, without the leading plus — the form the WhatsApp API expects. */
export function phoneDigits(raw: string | null | undefined): string | null {
  const normalised = normalizePhone(raw);
  return normalised ? normalised.slice(1) : null;
}

/** Last significant digits, used for `ilike` lookups against stored numbers. */
export function phoneTail(raw: string | null | undefined, length = 9): string | null {
  const digits = phoneDigits(raw);
  if (!digits) return null;
  return digits.slice(-Math.min(length, digits.length));
}

/**
 * True when two written numbers are the same line. Exact E.164 equality first;
 * otherwise the last nine digits, which absorbs a missing or duplicated
 * country code without matching short or partial numbers.
 */
export function phoneMatches(a: string | null | undefined, b: string | null | undefined): boolean {
  const left = normalizePhone(a);
  const right = normalizePhone(b);
  if (!left || !right) return false;
  if (left === right) return true;
  const tailA = left.slice(-9);
  const tailB = right.slice(-9);
  return tailA.length === 9 && tailA === tailB;
}

/** First phone number written in free text, normalised, or null. */
export function findPhoneInText(text: string | null | undefined): string | null {
  if (!text) return null;
  const matches = text.matchAll(/(\+?\d[\d\s().-]{7,20}\d)/g);
  for (const match of matches) {
    const candidate = normalizePhone(match[1]);
    if (candidate) return candidate;
  }
  return null;
}
