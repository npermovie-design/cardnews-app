-- ============================================================================
-- N-CRIT-3 핫픽스: change_points_atomic RPC IDOR + 양수 검증 추가
-- ============================================================================
-- Supabase CLI 2.78.x가 한 migration 안의 복수 dollar-quoted function을
-- 잘못 split하는 경우가 있어 단일 DO 블록에서 DDL을 실행한다.

DO $migration$
BEGIN
  EXECUTE $sql$
CREATE OR REPLACE FUNCTION public.change_points_atomic(
  p_uid UUID,
  p_delta INTEGER,
  p_reason TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_current_uid UUID;
  v_new_balance INTEGER;
BEGIN
  v_current_uid := auth.uid();
  IF v_current_uid IS NULL THEN
    RAISE EXCEPTION '인증이 필요합니다';
  END IF;

  IF v_current_uid != p_uid THEN
    RAISE EXCEPTION '다른 사용자의 포인트를 변경할 수 없습니다';
  END IF;

  IF p_delta > 0 THEN
    RAISE EXCEPTION '포인트 충전은 결제 시스템을 통해서만 가능합니다';
  END IF;

  SELECT points + p_delta INTO v_new_balance
  FROM public.users
  WHERE uid = p_uid::text;

  IF v_new_balance IS NULL THEN
    RAISE EXCEPTION '사용자를 찾을 수 없습니다';
  END IF;
  IF v_new_balance < 0 THEN
    RAISE EXCEPTION '잔액 부족';
  END IF;

  UPDATE public.users
  SET points = v_new_balance, updated_at = NOW()
  WHERE uid = p_uid::text;

  INSERT INTO public.point_history (uid, delta, reason, balance, created_at)
  VALUES (p_uid::text, p_delta, p_reason, v_new_balance, NOW());

  RETURN v_new_balance;
END;
$fn$
$sql$;

  EXECUTE 'REVOKE ALL ON FUNCTION public.change_points_atomic(UUID, INTEGER, TEXT) FROM PUBLIC';
  EXECUTE 'GRANT EXECUTE ON FUNCTION public.change_points_atomic(UUID, INTEGER, TEXT) TO authenticated';

  EXECUTE $sql$
CREATE OR REPLACE FUNCTION public.admin_grant_points(
  p_uid UUID,
  p_delta INTEGER,
  p_reason TEXT
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_new INTEGER;
BEGIN
  IF p_delta < 0 THEN
    RAISE EXCEPTION '차감은 change_points_atomic 사용';
  END IF;

  UPDATE public.users
  SET points = points + p_delta, updated_at = NOW()
  WHERE uid = p_uid::text
  RETURNING points INTO v_new;

  IF v_new IS NULL THEN
    RAISE EXCEPTION '사용자 미존재';
  END IF;

  INSERT INTO public.point_history (uid, delta, reason, balance)
  VALUES (p_uid::text, p_delta, p_reason, v_new);

  RETURN v_new;
END;
$fn$
$sql$;

  EXECUTE 'REVOKE ALL ON FUNCTION public.admin_grant_points(UUID, INTEGER, TEXT) FROM PUBLIC';
  EXECUTE 'GRANT EXECUTE ON FUNCTION public.admin_grant_points(UUID, INTEGER, TEXT) TO service_role';
END
$migration$;
