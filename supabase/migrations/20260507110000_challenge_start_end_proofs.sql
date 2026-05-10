ALTER TABLE public.challenge_applications
  ADD COLUMN IF NOT EXISTS start_screenshot_url TEXT,
  ADD COLUMN IF NOT EXISTS end_screenshot_url TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'challenge_applications'
      AND policyname = 'users_update_own_proofs'
  ) THEN
    CREATE POLICY "users_update_own_proofs" ON public.challenge_applications
      FOR UPDATE
      TO authenticated
      USING (uid = auth.uid())
      WITH CHECK (uid = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'challenge_missions'
      AND policyname = 'users_update_own_challenge_missions'
  ) THEN
    CREATE POLICY "users_update_own_challenge_missions" ON public.challenge_missions
      FOR UPDATE
      TO authenticated
      USING (uid = auth.uid()::text)
      WITH CHECK (uid = auth.uid()::text);
  END IF;
END $$;
