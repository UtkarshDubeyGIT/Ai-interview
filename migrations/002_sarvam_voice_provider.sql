ALTER TABLE candidate_interviews
  DROP CONSTRAINT IF EXISTS candidate_interviews_provider_check;

ALTER TABLE candidate_interviews
  ALTER COLUMN provider SET DEFAULT 'sarvam';

ALTER TABLE candidate_interviews
  ADD CONSTRAINT candidate_interviews_provider_check CHECK (provider = 'sarvam');
