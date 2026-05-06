-- 출석체크 보상 폐지: 트리거 비활성화
-- attendance_grant_points: 출석 시 포인트 지급 트리거
-- attendance_enforce: 출석 규칙 강제 트리거
ALTER TABLE public.attendance_checks DISABLE TRIGGER attendance_grant_points;
ALTER TABLE public.attendance_checks DISABLE TRIGGER attendance_enforce;
