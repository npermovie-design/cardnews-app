-- ============================================================================
-- F-012, N-CRIT-2 핫픽스: users 테이블 컬럼 단위 UPDATE 차단
-- ============================================================================
-- 적용 전 백업 권장:
--   pg_dump -t public.users > users_backup_$(date +%Y%m%d).sql
-- ============================================================================

-- 1. 기존 약한 UPDATE 정책 제거
DROP POLICY IF EXISTS "users_update_self" ON public.users;
DROP POLICY IF EXISTS "Users can update their own row" ON public.users;
DROP POLICY IF EXISTS "Enable update for users based on uid" ON public.users;

-- 2. 컬럼 단위 강제 트리거
CREATE OR REPLACE FUNCTION enforce_user_update_columns()
RETURNS TRIGGER AS $$
BEGIN
  -- service_role은 무제한 (RPC SECURITY DEFINER, 백엔드용)
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- 보호 컬럼 변경 차단
  IF NEW.points IS DISTINCT FROM OLD.points THEN
    RAISE EXCEPTION 'points 컬럼은 직접 변경할 수 없습니다. RPC change_points_atomic을 사용하세요.';
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
  -- email 변경 차단 (v2 추가 검증: 점검에서 'attacker@evil.com'으로 변경 성공)
  -- public.users.email은 auth.users.email과 별개이며,
  -- 의뢰인 백엔드/프런트가 사용자 식별/표시에 public.users.email을 쓴다면 위장 경로
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

  -- 닉네임 변경 7일 1회 제한
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

DROP TRIGGER IF EXISTS users_enforce_update_columns ON public.users;
CREATE TRIGGER users_enforce_update_columns
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION enforce_user_update_columns();

-- 3. RLS UPDATE 정책: 본인 행만
CREATE POLICY "users_update_self_own_row_only"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = uid)
  WITH CHECK (auth.uid()::text = uid);

-- 4. RLS 활성화
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 검증 (의뢰인 본인 JWT로):
--   curl -X PATCH ".../users?uid=eq.$UID" -d '{"points": 99999}'
--   → 응답에 "직접 변경할 수 없습니다" 포함되면 ✅
-- ============================================================================
