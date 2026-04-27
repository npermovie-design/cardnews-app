ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS referral_code text;

CREATE UNIQUE INDEX IF NOT EXISTS users_referral_code_key
  ON public.users (referral_code)
  WHERE referral_code IS NOT NULL;

UPDATE public.users
SET referral_code = 'MK' || upper(substr(regexp_replace(uid::text, '[^a-zA-Z0-9]', '', 'g'), 1, 8))
WHERE referral_code IS NULL
  AND uid IS NOT NULL;
