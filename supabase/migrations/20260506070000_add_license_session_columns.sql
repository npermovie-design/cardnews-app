-- N-HIGH-A3: license 세션 관리용 컬럼 추가
-- active_machines: 동시 접속 머신 목록 [{hash, last_seen}]
-- last_verified_at: 마지막 라이선스 검증 시각

ALTER TABLE public.naverbot_licenses
  ADD COLUMN IF NOT EXISTS active_machines JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ;
