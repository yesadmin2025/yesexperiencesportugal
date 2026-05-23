
-- ─────────────────────────────────────────────────────────────────────────
-- drift_voice — editable copy library for the Drift studio
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE public.drift_voice (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slot text NOT NULL,
  locale text NOT NULL DEFAULT 'pt',
  text text NOT NULL,
  slots text[] NOT NULL DEFAULT '{}'::text[],
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (slot, locale)
);

ALTER TABLE public.drift_voice ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active drift_voice"
  ON public.drift_voice FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins manage drift_voice insert"
  ON public.drift_voice FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage drift_voice update"
  ON public.drift_voice FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage drift_voice delete"
  ON public.drift_voice FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER drift_voice_set_updated_at
  BEFORE UPDATE ON public.drift_voice
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────
-- drift_dna_tokens — visual DNA tokens activated by confidence thresholds
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE public.drift_dna_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  dimension text NOT NULL,
  value text NOT NULL,
  threshold numeric NOT NULL DEFAULT 0.6,
  priority integer NOT NULL DEFAULT 50,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.drift_dna_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active drift_dna_tokens"
  ON public.drift_dna_tokens FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins manage drift_dna_tokens insert"
  ON public.drift_dna_tokens FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage drift_dna_tokens update"
  ON public.drift_dna_tokens FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage drift_dna_tokens delete"
  ON public.drift_dna_tokens FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER drift_dna_tokens_set_updated_at
  BEFORE UPDATE ON public.drift_dna_tokens
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────
-- drift_session_events — anonymous telemetry for the Drift studio
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE public.drift_session_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id text NOT NULL,
  event text NOT NULL,
  chapter_id text,
  signal_key text,
  signal_value text,
  meta jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX drift_session_events_session_idx
  ON public.drift_session_events (session_id, occurred_at);
CREATE INDEX drift_session_events_event_idx
  ON public.drift_session_events (event, occurred_at);

ALTER TABLE public.drift_session_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert drift_session_events"
  ON public.drift_session_events FOR INSERT TO anon, authenticated
  WITH CHECK (
    length(session_id) >= 8 AND length(session_id) <= 64
    AND length(event) >= 1 AND length(event) <= 48
    AND (chapter_id IS NULL OR length(chapter_id) <= 64)
    AND (signal_key IS NULL OR length(signal_key) <= 48)
    AND (signal_value IS NULL OR length(signal_value) <= 64)
    AND event = ANY (ARRAY[
      'session_start','scene_shown','scene_answered',
      'signal_captured','drift_complete','reveal_shown',
      'cta_book','cta_save','cta_refine','session_drop'
    ])
  );

CREATE POLICY "Admins can read drift_session_events"
  ON public.drift_session_events FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete drift_session_events"
  ON public.drift_session_events FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ─────────────────────────────────────────────────────────────────────────
-- Seed: 4 locked whispers + reveal/completion copy
-- ─────────────────────────────────────────────────────────────────────────
INSERT INTO public.drift_voice (slot, locale, text, slots, notes) VALUES
  ('whisper.pickup',     'pt', 'onde começa esta história',                    '{}',         'Pickup region — locked Phase 1'),
  ('whisper.companions', 'pt', 'quem vem contigo',                             '{}',         'Companions — locked Phase 1'),
  ('whisper.duration',   'pt', 'um dia, ou vários',                            '{}',         'Day vs multi-day — locked Phase 1'),
  ('whisper.radius',     'pt', 'até onde irias seguir esse instinto',          '{}',         'Travel radius — locked Phase 1'),
  ('welcome.opening',    'pt', 'portugal já está acordada. respira primeiro.', '{}',         'Opening drift line'),
  ('welcome.settling',   'pt', '{name}, portugal está a reparar em ti.',       '{name}',     'After name input'),
  ('reveal.hero',        'pt', 'o teu dia em {region} está pronto.',           '{region}',   'Reveal headline'),
  ('reveal.subline',     'pt', 'um dia desenhado em tempo real, contigo.',     '{}',         'Reveal subline'),
  ('completion.book',    'pt', 'reservar este dia',                            '{}',         'Primary CTA'),
  ('completion.save',    'pt', 'guardar para depois',                          '{}',         'Secondary CTA'),
  ('completion.refine',  'pt', 'refinar com um local',                         '{}',         'Tertiary CTA');

-- ─────────────────────────────────────────────────────────────────────────
-- Seed: core DNA tokens
-- ─────────────────────────────────────────────────────────────────────────
INSERT INTO public.drift_dna_tokens (key, label, dimension, value, threshold, priority) VALUES
  ('intimate', 'íntimo',    'social',     'intimate', 0.55, 90),
  ('shared',   'partilhado','social',     'shared',   0.55, 80),
  ('slow',     'lento',     'energy',     'slow',     0.55, 85),
  ('vivid',    'vivo',      'energy',     'vivid',    0.55, 80),
  ('coastal',  'costeiro',  'style',      'coast',    0.50, 75),
  ('heritage', 'memória',   'style',      'heritage', 0.50, 75),
  ('wine',     'vinha',     'style',      'wine',     0.50, 75),
  ('table',    'à mesa',    'style',      'table',    0.50, 75);
