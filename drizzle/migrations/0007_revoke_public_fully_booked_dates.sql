REVOKE EXECUTE ON FUNCTION public.public_fully_booked_dates(date, date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_fully_booked_dates(date, date) TO service_role;