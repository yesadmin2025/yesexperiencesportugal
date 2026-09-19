UPDATE public.home_path_content
SET photo_src = CASE path_id
  WHEN 'studio' THEN '/api/public/editorial-photo?path=home-paths%2Fstudio%2Fyes-studio-real.webp'
  WHEN 'signature' THEN '/api/public/editorial-photo?path=home-paths%2Fsignature%2Fyes-signature-real.webp'
  WHEN 'designer' THEN '/api/public/editorial-photo?path=home-paths%2Fdesigner%2Fyes-designer-real.webp'
  WHEN 'proposals' THEN '/api/public/editorial-photo?path=home-paths%2Fproposals%2Fyes-moments-real.webp'
  WHEN 'corporate' THEN '/api/public/editorial-photo?path=home-paths%2Fcorporate%2Fyes-corporate-real.webp'
END
WHERE path_id IN ('studio', 'signature', 'designer', 'proposals', 'corporate');