-- ============================================================================
-- F-013, F-014(부분), N-MED-1 핫픽스: point_history RLS 강화
-- ============================================================================

-- 1. 기존 정책 제거
DROP POLICY IF EXISTS "point_history_insert" ON public.point_history;
DROP POLICY IF EXISTS "Enable insert for users" ON public.point_history;
DROP POLICY IF EXISTS "point_history_select" ON public.point_history;
DROP POLICY IF EXISTS "point_history_select_admin_or_self" ON public.point_history;
DROP POLICY IF EXISTS "point_history_no_client_insert" ON public.point_history;
DROP POLICY IF EXISTS "point_history_no_update" ON public.point_history;
DROP POLICY IF EXISTS "point_history_no_delete" ON public.point_history;

-- 2. 클라이언트 INSERT 차단 (오직 RPC를 통해서만)
CREATE POLICY "point_history_no_client_insert"
  ON public.point_history
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

-- 3. SELECT는 본인 행만 (role 컬럼 검증 제거 — F-014 근본 차단)
CREATE POLICY "point_history_select_self_only"
  ON public.point_history
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = uid);

-- 4. UPDATE / DELETE 차단 (audit log 무결성)
CREATE POLICY "point_history_no_update"
  ON public.point_history
  FOR UPDATE TO authenticated USING (false);
CREATE POLICY "point_history_no_delete"
  ON public.point_history
  FOR DELETE TO authenticated USING (false);

-- 5. RLS 활성화
ALTER TABLE public.point_history ENABLE ROW LEVEL SECURITY;

-- 참고: Supabase에서 service_role은 RLS 자동 우회.
--       따라서 결제 webhook이 service_role 키로 INSERT는 정상 동작함.
--       클라이언트(authenticated) 직접 INSERT만 차단됨.
