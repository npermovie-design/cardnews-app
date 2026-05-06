-- 챌린지 스크린샷 인증 + 관리자 전용 챌린지
ALTER TABLE public.challenges ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'public';
ALTER TABLE public.challenge_missions ADD COLUMN IF NOT EXISTS screenshot_url TEXT;
