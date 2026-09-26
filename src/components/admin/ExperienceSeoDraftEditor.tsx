import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { signatureTours } from "@/data/signatureTours";
import { Button } from "@/components/ui/button";
import { listExperienceSeoDrafts, saveExperienceSeoDraft } from "@/lib/experienceSeoDrafts.functions";

type Draft = { pageTitle: string; metaDescription: string; h1: string };
type Saved = { tour_id: string; page_title: string; meta_description: string; h1: string };

export function ExperienceSeoDraftEditor() {
  const list = useServerFn(listExperienceSeoDrafts);
  const save = useServerFn(saveExperienceSeoDraft);
  const [tourId, setTourId] = useState(signatureTours[0]?.id ?? "");
  const [saved, setSaved] = useState<Record<string, Saved>>({});
  const [draft, setDraft] = useState<Draft>({ pageTitle: "", metaDescription: "", h1: "" });
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const tour = signatureTours.find((item) => item.id === tourId);

  useEffect(() => {
    let active = true;
    list().then((rows) => {
      if (active) setSaved(Object.fromEntries(rows.map((row) => [row.tour_id, row])));
    }).catch((error: unknown) => { if (active) setStatus(error instanceof Error ? error.message : "Could not load drafts"); });
    return () => { active = false; };
  }, [list]);

  useEffect(() => {
    const row = saved[tourId];
    setDraft(row
      ? { pageTitle: row.page_title, metaDescription: row.meta_description, h1: row.h1 }
      : { pageTitle: "", metaDescription: "", h1: "" });
    setStatus("");
  }, [tourId, saved]);

  if (!tour) return null;
  return (
    <section className="mt-10 border-t border-[color:var(--border)] pt-8">
      <h2 className="font-serif text-2xl text-[color:var(--charcoal)]">Search & page headings</h2>
      <p className="mt-2 text-sm text-[color:var(--charcoal-soft)]">Private drafts only. Saving here does not change the public pages.</p>
      <label className="mt-6 block text-xs text-[color:var(--charcoal-soft)]">
        Experience
        <select value={tourId} onChange={(event) => setTourId(event.target.value)} className="mt-2 block min-h-11 w-full border border-[color:var(--border)] bg-[color:var(--ivory)] px-3 text-sm text-[color:var(--charcoal)]">
          {signatureTours.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
        </select>
      </label>
      <div className="mt-5 grid gap-5">
        {([
          ["pageTitle", "Search title", tour.seoTitle ?? tour.title, 120],
          ["metaDescription", "Search description", tour.seoDescription ?? tour.blurb, 320],
          ["h1", "Page heading (H1)", tour.title, 160],
        ] as const).map(([key, label, current, maxLength]) => (
          <label key={key} className="block text-xs text-[color:var(--charcoal-soft)]">
            {label}
            <span className="mt-1 block text-xs">Currently on the site: {current}</span>
            {key === "metaDescription" ? (
              <textarea value={draft[key]} maxLength={maxLength} rows={3} onChange={(event) => setDraft((prev) => ({ ...prev, [key]: event.target.value }))} className="mt-2 block w-full border border-[color:var(--border)] bg-[color:var(--ivory)] p-3 text-sm text-[color:var(--charcoal)]" />
            ) : (
              <input value={draft[key]} maxLength={maxLength} onChange={(event) => setDraft((prev) => ({ ...prev, [key]: event.target.value }))} className="mt-2 block min-h-11 w-full border border-[color:var(--border)] bg-[color:var(--ivory)] px-3 text-sm text-[color:var(--charcoal)]" />
            )}
          </label>
        ))}
      </div>
      <Button className="mt-6" disabled={busy} onClick={async () => {
        setBusy(true);
        setStatus("");
        try {
          await save({ data: { tourId, ...draft } });
          setSaved((prev) => ({ ...prev, [tourId]: { tour_id: tourId, page_title: draft.pageTitle, meta_description: draft.metaDescription, h1: draft.h1 } }));
          setStatus("Draft saved privately. The public page is unchanged.");
        } catch (error) {
          setStatus(error instanceof Error ? error.message : "Could not save draft");
        } finally { setBusy(false); }
      }}>{busy ? "Saving…" : "Save private draft"}</Button>
      {status && <p role="status" className="mt-3 text-sm text-[color:var(--teal)]">{status}</p>}
    </section>
  );
}