-- subscriptions 테이블에 갱신/종료 날짜 컬럼 추가
-- My Page에서 "다음 결제일", "해지 예정일" 표시용

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS renews_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ends_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
