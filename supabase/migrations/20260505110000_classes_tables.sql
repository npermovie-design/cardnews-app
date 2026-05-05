-- Classes main table
CREATE TABLE IF NOT EXISTS classes (
  id text PRIMARY KEY,
  title text NOT NULL DEFAULT '',
  "desc" text DEFAULT '',
  type text NOT NULL DEFAULT 'vod' CHECK (type IN ('vod', 'zoom', 'offline')),
  pricing text NOT NULL DEFAULT 'free' CHECK (pricing IN ('free', 'paid')),
  price integer DEFAULT 0,
  free_preview_count integer DEFAULT 2,
  member_visible_count integer DEFAULT 5,
  tags text[] DEFAULT '{}',
  thumbnail text DEFAULT '',
  intro_html text DEFAULT '',
  target_audience text DEFAULT '',
  process text DEFAULT '',
  notes text DEFAULT '',
  instructor_bio text DEFAULT '',
  instructor text DEFAULT '',
  instructor_uid text DEFAULT '',
  difficulty text DEFAULT '입문',
  duration_info text DEFAULT '무제한',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Class lessons (VOD)
CREATE TABLE IF NOT EXISTS class_lessons (
  id text PRIMARY KEY,
  class_id text NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  duration text DEFAULT '',
  video_src text DEFAULT '',
  is_free_preview boolean DEFAULT false,
  assignment_required boolean DEFAULT false,
  assignment_desc text DEFAULT '',
  "order" integer DEFAULT 0
);

-- Live schedules
CREATE TABLE IF NOT EXISTS class_live_schedules (
  id text PRIMARY KEY,
  class_id text NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  date timestamptz,
  title text DEFAULT '',
  duration text DEFAULT '60분',
  max_seats integer DEFAULT 30,
  enrolled integer DEFAULT 0
);

-- Student progress
CREATE TABLE IF NOT EXISTS class_progress (
  lesson_id text NOT NULL,
  uid text NOT NULL,
  class_id text NOT NULL,
  watched boolean DEFAULT false,
  assignment_submitted boolean DEFAULT false,
  assignment_file text DEFAULT '',
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (lesson_id, uid)
);

-- Subtitles (multilang)
CREATE TABLE IF NOT EXISTS class_subtitles (
  lesson_id text NOT NULL,
  lang text NOT NULL DEFAULT 'ko',
  subtitles jsonb DEFAULT '[]',
  PRIMARY KEY (lesson_id, lang)
);

-- Reviews
CREATE TABLE IF NOT EXISTS class_reviews (
  id text PRIMARY KEY DEFAULT 'cr_' || extract(epoch from now())::bigint::text,
  class_id text NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  uid text NOT NULL,
  nick text DEFAULT '',
  rating integer DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
  content text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  UNIQUE (class_id, uid)
);

-- Q&A comments
CREATE TABLE IF NOT EXISTS class_comments (
  id text PRIMARY KEY DEFAULT 'cc_' || extract(epoch from now())::bigint::text,
  class_id text NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  lesson_id text DEFAULT '',
  uid text NOT NULL,
  nick text DEFAULT '',
  role text DEFAULT 'member',
  content text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Student notes
CREATE TABLE IF NOT EXISTS class_notes (
  class_id text NOT NULL,
  lesson_id text NOT NULL,
  uid text NOT NULL,
  content text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (class_id, lesson_id, uid)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_class_lessons_class_id ON class_lessons(class_id);
CREATE INDEX IF NOT EXISTS idx_class_live_schedules_class_id ON class_live_schedules(class_id);
CREATE INDEX IF NOT EXISTS idx_class_progress_class_uid ON class_progress(class_id, uid);
CREATE INDEX IF NOT EXISTS idx_class_reviews_class_id ON class_reviews(class_id);
CREATE INDEX IF NOT EXISTS idx_class_comments_class_id ON class_comments(class_id);

-- RLS
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_live_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_subtitles ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_notes ENABLE ROW LEVEL SECURITY;

-- Public read for classes & lessons
CREATE POLICY "public_read" ON classes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public_read" ON class_lessons FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public_read" ON class_live_schedules FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public_read" ON class_subtitles FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public_read" ON class_reviews FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "public_read" ON class_comments FOR SELECT TO anon, authenticated USING (true);

-- Admin full access on classes/lessons/schedules
CREATE POLICY "admin_manage" ON classes FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.uid = auth.uid() AND profiles.role IN ('admin', 'instructor')));
CREATE POLICY "admin_manage" ON class_lessons FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.uid = auth.uid() AND profiles.role IN ('admin', 'instructor')));
CREATE POLICY "admin_manage" ON class_live_schedules FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.uid = auth.uid() AND profiles.role IN ('admin', 'instructor')));
CREATE POLICY "admin_manage" ON class_subtitles FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.uid = auth.uid() AND profiles.role IN ('admin', 'instructor')));

-- Users manage their own progress/notes/reviews/comments
CREATE POLICY "own_progress" ON class_progress FOR ALL TO authenticated USING (uid = auth.uid());
CREATE POLICY "own_notes" ON class_notes FOR ALL TO authenticated USING (uid = auth.uid());
CREATE POLICY "own_reviews" ON class_reviews FOR INSERT TO authenticated WITH CHECK (uid = auth.uid());
CREATE POLICY "delete_own_reviews" ON class_reviews FOR DELETE TO authenticated USING (uid = auth.uid());
CREATE POLICY "own_comments" ON class_comments FOR INSERT TO authenticated WITH CHECK (uid = auth.uid());
CREATE POLICY "delete_own_comments" ON class_comments FOR DELETE TO authenticated USING (uid = auth.uid());
