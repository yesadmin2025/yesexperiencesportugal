-- Harden bookings SELECT policy: bind to auth.users (DB source of truth) rather than JWT email claim.
-- auth.users.email + email_confirmed_at are managed by Supabase Auth and cannot be spoofed by a client-crafted JWT payload.
DROP POLICY IF EXISTS "Verified users can read their own bookings" ON public.bookings;

CREATE POLICY "Verified users can read their own bookings"
ON public.bookings
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM auth.users u
    WHERE u.id = auth.uid()
      AND u.email_confirmed_at IS NOT NULL
      AND lower(u.email) = lower(public.bookings.customer_email)
  )
);