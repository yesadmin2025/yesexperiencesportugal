REVOKE EXECUTE ON FUNCTION public.submit_first_party_review(TEXT, NUMERIC, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.submit_first_party_review(TEXT, NUMERIC, TEXT, TEXT, TEXT, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.submit_first_party_review(TEXT, NUMERIC, TEXT, TEXT, TEXT, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.submit_first_party_review(TEXT, NUMERIC, TEXT, TEXT,TEXT,TEXT) TO service_role;