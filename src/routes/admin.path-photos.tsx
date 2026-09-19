import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import imageCompression from "browser-image-compression";
import { ArrowLeft, Check, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { SiteLayout } from "@/components/SiteLayout";
import { Button } from "@/components/ui/button";
import { HOME_PATH_DESTINATION_LIST, useHomePathDestinations, type HomePathId } from "@/content/home-path-images";
import { supabase } from "@/integrations/supabase/client";
import { publishOverridesBatch } from "@/lib/editorial-overrides";

export const Route = createFileRoute("/admin/path-photos")({
  head: () => ({
    meta: [
      { title: "Five paths photos — YES Admin" },
      { name: "description", content: "Manage the photographs used by the five homepage paths and map." },
      { property: "og:title", content: "Five paths photos — YES Admin" },
      { property: "og:description", content: "Manage the photographs used by the five homepage paths and map." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminPathPhotosPage,
});

type AuthState = "loading" | "signed-out" | "not-admin" | "ready";
type Draft = { file: File | null; preview: string; alt: string; sourceUrl: string };

async function preparePhoto(file: File): Promise<File> {
  let input = file;
  if (/heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name)) {
    const heic2any = (await import("heic2any")).default;
    const output = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
    const blob = Array.isArray(output) ? output[0] : output;
    input = new File([blob], file.name.replace(/\.(heic|heif)$/i, ".jpg"), { type: "image/jpeg" });
  }
  const compressed = await imageCompression(input, {
    maxSizeMB: 1.5,
    maxWidthOrHeight: 2400,
    useWebWorker: true,
    fileType: "image/jpeg",
    initialQuality: 0.88,
  });
  return new File([compressed], input.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" });
}

function AdminPathPhotosPage() {
  const managedDestinations = useHomePathDestinations();
  const [authState, setAuthState] = useState<AuthState>("loading");
  const [drafts, setDrafts] = useState<Record<HomePathId, Draft>>(() =>
    Object.fromEntries(HOME_PATH_DESTINATION_LIST.map((path) => [path.id, {
      file: null,
      preview: path.image.src,
      alt: path.image.alt,
      sourceUrl: "",
    }])) as Record<HomePathId, Draft>,
  );
  const [saving, setSaving] = useState<HomePathId | null>(null);
  const objectUrls = useRef<string[]>([]);

  const checkAuth = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return setAuthState("signed-out");
    const { data: admin } = await supabase.rpc("has_role", { _user_id: data.user.id, _role: "admin" });
    setAuthState(admin ? "ready" : "not-admin");
  }, []);

  useEffect(() => {
    void checkAuth();
    const { data } = supabase.auth.onAuthStateChange(() => void checkAuth());
    return () => {
      data.subscription.unsubscribe();
      objectUrls.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [checkAuth]);

  useEffect(() => {
    setDrafts((current) => Object.fromEntries(managedDestinations.map((path) => [path.id, {
      ...current[path.id],
      preview: current[path.id].file ? current[path.id].preview : path.image.src,
      alt: current[path.id].file ? current[path.id].alt : path.image.alt,
    }])) as Record<HomePathId, Draft>);
  }, [managedDestinations]);

  function chooseFile(id: HomePathId, file?: File) {
    if (!file) return;
    const preview = URL.createObjectURL(file);
    objectUrls.current.push(preview);
    setDrafts((current) => ({ ...current, [id]: { ...current[id], file, preview } }));
  }

  async function publish(id: HomePathId) {
    const index = HOME_PATH_DESTINATION_LIST.findIndex((path) => path.id === id);
    const draft = drafts[id];
    if (!draft.file || index < 0) return;
    if (!draft.alt.trim()) return toast.error("Add a clear photo description first.");
    setSaving(id);
    try {
      const photo = await preparePhoto(draft.file);
      const path = `home-paths/${id}/${Date.now()}-${crypto.randomUUID()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("editorial-photos")
        .upload(path, photo, { contentType: "image/jpeg", upsert: false });
      if (uploadError) throw uploadError;
      const stableUrl = `/api/public/editorial-photo?path=${encodeURIComponent(path)}`;
      await publishOverridesBatch("home_paths", [{
        slotIndex: index,
        photoSrc: stableUrl,
        alt: draft.alt.trim(),
        caption: draft.sourceUrl.trim() || null,
      }], HOME_PATH_DESTINATION_LIST.length);
      setDrafts((current) => ({ ...current, [id]: { ...current[id], file: null, preview: stableUrl } }));
      toast.success("Published on the card and homepage map.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Photo upload failed.");
    } finally {
      setSaving(null);
    }
  }

  if (authState !== "ready") {
    return (
      <SiteLayout><section className="container-x max-w-lg pb-20 pt-32">
        {authState === "loading" ? <Loader2 className="animate-spin" /> : (
          <><h1 className="text-2xl">{authState === "signed-out" ? "Sign in required" : "Not authorised"}</h1>
          <p className="mt-3 text-sm text-[color:var(--charcoal-soft)]">This page is reserved for administrators.</p>
          <Link to="/auth" className="mt-5 inline-flex min-h-11 items-center text-[color:var(--teal)] underline">Go to sign in</Link></>
        )}
      </section></SiteLayout>
    );
  }

  return (
    <SiteLayout><section className="pb-20 pt-24"><div className="container-x max-w-5xl">
      <Link to="/admin" className="inline-flex min-h-11 items-center gap-2 text-xs uppercase tracking-[0.18em] text-[color:var(--charcoal-soft)]"><ArrowLeft size={14} /> Admin</Link>
      <h1 className="mt-4 text-3xl">Five paths photos</h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[color:var(--charcoal-soft)]">Upload an original photo once. It appears on the matching homepage card and map. For a photo saved from your official Instagram or Facebook account, add the original post link for provenance.</p>
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {HOME_PATH_DESTINATION_LIST.map((path) => {
          const draft = drafts[path.id];
          return <article key={path.id} className="border border-[color:var(--border)] bg-[color:var(--ivory)] p-4">
            <div className="aspect-[3/2] overflow-hidden bg-[color:var(--sand)]"><img src={draft.preview} alt={draft.alt} className="h-full w-full object-cover" /></div>
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--teal)]">{path.label}</p>
            <p className="mt-1 text-sm text-[color:var(--charcoal-soft)]">{path.routeLabel}</p>
            <label className="mt-4 block text-xs font-medium" htmlFor={`photo-${path.id}`}>Photo</label>
            <input id={`photo-${path.id}`} type="file" accept="image/*,.heic,.heif" onChange={(event) => chooseFile(path.id, event.target.files?.[0])} className="mt-2 block w-full text-sm" />
            <label className="mt-4 block text-xs font-medium" htmlFor={`alt-${path.id}`}>What is visible</label>
            <input id={`alt-${path.id}`} value={draft.alt} onChange={(event) => setDrafts((current) => ({ ...current, [path.id]: { ...current[path.id], alt: event.target.value } }))} className="mt-2 min-h-11 w-full border border-[color:var(--border)] bg-transparent px-3 text-sm" />
            <label className="mt-4 block text-xs font-medium" htmlFor={`source-${path.id}`}>Original social post link (optional)</label>
            <input id={`source-${path.id}`} type="url" inputMode="url" placeholder="https://www.instagram.com/p/…" value={draft.sourceUrl} onChange={(event) => setDrafts((current) => ({ ...current, [path.id]: { ...current[path.id], sourceUrl: event.target.value } }))} className="mt-2 min-h-11 w-full border border-[color:var(--border)] bg-transparent px-3 text-sm" />
            <Button type="button" disabled={!draft.file || saving !== null} onClick={() => void publish(path.id)} className="mt-5 min-h-11 w-full gap-2">
              {saving === path.id ? <Loader2 size={16} className="animate-spin" /> : draft.file ? <Upload size={16} /> : <Check size={16} />}
              {saving === path.id ? "Publishing…" : draft.file ? "Publish to card and map" : "Choose a photo"}
            </Button>
          </article>;
        })}
      </div>
    </div></section></SiteLayout>
  );
}