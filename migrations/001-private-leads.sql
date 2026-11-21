CREATE TABLE public.leads (
  submission_id uuid PRIMARY KEY,
  received_at timestamptz NOT NULL DEFAULT now(),
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 80),
  whatsapp text NOT NULL CHECK (whatsapp ~ '^\+91[6-9][0-9]{9}$'),
  city text NOT NULL CHECK (length(city) BETWEEN 1 AND 100),
  answers jsonb NOT NULL CHECK (jsonb_typeof(answers) = 'object'),
  answer_labels jsonb NOT NULL,
  match_score numeric(3,2) NOT NULL CHECK (match_score BETWEEN 0 AND 1),
  score_breakdown text NOT NULL,
  consent_text text NOT NULL,
  terms_version text NOT NULL,
  fingerprint text NOT NULL CHECK (length(fingerprint) = 64)
);
CREATE INDEX leads_received_at_idx ON public.leads (received_at DESC);
COMMENT ON TABLE public.leads IS 'Private Megabase construction enquiries. Accessible to authorized database users only; no public read API.';
