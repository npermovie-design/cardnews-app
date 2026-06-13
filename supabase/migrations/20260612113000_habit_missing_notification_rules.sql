CREATE OR REPLACE FUNCTION public.send_challenge_missing_notifications(
  p_challenge_id TEXT,
  p_day INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ch RECORD;
  target_date DATE;
  affected_count INTEGER := 0;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.users
    WHERE uid = auth.uid()::text
      AND role IN ('admin', 'moderator')
  ) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  IF p_challenge_id IS NULL OR p_challenge_id = '' OR COALESCE(p_day, 0) <= 0 THEN
    RAISE EXCEPTION 'invalid challenge or day';
  END IF;

  SELECT id, title, challenge_mode, start_date, created_at
  INTO ch
  FROM public.challenges
  WHERE id = p_challenge_id;

  IF ch.id IS NULL THEN
    RAISE EXCEPTION 'challenge not found';
  END IF;

  target_date := (COALESCE(ch.start_date::date, ch.created_at::date) + (p_day - 1));

  INSERT INTO public.challenge_notifications (
    id,
    uid,
    challenge_id,
    mission_id,
    actor_uid,
    actor_nick,
    title,
    body,
    url,
    read_at,
    created_at
  )
  SELECT
    'cn_missing_' || p_challenge_id || '_' || p_day || '_' || app.uid || '_' || to_char(current_date, 'YYYYMMDD'),
    app.uid,
    p_challenge_id,
    NULL,
    auth.uid()::text,
    '관리자',
    COALESCE(ch.title, '크루잉') || ' 인증 알림',
    CASE
      WHEN ch.challenge_mode = 'habit'
        THEN 'Day ' || p_day || ' 인증이 아직 등록되지 않았습니다. 오늘 날짜로 업로드한 링크와 게시 날짜를 맞춰 미션 게시판에 올려주세요.'
      ELSE 'Day ' || p_day || ' 인증이 아직 등록되지 않았습니다. 오늘 안에 미션 게시판에서 인증을 올려주세요.'
    END,
    '/growth/' || p_challenge_id || '/board',
    NULL,
    now()
  FROM public.challenge_applications app
  WHERE app.challenge_id = p_challenge_id
    AND app.status = 'confirmed'
    AND app.uid IS NOT NULL
    AND (
      COALESCE(ch.challenge_mode, 'competitive') <> 'habit'
      OR GREATEST(
        COALESCE(ch.start_date::date, ch.created_at::date),
        COALESCE(app.confirmed_at::date, app.created_at::date, ch.start_date::date, ch.created_at::date)
      ) <= target_date
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.challenge_missions m
      WHERE m.challenge_id = p_challenge_id
        AND m.uid = app.uid
        AND m.day = p_day
        AND (
          COALESCE(m.link, '') <> ''
          OR COALESCE(m.screenshot_url, '') <> ''
          OR COALESCE(m.extra_link, '') <> ''
        )
        AND (
          COALESCE(ch.challenge_mode, 'competitive') <> 'habit'
          OR m.post_date = target_date
        )
    )
  ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    body = EXCLUDED.body,
    url = EXCLUDED.url,
    read_at = NULL,
    created_at = now();

  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RETURN affected_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_challenge_missing_notifications(TEXT, INTEGER) TO authenticated;
