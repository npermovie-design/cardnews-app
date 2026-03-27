-- ================================================================
-- SNS메이킷 Supabase 테이블 설정 SQL
-- Supabase Dashboard → SQL Editor에서 실행하세요
-- ================================================================

-- ── 인스타 자동DM 캠페인 테이블 ─────────────────────────────────
CREATE TABLE IF NOT EXISTS insta_dm_campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  uid TEXT NOT NULL,
  name TEXT NOT NULL,
  post_url TEXT,
  trigger_keywords JSONB DEFAULT '[]',
  dm_message_follower TEXT DEFAULT '',
  dm_message_non_follower TEXT DEFAULT '',
  dm_link TEXT,
  is_active BOOLEAN DEFAULT true,
  dm_sent_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE insta_dm_campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "insta_dm_campaigns_all" ON insta_dm_campaigns;
CREATE POLICY "insta_dm_campaigns_all" ON insta_dm_campaigns FOR ALL USING (true);

-- ── 인스타 자동DM 발송 로그 테이블 ──────────────────────────────
CREATE TABLE IF NOT EXISTS insta_dm_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID REFERENCES insta_dm_campaigns(id) ON DELETE CASCADE,
  uid TEXT NOT NULL,
  commenter_id TEXT NOT NULL,
  commenter_username TEXT DEFAULT '',
  comment_id TEXT NOT NULL,
  comment_text TEXT DEFAULT '',
  message_sent TEXT DEFAULT '',
  is_follower BOOLEAN DEFAULT false,
  sent_success BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE insta_dm_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "insta_dm_log_all" ON insta_dm_log;
CREATE POLICY "insta_dm_log_all" ON insta_dm_log FOR ALL USING (true);

-- dm_sent_count 컬럼 추가 (기존 테이블에 없을 경우)
ALTER TABLE insta_dm_campaigns ADD COLUMN IF NOT EXISTS dm_sent_count INTEGER DEFAULT 0;

-- ── 1. users 테이블에 nick_changed_at 컬럼 추가 ──────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS nick_changed_at TIMESTAMPTZ;

-- users 테이블 RLS: 본인만 자신의 닉네임 변경 가능
DROP POLICY IF EXISTS "users_update_own" ON users;
CREATE POLICY "users_update_own"
  ON users FOR UPDATE
  USING (auth.uid()::text = uid)
  WITH CHECK (auth.uid()::text = uid);

