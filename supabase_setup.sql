-- ================================================================
-- SNS메이킷 Supabase 테이블 설정 SQL
-- Supabase Dashboard → SQL Editor에서 실행하세요
-- ================================================================

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

-- ── 완료 ────────────────────────────────────────────────────────
-- 위 SQL 실행 후 사이트를 새로고침하면 적용됩니다.
