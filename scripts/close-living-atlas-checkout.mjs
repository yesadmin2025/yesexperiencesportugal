import { readFileSync, writeFileSync } from "node:fs";

function replaceOnce(source, before, after, label) {
  const first = source.indexOf(before);
  if (first < 0) throw new Error(`Missing patch target: ${label}`);
  if (source.indexOf(before, first + before.length) >= 0) {
    throw new Error(`Patch target is not unique: ${label}`);
  }
  return source.slice(0, first) + after + source.slice(first + before.length);
}

const guestPath = "src/components/studio-v3/GuestDetailsStep.tsx";
let guest = readFileSync(guestPath, "utf8");

guest = replaceOnce(
  guest,
  `  readonly priceQuote?: (c: { adults: number; minorAges: number[] }) => ChargeQuote | null;\n  readonly className?: string;`,
  `  readonly priceQuote?: (c: { adults: number; minorAges: number[] }) => ChargeQuote | null;\n  /** Date already chosen in the Studio. When present it is shown, not asked again. */\n  readonly fixedTourDate?: string;\n  /** Allows each checkout path to describe the next action honestly. */\n  readonly submitLabel?: string;\n  readonly className?: string;`,
  "GuestDetailsStep props",
);

guest = replaceOnce(
  guest,
  `  onStorySubmit,\n  priceQuote,\n  className,`,
  `  onStorySubmit,\n  priceQuote,\n  fixedTourDate,\n  submitLabel,\n  className,`,
  "GuestDetailsStep destructuring",
);

guest = replaceOnce(
  guest,
  `  const [phone, setPhone] = useState(initial?.phone ?? "");\n  const [tourDate, setTourDate] = useState(\n    initial?.tourDate && isStudioBookingDateAllowed(initial.tourDate) ? initial.tourDate : "",\n  );`,
  `  const [phone, setPhone] = useState(initial?.phone ?? "");\n  const fixedDate =\n    fixedTourDate && isStudioBookingDateAllowed(fixedTourDate) ? fixedTourDate : null;\n  const [tourDate, setTourDate] = useState(\n    fixedDate ??\n      (initial?.tourDate && isStudioBookingDateAllowed(initial.tourDate)\n        ? initial.tourDate\n        : ""),\n  );`,
  "fixed date state",
);

guest = replaceOnce(
  guest,
  `  useEffect(() => {\n    prewarmStripeScript();\n  }, []);`,
  `  useEffect(() => {\n    prewarmStripeScript();\n  }, []);\n\n  useEffect(() => {\n    if (fixedDate) setTourDate(fixedDate);\n  }, [fixedDate]);`,
  "fixed date synchronisation",
);

guest = replaceOnce(
  guest,
  `          <GuestField label="Tour date" required>\n            <input\n              type="date"\n              value={tourDate}\n              min={minimumStudioBookingDateIso()}\n              onChange={(e) => setTourDate(e.target.value)}\n              className={guestInputClass}\n            />\n          </GuestField>`,
  `          <GuestField label="Tour date" required>\n            {fixedDate ? (\n              <div\n                data-testid="studio-v3-fixed-tour-date"\n                className={\`${guestInputClass} flex items-center\`}\n                aria-label="Selected tour date"\n              >\n                {new Intl.DateTimeFormat("en-GB", {\n                  weekday: "long",\n                  day: "numeric",\n                  month: "long",\n                  year: "numeric",\n                }).format(new Date(\`${fixedDate}T00:00:00\`))}\n              </div>\n            ) : (\n              <input\n                type="date"\n                value={tourDate}\n                min={minimumStudioBookingDateIso()}\n                onChange={(e) => setTourDate(e.target.value)}\n                className={guestInputClass}\n              />\n            )}\n          </GuestField>`,
  "fixed date display",
);

guest = replaceOnce(
  guest,
  `                Continue and email my Signature story`,
  `                {submitLabel ?? "Continue and email my Signature story"}`,
  "submit label",
);

writeFileSync(guestPath, guest);

const previewPath = "src/components/studio-v3/LivingAtlasJourneyPreview.tsx";
let preview = readFileSync(previewPath, "utf8");

preview = replaceOnce(
  preview,
  `import { ShapeStep } from "@/components/studio-v3/LivingAtlasShapeStep";`,
  `import { ShapeStep } from "@/components/studio-v3/LivingAtlasShapeStep";\nimport { LivingAtlasBookingStep } from "@/components/studio-v3/LivingAtlasBookingStep";`,
  "booking import",
);

preview = replaceOnce(
  preview,
  `  const [statusMessage, setStatusMessage] = useState("");`,
  `  const [statusMessage, setStatusMessage] = useState("");\n  const [bookingOpen, setBookingOpen] = useState(false);`,
  "booking state",
);

preview = replaceOnce(
  preview,
  `  const routePlan = resolution?.routePlan ?? null;`,
  `  const routePlan = resolution?.routePlan ?? null;\n  const checkoutBlocked =\n    composition?.status === "invalid" ||\n    composition?.status === "impossible" ||\n    routePlan?.status === "unavailable" ||\n    routePlan?.status === "over-budget";`,
  "checkout readiness",
);

preview = replaceOnce(
  preview,
  `    setStatusMessage("");\n    clearLivingAtlasPreviewState();`,
  `    setStatusMessage("");\n    setBookingOpen(false);\n    clearLivingAtlasPreviewState();`,
  "reset booking",
);

preview = replaceOnce(
  preview,
  `  return (\n    <main`,
  `  if (\n    bookingOpen &&\n    selectedSignatureId &&\n    selectedDate &&\n    routePlan\n  ) {\n    return (\n      <main\n        className="min-h-[100dvh] w-full bg-[color:var(--ivory)] py-4 sm:py-8"\n        style={{ color: "var(--charcoal)" }}\n      >\n        <LivingAtlasBookingStep\n          signatureId={selectedSignatureId}\n          selectedDate={selectedDate}\n          profile={profile}\n          preferences={preferences}\n          routePlan={routePlan}\n          onBack={() => setBookingOpen(false)}\n        />\n      </main>\n    );\n  }\n\n  return (\n    <main`,
  "booking screen",
);

preview = replaceOnce(
  preview,
  `              Isolated, noindex and unbookable. No price, checkout or production behaviour is\n              changed.`,
  `              Isolated, noindex and sandbox-only. Production prices and bookings remain\n              unchanged.`,
  "preview safety copy",
);

preview = replaceOnce(
  preview,
  `                onBack={goBack}\n              />`,
  `                onBack={goBack}\n              />\n              <div className="mx-auto mt-8 max-w-xl text-center">\n                <button\n                  type="button"\n                  disabled={checkoutBlocked}\n                  onClick={() => setBookingOpen(true)}\n                  className="inline-flex min-h-12 w-full items-center justify-center rounded-full px-6 text-[11px] font-bold uppercase tracking-[0.2em] disabled:cursor-not-allowed disabled:opacity-40"\n                  style={{ background: "var(--gold)", color: "var(--charcoal)" }}\n                >\n                  Continue to booking\n                </button>\n                <p\n                  className="mt-3 text-[11px] leading-5"\n                  style={{ color: "color-mix(in oklab, var(--ivory) 58%, transparent)" }}\n                >\n                  Your selected date and composed moments continue with you. This isolated preview\n                  opens Stripe sandbox only.\n                </p>\n              </div>`,
  "shape checkout CTA",
);

writeFileSync(previewPath, preview);
console.log("Living Atlas checkout handoff patched.");
