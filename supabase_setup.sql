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

-- ── shared_templates 테이블 (카드뉴스 공유 템플릿) ──────────────
CREATE TABLE IF NOT EXISTS shared_templates (
  id          BIGINT PRIMARY KEY,
  title       TEXT NOT NULL DEFAULT '',
  author      TEXT DEFAULT '익명',
  user_id     TEXT,
  preset_key  TEXT DEFAULT 'bold_dark',
  preset_label TEXT DEFAULT '',
  slide_count INTEGER DEFAULT 1,
  slides_data TEXT DEFAULT '[]',
  preview     TEXT,
  use_count   INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE shared_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "shared_templates_select_all" ON shared_templates;
CREATE POLICY "shared_templates_select_all"
  ON shared_templates FOR SELECT USING (true);

DROP POLICY IF EXISTS "shared_templates_insert_all" ON shared_templates;
CREATE POLICY "shared_templates_insert_all"
  ON shared_templates FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "shared_templates_update_all" ON shared_templates;
CREATE POLICY "shared_templates_update_all"
  ON shared_templates FOR UPDATE USING (true);

DROP POLICY IF EXISTS "shared_templates_delete_all" ON shared_templates;
CREATE POLICY "shared_templates_delete_all"
  ON shared_templates FOR DELETE USING (true);

-- ── sns_news 테이블 (SNS 뉴스 캐시) ───────────────────────────
CREATE TABLE IF NOT EXISTS sns_news (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category    TEXT NOT NULL DEFAULT 'sns',
  title       TEXT NOT NULL,
  source      TEXT DEFAULT '',
  pub_date    TEXT DEFAULT '',
  link        TEXT DEFAULT '',
  description TEXT DEFAULT '',
  thumb       TEXT DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ── 계정 공통 출석체크: PC/브라우저가 달라도 하루 1회만 지급 ──
CREATE TABLE IF NOT EXISTS attendance_checks (
  id BIGSERIAL PRIMARY KEY,
  uid TEXT NOT NULL,
  check_date DATE NOT NULL,
  points INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(uid, check_date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_checks_uid_date
  ON attendance_checks(uid, check_date DESC);

ALTER TABLE attendance_checks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "attendance_select_own" ON attendance_checks;
CREATE POLICY "attendance_select_own"
  ON attendance_checks FOR SELECT
  USING (auth.uid()::text = uid);

DROP POLICY IF EXISTS "attendance_insert_own" ON attendance_checks;
CREATE POLICY "attendance_insert_own"
  ON attendance_checks FOR INSERT
  WITH CHECK (auth.uid()::text = uid);

-- ── 계정 공통 AI 보관함: 블로그/카드뉴스/상세페이지/PPT/영상 결과 동기화 ──
CREATE TABLE IF NOT EXISTS user_library_items (
  id BIGSERIAL PRIMARY KEY,
  uid TEXT NOT NULL,
  kind TEXT NOT NULL,
  item_id TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(uid, kind, item_id)
);

CREATE INDEX IF NOT EXISTS idx_user_library_items_uid_kind_updated
  ON user_library_items(uid, kind, updated_at DESC);

ALTER TABLE user_library_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "library_select_own" ON user_library_items;
CREATE POLICY "library_select_own"
  ON user_library_items FOR SELECT
  USING (auth.uid()::text = uid);

DROP POLICY IF EXISTS "library_insert_own" ON user_library_items;
CREATE POLICY "library_insert_own"
  ON user_library_items FOR INSERT
  WITH CHECK (auth.uid()::text = uid);

DROP POLICY IF EXISTS "library_update_own" ON user_library_items;
CREATE POLICY "library_update_own"
  ON user_library_items FOR UPDATE
  USING (auth.uid()::text = uid)
  WITH CHECK (auth.uid()::text = uid);

DROP POLICY IF EXISTS "library_delete_own" ON user_library_items;
CREATE POLICY "library_delete_own"
  ON user_library_items FOR DELETE
  USING (auth.uid()::text = uid);

ALTER TABLE sns_news ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sns_news_select_all" ON sns_news;
CREATE POLICY "sns_news_select_all"
  ON sns_news FOR SELECT USING (true);

DROP POLICY IF EXISTS "sns_news_insert_all" ON sns_news;
CREATE POLICY "sns_news_insert_all"
  ON sns_news FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "sns_news_delete_all" ON sns_news;
CREATE POLICY "sns_news_delete_all"
  ON sns_news FOR DELETE USING (true);

-- ── 클래스(강의) 테이블 ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS classes (
  id            TEXT PRIMARY KEY,
  title         TEXT NOT NULL DEFAULT '',
  "desc"        TEXT DEFAULT '',
  type          TEXT DEFAULT 'vod',          -- vod | zoom | offline
  pricing       TEXT DEFAULT 'free',         -- free | paid
  price         INTEGER DEFAULT 0,
  free_preview_count   INTEGER DEFAULT 2,
  member_visible_count INTEGER DEFAULT 5,
  tags          JSONB DEFAULT '[]',
  thumbnail     TEXT DEFAULT '',
  intro_html    TEXT DEFAULT '',
  target_audience TEXT DEFAULT '',
  process       TEXT DEFAULT '',
  notes         TEXT DEFAULT '',
  instructor_bio TEXT DEFAULT '',
  instructor    TEXT DEFAULT '',
  instructor_uid TEXT DEFAULT '',
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "classes_select_all" ON classes;
CREATE POLICY "classes_select_all" ON classes FOR SELECT USING (true);
DROP POLICY IF EXISTS "classes_write_all" ON classes;
CREATE POLICY "classes_write_all" ON classes FOR ALL USING (true);

-- ── 강의 레슨(영상) 테이블 ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS class_lessons (
  id            TEXT PRIMARY KEY,
  class_id      TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  title         TEXT NOT NULL DEFAULT '',
  duration      TEXT DEFAULT '',
  video_src     TEXT DEFAULT '',
  is_free_preview    BOOLEAN DEFAULT false,
  assignment_required BOOLEAN DEFAULT false,
  assignment_desc    TEXT DEFAULT '',
  "order"       INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE class_lessons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "class_lessons_select_all" ON class_lessons;
CREATE POLICY "class_lessons_select_all" ON class_lessons FOR SELECT USING (true);
DROP POLICY IF EXISTS "class_lessons_write_all" ON class_lessons;
CREATE POLICY "class_lessons_write_all" ON class_lessons FOR ALL USING (true);

-- ── 라이브 일정 테이블 ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS class_live_schedules (
  id            TEXT PRIMARY KEY,
  class_id      TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  date          TIMESTAMPTZ,
  title         TEXT DEFAULT '',
  duration      TEXT DEFAULT '60분',
  max_seats     INTEGER DEFAULT 30,
  enrolled      INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE class_live_schedules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "class_live_select_all" ON class_live_schedules;
CREATE POLICY "class_live_select_all" ON class_live_schedules FOR SELECT USING (true);
DROP POLICY IF EXISTS "class_live_write_all" ON class_live_schedules;
CREATE POLICY "class_live_write_all" ON class_live_schedules FOR ALL USING (true);

-- ── 자막 테이블 ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS class_subtitles (
  id            BIGSERIAL PRIMARY KEY,
  lesson_id     TEXT NOT NULL REFERENCES class_lessons(id) ON DELETE CASCADE,
  lang          TEXT NOT NULL DEFAULT 'ko',
  subtitles     JSONB NOT NULL DEFAULT '[]',  -- [{start, end, text}]
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(lesson_id, lang)
);

ALTER TABLE class_subtitles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "class_subtitles_select_all" ON class_subtitles;
CREATE POLICY "class_subtitles_select_all" ON class_subtitles FOR SELECT USING (true);
DROP POLICY IF EXISTS "class_subtitles_write_all" ON class_subtitles;
CREATE POLICY "class_subtitles_write_all" ON class_subtitles FOR ALL USING (true);

-- ── 수강 후기 테이블 ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS class_reviews (
  id            BIGSERIAL PRIMARY KEY,
  class_id      TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  uid           TEXT NOT NULL,
  nick          TEXT DEFAULT '',
  rating        INTEGER NOT NULL DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
  content       TEXT DEFAULT '',
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(class_id, uid)
);
ALTER TABLE class_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "class_reviews_select_all" ON class_reviews FOR SELECT USING (true);
CREATE POLICY "class_reviews_write_all" ON class_reviews FOR ALL USING (true);

-- ── 수강 진도 테이블 ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS class_progress (
  id            BIGSERIAL PRIMARY KEY,
  class_id      TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  lesson_id     TEXT NOT NULL REFERENCES class_lessons(id) ON DELETE CASCADE,
  uid           TEXT NOT NULL,
  watched       BOOLEAN DEFAULT false,
  watch_seconds REAL DEFAULT 0,
  assignment_submitted BOOLEAN DEFAULT false,
  assignment_file TEXT DEFAULT '',
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(lesson_id, uid)
);
ALTER TABLE class_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "class_progress_select_all" ON class_progress FOR SELECT USING (true);
CREATE POLICY "class_progress_write_all" ON class_progress FOR ALL USING (true);

-- ── 강의 Q&A 댓글 테이블 ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS class_comments (
  id            BIGSERIAL PRIMARY KEY,
  class_id      TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  lesson_id     TEXT DEFAULT '',
  uid           TEXT NOT NULL,
  nick          TEXT DEFAULT '',
  role          TEXT DEFAULT 'member',
  content       TEXT NOT NULL DEFAULT '',
  parent_id     BIGINT DEFAULT NULL,
  created_at    TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE class_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "class_comments_select_all" ON class_comments FOR SELECT USING (true);
CREATE POLICY "class_comments_write_all" ON class_comments FOR ALL USING (true);

-- ── classes 테이블에 난이도/수강기간 컬럼 추가 ──────────────────
ALTER TABLE classes ADD COLUMN IF NOT EXISTS difficulty TEXT DEFAULT '입문';
ALTER TABLE classes ADD COLUMN IF NOT EXISTS duration_info TEXT DEFAULT '무제한';

-- ── 완료 ────────────────────────────────────────────────────────
-- 위 SQL 실행 후 사이트를 새로고침하면 적용됩니다.
