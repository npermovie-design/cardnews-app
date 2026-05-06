-- ============================================================================
-- N-HIGH-A2 핫픽스: referral_code 무작위화
-- ============================================================================

-- 1) 기존 사용자 referral_code를 무작위로 재생성
ALTER TABLE public.users DISABLE TRIGGER users_enforce_update_columns;

UPDATE public.users
SET referral_code = 'MK' || upper(substring(md5(random()::text || uid::text || gen_random_uuid()::text), 1, 8))
WHERE TRUE;

ALTER TABLE public.users ENABLE TRIGGER users_enforce_update_columns;

-- 2) 신규 가입 시 자동 생성 트리거
CREATE OR REPLACE FUNCTION generate_random_referral_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.referral_code IS NULL OR NEW.referral_code = '' OR NEW.referral_code ~ '^MK[A-F0-9]{8}$' THEN
    -- 무작위 8자 (uid 추측 불가)
    NEW.referral_code := 'MK' || upper(substring(
      md5(random()::text || NEW.uid::text || gen_random_uuid()::text),
      1, 8
    ));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS users_random_referral ON public.users;
CREATE TRIGGER users_random_referral
  BEFORE INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION generate_random_referral_code();

-- 3) referral_code unique constraint
ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_referral_code_unique;
ALTER TABLE public.users
  ADD CONSTRAINT users_referral_code_unique UNIQUE (referral_code);
