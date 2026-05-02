-- 기능별 월간 사용량 분리 (write/video)
ALTER TABLE users ADD COLUMN IF NOT EXISTS monthly_used_write INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS monthly_used_video INTEGER DEFAULT 0;

-- 기존 monthly_used 값을 write로 이관
UPDATE users SET monthly_used_write = COALESCE(monthly_used, 0) WHERE monthly_used > 0;

-- use_monthly_quota RPC 확장: feature 파라미터 추가
CREATE OR REPLACE FUNCTION use_monthly_quota(p_uid TEXT, p_cost INTEGER, p_reason TEXT DEFAULT '', p_feature TEXT DEFAULT 'write')
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_row RECORD;
  v_sub RECORD;
  v_limit INTEGER;
  v_used INTEGER;
  v_new_used INTEGER;
  v_col TEXT;
BEGIN
  SELECT * INTO v_row FROM users WHERE uid = p_uid FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'user_not_found');
  END IF;

  SELECT * INTO v_sub FROM subscriptions
    WHERE uid = p_uid AND status IN ('active', 'on_trial')
    ORDER BY updated_at DESC LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'no_subscription', 'points', v_row.points);
  END IF;

  -- feature별 한도/사용량 선택
  IF p_feature = 'video' THEN
    v_limit := COALESCE((SELECT CASE v_sub.product_name
      WHEN 'Basic' THEN 5 WHEN 'Pro' THEN 20 WHEN 'Premium' THEN 35
      WHEN 'Business' THEN 50 WHEN 'Agency' THEN 99999 ELSE 0 END), 0);
    v_used := COALESCE(v_row.monthly_used_video, 0);
  ELSE
    v_limit := COALESCE(v_sub.monthly_limit, 0);
    v_used := COALESCE(v_row.monthly_used_write, 0);
  END IF;

  IF v_limit <= 0 THEN
    RETURN json_build_object('ok', false, 'error', 'no_limit_set', 'points', v_row.points);
  END IF;

  v_new_used := v_used + p_cost;
  IF v_new_used > v_limit THEN
    RETURN json_build_object('ok', false, 'error', 'monthly_exceeded',
      'used', v_used, 'limit', v_limit, 'feature', p_feature);
  END IF;

  IF p_feature = 'video' THEN
    UPDATE users SET monthly_used_video = v_new_used WHERE uid = p_uid;
  ELSE
    UPDATE users SET monthly_used_write = v_new_used WHERE uid = p_uid;
  END IF;

  INSERT INTO point_history (uid, delta, reason, balance, created_at)
  VALUES (p_uid, -p_cost, p_reason, v_row.points, now());

  RETURN json_build_object('ok', true,
    'monthly_used', v_new_used, 'monthly_limit', v_limit,
    'feature', p_feature, 'points', v_row.points);
END;
$$;

-- reset_monthly_usage도 양쪽 리셋
CREATE OR REPLACE FUNCTION reset_monthly_usage(p_uid TEXT, p_reason TEXT DEFAULT '')
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE users
  SET monthly_used = 0, monthly_used_write = 0, monthly_used_video = 0, monthly_reset_at = now()
  WHERE uid = p_uid;

  INSERT INTO point_history (uid, delta, reason, balance, created_at)
  VALUES (p_uid, 0, p_reason, (SELECT points FROM users WHERE uid = p_uid), now());

  RETURN 0;
END;
$$;
