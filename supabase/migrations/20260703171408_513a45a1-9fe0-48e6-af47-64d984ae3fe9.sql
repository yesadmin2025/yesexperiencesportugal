DROP POLICY IF EXISTS "Anyone can submit a contact message" ON public.contact_messages;

CREATE POLICY "Anyone can submit a contact message"
  ON public.contact_messages
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    char_length(first_name) BETWEEN 1 AND 80
    AND char_length(last_name)  BETWEEN 1 AND 80
    AND char_length(email) BETWEEN 3 AND 254
    AND position('@' in email) > 1
    AND char_length(message) BETWEEN 1 AND 4000
  );