-- NaverBot SaaS 테이블 (메이킷 Supabase 공유)
-- 네이버 블로그/카페 자동화 SaaS 라이선스/사용량/결제 관리

create extension if not exists "uuid-ossp";

-- 라이선스 (구독)
create table if not exists naverbot_licenses (
  id              uuid primary key default uuid_generate_v4(),
  license_key     text unique not null,
  user_email      text not null,
  plan            text not null check (plan in ('starter', 'pro', 'business')),
  status          text not null default 'active' check (status in ('active', 'unpaid', 'canceled')),
  machine_id_hash text,                      -- 평문 저장 안 함, salt 해시
  expires_at      timestamptz not null,
  toss_billing_key text,                     -- 토스 정기결제 빌링키 (암호화 권장)
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create index if not exists idx_naverbot_licenses_key on naverbot_licenses(license_key);
create index if not exists idx_naverbot_licenses_email on naverbot_licenses(user_email);

-- 발행 로그 (사용량 추적 + 일일 한도 계산용)
create table if not exists naverbot_posts_log (
  id            uuid primary key default uuid_generate_v4(),
  license_key   text not null references naverbot_licenses(license_key) on delete cascade,
  topic         text not null,
  title         text,
  post_url      text,
  tokens_used   int default 0,
  created_at    timestamptz default now()
);

create index if not exists idx_naverbot_posts_license on naverbot_posts_log(license_key);
create index if not exists idx_naverbot_posts_created on naverbot_posts_log(created_at);
create index if not exists idx_naverbot_posts_license_created on naverbot_posts_log(license_key, created_at);

-- 결제 이력
create table if not exists naverbot_billing_history (
  id              uuid primary key default uuid_generate_v4(),
  license_key     text not null references naverbot_licenses(license_key) on delete cascade,
  amount          int not null,
  status          text not null,            -- success | failed | refunded
  toss_payment_key text,
  raw_payload     jsonb,
  created_at      timestamptz default now()
);

create index if not exists idx_naverbot_billing_license on naverbot_billing_history(license_key);

-- RLS 활성화 (service_role만 접근, anon/authenticated 차단)
alter table naverbot_licenses enable row level security;
alter table naverbot_posts_log enable row level security;
alter table naverbot_billing_history enable row level security;

-- 정책: 아무도 직접 접근 못함 (서버 service_role_key만 우회)
-- (정책 없으면 모두 거부됨)
