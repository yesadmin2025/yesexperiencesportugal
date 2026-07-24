REVOKE SELECT ON public.tour_reviews FROM anon;
GRANT SELECT (
  id, tour_id, source, external_id, source_url,
  rating, title, body, reviewer_name, reviewer_country,
  language, is_first_party, verified,
  is_published, published_at, is_featured,
  moderation_status, scraped_at,
  created_at, updated_at
) ON public.tour_reviews TO anon;