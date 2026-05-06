#!/bin/bash
# ============================================================================
# v2 핫픽스 적용 후 종합 검증 스크립트
# ============================================================================
# 실행 전: .env 파일 작성
#   SUPABASE_URL=https://ckzjnpzadeovrasucjmu.supabase.co
#   SUPABASE_ANON=<anon_key>
#   USER_JWT=<your_access_token>
#   MY_USER_ID=<your_uid>
#
# 사용:
#   chmod +x verify-all.sh
#   ./verify-all.sh
# ============================================================================

set -u
[ -f .env ] && source .env || { echo "❌ .env 없음"; exit 1; }

H_API="apikey: $SUPABASE_ANON"
H_AUTH="Authorization: Bearer $USER_JWT"
H_CT="Content-Type: application/json"
H_PREF="Prefer: return=representation"

PASS=0
FAIL=0
WARN=0

ok()  { echo "  ✅ $1"; PASS=$((PASS+1)); }
ng()  { echo "  🔴 $1"; FAIL=$((FAIL+1)); }
wn()  { echo "  ⚠️  $1"; WARN=$((WARN+1)); }

echo "════════════════════════════════════════════════════════════"
echo "SNS메이킷 v2 핫픽스 검증 — $(date)"
echo "════════════════════════════════════════════════════════════"
echo ""

# ========================================================================
# F-012 — points 컬럼 변경 차단
# ========================================================================
echo "[F-012] users.points 직접 UPDATE 차단"
RES=$(curl -s -X PATCH "$SUPABASE_URL/rest/v1/users?uid=eq.$MY_USER_ID" \
  -H "$H_API" -H "$H_AUTH" -H "$H_CT" -H "$H_PREF" \
  -d '{"points": 99999}')
if echo "$RES" | grep -qE "직접 변경할 수 없습니다|policy|violates row-level"; then
  ok "points UPDATE 차단됨"
else
  ng "points UPDATE 통과! 응답: $(echo $RES | head -c 200)"
fi
echo ""

# ========================================================================
# F-014 — role admin 변경 차단
# ========================================================================
echo "[F-014a] users.role 변경 차단"
RES=$(curl -s -X PATCH "$SUPABASE_URL/rest/v1/users?uid=eq.$MY_USER_ID" \
  -H "$H_API" -H "$H_AUTH" -H "$H_CT" -H "$H_PREF" \
  -d '{"role": "admin"}')
if echo "$RES" | grep -qE "변경할 수 없습니다|policy"; then
  ok "role UPDATE 차단됨"
else
  ng "role UPDATE 통과! 응답: $(echo $RES | head -c 200)"
  # 만약 통과됐으면 즉시 원복 시도
  curl -s -X PATCH "$SUPABASE_URL/rest/v1/users?uid=eq.$MY_USER_ID" \
    -H "$H_API" -H "$H_AUTH" -H "$H_CT" -d '{"role":"member"}' > /dev/null
fi
echo ""

# ========================================================================
# F-014 — RLS에서 role 검증 제거 확인 (admin 시나리오 시뮬 불가, 별도 확인)
# ========================================================================
echo "[F-014b] point_history SELECT는 본인만"
COUNT=$(curl -s "$SUPABASE_URL/rest/v1/point_history?select=uid" \
  -H "$H_API" -H "$H_AUTH" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(set(r['uid'] for r in d))) if isinstance(d,list) else print(0)")
if [ "$COUNT" = "1" ] || [ "$COUNT" = "0" ]; then
  ok "본인 행만 보임 ($COUNT 명)"
else
  ng "다른 사용자 ${COUNT}명 노출 (RLS 약함)"
fi
echo ""

# ========================================================================
# N-CRIT-2 — monthly_used 차단
# ========================================================================
echo "[N-CRIT-2] monthly_used 음수 변조 차단"
RES=$(curl -s -X PATCH "$SUPABASE_URL/rest/v1/users?uid=eq.$MY_USER_ID" \
  -H "$H_API" -H "$H_AUTH" -H "$H_CT" -H "$H_PREF" \
  -d '{"monthly_used": -99999}')
