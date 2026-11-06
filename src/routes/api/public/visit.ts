import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { visitProductPath } from "@/lib/visit-product-path";

const LIVE_HOSTS = ["yesexperiencesportugal.com", "www.yesexperiencesportugal.com"];

const schema = z.object({
  visitorId: z.string().regex(/^[a-z0-9-]{8,64}$/i),
  path: z.string().min(1).max(300),
  referrer: z.string().max(300).nullable().optional(),
  event: z.enum(["view", "booking_start", "landing", "cta_click"]).default("view"),
  cta: z.enum(["tailor", "studio", "signature"]).optional(),
});

export const Route = createFileRoute("/api/public/visit")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const origin = request.headers.get("origin") ?? "";
        let host = "";
        try {
          host = new URL(origin).hostname;
        } catch {
          return new Response(null, { status: 204 });
        }
        if (!LIVE_HOSTS.includes(host)) return new Response(null, { status: 204 });
        const raw = await request.text();
        if (raw.length > 2000) return new Response(null, { status: 413 });
        const parsed = schema.safeParse(JSON.parse(raw || "{}"));
        if (!parsed.success) return new Response(null, { status: 400 });
        const d = parsed.data;
        if (d.path.startsWith("/admin") || d.path.startsWith("/guide")) {
          return new Response(null, { status: 204 });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        await supabaseAdmin.from("site_visits").insert({
          visitor_id: d.visitorId,
          path: d.path.split("?")[0],
          referrer: d.referrer ? d.referrer.slice(0, 300) : null,
          product_path: d.event === "cta_click" ? (d.cta ?? null) : visitProductPath(d.path),
          event: d.event,
        });
        return new Response(null, { status: 204 });
      },
    },
  },
});
