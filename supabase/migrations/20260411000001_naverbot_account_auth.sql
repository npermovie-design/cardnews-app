-- NaverBot SaaS - 메이킷 계정 통합
-- naverbot_posts_log의 license_key FK 제거 (uid 저장 허용)
-- license_key 컬럼은 이제 "user identifier" 역할 (uid 또는 기존 license_key)

-- FK 제약 이름은 상황마다 다를 수 있으니 information_schema에서 찾아서 제거
DO $$
DECLARE
    fk_name text;
BEGIN
    SELECT conname INTO fk_name
    FROM pg_constraint
    WHERE conrelid = 'naverbot_posts_log'::regclass
      AND contype = 'f'
      AND conname LIKE '%license_key%';

    IF fk_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE naverbot_posts_log DROP CONSTRAINT %I', fk_name);
    END IF;
END $$;

-- 동일 작업: naverbot_billing_history
DO $$
DECLARE
    fk_name text;
BEGIN
    SELECT conname INTO fk_name
    FROM pg_constraint
    WHERE conrelid = 'naverbot_billing_history'::regclass
      AND contype = 'f'
      AND conname LIKE '%license_key%';

    IF fk_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE naverbot_billing_history DROP CONSTRAINT %I', fk_name);
    END IF;
END $$;