if echo "$RES" | grep -qE "RPC use_monthly_quota|변경할 수 없습니다"; then
  ok "monthly_used 차단됨"
else
  ng "monthly_used 통과!"
fi
echo ""

# ========================================================================
# F-013 — point_history INSERT 차단
# ========================================================================
echo "[F-013] point_history 직접 INSERT 차단"
RES=$(curl -s -X POST "$SUPABASE_URL/rest/v1/point_history" \
  -H "$H_API" -H "$H_AUTH" -H "$H_CT" -H "$H_PREF" \
  -d "{\"uid\":\"$MY_USER_ID\",\"delta\":1,\"reason\":\"v2 verify\",\"balance\":1}")
if echo "$RES" | grep -qE "violates row-level|policy|new row"; then
  ok "INSERT 차단됨"
else
  ng "INSERT 통과! 응답: $(echo $RES | head -c 200)"
  # 통과됐으면 정리 시도
  ID=$(echo "$RES" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d[0]['id']) if isinstance(d,list) and d else print('')" 2>/dev/null)
  [ -n "$ID" ] && curl -s -X DELETE "$SUPABASE_URL/rest/v1/point_history?id=eq.$ID" -H "$H_API" -H "$H_AUTH" > /dev/null
fi
echo ""

# ========================================================================
# N-CRIT-3 — change_points_atomic IDOR + 양수 차단
# ========================================================================
echo "[N-CRIT-3a] RPC IDOR 차단 (다른 사용자 uid)"
RES=$(curl -s -X POST "$SUPABASE_URL/rest/v1/rpc/change_points_atomic" \
  -H "$H_API" -H "$H_AUTH" -H "$H_CT" \
  -d '{"p_uid":"00000000-0000-0000-0000-000000000000","p_delta":-1,"p_reason":"verify"}')
if echo "$RES" | grep -qE "다른 사용자의 포인트를 변경할 수 없습니다"; then
  ok "IDOR 차단됨"
else
  ng "IDOR 통과! 응답: $(echo $RES | head -c 300)"
fi

echo "[N-CRIT-3b] RPC 양수 차단"
RES=$(curl -s -X POST "$SUPABASE_URL/rest/v1/rpc/change_points_atomic" \
  -H "$H_API" -H "$H_AUTH" -H "$H_CT" \
  -d "{\"p_uid\":\"$MY_USER_ID\",\"p_delta\":1,\"p_reason\":\"verify\"}")
if echo "$RES" | grep -qE "결제 시스템을 통해서만"; then
  ok "양수 차단됨"
else
  ng "양수 통과! 응답: $(echo $RES | head -c 200)"
fi
echo ""

# ========================================================================
# N-CRIT-4 — attendance_checks 임의 points 차단
# ========================================================================
echo "[N-CRIT-4] attendance_checks 임의 points INSERT 차단"
RES=$(curl -s -X POST "$SUPABASE_URL/rest/v1/attendance_checks" \
  -H "$H_API" -H "$H_AUTH" -H "$H_CT" -H "$H_PREF" \
  -d "{\"uid\":\"$MY_USER_ID\",\"check_date\":\"$(date +%F)\",\"points\":99999}")
if echo "$RES" | grep -qE 'duplicate|unique|violates'; then
  wn "오늘 출석체크 이미 존재 (테스트 어려움)"
else
  POINTS=$(echo "$RES" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d[0]['points']) if isinstance(d,list) and d else print('')" 2>/dev/null)
  if [ "$POINTS" = "99999" ]; then
    ng "points 99999로 INSERT 통과!"
  elif [ -n "$POINTS" ]; then
    ok "points 강제 1로 변환 (서버 결정값: $POINTS)"
  else
    ok "차단됨 또는 다른 응답: $(echo $RES | head -c 100)"
  fi
