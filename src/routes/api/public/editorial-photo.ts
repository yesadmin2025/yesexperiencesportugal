import { createFileRoute } from "@tanstack/react-router";

const SAFE_PATH = /^home-paths\/(studio|signature|designer|proposals|corporate)\/[a-zA-Z0-9-]+\.(jpg|webp)$/;

export const Route = createFileRoute("/api/public/editorial-photo")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const path = new URL(request.url).searchParams.get("path") ?? "";
        if (!SAFE_PATH.test(path)) return new Response("Not found", { status: 404 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.storage.from("editorial-photos").download(path);
        if (error || !data) return new Response("Not found", { status: 404 });

        return new Response(data, {
          headers: {
            "Content-Type": data.type || (path.endsWith(".webp") ? "image/webp" : "image/jpeg"),
            "Cache-Control": "public, max-age=31536000, immutable",
            "X-Content-Type-Options": "nosniff",
          },
        });
      },
    },
  },
});