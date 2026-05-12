-- Account-wide attendance and AI library sync.

CREATE TABLE IF NOT EXISTS attendance_checks (
  id BIGSERIAL PRIMARY KEY,
  uid TEXT NOT NULL,
  check_date DATE NOT NULL,
  points INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(uid, check_date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_checks_uid_date
  ON attendance_checks(uid, check_date DESC);

ALTER TABLE attendance_checks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "attendance_select_own" ON attendance_checks;
CREATE POLICY "attendance_select_own"
  ON attendance_checks FOR SELECT
  USING (auth.uid()::text = uid);

DROP POLICY IF EXISTS "attendance_insert_own" ON attendance_checks;
CREATE POLICY "attendance_insert_own"
  ON attendance_checks FOR INSERT
  WITH CHECK (auth.uid()::text = uid);

CREATE TABLE IF NOT EXISTS user_library_items (
  id BIGSERIAL PRIMARY KEY,
  uid TEXT NOT NULL,
  kind TEXT NOT NULL,
  item_id TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(uid, kind, item_id)
);

CREATE INDEX IF NOT EXISTS idx_user_library_items_uid_kind_updated
  ON user_library_items(uid, kind, updated_at DESC);

ALTER TABLE user_library_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "library_select_own" ON user_library_items;
CREATE POLICY "library_select_own"
  ON user_library_items FOR SELECT
  USING (auth.uid()::text = uid);

DROP POLICY IF EXISTS "library_insert_own" ON user_library_items;
CREATE POLICY "library_insert_own"
  ON user_library_items FOR INSERT
  WITH CHECK (auth.uid()::text = uid);

DROP POLICY IF EXISTS "library_update_own" ON user_library_items;
CREATE POLICY "library_update_own"
  ON user_library_items FOR UPDATE
  USING (auth.uid()::text = uid)
  WITH CHECK (auth.uid()::text = uid);

DROP POLICY IF EXISTS "library_delete_own" ON user_library_items;
CREATE POLICY "library_delete_own"
  ON user_library_items FOR DELETE
  USING (auth.uid()::text = uid);
