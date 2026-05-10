DROP POLICY IF EXISTS program_trials_select_own ON program_trials;
CREATE POLICY program_trials_select_own ON program_trials
  FOR SELECT
  USING (
    uid = auth.uid()::text
    OR LOWER(email) = LOWER(COALESCE(auth.jwt() ->> 'email', ''))
  );
