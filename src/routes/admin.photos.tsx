/**
 * /admin/photos — Private admin page for uploading tour gallery photos
 * from an iPhone or any device. Multi-select, HEIC auto-convert, resize,
 * reorder, set cover, delete.
 *
 * Access: authenticated + admin role. RLS on `tour_gallery_photos` and
 * `storage.objects` (bucket `tour-photos`) enforces admin-only writes.
 * Reads (SELECT) are open to anon so public tour pages can display photos.
 */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import imageCompression from "browser-image-compression";
import { Upload, Star, Trash2, ArrowLeft, Loader2, Image as ImageIcon } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { supabase } from "@/integrations/supabase/client";
import { signatureTours } from "@/data/signatureTours";

export const Route = createFileRoute("/admin/photos")({
  head: () => ({
    meta: [
      { title: "Tour photos · Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminPhotosPage,
  errorComponent: ({ error }) => (
    <SiteLayout>
      <section className="pt-32 pb-20 container-x max-w-2xl">
        <h1 className="text-2xl">Photo admin failed</h1>
        <p className="mt-3 text-sm text-[color:var(--charcoal-soft)]">{error.message}</p>
      </section>
    </SiteLayout>
  ),
});

type PhotoRow = {
  id: string;
  tour_id: string;
  storage_path: string;
  alt: string;
  sort_order: number;
  is_cover: boolean;
  content_hash: string | null;
  width: number | null;
  height: number | null;
  signedUrl?: string;
};

type AuthState = "loading" | "signed-out" | "not-admin" | "ready";

const SIGNED_URL_TTL = 60 * 60 * 24 * 7; // 7 days

function AdminPhotosPage() {
  const [authState, setAuthState] = useState<AuthState>("loading");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signingIn, setSigningIn] = useState(false);

  const [tourId, setTourId] = useState<string>(signatureTours[0]?.id ?? "");
  const [photos, setPhotos] = useState<PhotoRow[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Auth check ─────────────────────────────────────────────────
  const checkAuth = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setAuthState("signed-out");
      return;
    }
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    setAuthState(isAdmin ? "ready" : "not-admin");
  }, []);

  useEffect(() => {
    checkAuth();
    const { data: sub } = supabase.auth.onAuthStateChange(() => checkAuth());
    return () => sub.subscription.unsubscribe();
  }, [checkAuth]);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setSigningIn(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setSigningIn(false);
    if (error) toast.error(error.message);
    else toast.success("Signed in");
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    setPhotos([]);
  }

  // ── Load photos for selected tour ──────────────────────────────
  const loadPhotos = useCallback(async (id: string) => {
    setLoadingPhotos(true);
    const { data: rows, error } = await supabase
      .from("tour_gallery_photos")
      .select("*")
      .eq("tour_id", id)
      .order("is_cover", { ascending: false })
      .order("sort_order", { ascending: true });
    if (error) {
      toast.error(error.message);
      setLoadingPhotos(false);
      return;
    }
    if (!rows || rows.length === 0) {
      setPhotos([]);
      setLoadingPhotos(false);
      return;
    }
    const { data: signed } = await supabase.storage
      .from("tour-photos")
      .createSignedUrls(rows.map((r) => r.storage_path), SIGNED_URL_TTL);
    const byPath = new Map((signed ?? []).map((s) => [s.path ?? "", s.signedUrl]));
    setPhotos(rows.map((r) => ({ ...r, signedUrl: byPath.get(r.storage_path) ?? undefined })));
    setLoadingPhotos(false);
  }, []);

  useEffect(() => {
    if (authState === "ready" && tourId) loadPhotos(tourId);
  }, [authState, tourId, loadPhotos]);

  // ── Upload flow ────────────────────────────────────────────────
  async function processFile(file: File): Promise<File> {
    let working = file;
    // HEIC/HEIF → JPEG
    const isHeic =
      /heic|heif/i.test(file.type) ||
      /\.(heic|heif)$/i.test(file.name);
    if (isHeic) {
      const heic2any = (await import("heic2any")).default;
      const blob = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
      const b = Array.isArray(blob) ? blob[0] : blob;
      working = new File([b], file.name.replace(/\.(heic|heif)$/i, ".jpg"), {
        type: "image/jpeg",
      });
    }
    // Compress + resize
    const compressed = await imageCompression(working, {
      maxSizeMB: 1.2,
      maxWidthOrHeight: 2400,
      useWebWorker: true,
      fileType: "image/jpeg",
      initialQuality: 0.85,
    });
    return new File([compressed], working.name.replace(/\.\w+$/, ".jpg"), {
      type: "image/jpeg",
    });
  }

  async function imageMetadata(file: File) {
    const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
    const contentHash = Array.from(new Uint8Array(digest), (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("");
    const bitmap = await createImageBitmap(file);
    const dimensions = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return { contentHash, ...dimensions };
  }

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    setUploading(true);
    setUploadProgress({ done: 0, total: files.length });

    const currentMax = photos.reduce((m, p) => Math.max(m, p.sort_order), 0);
    const tour = signatureTours.find((t) => t.id === tourId);

    let done = 0;
    for (const file of files) {
      try {
        const processed = await processFile(file);
        const { contentHash, width, height } = await imageMetadata(processed);
        const { data: duplicate } = await supabase
          .from("tour_gallery_photos")
          .select("id, tour_id")
          .eq("content_hash", contentHash)
          .maybeSingle();
        if (duplicate) {
          toast.error(`${file.name} is already in the gallery.`);
          done += 1;
          setUploadProgress({ done, total: files.length });
          continue;
        }
        const path = `${tourId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
        const { error: upErr } = await supabase.storage
          .from("tour-photos")
          .upload(path, processed, { contentType: "image/jpeg", upsert: false });
        if (upErr) throw upErr;

        const { error: dbErr } = await supabase.from("tour_gallery_photos").insert({
          tour_id: tourId,
          storage_path: path,
          alt: `${tour?.title ?? tourId} — photo ${currentMax + done + 1}`,
          sort_order: currentMax + done + 1,
          is_cover: false,
          content_hash: contentHash,
          width,
          height,
        });
        if (dbErr) throw dbErr;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        toast.error(`Failed on ${file.name}: ${msg}`);
      }
      done += 1;
      setUploadProgress({ done, total: files.length });
    }

    setUploading(false);
    setUploadProgress(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    toast.success(`Uploaded ${done} photo${done === 1 ? "" : "s"}`);
    loadPhotos(tourId);
  }

  // ── Per-photo actions ──────────────────────────────────────────
  async function setCover(id: string) {
    // Clear existing cover, set this one
    await supabase
      .from("tour_gallery_photos")
      .update({ is_cover: false })
      .eq("tour_id", tourId)
      .eq("is_cover", true);
    const { error } = await supabase
      .from("tour_gallery_photos")
      .update({ is_cover: true })
      .eq("id", id);
    if (error) toast.error(error.message);
    else toast.success("Cover updated");
    loadPhotos(tourId);
  }

  async function updateAlt(id: string, alt: string) {
    const { error } = await supabase
      .from("tour_gallery_photos")
      .update({ alt })
      .eq("id", id);
    if (error) toast.error(error.message);
  }

  async function movePhoto(id: string, direction: -1 | 1) {
    const idx = photos.findIndex((p) => p.id === id);
    const swapIdx = idx + direction;
    if (idx === -1 || swapIdx < 0 || swapIdx >= photos.length) return;
    const a = photos[idx];
    const b = photos[swapIdx];
    await Promise.all([
      supabase.from("tour_gallery_photos").update({ sort_order: b.sort_order }).eq("id", a.id),
      supabase.from("tour_gallery_photos").update({ sort_order: a.sort_order }).eq("id", b.id),
    ]);
    loadPhotos(tourId);
  }

  async function deletePhoto(id: string, storage_path: string) {
    if (!confirm("Delete this photo?")) return;
    await supabase.storage.from("tour-photos").remove([storage_path]);
    const { error } = await supabase.from("tour_gallery_photos").delete().eq("id", id);
    if (error) toast.error(error.message);
    else toast.success("Deleted");
    loadPhotos(tourId);
  }

  // ── Render ─────────────────────────────────────────────────────
  if (authState === "loading") {
    return (
      <SiteLayout>
        <section className="pt-32 pb-20 container-x max-w-md">
          <Loader2 className="animate-spin" size={20} />
        </section>
      </SiteLayout>
    );
  }

  if (authState === "signed-out") {
    return (
      <SiteLayout>
        <section className="pt-32 pb-20 container-x max-w-md">
          <h1 className="text-2xl mb-2">Admin sign in</h1>
          <p className="text-sm text-[color:var(--charcoal-soft)] mb-6">
            Sign in with your admin email to upload tour photos.
          </p>
          <form onSubmit={handleSignIn} className="space-y-3">
            <input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-[color:var(--border)] px-4 py-3 text-base"
              autoComplete="email"
            />
            <input
              type="password"
              required
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-[color:var(--border)] px-4 py-3 text-base"
              autoComplete="current-password"
            />
            <button
              type="submit"
              disabled={signingIn}
              className="w-full bg-[color:var(--charcoal)] text-[color:var(--ivory)] py-3 text-sm uppercase tracking-[0.22em] disabled:opacity-60"
            >
              {signingIn ? "Signing in…" : "Sign in"}
            </button>
          </form>
          <p className="mt-4 text-xs text-[color:var(--charcoal-soft)]">
            No account yet? <Link to="/auth" className="underline">Create one</Link> — admin
            access is granted automatically for the approved admin emails once you confirm your
            email.
          </p>
        </section>
      </SiteLayout>
    );
  }

  if (authState === "not-admin") {
    return (
      <SiteLayout>
        <section className="pt-32 pb-20 container-x max-w-md">
          <h1 className="text-2xl mb-3">Not authorised</h1>
          <p className="text-sm text-[color:var(--charcoal-soft)] mb-6">
            Your account is signed in but doesn't have admin access. Sign in with the approved
            admin email.
          </p>
          <button
            onClick={handleSignOut}
            className="border border-[color:var(--border)] px-4 py-2 text-sm"
          >
            Sign out
          </button>
        </section>
      </SiteLayout>
    );
  }

  const tour = signatureTours.find((t) => t.id === tourId);

  return (
    <SiteLayout>
      <section className="pt-24 pb-20">
        <div className="container-x max-w-4xl">
          <div className="flex items-center justify-between mb-6">
            <Link
              to="/admin"
              className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.22em] text-[color:var(--charcoal-soft)] hover:text-[color:var(--charcoal)]"
            >
              <ArrowLeft size={12} /> Admin
            </Link>
            <button
              onClick={handleSignOut}
              className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--charcoal-soft)] hover:text-[color:var(--charcoal)]"
            >
              Sign out
            </button>
          </div>

          <h1 className="text-3xl mb-2">Tour photos</h1>
          <p className="text-sm text-[color:var(--charcoal-soft)] mb-8">
            Pick a tour, add photos from your phone. They appear on the public tour page.
          </p>

          <label className="block text-[11px] uppercase tracking-[0.22em] text-[color:var(--charcoal-soft)] mb-2">
            Tour
          </label>
          <select
            value={tourId}
            onChange={(e) => setTourId(e.target.value)}
            className="w-full border border-[color:var(--border)] px-4 py-3 text-base mb-6 bg-white"
          >
            {signatureTours.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>

          {/* Upload */}
          <div className="border-2 border-dashed border-[color:var(--border)] p-6 text-center mb-8">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.heic,.heif"
              multiple
              onChange={(e) => handleFiles(e.target.files)}
              className="hidden"
              id="photo-upload"
            />
            <label
              htmlFor="photo-upload"
              className={`inline-flex items-center gap-2 bg-[color:var(--charcoal)] text-[color:var(--ivory)] px-6 py-3 text-sm uppercase tracking-[0.22em] cursor-pointer ${uploading ? "opacity-60 pointer-events-none" : ""}`}
            >
              {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              {uploading ? "Uploading…" : "Add photos"}
            </label>
            {uploadProgress && (
              <p className="mt-3 text-sm text-[color:var(--charcoal-soft)]">
                {uploadProgress.done} of {uploadProgress.total}
              </p>
            )}
            <p className="mt-3 text-xs text-[color:var(--charcoal-soft)]">
              iPhone HEIC photos are auto-converted. Resized to 2400px, ~85% quality.
            </p>
          </div>

          {/* Photo grid */}
          {loadingPhotos ? (
            <div className="py-10 text-center">
              <Loader2 className="animate-spin inline-block" size={20} />
            </div>
          ) : photos.length === 0 ? (
            <div className="py-12 text-center border border-[color:var(--border)]">
              <ImageIcon size={32} className="mx-auto text-[color:var(--charcoal-soft)] mb-3" />
              <p className="text-sm text-[color:var(--charcoal-soft)]">
                No photos yet for {tour?.title ?? tourId}. Tap "Add photos" above.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {photos.map((p, i) => (
                <div key={p.id} className="border border-[color:var(--border)] p-2">
                  <div className="relative aspect-[4/5] bg-[color:var(--sand)] mb-2 overflow-hidden">
                    {p.signedUrl && (
                      <img
                        src={p.signedUrl}
                        alt={p.alt}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    )}
                    {p.is_cover && (
                      <span className="absolute top-1 left-1 bg-[color:var(--gold)] text-[color:var(--charcoal)] text-[10px] uppercase tracking-widest px-2 py-0.5">
                        Cover
                      </span>
                    )}
                  </div>
                  <textarea
                    defaultValue={p.alt}
                    onBlur={(e) => updateAlt(p.id, e.target.value)}
                    rows={2}
                    className="w-full text-xs border border-[color:var(--border)] p-1.5 mb-2"
                    placeholder="Alt text"
                  />
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex gap-1">
                      <button
                        onClick={() => movePhoto(p.id, -1)}
                        disabled={i === 0}
                        className="text-xs px-2 py-1 border border-[color:var(--border)] disabled:opacity-30"
                        aria-label="Move up"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => movePhoto(p.id, 1)}
                        disabled={i === photos.length - 1}
                        className="text-xs px-2 py-1 border border-[color:var(--border)] disabled:opacity-30"
                        aria-label="Move down"
                      >
                        ↓
                      </button>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setCover(p.id)}
                        disabled={p.is_cover}
                        className="text-xs p-1.5 border border-[color:var(--border)] disabled:opacity-30"
                        aria-label="Set as cover"
                        title="Set as cover"
                      >
                        <Star size={12} />
                      </button>
                      <button
                        onClick={() => deletePhoto(p.id, p.storage_path)}
                        className="text-xs p-1.5 border border-[color:var(--border)] text-red-700"
                        aria-label="Delete"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </SiteLayout>
  );
}
