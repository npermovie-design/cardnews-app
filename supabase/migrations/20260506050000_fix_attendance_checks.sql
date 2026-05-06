-- ============================================================================
-- N-CRIT-4 핫픽스: attendance_checks 임의 points INSERT 차단
-- ============================================================================

-- 1) points 컬럼 default = 1 (서버 결정)
ALTER TABLE public.attendance_checks ALTER COLUMN points SET DEFAULT 1;

-- 2) 트리거: 클라이언트가 보낸 points 무시 + 본인 + 미래 날짜 차단
CREATE OR REPLACE FUNCTION enforce_attendance_constraints()
RETURNS TRIGGER AS $$
DECLARE
  v_streak_bonus INTEGER := 1;
  v_continuous_days INTEGER := 0;
BEGIN
  -- service_role 우회
  IF auth.role() = 'service_role' THEN RETURN NEW; END IF;

  -- 본인만
  IF NEW.uid != auth.uid()::text THEN
    RAISE EXCEPTION '본인 출석체크만 가능합니다';
  END IF;

  -- 미래 날짜 차단
  IF NEW.check_date > CURRENT_DATE THEN
    RAISE EXCEPTION '미래 날짜로 출석체크할 수 없습니다';
  END IF;

  -- 너무 과거(7일 이상 전) 차단
  IF NEW.check_date < CURRENT_DATE - INTERVAL '7 days' THEN
    RAISE EXCEPTION '7일 이전 날짜는 출석체크할 수 없습니다';
  END IF;

  -- 연속 출석 보너스 계산 (서버 결정)
  -- 의뢰인의 비즈니스 로직에 맞춰 customize:
  -- 예: 3일 연속 +2P, 7일 연속 +5P
  SELECT COUNT(*) INTO v_continuous_days
    FROM public.attendance_checks
    WHERE uid = NEW.uid
    AND check_date >= NEW.check_date - INTERVAL '7 days'
    AND check_date < NEW.check_date;
  IF v_continuous_days >= 6 THEN
    v_streak_bonus := 5;
  ELSIF v_continuous_days >= 2 THEN
    v_streak_bonus := 2;
  END IF;

  -- 클라이언트가 보낸 points 무시 + 서버 계산값으로 강제
  NEW.points := v_streak_bonus;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS attendance_enforce ON public.attendance_checks;
CREATE TRIGGER attendance_enforce
  BEFORE INSERT ON public.attendance_checks
  FOR EACH ROW
  EXECUTE FUNCTION enforce_attendance_constraints();

-- 3) RLS 정책
DROP POLICY IF EXISTS "attendance_insert_self" ON public.attendance_checks;
DROP POLICY IF EXISTS "attendance_insert_self_only" ON public.attendance_checks;
CREATE POLICY "attendance_insert_self_only"
  ON public.attendance_checks
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = uid);

DROP POLICY IF EXISTS "attendance_update" ON public.attendance_checks;
DROP POLICY IF EXISTS "attendance_no_update" ON public.attendance_checks;
CREATE POLICY "attendance_no_update"
  ON public.attendance_checks
  FOR UPDATE TO authenticated USING (false);

DROP POLICY IF EXISTS "attendance_delete" ON public.attendance_checks;
DROP POLICY IF EXISTS "attendance_no_delete" ON public.attendance_checks;
CREATE POLICY "attendance_no_delete"
  ON public.attendance_checks
  FOR DELETE TO authenticated USING (false);

ALTER TABLE public.attendance_checks ENABLE ROW LEVEL SECURITY;

-- 4) 출석 보너스 → users.points 반영은 별도 트리거 또는 RPC로
-- (이미 클라이언트 코드가 attendance_checks INSERT 후 users.points UPDATE 한다면
--  F-012 수정안의 트리거가 차단함. 출석 보너스는 attendance trigger에서
--  admin_grant_points RPC 호출로 처리하는 것이 안전)

CREATE OR REPLACE FUNCTION attendance_grant_points_after_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- service_role로 admin_grant_points 호출 (SECURITY DEFINER 효과)
  -- 또는 직접 INSERT into point_history + UPDATE users.points
  UPDATE public.users SET points = points + NEW.points WHERE uid = NEW.uid;
  INSERT INTO public.point_history (uid, delta, reason, balance, created_at)
    SELECT NEW.uid, NEW.points,
           '출석체크 +' || NEW.points || 'P',
           u.points,
           NOW()
    FROM public.users u WHERE u.uid = NEW.uid;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS attendance_grant_points ON public.attendance_checks;
CREATE TRIGGER attendance_grant_points
  AFTER INSERT ON public.attendance_checks
  FOR EACH ROW
  EXECUTE FUNCTION attendance_grant_points_after_insert();
