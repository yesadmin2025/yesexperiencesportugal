import { readFile, writeFile } from "node:fs/promises";

async function replaceOnce(path, before, after) {
  const source = await readFile(path, "utf8");
  if (!source.includes(before)) {
    throw new Error(`Expected patch anchor not found in ${path}: ${before.slice(0, 80)}`);
  }
  const next = source.replace(before, after);
  if (next === source) throw new Error(`No change produced for ${path}`);
  await writeFile(path, next);
}

const guestPath = "src/components/studio-v3/GuestDetailsStep.tsx";
await replaceOnce(
  guestPath,
  'import { toast } from "sonner";\n',
  'import {\n  isStudioBookingDateAllowed,\n  minimumStudioBookingDateIso,\n} from "@/components/studio-v3/dateGuards";\nimport { toast } from "sonner";\n',
);
await replaceOnce(
  guestPath,
  '  const [tourDate, setTourDate] = useState(initial?.tourDate ?? "");',
  '  const [tourDate, setTourDate] = useState(\n    initial?.tourDate && isStudioBookingDateAllowed(initial.tourDate) ? initial.tourDate : "",\n  );',
);
await replaceOnce(
  guestPath,
  '    if (!tourDate) missing.push("tour date");',
  '    if (!isStudioBookingDateAllowed(tourDate)) missing.push("tour date");',
);
await replaceOnce(
  guestPath,
  '              min={new Date().toISOString().split("T")[0]}',
  '              min={minimumStudioBookingDateIso()}',
);
await replaceOnce(
  guestPath,
  `          <GuestField label="Notes for the guide">
            <textarea
              value={guideNotes}
              onChange={(e) => setGuideNotes(e.target.value)}
              rows={3}
              className={\`${'${guestInputClass}'} resize-none\`}
            />
          </GuestField>`,
  `          <GuestField label="Preferences for your day" hint="Optional">
            <textarea
              value={guideNotes}
              onChange={(e) => setGuideNotes(e.target.value)}
              placeholder="Winery preferences or anything not shown in the Studio"
              rows={3}
              className={\`${'${guestInputClass}'} resize-none\`}
            />
            <p className="mt-1.5 text-[11px] leading-snug text-[color:var(--charcoal-soft)]">
              We consider these preferences whenever possible. They do not delay payment or booking
              confirmation.
            </p>
          </GuestField>`,
);

const edgePath = "supabase/functions/create-signature-checkout/index.ts";
await replaceOnce(
  edgePath,
  'import { type StripeEnv, createStripeClient } from "../_shared/stripe.ts";\n',
  'import { type StripeEnv, createStripeClient } from "../_shared/stripe.ts";\nimport { isStudioCheckoutDateAllowed } from "../_shared/studio-booking-date.ts";\n',
);
await replaceOnce(
  edgePath,
  `    const flowError = validateFlow(body);
    if (flowError) return jsonError(flowError, 400);

    const uiMode: "hosted" | "embedded" = body.uiMode === "embedded" ? "embedded" : "hosted";`,
  `    const flowError = validateFlow(body);
    if (flowError) return jsonError(flowError, 400);

    const checkoutFlow = resolveFlow(body);
    if (checkoutFlow === "studio" && !isStudioCheckoutDateAllowed(body.dateExact)) {
      return jsonError("Selected Studio date is not available", 409);
    }

    const uiMode: "hosted" | "embedded" = body.uiMode === "embedded" ? "embedded" : "hosted";`,
);
await replaceOnce(
  edgePath,
  '    const flow = resolveFlow(body);',
  '    const flow = checkoutFlow;',
);
await replaceOnce(
  edgePath,
  `        ...(body.guestDetails?.startTime
          ? { start_time: String(body.guestDetails.startTime).slice(0, 16) }
          : {}),`,
  `        ...(body.guestDetails?.startTime
          ? { start_time: String(body.guestDetails.startTime).slice(0, 16) }
          : {}),
        ...(typeof body.guestDetails?.guideNotes === "string" &&
        body.guestDetails.guideNotes.trim()
          ? { traveller_preferences: body.guestDetails.guideNotes.trim().slice(0, 480) }
          : {}),`,
);
await replaceOnce(
  edgePath,
  '        str(gd.guideNotes, 1200) ? `Guide notes: ${str(gd.guideNotes, 1200)}` : null,',
  '        str(gd.guideNotes, 1200) ? `Preferences: ${str(gd.guideNotes, 1200)}` : null,',
);

console.log("Applied Studio checkout date and preference rules.");
