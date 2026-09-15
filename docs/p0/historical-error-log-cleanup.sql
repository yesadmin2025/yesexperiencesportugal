-- FOR LATER REVIEW ONLY — DO NOT RUN AS PART OF P0.
--
-- New client error logs already store a path plus a value-redacted query
-- object. These statements clean the *historical* rows written before the
-- privacy change (they contain raw hrefs and raw query strings).
--
-- Review, take a backup, then run deliberately.

-- 1. Inspect the blast radius first.
-- select count(*) from public.client_error_logs where url like '%?%';

-- 2. Strip the query string from stored URLs (keeps origin + path).
-- update public.client_error_logs
--    set url = split_part(url, '?', 1)
--  where url like '%?%';

-- 3. Strip the query string from the route column.
-- update public.client_error_logs
--    set route = split_part(route, '?', 1)
--  where route like '%?%';

-- 4. Optional retention: drop error rows older than 180 days.
-- delete from public.client_error_logs
--  where created_at < now() - interval '180 days';
