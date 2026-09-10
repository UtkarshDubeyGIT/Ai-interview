CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN
  CREATE TYPE interview_status AS ENUM ('not_started', 'in_progress', 'processing', 'completed', 'report_failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE CHECK (email = lower(email)),
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  supporting_details text,
  rubric jsonb NOT NULL CHECK (jsonb_array_length(rubric->'competencies') = 4),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS jobs_owner_idx ON jobs(owner_id, created_at DESC);

CREATE TABLE IF NOT EXISTS candidate_interviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  candidate_name text NOT NULL,
  candidate_email text NOT NULL,
  resume_text text,
  resume_parse_failed boolean NOT NULL DEFAULT false,
  invite_token_hash char(64) NOT NULL UNIQUE,
  status interview_status NOT NULL DEFAULT 'not_started',
  provider text NOT NULL DEFAULT 'openai' CHECK (provider = 'openai'),
  provider_session_id text,
  elapsed_seconds integer NOT NULL DEFAULT 0 CHECK (elapsed_seconds BETWEEN 0 AND 900),
  consented_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  report jsonb,
  report_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS candidate_job_idx ON candidate_interviews(job_id, created_at DESC);

CREATE TABLE IF NOT EXISTS interview_turns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_interview_id uuid NOT NULL REFERENCES candidate_interviews(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('candidate', 'interviewer')),
  text text NOT NULL CHECK (length(trim(text)) > 0),
  sequence_number integer NOT NULL,
  provider_event_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(candidate_interview_id, sequence_number),
  UNIQUE(candidate_interview_id, provider_event_id)
);

CREATE TABLE IF NOT EXISTS shared_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_interview_id uuid NOT NULL REFERENCES candidate_interviews(id) ON DELETE CASCADE,
  token_hash char(64) NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS one_active_report_link
  ON shared_reports(candidate_interview_id) WHERE revoked_at IS NULL;
