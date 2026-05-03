-- NaverBot SaaS Supabase 스키마
-- 실행: Supabase 대시보드 SQL Editor에 붙여넣기

create extension if not exists "uuid-ossp";

-- 라이선스 (구독 계정)
create table if not exists licenses (
  id            uuid primary key default uuid_generate_v4(),
  license_key   text unique not null,
  user_email    text not null,
  plan          text not null check (plan in ('basic', 'starter', 'pro', 'premium', 'business')),
  status        text not null default 'active' check (status in ('active', 'unpaid', 'canceled')),
  machine_id    text,
  expires_at    timestamptz not null,
  toss_billing_key text,            -- 토스 정기결제 키
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create index if not exists idx_licenses_key on licenses(license_key);
create index if not exists idx_licenses_email on licenses(user_email);

-- 발행 로그 (사용량 + 분석)
create table if not exists posts_log (
  id            uuid primary key default uuid_generate_v4(),
  license_key   text not null references licenses(license_key) on delete cascade,
  topic         text not null,
  title         text,
  post_url      text,
  tokens_used   int default 0,
  created_at    timestamptz default now()
);

create index if not exists idx_posts_log_license on posts_log(license_key);
create index if not exists idx_posts_log_created on posts_log(created_at);

-- 결제 이력
create table if not exists billing_history (
  id            uuid primary key default uuid_generate_v4(),
  license_key   text not null references licenses(license_key) on delete cascade,
  amount        int not null,
  status        text not null,        -- success | failed | refunded
  toss_payment_key text,
  raw_payload   jsonb,
  created_at    timestamptz default now()
);

create index if not exists idx_billing_license on billing_history(license_key);
