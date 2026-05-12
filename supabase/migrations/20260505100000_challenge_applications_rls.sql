-- Enable RLS on challenge_applications
ALTER TABLE challenge_applications ENABLE ROW LEVEL SECURITY;

-- Admin can do everything
CREATE POLICY "admin_full_access" ON challenge_applications
  FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.uid = auth.uid()::text AND users.role = 'admin')
  );

-- Users can view their own applications
CREATE POLICY "users_view_own" ON challenge_applications
  FOR SELECT
  TO authenticated
  USING (uid = auth.uid());

-- Users can insert their own applications
CREATE POLICY "users_insert_own" ON challenge_applications
  FOR INSERT
  TO authenticated
  WITH CHECK (uid = auth.uid());

-- Public view: only expose safe columns via a security-definer function
-- (Prevents anon users from SELECT * on raw table)

-- Enable RLS on challenges table
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;

-- Anyone can read challenges
CREATE POLICY "public_read_challenges" ON challenges
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Only admin can modify challenges
CREATE POLICY "admin_modify_challenges" ON challenges
  FOR INSERT OR UPDATE OR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.uid = auth.uid()::text AND users.role = 'admin')
  );

-- Secure function for public participant list (no personal info)
CREATE OR REPLACE FUNCTION public.get_challenge_participants(p_challenge_id text)
RETURNS TABLE(id text, name text, status text, created_at timestamptz)
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT id, name, status, created_at
  FROM challenge_applications
  WHERE challenge_id = p_challenge_id
  ORDER BY created_at ASC;
$$;
