-- ============================================================================
-- 횟수제 전환 반영: RPC + 트리거 에러 메시지를 '포인트' → '이용 횟수'로 수정
-- ============================================================================

-- 1. change_points_atomic RPC 메시지 수정
CREATE OR REPLACE FUNCTION change_points_atomic(p_uid UUID, p_delta INTEGER, p_reason TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_current_uid UUID;
  v_new_balance INTEGER;
BEGIN
  v_current_uid := auth.uid();
  IF v_current_uid IS NULL THEN
    RAISE EXCEPTION '인증이 필요합니다';
  END IF;

  IF v_current_uid <> p_uid THEN
    RAISE EXCEPTION '다른 사용자의 이용 횟수를 변경할 수 없습니다';
  END IF;

  IF p_delta > 0 THEN
    RAISE EXCEPTION '이용 횟수 충전은 결제 시스템을 통해서만 가능합니다';
  END IF;

  SELECT points + p_delta INTO v_new_balance
  FROM public.users
  WHERE uid = p_uid::text;

  IF v_new_balance IS NULL THEN
    RAISE EXCEPTION '사용자를 찾을 수 없습니다';
  END IF;
  IF v_new_balance < 0 THEN
    RAISE EXCEPTION '잔여 횟수 부족';
  END IF;

  UPDATE public.users
  SET points = v_new_balance, updated_at = NOW()
  WHERE uid = p_uid::text;

  INSERT INTO public.point_history (uid, delta, reason, balance, created_at)
  VALUES (p_uid::text, p_delta, p_reason, v_new_balance, NOW());

  RETURN v_new_balance;
END;
$$;

-- 2. enforce_user_update_columns 트리거 메시지 수정
CREATE OR REPLACE FUNCTION enforce_user_update_columns()
RETURNS TRIGGER AS $$
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NEW.points IS DISTINCT FROM OLD.points THEN
    RAISE EXCEPTION '이용 횟수는 직접 변경할 수 없습니다. RPC change_points_atomic을 사용하세요.';
  END IF;
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'role 컬럼은 변경할 수 없습니다.';
  END IF;
  IF NEW.monthly_used IS DISTINCT FROM OLD.monthly_used
     OR NEW.monthly_used_write IS DISTINCT FROM OLD.monthly_used_write
     OR NEW.monthly_used_video IS DISTINCT FROM OLD.monthly_used_video
     OR NEW.monthly_reset_at IS DISTINCT FROM OLD.monthly_reset_at THEN
    RAISE EXCEPTION 'monthly_used_* 컬럼은 RPC use_monthly_quota를 통해서만 변경 가능합니다.';
  END IF;
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    RAISE EXCEPTION 'email은 직접 변경할 수 없습니다.';
  END IF;
  IF NEW.referral_code IS DISTINCT FROM OLD.referral_code THEN
    RAISE EXCEPTION 'referral_code는 직접 변경할 수 없습니다.';
  END IF;
  IF NEW.uid IS DISTINCT FROM OLD.uid THEN
    RAISE EXCEPTION 'uid는 변경 불가';
  END IF;
  IF NEW.last_login IS DISTINCT FROM OLD.last_login
     OR NEW.last_login_date IS DISTINCT FROM OLD.last_login_date THEN
    RAISE EXCEPTION 'last_login은 직접 변경할 수 없습니다.';
  END IF;
  IF NEW.join_date IS DISTINCT FROM OLD.join_date
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'join_date / created_at은 변경 불가';
  END IF;

  IF NEW.nick IS DISTINCT FROM OLD.nick THEN
    IF OLD.nick_changed_at IS NOT NULL
       AND OLD.nick_changed_at > NOW() - INTERVAL '7 days' THEN
      RAISE EXCEPTION '닉네임은 7일에 1회만 변경 가능합니다.';
    END IF;
    NEW.nick_changed_at := NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;
