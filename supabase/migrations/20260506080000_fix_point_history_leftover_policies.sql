-- ============================================================================
-- F-013, F-014 잔존 정책 제거
-- point_history_insert_own: 본인 INSERT 허용 (no_client_insert와 OR 결합되어 우회 가능)
-- point_history_admin_select: is_admin() 기반 전체 SELECT (role 변경 시 전체 노출)
-- ============================================================================

DROP POLICY IF EXISTS "point_history_insert_own" ON public.point_history;
DROP POLICY IF EXISTS "point_history_admin_select" ON public.point_history;

-- users 테이블: with_check 없는 약한 UPDATE 정책 제거 (트리거 보호와 별개로 정리)
DROP POLICY IF EXISTS "users can update own data" ON public.users;
