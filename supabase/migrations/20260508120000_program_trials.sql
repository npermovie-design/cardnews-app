CREATE TABLE IF NOT EXISTS program_trials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uid TEXT,
  email TEXT,
  plan TEXT NOT NULL DEFAULT 'pro',
  status TEXT NOT NULL DEFAULT 'active',
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT,
  note TEXT
);

CREATE INDEX IF NOT EXISTS program_trials_uid_idx ON program_trials(uid);
CREATE INDEX IF NOT EXISTS program_trials_email_lower_idx ON program_trials(LOWER(email));
CREATE INDEX IF NOT EXISTS program_trials_active_idx ON program_trials(status, expires_at);

ALTER TABLE program_trials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS program_trials_admin_all ON program_trials;
CREATE POLICY program_trials_admin_all ON program_trials
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.uid = auth.uid()::text
        AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.uid = auth.uid()::text
        AND users.role = 'admin'
    )
  );
