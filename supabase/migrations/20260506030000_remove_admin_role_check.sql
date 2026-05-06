-- ============================================================================
-- F-014 핵심 수정: 모든 RLS 정책에서 role='admin' 검증 제거
-- ============================================================================
-- 이유: 클라이언트가 role 컬럼을 변경할 수 있는 한, RLS에서 role을 검증하면
-- 권한 우회 경로가 생김. admin 작업은 별도 백엔드(Vercel API + service_role)로
-- 분리해야 함.
-- ============================================================================

-- attendance_checks
DROP POLICY IF EXISTS "attendance_select" ON public.attendance_checks;
DROP POLICY IF EXISTS "attendance_select_admin_or_self" ON public.attendance_checks;
DROP POLICY IF EXISTS "attendance_select_self_only" ON public.attendance_checks;
CREATE POLICY "attendance_select_self_only"
  ON public.attendance_checks
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = uid);

-- user_library_items
DROP POLICY IF EXISTS "library_select" ON public.user_library_items;
DROP POLICY IF EXISTS "library_select_admin_or_self" ON public.user_library_items;
DROP POLICY IF EXISTS "library_select_self_only" ON public.user_library_items;
CREATE POLICY "library_select_self_only"
  ON public.user_library_items
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = uid);

-- users
DROP POLICY IF EXISTS "users_select" ON public.users;
DROP POLICY IF EXISTS "users_select_admin_or_self" ON public.users;
DROP POLICY IF EXISTS "users_select_self_only" ON public.users;
CREATE POLICY "users_select_self_only"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = uid);

-- 다른 사용자의 공개 정보(닉네임, 아바타 등)는 view로 노출
CREATE OR REPLACE VIEW public.users_public AS
  SELECT uid, nick, avatar_idx, referral_code FROM public.users;
GRANT SELECT ON public.users_public TO authenticated;

-- subscriptions: 본인 것만
DROP POLICY IF EXISTS "subscriptions_select" ON public.subscriptions;
DROP POLICY IF EXISTS "subscriptions_select_self_only" ON public.subscriptions;
CREATE POLICY "subscriptions_select_self_only"
  ON public.subscriptions
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = uid);

-- ============================================================================
-- admin 백엔드 분리 — /api/admin/users 같은 라우트 만들고 service_role 사용
-- 클라이언트 role 컬럼은 더 이상 권한 부여 의미 없음 (RLS에서 안 봄)
-- ============================================================================
