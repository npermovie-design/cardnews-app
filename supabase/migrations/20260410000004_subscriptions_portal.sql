-- subscriptions 테이블에 Lemon Squeezy Customer Portal URL 컬럼 추가
-- My Page에서 "구독 관리" 버튼으로 해지/결제수단 변경 플로우 연결용

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS customer_portal_url TEXT,
  ADD COLUMN IF NOT EXISTS update_payment_url TEXT;
