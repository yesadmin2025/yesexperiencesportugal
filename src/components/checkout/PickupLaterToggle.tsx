/**
 * "I'll confirm pickup later" — lets the guest pay without a pickup address.
 * Sends an explicit operational value (never an invented address) so the
 * operations team can tell a deliberate later-confirmation from missing data.
 */
export const PICKUP_TO_BE_CONFIRMED = "To be confirmed — guest will confirm pickup later";

export function isPickupToBeConfirmed(value: string | null | undefined): boolean {
  return (value ?? "").trim() === PICKUP_TO_BE_CONFIRMED;
}

export function PickupLaterToggle({
  checked,
  onChange,
  testId = "pickup-later-toggle",
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  testId?: string;
}) {
  return (
    <label className="mt-2 flex min-h-[44px] cursor-pointer items-center gap-3 text-[13.5px] text-[color:var(--charcoal)]">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        data-testid={testId}
        className="h-5 w-5 accent-[color:var(--teal)]"
      />
      <span>I'll confirm pickup later</span>
    </label>
  );
}
