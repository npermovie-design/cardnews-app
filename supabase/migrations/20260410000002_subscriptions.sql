-- Lemon Squeezy 구독 매핑 테이블
-- subscription_payment_success 이벤트 수신 시 subscription_id로 product 정보 조회용

CREATE TABLE IF NOT EXISTS subscriptions (
  subscription_id TEXT PRIMARY KEY,
  uid             TEXT NOT NULL,
  product_name    TEXT NOT NULL,         -- "Basic" / "Pro" / "Premium"
  interval        TEXT NOT NULL,         -- "monthly" / "yearly"
  status          TEXT NOT NULL DEFAULT 'active',  -- active / cancelled / expired
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_uid ON subscriptions(uid);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- RLS: 사용자는 본인 구독만 조회
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS subscriptions_select_own ON subscriptions;
CREATE POLICY subscriptions_select_own ON subscriptions
  FOR SELECT USING (uid = auth.uid()::text);

-- Service role은 webhook에서 전체 접근
DROP POLICY IF EXISTS subscriptions_service_all ON subscriptions;
CREATE POLICY subscriptions_service_all ON subscriptions
  FOR ALL USING (auth.role() = 'service_role');
