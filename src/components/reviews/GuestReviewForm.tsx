/**
 * Open guest review form shown at the bottom of /reviews and /pt/reviews.
 *
 * Submissions are stored unpublished (moderation queue) — nothing on the
 * page, in the aggregates or in the JSON-LD changes until an admin
 * approves. Bilingual by prop; no new plumbing.
 */
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Star } from "lucide-react";
import { submitPublicReview } from "@/lib/reviewsPublic.functions";

type TourOption = { tour_id: string; title: string };

const COPY = {
  en: {
    eyebrow: "Travelled with us?",
    title: "Leave your review",
    intro:
      "One honest sentence is enough. Reviews are read by our team before they appear on this page.",
    experience: "Which experience?",
    choose: "Choose an experience",
    rating: "Your rating",
    reviewTitle: "Title",
    optional: "(optional)",
    review: "Your review",
    name: "Your name",
    country: "Country",
    submit: "Submit review",
    submitting: "Sending…",
    thanksTitle: "Thank you",
    thanksBody:
      "Your review has been sent to our team. Once checked, it will appear on this page.",
    note: "We publish reviews as written. Please only review an experience you actually took.",
    genericError: "Could not submit your review",
  },
  pt: {
    eyebrow: "Viajou connosco?",
    title: "Deixe a sua avaliação",
    intro:
      "Uma frase honesta é suficiente. As avaliações são lidas pela nossa equipa antes de aparecerem nesta página.",
    experience: "Que experiência?",
    choose: "Escolha uma experiência",
    rating: "A sua classificação",
    reviewTitle: "Título",
    optional: "(opcional)",
    review: "A sua avaliação",
    name: "O seu nome",
    country: "País",
    submit: "Enviar avaliação",
    submitting: "A enviar…",
    thanksTitle: "Obrigado",
    thanksBody:
      "A sua avaliação foi enviada para a nossa equipa. Depois de verificada, aparecerá nesta página.",
    note: "Publicamos as avaliações tal como são escritas. Avalie apenas uma experiência que tenha realizado.",
    genericError: "Não foi possível enviar a sua avaliação",
  },
} as const;

export function GuestReviewForm({
  tours,
  locale = "en",
}: {
  tours: TourOption[];
  locale?: "en" | "pt";
}) {
  const t = COPY[locale];
  const submit = useServerFn(submitPublicReview);
  const [tourId, setTourId] = useState(tours[0]?.tour_id ?? "");
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [website, setWebsite] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await submit({
        data: {
          tourId,
          rating,
          title: title.trim() || null,
          body: body.trim(),
          reviewer_name: name.trim() || null,
          reviewer_country: country.trim() || null,
          language: locale,
          website,
        },
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.genericError);
    } finally {
      setSubmitting(false);
    }
  }

  const field =
    "mt-1 w-full min-h-[44px] rounded-[2px] border border-[color:var(--charcoal)]/15 bg-[color:var(--ivory)] px-3 py-2 text-[15px] text-[color:var(--charcoal)]";
  const label = "block font-sans text-[12.5px] font-medium text-[color:var(--charcoal)]";

  return (
    <section
      id="leave-a-review"
      className="mt-20 pt-12 border-t border-[color:var(--gold-soft)]/40"
      data-testid="guest-review-form"
    >
      <div className="max-w-xl mx-auto">
        <p className="font-sans text-[10.5px] uppercase tracking-[0.22em] text-[color:var(--charcoal-soft)]">
          {t.eyebrow}
        </p>
        <h2 className="mt-2 font-display font-semibold text-[1.5rem] md:text-[1.9rem] leading-[1.25] text-[color:var(--charcoal)]">
          {t.title}
        </h2>

        {done ? (
          <div className="mt-6 rounded-[2px] border border-[color:var(--gold-soft)]/60 bg-[color:var(--sand)] p-6">
            <p className="font-display font-semibold text-[1.1rem] text-[color:var(--charcoal)]">
              {t.thanksTitle}
            </p>
            <p className="mt-2 text-[14px] leading-[1.7] text-[color:var(--charcoal)]">
              {t.thanksBody}
            </p>
          </div>
        ) : (
          <>
            <p className="mt-3 text-[14px] leading-[1.7] text-[color:var(--charcoal-soft)]">
              {t.intro}
            </p>
            <form onSubmit={onSubmit} className="mt-6 space-y-5">
              <div>
                <label className={label} htmlFor="gr-tour">
                  {t.experience}
                </label>
                <select
                  id="gr-tour"
                  required
                  value={tourId}
                  onChange={(e) => setTourId(e.target.value)}
                  className={field}
                >
                  <option value="">{t.choose}</option>
                  {tours.map((o) => (
                    <option key={o.tour_id} value={o.tour_id}>
                      {o.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <span className={label}>{t.rating}</span>
                <div
                  className="mt-2 inline-flex items-center gap-1"
                  onMouseLeave={() => setHover(0)}
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setRating(n)}
                      onMouseEnter={() => setHover(n)}
                      aria-label={`${n} / 5`}
                      aria-pressed={rating === n}
                      className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
                    >
                      <Star
                        size={26}
                        className="text-[color:var(--gold)]"
                        fill={(hover || rating) >= n ? "currentColor" : "none"}
                        strokeWidth={(hover || rating) >= n ? 0 : 1.5}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={label} htmlFor="gr-title">
                  {t.reviewTitle}{" "}
                  <span className="text-[color:var(--charcoal-soft)]">{t.optional}</span>
                </label>
                <input
                  id="gr-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={120}
                  className={field}
                />
              </div>

              <div>
                <label className={label} htmlFor="gr-body">
                  {t.review}
                </label>
                <textarea
                  id="gr-body"
                  required
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  minLength={10}
                  maxLength={4000}
                  rows={6}
                  className={field}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={label} htmlFor="gr-name">
                    {t.name}
                  </label>
                  <input
                    id="gr-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={120}
                    className={field}
                  />
                </div>
                <div>
                  <label className={label} htmlFor="gr-country">
                    {t.country}
                  </label>
                  <input
                    id="gr-country"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    maxLength={60}
                    className={field}
                  />
                </div>
              </div>

              {/* Honeypot — hidden from people, tempting to bots. */}
              <div aria-hidden="true" className="hidden">
                <label htmlFor="gr-website">Website</label>
                <input
                  id="gr-website"
                  tabIndex={-1}
                  autoComplete="off"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />
              </div>

              {error && (
                <p
                  role="alert"
                  className="text-[13px] text-red-800 bg-red-50 border border-red-200 rounded-[2px] px-3 py-2"
                >
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting || !tourId}
                className="w-full min-h-[48px] rounded-[2px] bg-[color:var(--teal)] text-[color:var(--ivory)] px-4 py-3 font-sans text-[14px] font-medium disabled:opacity-60"
              >
                {submitting ? t.submitting : t.submit}
              </button>
              <p className="text-[12px] leading-[1.6] text-[color:var(--charcoal-soft)] text-center">
                {t.note}
              </p>
            </form>
          </>
        )}
      </div>
    </section>
  );
}
