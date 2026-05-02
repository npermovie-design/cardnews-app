-- ================================================================
-- 구독 기반 월간 횟수 시스템 업그레이드
-- Supabase Dashboard → SQL Editor에서 실행
-- ================================================================

-- 1. users 테이블에 월간 사용량 추적 컬럼 추가
ALTER TABLE users ADD COLUMN IF NOT EXISTS monthly_used INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS monthly_reset_at TIMESTAMPTZ DEFAULT now();

-- 2. subscriptions 테이블에 월간 한도 컬럼 추가
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS monthly_limit INTEGER DEFAULT 0;

-- 3. 월간 사용량 원자적 증가 RPC (race condition 방지)
CREATE OR REPLACE FUNCTION use_monthly_quota(p_uid TEXT, p_cost INTEGER, p_reason TEXT DEFAULT '')
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_row RECORD;
  v_sub RECORD;
  v_limit INTEGER;
  v_new_used INTEGER;
BEGIN
  -- 유저 행 잠금
  SELECT * INTO v_row FROM users WHERE uid = p_uid FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'user_not_found');
  END IF;

  -- 활성 구독 확인
  SELECT * INTO v_sub FROM subscriptions
    WHERE uid = p_uid AND status IN ('active', 'on_trial')
    ORDER BY updated_at DESC LIMIT 1;

  IF NOT FOUND THEN
    -- 구독 없음 → 기존 포인트 방식으로 폴백
    RETURN json_build_object('ok', false, 'error', 'no_subscription', 'points', v_row.points);
  END IF;

  v_limit := v_sub.monthly_limit;
  IF v_limit <= 0 THEN
    -- monthly_limit 미설정 → 기존 포인트 방식 폴백
    RETURN json_build_object('ok', false, 'error', 'no_limit_set', 'points', v_row.points);
  END IF;

  -- 월간 사용량 체크
  v_new_used := COALESCE(v_row.monthly_used, 0) + p_cost;
  IF v_new_used > v_limit THEN
    RETURN json_build_object('ok', false, 'error', 'monthly_exceeded',
      'used', v_row.monthly_used, 'limit', v_limit);
  END IF;

  -- 사용량 증가
  UPDATE users SET monthly_used = v_new_used WHERE uid = p_uid;

  -- 이력 기록
  INSERT INTO point_history (uid, delta, reason, balance, created_at)
  VALUES (p_uid, -p_cost, p_reason, v_row.points, now());

  RETURN json_build_object('ok', true,
    'monthly_used', v_new_used, 'monthly_limit', v_limit,
    'points', v_row.points);
END;
$$;

-- 4. 월간 사용량 리셋 RPC (구독 갱신 시 호출)
CREATE OR REPLACE FUNCTION reset_monthly_usage(p_uid TEXT, p_reason TEXT DEFAULT '')
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_old_used INTEGER;
BEGIN
  SELECT monthly_used INTO v_old_used FROM users WHERE uid = p_uid FOR UPDATE;

  UPDATE users
  SET monthly_used = 0, monthly_reset_at = now()
  WHERE uid = p_uid;

  -- 리셋 이력 기록
  IF v_old_used > 0 THEN
    INSERT INTO point_history (uid, delta, reason, balance, created_at)
    VALUES (p_uid, 0, p_reason, (SELECT points FROM users WHERE uid = p_uid), now());
  END IF;

  RETURN 0;
END;
$$;