fi
echo ""

# ========================================================================
# N-CRIT-1 — cron 무인증 차단
# ========================================================================
echo "[N-CRIT-1] /api/seo cron 무인증 차단"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "https://snsmakeit.com/api/seo?action=cron-briefing" \
  -H "Content-Type: application/json" -d '{}')
if [ "$HTTP_CODE" = "401" ]; then
  ok "cron-briefing 401 (인증 필요)"
elif [ "$HTTP_CODE" = "200" ]; then
  ng "cron-briefing 무인증 통과 (HTTP $HTTP_CODE)"
else
  wn "cron-briefing HTTP $HTTP_CODE (예상과 다름)"
fi

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "https://snsmakeit.com/api/seo?action=cron-ai" \
  -H "Content-Type: application/json" -d '{}')
[ "$HTTP_CODE" = "401" ] && ok "cron-ai 401" || ng "cron-ai HTTP $HTTP_CODE"
echo ""

# ========================================================================
# N-HIGH-A2 — referral_code 무작위
# ========================================================================
echo "[N-HIGH-A2] referral_code 무작위화"
ACTUAL=$(curl -s "$SUPABASE_URL/rest/v1/users?select=referral_code&uid=eq.$MY_USER_ID" \
  -H "$H_API" -H "$H_AUTH" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d[0]['referral_code'])")
EXPECTED="MK$(echo $MY_USER_ID | tr -d '-' | tr 'a-f' 'A-F' | cut -c1-8)"
if [ "$ACTUAL" = "$EXPECTED" ]; then
  ng "referral_code가 uid 첫 8자: $ACTUAL"
else
  ok "referral_code 무작위 (uid와 무관): $ACTUAL"
fi
echo ""

# ========================================================================
# N-MED-2 — CSP 헤더
# ========================================================================
echo "[N-MED-2] CSP 헤더 설정"
CSP=$(curl -sI "https://snsmakeit.com/" | grep -i "content-security-policy" | head -1)
if [ -n "$CSP" ]; then
  ok "CSP 헤더 있음: $(echo $CSP | head -c 80)..."
else
  ng "CSP 헤더 없음"
fi
echo ""

# ========================================================================
# N-MED-3 — version-check 응답 변경 확인
# ========================================================================
echo "[N-MED-3] version-check 클라이언트 v 검증 약화 해제"
RESP_OLD=$(curl -s "https://snsmakeit.com/api/naverbot/version-check?v=0.0.1")
RESP_NEW=$(curl -s "https://snsmakeit.com/api/naverbot/version-check?v=999.0.0")
OK_OLD=$(echo "$RESP_OLD" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('ok'))" 2>/dev/null)
OK_NEW=$(echo "$RESP_NEW" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('ok'))" 2>/dev/null)
if [ "$OK_OLD" = "False" ] && [ "$OK_NEW" = "True" ]; then
  ng "여전히 클라이언트 v로 ok 결정 (v=0.0.1: false, v=999.0.0: true)"
else
  ok "version-check 응답 패턴 개선 (v=0.0.1: $OK_OLD, v=999.0.0: $OK_NEW)"
fi
echo ""

# ========================================================================
# 결과
# ========================================================================
echo "════════════════════════════════════════════════════════════"
echo "최종 결과"
echo "════════════════════════════════════════════════════════════"
echo "  ✅ 통과: $PASS"
echo "  🔴 실패: $FAIL"
echo "  ⚠️  경고: $WARN"
echo ""

if [ "$FAIL" = "0" ]; then
  echo "🎉 모든 핫픽스 정상 적용. 다음 단계:"
  echo "   1. 잔존 [PENTEST] point_history 데이터 정리 (보고서 섹션 7)"
  echo "   2. HIGH 수정 1주 내"
  echo "   3. 분기별 재점검"
  exit 0
else
  echo "⚠️ 미패치 항목 $FAIL건. 보고서의 해당 발견 항목 다시 확인."
  exit 1
fi
