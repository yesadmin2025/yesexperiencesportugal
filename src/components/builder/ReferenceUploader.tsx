/**
 * ReferenceUploader — anonymous reference uploads for the Builder review step.
 *
 * Mobile-first. Up to 5 files (JPG/PNG/WEBP/HEIC/PDF), 10 MB each.
 * Files land in the public `builder-references` bucket under {sessionId}/...
 * and are tracked in `builder_reference_uploads`.
 *
 * The "Read my mood" button calls the `analyze-builder-references` edge
 * function, which uses Gemini Vision to extract a TONE summary only —
 * never invents stops, partners, or images.
 */
import { useEffect, useRef, useState } from "react";
import { Plus, X, ImageIcon, FileText, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { deleteBuilderReference } from "@/lib/builderReferences.functions";
import { listBuilderReferences } from "@/lib/builderReferences.list.functions";

const MAX_FILES = 5;
const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf";

interface ReferenceRow {
  id: string;
  file_path: string;
  signed_url: string | null;
  file_name: string;
  mime_type: string;
  file_size_bytes: number;
  tone_summary: string | null;
  tone_keywords: string[];
  analyzed_at: string | null;
  created_at: string;
}

export interface ToneResult {
  toneSummary: string;
  toneKeywords: string[];
}

interface Props {
  sessionId: string;
  onToneReady?: (tone: ToneResult) => void;
}

export function ReferenceUploader({ sessionId, onToneReady }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [rows, setRows] = useState<ReferenceRow[]>([]);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [tone, setTone] = useState<ToneResult | null>(null);

  // Hydrate previous uploads for this session via server function (RLS no
  // longer permits anonymous SELECT on builder_reference_uploads).
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const result = await listBuilderReferences({ data: { sessionId } });
        if (cancelled) return;
        if (!result.ok) return;
        const data = result.rows;
        setRows(data as ReferenceRow[]);
        const last = data.find((r) => r.tone_summary);
        if (last?.tone_summary) {
          const restored: ToneResult = {
            toneSummary: last.tone_summary,
            toneKeywords: last.tone_keywords ?? [],
          };
          setTone(restored);
          onToneReady?.(restored);
        }
      } catch (err) {
        console.warn("Failed to load existing references", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId, onToneReady]);

  function handlePickClick() {
    if (rows.length >= MAX_FILES) {
      toast.error(`Up to ${MAX_FILES} references.`);
      return;
    }
    inputRef.current?.click();
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const remaining = MAX_FILES - rows.length;
    if (remaining <= 0) {
      toast.error(`Up to ${MAX_FILES} references.`);
      return;
    }
    const picked = Array.from(files).slice(0, remaining);
    setUploading(true);
    try {
      const newRows: ReferenceRow[] = [];
      for (const file of picked) {
        if (file.size > MAX_BYTES) {
          toast.error(`${file.name} is over 10 MB.`);
          continue;
        }
        const safeName = file.name.replace(/[^\w.-]+/g, "_").slice(0, 80);
        const path = `${sessionId}/${Date.now()}-${safeName}`;
        const { error: upErr } = await supabase.storage
          .from("builder-references")
          .upload(path, file, {
            contentType: file.type,
            upsert: false,
          });
        if (upErr) {
          console.error(upErr);
          toast.error(`Upload failed: ${file.name}`);
          continue;
        }
        const {
          data: { publicUrl },
        } = supabase.storage.from("builder-references").getPublicUrl(path);

        const { error: insErr } = await supabase.from("builder_reference_uploads").insert({
          session_id: sessionId,
          file_path: path,
          // file_url is legacy/NOT NULL — store storage path reference
          // only; clients now read via short-lived signed URLs.
          file_url: publicUrl,
          file_name: file.name.slice(0, 200),
          mime_type: file.type,
          file_size_bytes: file.size,
        });
        if (insErr) {
          console.error(insErr);
          await supabase.storage
            .from("builder-references")
            .remove([path])
            .catch(() => {});
          toast.error(`Couldn't save ${file.name}`);
          continue;
        }
      }
      // Re-list via server function to pick up signed URLs.
      try {
        const refreshed = await listBuilderReferences({ data: { sessionId } });
        if (refreshed.ok) {
          setRows(refreshed.rows as ReferenceRow[]);
          setTone(null);
        }
      } catch (err) {
        console.warn("Failed to refresh references", err);
      }
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleRemove(row: ReferenceRow) {
    setRows((prev) => prev.filter((r) => r.id !== row.id));
    setTone(null);
    // Server-side delete: validates `id + session_id` server-side and
    // removes the storage object + table row using the admin client.
    // Anonymous client-side deletes are no longer permitted by RLS.
    try {
      const result = await deleteBuilderReference({
        data: { rowId: row.id, sessionId },
      });
      if (!result.ok) {
        console.warn("Failed to delete reference:", result.reason);
      }
    } catch (err) {
      console.warn("deleteBuilderReference threw:", err);
    }
  }

  async function handleAnalyze() {
    if (rows.length === 0 || analyzing) return;
    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-builder-references", {
        body: {
          sessionId,
          fileIds: rows.map((r) => r.id),
        },
      });
      if (error) {
        const msg =
          (error as { message?: string }).message ?? "Couldn't read your references right now.";
        toast.error(msg);
        return;
      }
      const result = data as ToneResult | { error: string } | null;
      if (!result || "error" in (result ?? {})) {
        toast.error(
          (result as { error: string } | null)?.error ??
            "Couldn't read tone from these references.",
        );
        return;
      }
      const ok = result as ToneResult;
      setTone(ok);
      onToneReady?.(ok);
      toast.success("Tone read — added to your experience brief.");
    } catch (e) {
      console.error(e);
      toast.error("Couldn't reach the tone reader.");
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <div className="rounded-[2px] border border-[color:var(--charcoal)]/12 bg-[color:var(--ivory)] p-5">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.28em] font-bold text-[color:var(--gold)]">
            Mood references
          </p>
          <p className="mt-1 text-[13px] text-[color:var(--charcoal)]/75 max-w-md">
            Add up to {MAX_FILES} photos or a PDF that capture the{" "}
            <em className="serif italic">feel</em> you want. We read the tone only — never the
            itinerary.
          </p>
        </div>
        <span className="shrink-0 text-[11px] text-[color:var(--charcoal)]/55 tabular-nums">
          {rows.length}/{MAX_FILES}
        </span>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        className="sr-only"
        onChange={(e) => void handleFiles(e.target.files)}
      />

      <ul className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5">
        {rows.map((r) => (
          <li
            key={r.id}
            className="relative aspect-square rounded-[2px] overflow-hidden border border-[color:var(--charcoal)]/12 bg-[color:var(--sand)]/40"
          >
            {r.mime_type.startsWith("image/") ? (
              <img
                src={r.signed_url ?? ""}
                alt={r.file_name}
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 p-2 text-center">
                <FileText size={20} strokeWidth={1.5} className="text-[color:var(--charcoal)]/55" />
                <span className="text-[10px] leading-tight text-[color:var(--charcoal)]/65 line-clamp-2">
                  {r.file_name}
                </span>
              </div>
            )}
            <button
              type="button"
              onClick={() => void handleRemove(r)}
              aria-label={`Remove ${r.file_name}`}
              className="absolute top-1 right-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[color:var(--charcoal)]/85 text-[color:var(--ivory)] hover:bg-[color:var(--charcoal)]"
            >
              <X size={11} strokeWidth={2.5} />
            </button>
          </li>
        ))}

        {rows.length < MAX_FILES && (
          <li>
            <button
              type="button"
              onClick={handlePickClick}
              disabled={uploading}
              className="flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-[2px] border border-dashed border-[color:var(--charcoal)]/25 bg-[color:var(--sand)]/30 text-[color:var(--charcoal)]/65 hover:border-[color:var(--gold)] hover:text-[color:var(--charcoal)] transition-colors disabled:opacity-60 min-h-[44px]"
              aria-label="Add reference"
            >
              {uploading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  <Plus size={18} strokeWidth={1.75} />
                  <span className="text-[10.5px] uppercase tracking-[0.18em] font-semibold">
                    Add
                  </span>
                </>
              )}
            </button>
          </li>
        )}
      </ul>

      {rows.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void handleAnalyze()}
            disabled={analyzing || rows.length === 0}
            className="inline-flex items-center gap-2 rounded-[2px] bg-[color:var(--charcoal)] px-4 py-2.5 text-[12px] uppercase tracking-[0.2em] font-bold text-[color:var(--ivory)] hover:bg-[color:var(--teal)] disabled:opacity-60 min-h-[44px]"
          >
            {analyzing ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Sparkles size={13} strokeWidth={2} />
            )}
            {tone ? "Re-read mood" : "Read my mood"}
          </button>
          <span className="text-[11px] text-[color:var(--charcoal)]/55">
            <ImageIcon size={11} className="inline -mt-0.5 mr-1" />
            JPG · PNG · WEBP · HEIC · PDF · 10 MB max
          </span>
        </div>
      )}

      {tone && (
        <div className="mt-4 rounded-[2px] border border-[color:var(--gold)]/40 bg-[color:var(--gold-soft)]/30 p-4">
          <p className="text-[10px] uppercase tracking-[0.28em] font-bold text-[color:var(--gold)]">
            Tone read
          </p>
          {tone.toneKeywords.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {tone.toneKeywords.map((k) => (
                <li
                  key={k}
                  className="rounded-full border border-[color:var(--charcoal)]/20 bg-[color:var(--ivory)] px-2.5 py-0.5 text-[11px] text-[color:var(--charcoal)]/85"
                >
                  {k}
                </li>
              ))}
            </ul>
          )}
          {tone.toneSummary && (
            <p className="mt-2 serif italic text-[14px] leading-snug text-[color:var(--charcoal)]/85">
              “{tone.toneSummary}”
            </p>
          )}
          <p className="mt-2 text-[10.5px] text-[color:var(--charcoal)]/55">
            Used to fine-tune narration only — never to add stops or images.
          </p>
        </div>
      )}
    </div>
  );
}
