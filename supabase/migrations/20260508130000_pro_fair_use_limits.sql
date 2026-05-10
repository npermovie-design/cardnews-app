-- Pro부터는 실제 무제한 대신 무제한급 공정 사용량으로 운영한다.
-- Basic: write 30 / video 10
-- Pro: write 200 / video unlimited
-- Premium/Business: write 700 / video unlimited

UPDATE subscriptions
SET monthly_limit = CASE product_name
  WHEN 'Basic' THEN 30
  WHEN 'Pro' THEN 200
  WHEN 'Premium' THEN 700
  WHEN 'Business' THEN 700
  WHEN 'Agency' THEN 99999
  ELSE COALESCE(monthly_limit, 0)
END,
updated_at = now()
WHERE product_name IN ('Basic', 'Pro', 'Premium', 'Business', 'Agency');

CREATE OR REPLACE FUNCTION use_monthly_quota(p_uid TEXT, p_cost INTEGER, p_reason TEXT DEFAULT '', p_feature TEXT DEFAULT 'write')
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_row RECORD;
  v_sub RECORD;
  v_trial RECORD;
  v_plan TEXT;
  v_limit INTEGER;
  v_used INTEGER;
  v_new_used INTEGER;
BEGIN
  SELECT * INTO v_row FROM users WHERE uid = p_uid FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'user_not_found');
  END IF;

  SELECT * INTO v_sub FROM subscriptions
    WHERE uid = p_uid AND status IN ('active', 'on_trial')
    ORDER BY updated_at DESC LIMIT 1;

  IF NOT FOUND THEN
    SELECT * INTO v_trial FROM program_trials
      WHERE uid = p_uid
        AND status = 'active'
        AND expires_at > now()
      ORDER BY expires_at DESC LIMIT 1;

    IF NOT FOUND THEN
      RETURN json_build_object('ok', false, 'error', 'no_subscription', 'points', v_row.points);
    END IF;
  END IF;

  v_plan := COALESCE(v_sub.product_name, initcap(COALESCE(v_trial.plan, 'pro')));

  IF p_feature = 'video' THEN
    v_limit := CASE v_plan
      WHEN 'Basic' THEN 10
      WHEN 'Pro' THEN 99999
      WHEN 'Premium' THEN 99999
      WHEN 'Business' THEN 99999
      WHEN 'Agency' THEN 99999
      ELSE 0
    END;
    v_used := COALESCE(v_row.monthly_used_video, 0);
  ELSE
    v_limit := COALESCE(v_sub.monthly_limit, CASE v_plan
      WHEN 'Basic' THEN 30
      WHEN 'Pro' THEN 200
      WHEN 'Premium' THEN 700
      WHEN 'Business' THEN 700
      WHEN 'Agency' THEN 99999
      ELSE 0
    END);
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