-- ── 2. board_cats 테이블 생성 ────────────────────────────────────
CREATE TABLE IF NOT EXISTS board_cats (
  id      TEXT PRIMARY KEY,
  label   TEXT NOT NULL,
  icon    TEXT DEFAULT '📌',
  color   TEXT DEFAULT '#6366f1',
  "order" INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- board_cats RLS
ALTER TABLE board_cats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "board_cats_select_all" ON board_cats;
CREATE POLICY "board_cats_select_all"
  ON board_cats FOR SELECT USING (true);

DROP POLICY IF EXISTS "board_cats_insert_admin" ON board_cats;
CREATE POLICY "board_cats_insert_admin"
  ON board_cats FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "board_cats_update_admin" ON board_cats;
CREATE POLICY "board_cats_update_admin"
  ON board_cats FOR UPDATE USING (true);

DROP POLICY IF EXISTS "board_cats_delete_admin" ON board_cats;
CREATE POLICY "board_cats_delete_admin"
  ON board_cats FOR DELETE USING (true);

-- ── 3. board_tags 테이블 생성 ────────────────────────────────────
CREATE TABLE IF NOT EXISTS board_tags (
  id      TEXT PRIMARY KEY,
  cat_id  TEXT NOT NULL REFERENCES board_cats(id) ON DELETE CASCADE,
  label   TEXT NOT NULL,
  color   TEXT DEFAULT '#6366f1',
  "order" INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- board_tags RLS
ALTER TABLE board_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "board_tags_select_all" ON board_tags;
CREATE POLICY "board_tags_select_all"
  ON board_tags FOR SELECT USING (true);

DROP POLICY IF EXISTS "board_tags_insert_admin" ON board_tags;
CREATE POLICY "board_tags_insert_admin"
  ON board_tags FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "board_tags_update_admin" ON board_tags;
CREATE POLICY "board_tags_update_admin"
  ON board_tags FOR UPDATE USING (true);

DROP POLICY IF EXISTS "board_tags_delete_admin" ON board_tags;
CREATE POLICY "board_tags_delete_admin"
  ON board_tags FOR DELETE USING (true);

-- ── 4. board_cats 기본 데이터 입력 ──────────────────────────────
INSERT INTO board_cats (id, label, icon, color, "order") VALUES
  ('info',   '정보공유',   '📌', '#6366f1', 0),
  ('qna',    '질문답변',   '❓', '#f59e0b', 1),
  ('free',   '자유게시판', '🗣', '#10b981', 2),
  ('review', '사용후기',   '⭐', '#ec4899', 3)
ON CONFLICT (id) DO NOTHING;

-- ── 5. videos 테이블 (없을 경우 생성) ───────────────────────────
CREATE TABLE IF NOT EXISTS videos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  "videoUrl"  TEXT NOT NULL,
  "downloadUrl" TEXT DEFAULT '',
  thumbnail   TEXT DEFAULT '',
  description TEXT DEFAULT '',
  category    TEXT DEFAULT 'synth',
  "isFree"    BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE videos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "videos_select_all" ON videos;
CREATE POLICY "videos_select_all"
  ON videos FOR SELECT USING (true);

DROP POLICY IF EXISTS "videos_write_admin" ON videos;
CREATE POLICY "videos_write_admin"
  ON videos FOR ALL USING (true);

-- ── 6. inquiries 테이블 (문의하기) ──────────────────────────────
CREATE TABLE IF NOT EXISTS inquiries (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  subject    TEXT DEFAULT '',
  message    TEXT NOT NULL,
  status     TEXT DEFAULT 'pending',
  reply      TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "inquiries_insert_all" ON inquiries;
CREATE POLICY "inquiries_insert_all"
  ON inquiries FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "inquiries_select_all" ON inquiries;
CREATE POLICY "inquiries_select_all"
  ON inquiries FOR SELECT USING (true);

DROP POLICY IF EXISTS "inquiries_update_all" ON inquiries;
CREATE POLICY "inquiries_update_all"
  ON inquiries FOR UPDATE USING (true);

DROP POLICY IF EXISTS "inquiries_delete_all" ON inquiries;
CREATE POLICY "inquiries_delete_all"
  ON inquiries FOR DELETE USING (true);

-- ── 7. online_users 테이블 (실시간 접속자 카운트) ───────────────
CREATE TABLE IF NOT EXISTS online_users (
  id         TEXT PRIMARY KEY,
  device     TEXT DEFAULT 'desktop',
  last_seen  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE online_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "online_users_all" ON online_users;
CREATE POLICY "online_users_all"
  ON online_users FOR ALL USING (true);

-- ── 6. posts 테이블에 tag / subCat 컬럼 추가 ────────────────────
-- 세부 카테고리(태그) 필터 기능을 위해 필요
ALTER TABLE posts ADD COLUMN IF NOT EXISTS tag     TEXT DEFAULT '';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS "subCat" TEXT DEFAULT '';

-- posts RLS (없을 경우 추가)
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "posts_select_all" ON posts;
CREATE POLICY "posts_select_all"
  ON posts FOR SELECT USING (true);

DROP POLICY IF EXISTS "posts_insert_auth" ON posts;
CREATE POLICY "posts_insert_auth"
  ON posts FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "posts_update_auth" ON posts;
CREATE POLICY "posts_update_auth"
  ON posts FOR UPDATE USING (true);

DROP POLICY IF EXISTS "posts_delete_auth" ON posts;
CREATE POLICY "posts_delete_auth"
  ON posts FOR DELETE USING (true);

-- ── SNS 연동 계정 테이블 ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sns_connections (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uid             TEXT NOT NULL,
  platform        TEXT NOT NULL,  -- 'tistory', 'instagram', 'threads', 'naver_blog'
  access_token    TEXT,
  refresh_token   TEXT,
  token_expires_at TIMESTAMPTZ,
  platform_user_id TEXT,
  platform_username TEXT,
  blog_name       TEXT,
  metadata        JSONB DEFAULT '{}',
  connected_at    TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(uid, platform)
);

ALTER TABLE sns_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sns_conn_select_own" ON sns_connections;
CREATE POLICY "sns_conn_select_own"
  ON sns_connections FOR SELECT
  USING (auth.uid()::text = uid);

DROP POLICY IF EXISTS "sns_conn_insert_own" ON sns_connections;
CREATE POLICY "sns_conn_insert_own"
  ON sns_connections FOR INSERT
  WITH CHECK (auth.uid()::text = uid);

DROP POLICY IF EXISTS "sns_conn_update_own" ON sns_connections;
CREATE POLICY "sns_conn_update_own"
  ON sns_connections FOR UPDATE
  USING (auth.uid()::text = uid);

DROP POLICY IF EXISTS "sns_conn_delete_own" ON sns_connections;
CREATE POLICY "sns_conn_delete_own"
  ON sns_connections FOR DELETE
  USING (auth.uid()::text = uid);

-- ── SNS 발행 이력 테이블 ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS publish_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uid             TEXT NOT NULL,
  platform        TEXT NOT NULL,
  title           TEXT,
  content_preview TEXT,
  post_url        TEXT,
  status          TEXT DEFAULT 'success',  -- 'success', 'failed', 'pending'
  error_message   TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE publish_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pub_hist_select_own" ON publish_history;
CREATE POLICY "pub_hist_select_own"
  ON publish_history FOR SELECT
  USING (auth.uid()::text = uid);

DROP POLICY IF EXISTS "pub_hist_insert_own" ON publish_history;
CREATE POLICY "pub_hist_insert_own"
  ON publish_history FOR INSERT
  WITH CHECK (auth.uid()::text = uid);

-- ── 인스타 자동 대댓글 캠페인 테이블 ──────────────────────────────
CREATE TABLE IF NOT EXISTS insta_reply_campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  uid TEXT NOT NULL,
  name TEXT NOT NULL,
  post_url TEXT,
  media_id TEXT,
  trigger_keywords JSONB DEFAULT '[]',
  reply_message TEXT DEFAULT '',
  reply_link TEXT,
  is_active BOOLEAN DEFAULT true,
  reply_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE insta_reply_campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "insta_reply_campaigns_all" ON insta_reply_campaigns;
CREATE POLICY "insta_reply_campaigns_all" ON insta_reply_campaigns FOR ALL USING (true);

-- insta_dm_log campaign_id를 TEXT로 변경 (대댓글 로그에 "reply_" prefix 사용)
ALTER TABLE insta_dm_log ALTER COLUMN campaign_id TYPE TEXT USING campaign_id::TEXT;

-- ── 고객사례 테이블 ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customer_cases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  brand TEXT NOT NULL,
  field TEXT DEFAULT '',
  feature TEXT DEFAULT '',
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  link TEXT DEFAULT '',
  thumb_url TEXT DEFAULT '',
  tags JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE customer_cases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "customer_cases_all" ON customer_cases;
CREATE POLICY "customer_cases_all" ON customer_cases FOR ALL USING (true);

-- ── 완료 ────────────────────────────────────────────────────────
-- 위 SQL 실행 후 사이트를 새로고침하면 적용됩니다.
