/**
 * /review/:token — public first-party review submission page.
 *
 * Reachable only via a one-time tokenized link emailed to a guest after
 * their trip. The token is validated server-side by the RPC.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Star } from "lucide-react";
import { submitFirstPartyReview } from "@/lib/reviewsPublic.functions";

export const Route = createFileRoute("/review/$token")({
  component: ReviewSubmissionPage,
  head: () => ({
    meta: [
      { title: "Leave a review · YES Experiences Portugal" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  errorComponent: () => (
    <div className="max-w-xl mx-auto py-20 px-6 text-center text-[color:var(--charcoal)]">
      <h1 className="text-2xl font-medium">Something went wrong</h1>
      <p className="mt-3 text-[color:var(--charcoal)]/70">Please use the link from your email.</p>
    </div>
  ),
  notFoundComponent: () => (
    <div className="max-w-xl mx-auto py-20 px-6 text-center text-[color:var(--charcoal)]">
      <h1 className="text-2xl font-medium">Link not found</h1>
    </div>
  ),
});

function ReviewSubmissionPage() {
  const { token } = Route.useParams();
  const submit = useServerFn(submitFirstPartyReview);
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [name, setName] = useState("");
  const [country, setCountry] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await submit({
        data: {
          token,
          rating,
          title: title.trim() || null,
          body: body.trim(),
          reviewer_name: name.trim() || null,
          reviewer_country: country.trim() || null,
        },
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit your review");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="max-w-xl mx-auto py-20 px-6 text-center text-[color:var(--charcoal)]">
        <h1 className="text-3xl font-medium">Thank you</h1>
        <p className="mt-4 text-[color:var(--charcoal)]/75">
          Your review is saved. We're grateful you travelled with us.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto py-14 md:py-20 px-5 md:px-6 text-[color:var(--charcoal)]">
      <div className="text-[11px] uppercase tracking-[0.22em] text-[color:var(--charcoal)]/55">
        Share your experience
      </div>
      <h1 className="mt-2 text-3xl md:text-4xl font-medium leading-tight">
        How was your day with YES?
      </h1>
      <p className="mt-3 text-[color:var(--charcoal)]/70">
        One honest sentence is enough. Real reviews from real guests is what we trade on.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-5">
        <div>
          <label className="block text-sm font-medium">Your rating</label>
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
                aria-label={`${n} stars`}
                className="p-1"
              >
                <Star
                  size={28}
                  className="text-[color:var(--gold)]"
                  fill={(hover || rating) >= n ? "currentColor" : "none"}
                  strokeWidth={(hover || rating) >= n ? 0 : 1.5}
                />
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium" htmlFor="r-title">
            Title <span className="text-[color:var(--charcoal)]/50">(optional)</span>
          </label>
          <input
            id="r-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            className="mt-1 w-full rounded border border-[color:var(--charcoal)]/15 bg-white px-3 py-2 text-[15px]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium" htmlFor="r-body">
            Your review
          </label>
          <textarea
            id="r-body"
            required
            value={body}
            onChange={(e) => setBody(e.target.value)}
            minLength={10}
            maxLength={4000}
            rows={6}
            className="mt-1 w-full rounded border border-[color:var(--charcoal)]/15 bg-white px-3 py-2 text-[15px]"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium" htmlFor="r-name">
              Your name
            </label>
            <input
              id="r-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
              className="mt-1 w-full rounded border border-[color:var(--charcoal)]/15 bg-white px-3 py-2 text-[15px]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium" htmlFor="r-country">
              Country
            </label>
            <input
              id="r-country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              maxLength={60}
              className="mt-1 w-full rounded border border-[color:var(--charcoal)]/15 bg-white px-3 py-2 text-[15px]"
            />
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded bg-[color:var(--teal)] text-white px-4 py-3 font-medium disabled:opacity-60"
        >
          {submitting ? "Submitting…" : "Submit review"}
        </button>
        <p className="text-[11px] text-[color:var(--charcoal)]/55 text-center">
          By submitting you confirm this is your honest experience. We publish reviews as written.
        </p>
      </form>
    </div>
  );
}
