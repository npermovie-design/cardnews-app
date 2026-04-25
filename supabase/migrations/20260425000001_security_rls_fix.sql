-- 보안 수정 마이그레이션 2026-04-25
DO $do$
DECLARE t TEXT;
BEGIN

  -- 관리자 체크 헬퍼 함수
  EXECUTE '
    CREATE OR REPLACE FUNCTION public.is_admin()
    RETURNS BOOLEAN AS $f1$
      SELECT EXISTS (SELECT 1 FROM public.users WHERE uid = auth.uid()::text AND role = ''admin'');
    $f1$ LANGUAGE sql SECURITY DEFINER STABLE';

  -- 포인트 원자적 변경 RPC
  EXECUTE '
    CREATE OR REPLACE FUNCTION public.change_points_atomic(
      p_uid TEXT, p_delta INT, p_reason TEXT DEFAULT ''''
    ) RETURNS INT AS $f2$
    DECLARE current_pts INT; new_pts INT;
    BEGIN
      SELECT points INTO current_pts FROM public.users WHERE uid = p_uid FOR UPDATE;
      IF NOT FOUND THEN RAISE EXCEPTION ''User not found''; END IF;
      IF p_delta < 0 AND current_pts < abs(p_delta) THEN RETURN current_pts; END IF;
      new_pts := GREATEST(0, current_pts + p_delta);
      UPDATE public.users SET points = new_pts WHERE uid = p_uid;
      INSERT INTO public.point_history (uid, delta, reason, balance, created_at)
        VALUES (p_uid, p_delta, p_reason, new_pts, NOW());
      RETURN new_pts;
    END;
    $f2$ LANGUAGE plpgsql SECURITY DEFINER';

  -- 1. point_history (F-001 CRITICAL)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='point_history') THEN
    EXECUTE 'ALTER TABLE public.point_history ENABLE ROW LEVEL SECURITY';
    FOR t IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='point_history' LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.point_history', t);
    END LOOP;
    EXECUTE 'CREATE POLICY "point_history_select_own" ON public.point_history FOR SELECT TO authenticated USING (auth.uid()::text = uid)';
    EXECUTE 'CREATE POLICY "point_history_insert_own" ON public.point_history FOR INSERT TO authenticated WITH CHECK (auth.uid()::text = uid)';
    EXECUTE 'CREATE POLICY "point_history_no_update" ON public.point_history FOR UPDATE TO authenticated USING (false)';
    EXECUTE 'CREATE POLICY "point_history_no_delete" ON public.point_history FOR DELETE TO authenticated USING (false)';
    EXECUTE 'CREATE POLICY "point_history_admin_select" ON public.point_history FOR SELECT TO authenticated USING (public.is_admin())';
    RAISE NOTICE 'point_history RLS applied';
  END IF;

  -- 2. payment_history
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='payment_history') THEN
    EXECUTE 'ALTER TABLE public.payment_history ADD COLUMN IF NOT EXISTS payment_key TEXT';
    EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_history_payment_key ON public.payment_history(payment_key) WHERE payment_key IS NOT NULL';
    EXECUTE 'ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY';
    FOR t IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='payment_history' LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.payment_history', t);
    END LOOP;
    EXECUTE 'CREATE POLICY "payment_history_select_own" ON public.payment_history FOR SELECT TO authenticated USING (auth.uid()::text = uid)';
    EXECUTE 'CREATE POLICY "payment_history_no_client_insert" ON public.payment_history FOR INSERT TO authenticated WITH CHECK (false)';
    EXECUTE 'CREATE POLICY "payment_history_no_update" ON public.payment_history FOR UPDATE TO authenticated USING (false)';
    EXECUTE 'CREATE POLICY "payment_history_no_delete" ON public.payment_history FOR DELETE TO authenticated USING (false)';
    EXECUTE 'CREATE POLICY "payment_history_admin_select" ON public.payment_history FOR SELECT TO authenticated USING (public.is_admin())';
    RAISE NOTICE 'payment_history RLS applied';
  END IF;

  -- 3. inquiries
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='inquiries') THEN
    FOR t IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='inquiries' LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.inquiries', t);
    END LOOP;
    EXECUTE 'CREATE POLICY "inquiries_insert_open" ON public.inquiries FOR INSERT WITH CHECK (true)';
    EXECUTE 'CREATE POLICY "inquiries_select_admin" ON public.inquiries FOR SELECT TO authenticated USING (public.is_admin())';
    EXECUTE 'CREATE POLICY "inquiries_update_admin" ON public.inquiries FOR UPDATE TO authenticated USING (public.is_admin())';
    EXECUTE 'CREATE POLICY "inquiries_delete_admin" ON public.inquiries FOR DELETE TO authenticated USING (public.is_admin())';
    RAISE NOTICE 'inquiries RLS applied';
  END IF;

  -- 4. posts
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='posts') THEN
    FOR t IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='posts' LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.posts', t);
    END LOOP;
    EXECUTE 'CREATE POLICY "posts_select_all" ON public.posts FOR SELECT USING (true)';
    EXECUTE 'CREATE POLICY "posts_insert_own" ON public.posts FOR INSERT TO authenticated WITH CHECK (auth.uid()::text = author_uid)';
    EXECUTE 'CREATE POLICY "posts_update_own" ON public.posts FOR UPDATE TO authenticated USING (auth.uid()::text = author_uid OR public.is_admin())';
    EXECUTE 'CREATE POLICY "posts_delete_own" ON public.posts FOR DELETE TO authenticated USING (auth.uid()::text = author_uid OR public.is_admin())';
    RAISE NOTICE 'posts RLS applied';
  END IF;

  -- 5. insta_dm_campaigns
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='insta_dm_campaigns') THEN
    FOR t IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='insta_dm_campaigns' LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.insta_dm_campaigns', t);
    END LOOP;
    EXECUTE 'CREATE POLICY "insta_dm_campaigns_select_own" ON public.insta_dm_campaigns FOR SELECT TO authenticated USING (auth.uid()::text = uid)';
    EXECUTE 'CREATE POLICY "insta_dm_campaigns_insert_own" ON public.insta_dm_campaigns FOR INSERT TO authenticated WITH CHECK (auth.uid()::text = uid)';
    EXECUTE 'CREATE POLICY "insta_dm_campaigns_update_own" ON public.insta_dm_campaigns FOR UPDATE TO authenticated USING (auth.uid()::text = uid)';
    EXECUTE 'CREATE POLICY "insta_dm_campaigns_delete_own" ON public.insta_dm_campaigns FOR DELETE TO authenticated USING (auth.uid()::text = uid)';
    RAISE NOTICE 'insta_dm_campaigns RLS applied';
  END IF;

  -- 6. insta_dm_log
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='insta_dm_log') THEN
    FOR t IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='insta_dm_log' LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.insta_dm_log', t);
    END LOOP;
    EXECUTE 'CREATE POLICY "insta_dm_log_select_own" ON public.insta_dm_log FOR SELECT TO authenticated USING (auth.uid()::text = uid)';
    EXECUTE 'CREATE POLICY "insta_dm_log_insert_own" ON public.insta_dm_log FOR INSERT TO authenticated WITH CHECK (auth.uid()::text = uid)';
    EXECUTE 'CREATE POLICY "insta_dm_log_update_own" ON public.insta_dm_log FOR UPDATE TO authenticated USING (auth.uid()::text = uid)';
    EXECUTE 'CREATE POLICY "insta_dm_log_delete_own" ON public.insta_dm_log FOR DELETE TO authenticated USING (auth.uid()::text = uid)';
    RAISE NOTICE 'insta_dm_log RLS applied';
  END IF;

  -- 7. insta_reply_campaigns
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='insta_reply_campaigns') THEN
    FOR t IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='insta_reply_campaigns' LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.insta_reply_campaigns', t);
    END LOOP;
    EXECUTE 'CREATE POLICY "insta_reply_campaigns_select_own" ON public.insta_reply_campaigns FOR SELECT TO authenticated USING (auth.uid()::text = uid)';
    EXECUTE 'CREATE POLICY "insta_reply_campaigns_insert_own" ON public.insta_reply_campaigns FOR INSERT TO authenticated WITH CHECK (auth.uid()::text = uid)';
    EXECUTE 'CREATE POLICY "insta_reply_campaigns_update_own" ON public.insta_reply_campaigns FOR UPDATE TO authenticated USING (auth.uid()::text = uid)';
    EXECUTE 'CREATE POLICY "insta_reply_campaigns_delete_own" ON public.insta_reply_campaigns FOR DELETE TO authenticated USING (auth.uid()::text = uid)';
    RAISE NOTICE 'insta_reply_campaigns RLS applied';
  END IF;

  -- 8. shared_templates
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='shared_templates') THEN
    FOR t IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='shared_templates' LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.shared_templates', t);
    END LOOP;
    EXECUTE 'CREATE POLICY "shared_templates_select_all" ON public.shared_templates FOR SELECT USING (true)';
    EXECUTE 'CREATE POLICY "shared_templates_insert_auth" ON public.shared_templates FOR INSERT TO authenticated WITH CHECK (auth.uid()::text = user_id)';
    EXECUTE 'CREATE POLICY "shared_templates_update_own" ON public.shared_templates FOR UPDATE TO authenticated USING (auth.uid()::text = user_id OR public.is_admin())';
    EXECUTE 'CREATE POLICY "shared_templates_delete_own" ON public.shared_templates FOR DELETE TO authenticated USING (auth.uid()::text = user_id OR public.is_admin())';
    RAISE NOTICE 'shared_templates RLS applied';
  END IF;

  -- 9. videos
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='videos') THEN
    FOR t IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='videos' LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.videos', t);
    END LOOP;
    EXECUTE 'CREATE POLICY "videos_select_all" ON public.videos FOR SELECT USING (true)';
    EXECUTE 'CREATE POLICY "videos_insert_admin" ON public.videos FOR INSERT TO authenticated WITH CHECK (public.is_admin())';
    EXECUTE 'CREATE POLICY "videos_update_admin" ON public.videos FOR UPDATE TO authenticated USING (public.is_admin())';
    EXECUTE 'CREATE POLICY "videos_delete_admin" ON public.videos FOR DELETE TO authenticated USING (public.is_admin())';
    RAISE NOTICE 'videos RLS applied';
  END IF;

  -- 10. customer_cases
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='customer_cases') THEN
    FOR t IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='customer_cases' LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.customer_cases', t);
    END LOOP;
    EXECUTE 'CREATE POLICY "customer_cases_select_all" ON public.customer_cases FOR SELECT USING (true)';
    EXECUTE 'CREATE POLICY "customer_cases_insert_admin" ON public.customer_cases FOR INSERT TO authenticated WITH CHECK (public.is_admin())';
    EXECUTE 'CREATE POLICY "customer_cases_update_admin" ON public.customer_cases FOR UPDATE TO authenticated USING (public.is_admin())';
    EXECUTE 'CREATE POLICY "customer_cases_delete_admin" ON public.customer_cases FOR DELETE TO authenticated USING (public.is_admin())';
    RAISE NOTICE 'customer_cases RLS applied';
  END IF;

  -- 11. board_cats
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='board_cats') THEN
    FOR t IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='board_cats' LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.board_cats', t);
    END LOOP;
    EXECUTE 'CREATE POLICY "board_cats_select_all" ON public.board_cats FOR SELECT USING (true)';
    EXECUTE 'CREATE POLICY "board_cats_insert_admin" ON public.board_cats FOR INSERT TO authenticated WITH CHECK (public.is_admin())';
    EXECUTE 'CREATE POLICY "board_cats_update_admin" ON public.board_cats FOR UPDATE TO authenticated USING (public.is_admin())';
    EXECUTE 'CREATE POLICY "board_cats_delete_admin" ON public.board_cats FOR DELETE TO authenticated USING (public.is_admin())';
    RAISE NOTICE 'board_cats RLS applied';
  END IF;

  -- 12. board_tags
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='board_tags') THEN
    FOR t IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='board_tags' LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.board_tags', t);
    END LOOP;
    EXECUTE 'CREATE POLICY "board_tags_select_all" ON public.board_tags FOR SELECT USING (true)';
    EXECUTE 'CREATE POLICY "board_tags_insert_admin" ON public.board_tags FOR INSERT TO authenticated WITH CHECK (public.is_admin())';
    EXECUTE 'CREATE POLICY "board_tags_update_admin" ON public.board_tags FOR UPDATE TO authenticated USING (public.is_admin())';
    EXECUTE 'CREATE POLICY "board_tags_delete_admin" ON public.board_tags FOR DELETE TO authenticated USING (public.is_admin())';
    RAISE NOTICE 'board_tags RLS applied';
  END IF;

  -- 13. sns_news
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='sns_news') THEN
    FOR t IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='sns_news' LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.sns_news', t);
    END LOOP;
    EXECUTE 'CREATE POLICY "sns_news_select_all" ON public.sns_news FOR SELECT USING (true)';
    EXECUTE 'CREATE POLICY "sns_news_insert_admin" ON public.sns_news FOR INSERT TO authenticated WITH CHECK (public.is_admin())';
    EXECUTE 'CREATE POLICY "sns_news_delete_admin" ON public.sns_news FOR DELETE TO authenticated USING (public.is_admin())';
    RAISE NOTICE 'sns_news RLS applied';
  END IF;

END $do$;
