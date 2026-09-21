import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/path-photos")({
  head: () => ({
    meta: [
      { title: "Five paths photos — YES Admin" },
      { name: "description", content: "The retired Five Paths photography manager." },
      { property: "og:title", content: "Five paths photos — YES Admin" },
      { property: "og:description", content: "The retired Five Paths photography manager." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminPathPhotosPage,
});

function AdminPathPhotosPage() {
  return (
    <SiteLayout><section className="pb-20 pt-24"><div className="container-x max-w-2xl">
      <Link to="/admin" className="inline-flex min-h-11 items-center gap-2 text-xs uppercase tracking-[0.18em] text-[color:var(--charcoal-soft)]"><ArrowLeft size={14} /> Admin</Link>
      <h1 className="mt-4 text-3xl">Five paths photos retired</h1>
      <p className="mt-3 text-sm leading-relaxed text-[color:var(--charcoal-soft)]">The Five Ways homepage cards are now intentionally text-only, and the Portugal map no longer uses photographs. This older manager has been retired so it cannot publish changes that visitors will not see.</p>
      <Button asChild className="mt-6 min-h-11"><Link to="/admin/photos">Manage active website photos</Link></Button>
    </div></section></SiteLayout>
  );
}