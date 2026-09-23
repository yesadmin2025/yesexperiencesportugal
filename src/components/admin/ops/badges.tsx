/**
 * Operational badges — source channel, booking state, payment state and guide
 * assignment. Reads at a glance on a phone: one small pill each, brand palette,
 * no decoration.
 */
import { cn } from "@/lib/utils";

const base =
  "inline-flex items-center gap-1 rounded-full border px-2 py-[2px] text-[10.5px] font-medium uppercase tracking-[0.12em] whitespace-nowrap";

const CHANNEL_STYLES: Record<string, string> = {
  WEBSITE: "border-[color:var(--teal)]/30 bg-[color:var(--teal)]/10 text-[color:var(--teal)]",
  DIRECT: "border-[color:var(--gold)]/40 bg-[color:var(--gold)]/12 text-[#8A6B23]",
  VIATOR: "border-[#1F6F5C]/30 bg-[#1F6F5C]/10 text-[#1F6F5C]",
  GETYOURGUIDE: "border-[#F05A28]/30 bg-[#F05A28]/10 text-[#B23F16]",
  BOKUN: "border-[#3C5A99]/30 bg-[#3C5A99]/10 text-[#3C5A99]",
  OTHER: "border-[color:var(--charcoal)]/20 bg-[color:var(--charcoal)]/6 text-[color:var(--charcoal-soft)]",
};

export function ChannelBadge({ channel, source }: { channel: string | null; source?: string | null }) {
  const key = (channel ?? (source === "EMAIL" ? "DIRECT" : "WEBSITE")).toUpperCase();
  const label = key === "GETYOURGUIDE" ? "GetYourGuide" : key.charAt(0) + key.slice(1).toLowerCase();
  return <span className={cn(base, CHANNEL_STYLES[key] ?? CHANNEL_STYLES["OTHER"])}>{label}</span>;
}

export function StatusBadge({ status }: { status: string | null }) {
  const value = (status ?? "pending").toLowerCase();
  const styles =
    value === "paid"
      ? "border-[#1F6F5C]/30 bg-[#1F6F5C]/10 text-[#1F6F5C]"
      : value === "cancelled" || value === "failed"
        ? "border-[#9B2C2C]/30 bg-[#9B2C2C]/8 text-[#9B2C2C]"
        : value === "refunded"
          ? "border-[color:var(--charcoal)]/20 bg-[color:var(--charcoal)]/6 text-[color:var(--charcoal-soft)]"
          : "border-[color:var(--gold)]/45 bg-[color:var(--gold)]/12 text-[#8A6B23]";
  const label = value === "paid" ? "Confirmed" : value.charAt(0).toUpperCase() + value.slice(1);
  return <span className={cn(base, styles)}>{label}</span>;
}

export function PaymentBadge({ paymentStatus }: { paymentStatus: string | null }) {
  if (!paymentStatus) return null;
  const value = paymentStatus.toUpperCase();
  const styles =
    value === "PAID"
      ? "border-[#1F6F5C]/30 bg-[#1F6F5C]/10 text-[#1F6F5C]"
      : value === "REFUNDED"
        ? "border-[color:var(--charcoal)]/20 bg-[color:var(--charcoal)]/6 text-[color:var(--charcoal-soft)]"
        : "border-[#9B6B1F]/30 bg-[#9B6B1F]/10 text-[#8A6B23]";
  const label =
    value === "PAID" ? "Paid" : value === "PENDING_PAYMENT" ? "Awaiting payment" : value.toLowerCase();
  return <span className={cn(base, styles)}>{label}</span>;
}

export function GuideBadge({ guideName }: { guideName: string | null }) {
  return guideName ? (
    <span className={cn(base, "border-[color:var(--teal)]/30 bg-[color:var(--teal)]/8 text-[color:var(--teal)]")}>
      {guideName}
    </span>
  ) : (
    <span className={cn(base, "border-dashed border-[#9B2C2C]/40 bg-transparent text-[#9B2C2C]")}>
      No guide
    </span>
  );
}

export function ReviewBadge({ reason }: { reason?: string | null }) {
  return (
    <span
      className={cn(base, "border-[#9B2C2C]/40 bg-[#9B2C2C]/8 text-[#9B2C2C]")}
      title={reason ?? undefined}
    >
      Needs review
    </span>
  );
}
