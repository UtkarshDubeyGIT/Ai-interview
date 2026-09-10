ALTER TABLE candidate_interviews
  ADD COLUMN IF NOT EXISTS completion_reason text;

DO $$ BEGIN
  ALTER TABLE candidate_interviews
    ADD CONSTRAINT candidate_interviews_completion_reason_check
    CHECK (
      completion_reason IS NULL OR
      completion_reason IN ('candidate_ended_early', 'time_limit', 'agent_completed')
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE shared_reports
  ADD COLUMN IF NOT EXISTS public_id text;

CREATE UNIQUE INDEX IF NOT EXISTS shared_reports_public_id_unique
  ON shared_reports(public_id) WHERE public_id IS NOT NULL;
