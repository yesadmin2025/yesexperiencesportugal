import { MessageCircle } from "lucide-react";
import { CtaButton } from "@/components/ui/CtaButton";
import { trackStudio } from "@/lib/studio-analytics";

export function studioDayShareUrl(input: {
  title: string;
  stops: readonly string[];
  date: string | null;
  totalEur: number | null;
}) {
  const text = [
    `${input.title} — YES Experiences Portugal`,
    input.date,
    ...input.stops.map((label) => `· ${label}`),
    input.totalEur != null ? `Total: €${input.totalEur}` : null,
    "Day idea — not a confirmed reservation.",
    "https://yesexperiencesportugal.com/studio?utm_source=whatsapp&utm_medium=share&utm_campaign=studio_day",
  ].filter(Boolean).join("\n");
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function StudioDayWhatsApp(props: Parameters<typeof studioDayShareUrl>[0]) {
  return (
    <CtaButton
      href={studioDayShareUrl(props)}
      target="_blank"
      rel="noopener noreferrer"
      variant="hairline"
      icon={null}
      iconLeading={<MessageCircle size={16} aria-hidden />}
      data-testid="studio-v3-share-whatsapp"
      className="max-w-[380px] text-center"
      onClick={() => trackStudio("day_shared", { phase: "storyboard", method: "whatsapp", moment_count: props.stops.length })}
    >
      Send this day to my WhatsApp
    </CtaButton>
  );
}