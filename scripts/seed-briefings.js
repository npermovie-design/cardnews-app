/*
 * seed-briefings.js
 * 30일치 SNS 브리핑 시드 데이터를 Supabase posts 테이블에 삽입
 *
 * 사용법:
 *   SUPABASE_URL=https://xxx.supabase.co SUPABASE_KEY=eyJ... node scripts/seed-briefings.js
 *
 * 또는 .env 파일이 있으면 자동 로드
 */

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_KEY || "";

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ SUPABASE_URL, SUPABASE_KEY 환경변수를 설정해주세요.");
  console.error("   예: SUPABASE_URL=https://xxx.supabase.co SUPABASE_KEY=eyJ... node scripts/seed-briefings.js");
  process.exit(1);
}

// ── 30일치 브리핑 데이터 ──────────────────────────────────────────
function generateBriefings() {
  const topics = [
    {
      items: [
        { title: "인스타그램 릴스 알고리즘 변경, 노출 전략 바뀐다", content: "인스타그램이 릴스 추천 알고리즘을 대폭 업데이트했다. 기존에는 조회수 중심이었지만, 이제는 시청 완료율과 공유 횟수가 핵심 지표로 부상했다. 특히 15초 이하 짧은 릴스보다 30~60초 릴스의 도달률이 평균 40% 높아졌다는 분석이 나왔다.\n📎 관련 키워드: #릴스알고리즘 #인스타마케팅 #SNS전략" },
        { title: "틱톡 쇼핑 기능 한국 정식 출시 임박", content: "틱톡이 한국 시장에 쇼핑 기능을 정식 도입할 예정이다. 라이브 커머스와 숏폼 내 상품 태깅이 가능해지며, 크리에이터와 브랜드 간 직접 거래가 활성화될 전망이다. 이미 동남아 시장에서 월 거래액 1조원을 돌파한 바 있다.\n📎 관련 키워드: #틱톡쇼핑 #라이브커머스 #소셜커머스" },
        { title: "AI 이미지 생성 도구, SNS 콘텐츠 제작 패러다임 전환", content: "Midjourney, DALL-E 등 AI 이미지 생성 도구의 품질이 급격히 향상되면서 SNS 콘텐츠 제작 방식이 크게 변화하고 있다. 소규모 브랜드도 고품질 비주얼 콘텐츠를 빠르게 제작할 수 있게 되면서, 콘텐츠 경쟁력의 핵심이 비주얼에서 스토리텔링으로 이동하고 있다.\n📎 관련 키워드: #AI콘텐츠 #이미지생성 #콘텐츠마케팅" },
        { title: "유튜브 쇼츠 수익화 정책 업데이트", content: "유튜브가 쇼츠 크리에이터를 위한 수익화 모델을 개선했다. 쇼츠 광고 수익 배분율이 기존 45%에서 50%로 상향되었고, 구독자 1000명 미만 채널도 쇼츠 펀드를 통해 수익을 얻을 수 있는 길이 열렸다.\n📎 관련 키워드: #유튜브쇼츠 #크리에이터수익 #숏폼" },
        { title: "네이버 블로그, AI 검색 최적화가 새로운 SEO", content: "네이버의 AI 검색 '큐(Cue)' 도입 이후 블로그 유입 패턴이 크게 달라지고 있다. AI가 요약 답변을 제공하면서 클릭률이 변화했고, 전문성 있는 심층 콘텐츠가 AI 답변 출처로 선택되는 비율이 높아지고 있다.\n📎 관련 키워드: #네이버SEO #AI검색 #블로그마케팅" },
      ]
    },
    {
      items: [
        { title: "스레드(Threads) MAU 2억 돌파, 브랜드 마케팅 채널로 급부상", content: "메타의 텍스트 기반 SNS 스레드의 월간 활성 사용자가 2억명을 넘어섰다. 특히 한국에서는 Z세대 사용자가 급증하며, 브랜드들이 스레드 전용 콘텐츠 전략을 수립하기 시작했다. 캐주얼한 톤의 짧은 텍스트 콘텐츠가 높은 참여율을 보이고 있다.\n📎 관련 키워드: #스레드 #텍스트SNS #브랜드마케팅" },
        { title: "인플루언서 마케팅 시장 30조원 규모 전망", content: "글로벌 인플루언서 마케팅 시장이 올해 30조원 규모에 이를 것으로 전망된다. 특히 마이크로 인플루언서(팔로워 1만~10만)의 ROI가 메가 인플루언서 대비 3배 높다는 데이터가 발표되면서, 중소기업의 인플루언서 마케팅 투자가 늘고 있다.\n📎 관련 키워드: #인플루언서마케팅 #마이크로인플루언서 #ROI" },
        { title: "카카오톡 채널 메시지 광고 효율 극대화 팁", content: "카카오톡 채널 메시지의 평균 열람률이 70%를 넘는 것으로 조사됐다. 특히 개인화된 메시지와 시간대별 발송 최적화를 적용한 브랜드의 경우 전환율이 평균 대비 2.5배 높았다. 오전 10시와 오후 8시가 최적 발송 시간대로 분석됐다.\n📎 관련 키워드: #카카오채널 #메시지마케팅 #전환율" },
        { title: "숏폼 콘텐츠 SEO 최적화, 검색에서도 발견되는 숏폼", content: "구글과 네이버 검색 결과에 숏폼 영상이 상위 노출되는 사례가 급증하고 있다. 영상 제목, 설명, 해시태그에 검색 키워드를 전략적으로 배치하면 검색 유입을 2~3배 늘릴 수 있다는 분석이 나왔다.\n📎 관련 키워드: #숏폼SEO #검색최적화 #영상마케팅" },
        { title: "소셜 미디어 자동화 도구 트렌드 2026", content: "SNS 자동화 도구 시장이 전년 대비 45% 성장했다. AI 기반 콘텐츠 생성, 최적 게시 시간 자동 분석, 멀티 플랫폼 동시 게시 등의 기능이 핵심이다. 특히 AI가 브랜드 톤앤매너를 학습해 자동으로 콘텐츠를 생성하는 기능이 주목받고 있다.\n📎 관련 키워드: #SNS자동화 #마케팅자동화 #AI마케팅" },
      ]
    },
    {
      items: [
        { title: "페이스북 광고 비용 상승, 대안 채널은?", content: "페이스북 광고 CPM이 전년 대비 25% 상승하면서 중소 브랜드들의 부담이 커지고 있다. 대안으로 핀터레스트, 스레드, 카카오 비즈보드 등이 떠오르고 있으며, 특히 핀터레스트의 쇼핑 광고 ROAS가 페이스북 대비 1.8배 높다는 데이터가 주목받고 있다.\n📎 관련 키워드: #페이스북광고 #광고비용 #대안채널" },
        { title: "UGC(사용자 생성 콘텐츠) 마케팅 효과 검증", content: "브랜드가 직접 제작한 콘텐츠보다 UGC의 전환율이 평균 4.5배 높다는 조사 결과가 발표됐다. 특히 실제 구매 후기, 언박싱 영상, 비포&애프터 콘텐츠의 신뢰도가 가장 높았다. UGC 수집과 활용을 체계화하는 것이 핵심 과제로 떠올랐다.\n📎 관련 키워드: #UGC #사용자콘텐츠 #소셜프루프" },
        { title: "링크드인 한국 사용자 500만 돌파, B2B 마케팅 필수 채널", content: "링크드인의 한국 사용자가 500만명을 넘어서면서 B2B 마케팅의 핵심 채널로 자리잡고 있다. 특히 사고 리더십(Thought Leadership) 콘텐츠의 참여율이 일반 게시물 대비 5배 높으며, 뉴스레터 기능 활용이 급증하고 있다.\n📎 관련 키워드: #링크드인 #B2B마케팅 #사고리더십" },
        { title: "커뮤니티 마케팅의 부상, 브랜드 커뮤니티 구축법", content: "일방적 광고보다 커뮤니티 기반 마케팅의 효과가 입증되면서, 자체 커뮤니티를 구축하는 브랜드가 늘고 있다. 디스코드, 카카오 오픈채팅, 네이버 카페 등을 활용한 커뮤니티의 고객 유지율이 일반 고객 대비 2배 이상 높다.\n📎 관련 키워드: #커뮤니티마케팅 #브랜드커뮤니티 #고객유지" },
        { title: "개인정보 보호 강화에 따른 SNS 광고 타겟팅 변화", content: "쿠키리스 시대가 본격화되면서 SNS 광고 타겟팅 방식이 바뀌고 있다. 1st Party 데이터 수집과 활용이 핵심이 되었고, 맥락 타겟팅(Contextual Targeting)이 기존 행동 타겟팅을 빠르게 대체하고 있다.\n📎 관련 키워드: #개인정보보호 #광고타겟팅 #쿠키리스" },
      ]
    },
    {
      items: [
        { title: "인스타그램 노트(Notes) 기능 마케팅 활용법", content: "인스타그램 노트 기능을 마케팅에 활용하는 브랜드가 늘고 있다. 24시간 한정 텍스트 메시지로 DM 상단에 노출되어 친밀감을 높일 수 있다. 특히 신제품 출시 힌트, 한정 프로모션 알림 등에 효과적이며, DM 응답률이 스토리 대비 3배 높다.\n📎 관련 키워드: #인스타노트 #DM마케팅 #인게이지먼트" },
        { title: "AI 챗봇 기반 고객 응대, SNS DM 자동화", content: "AI 챗봇을 SNS DM에 연동하는 브랜드가 급증하고 있다. 인스타그램, 카카오톡 등의 DM에 AI 자동 응답을 설정하면 응답 시간이 평균 2분 이내로 단축되고, 전환율은 35% 향상됐다는 조사 결과가 나왔다.\n📎 관련 키워드: #AI챗봇 #DM자동화 #고객응대" },
        { title: "소셜 커머스 라이브 방송, 매출 극대화 전략", content: "라이브 커머스 시장이 올해 10조원 규모로 성장할 전망이다. 성공적인 라이브 방송의 핵심은 사전 티저 콘텐츠(3일 전부터), 실시간 할인 쿠폰, 시청자 참여 이벤트 3가지로 분석됐다. 평균 시청 시간이 15분을 넘으면 구매 전환율이 급격히 상승한다.\n📎 관련 키워드: #라이브커머스 #소셜커머스 #라이브방송" },
        { title: "Z세대의 SNS 사용 패턴 변화", content: "Z세대의 SNS 사용 패턴이 공개형에서 프라이빗으로 이동하고 있다. 인스타그램 '친한 친구' 스토리, 비공개 계정, 소규모 그룹 채팅 중심으로 활동이 옮겨가면서, 브랜드의 접근 전략도 변화가 필요하다.\n📎 관련 키워드: #Z세대 #프라이빗SNS #마케팅전략" },
        { title: "콘텐츠 리퍼포징 전략, 하나의 콘텐츠로 10배 효과", content: "하나의 원본 콘텐츠를 여러 플랫폼에 맞게 변환하는 리퍼포징 전략이 주목받고 있다. 블로그 글을 카드뉴스, 릴스, 쇼츠, 스레드 게시물, 뉴스레터로 변환하면 제작 시간은 70% 줄이고 도달률은 10배 높일 수 있다.\n📎 관련 키워드: #리퍼포징 #콘텐츠전략 #멀티플랫폼" },
      ]
    },
    {
      items: [
        { title: "네이버 스마트스토어 + SNS 연동 매출 상승 사례", content: "네이버 스마트스토어와 인스타그램을 연동한 소상공인의 매출이 평균 180% 상승한 것으로 나타났다. 인스타그램에서 상품 태그를 활용해 스마트스토어로 유입시키는 전략이 가장 효과적이었으며, 릴스를 통한 상품 소개 영상의 전환율이 가장 높았다.\n📎 관련 키워드: #스마트스토어 #인스타연동 #소셜커머스" },
        { title: "해시태그 전략 2026, 변화하는 검색 환경 대응", content: "인스타그램과 틱톡에서 해시태그의 역할이 변하고 있다. 인스타그램은 키워드 검색이 강화되면서 해시태그보다 캡션 내 자연어 키워드가 중요해졌고, 틱톡은 3~5개의 핵심 해시태그가 최적이라는 분석이 나왔다.\n📎 관련 키워드: #해시태그전략 #SNS검색 #키워드최적화" },
        { title: "브랜드 스토리텔링, 감정을 파는 시대", content: "제품 기능을 나열하는 광고보다 브랜드 스토리를 담은 콘텐츠의 공유율이 22배 높다는 연구 결과가 발표됐다. 특히 창업 스토리, 고객 성공 사례, 팀 일상 등 진정성 있는 콘텐츠가 Z세대와 밀레니얼 세대에게 강한 호응을 얻고 있다.\n📎 관련 키워드: #브랜드스토리 #스토리텔링 #진정성마케팅" },
        { title: "이메일 마케팅과 SNS의 시너지 전략", content: "이메일 마케팅과 SNS를 결합한 옴니채널 전략의 ROI가 단독 채널 대비 2.8배 높은 것으로 나타났다. SNS에서 리드를 수집하고, 이메일로 너처링한 뒤, 다시 SNS 리타겟팅으로 전환하는 퍼널이 가장 효과적이다.\n📎 관련 키워드: #이메일마케팅 #옴니채널 #마케팅퍼널" },
        { title: "SNS 마케팅 성과 측정, 핵심 KPI 재정립", content: "팔로워 수와 좋아요 수 중심의 허영 지표(Vanity Metrics)에서 벗어나, 저장 수, 공유 수, DM 문의 수 등 실질적 전환 지표 중심으로 KPI를 재설정하는 브랜드가 늘고 있다. 특히 저장 수가 높은 콘텐츠일수록 실제 구매로 이어지는 비율이 높았다.\n📎 관련 키워드: #마케팅KPI #성과측정 #전환지표" },
      ]
    },
    {
      items: [
        { title: "핀터레스트 마케팅 재조명, 검색형 SNS의 강점", content: "핀터레스트가 검색형 SNS로서 재조명받고 있다. 핀의 평균 수명이 4개월로 인스타그램 게시물(48시간) 대비 압도적으로 길며, 구매 의도가 높은 사용자가 많아 이커머스 전환율이 타 SNS 대비 2.3배 높다.\n📎 관련 키워드: #핀터레스트 #검색형SNS #이커머스" },
        { title: "AI 기반 SNS 분석 도구로 경쟁사 전략 파악", content: "AI 기반 소셜 리스닝 도구가 진화하면서 경쟁사의 SNS 전략을 실시간으로 분석할 수 있게 됐다. 게시 빈도, 콘텐츠 유형, 참여율, 광고 집행 패턴까지 자동 분석해 인사이트를 제공하는 도구들이 마케터 사이에서 필수 도구로 자리잡고 있다.\n📎 관련 키워드: #소셜리스닝 #경쟁분석 #AI분석" },
        { title: "카카오 비즈니스 채널 리뉴얼, 새로운 기능 총정리", content: "카카오가 비즈니스 채널을 대폭 리뉴얼했다. AI 자동 응답, 예약 메시지, 고객 세그먼트별 타겟 메시지, 쿠폰 발행 등 새로운 기능이 추가됐다. 특히 AI 챗봇 연동이 간편해져 소규모 사업자도 24시간 고객 응대가 가능해졌다.\n📎 관련 키워드: #카카오비즈 #채널리뉴얼 #비즈니스채널" },
        { title: "인스타그램 콜라보 게시물, 도달률 2배 상승 비결", content: "인스타그램의 콜라보 게시물 기능을 활용한 브랜드의 평균 도달률이 단독 게시물 대비 2배 이상 높은 것으로 나타났다. 서로 다른 타겟을 가진 브랜드 간 콜라보, 브랜드와 인플루언서 간 콜라보 게시물이 특히 효과적이다.\n📎 관련 키워드: #콜라보게시물 #인스타도달 #협업마케팅" },
        { title: "동영상 자막의 중요성, 무음 시청 시대", content: "SNS 동영상의 85%가 무음으로 시청된다는 조사 결과가 나왔다. 자막이 있는 영상의 시청 완료율이 없는 영상 대비 80% 높으며, 특히 릴스와 쇼츠에서 자막 추가 시 참여율이 평균 40% 상승한다.\n📎 관련 키워드: #자막 #무음시청 #동영상마케팅" },
      ]
    },
  ];

  const briefings = [];
  const today = new Date();

  for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
    const d = new Date(today);
    d.setDate(d.getDate() - dayOffset);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const dateKey = `${yyyy}-${mm}-${dd}`;
    const dateLabel = `${yyyy}.${mm}.${dd}`;

    // 6개 토픽 세트 중 순환 선택
    const topicSet = topics[dayOffset % topics.length];
    const content = topicSet.items
      .map((item, idx) => `## ${idx + 1}. ${item.title}\n${item.content}`)
      .join("\n\n");

    briefings.push({
      id: `briefing_${dateKey}`,
      title: `${dateLabel} 엔퍼SNS브리핑`,
      content,
      author: "엔퍼 AI",
      author_uid: "system_ai",
      cat: "sns_briefing",
      tag: "",
      subCat: "sns_briefing",
      views: Math.floor(Math.random() * 50) + 10,
      likes: Math.floor(Math.random() * 10),
      created_at: d.toISOString(),
      images: [],
      comments: [],
    });
  }

  return briefings;
}

// ── Supabase REST API로 직접 삽입 ─────────────────────────────────
async function seedBriefings() {
  const briefings = generateBriefings();
  console.log(`\n📰 ${briefings.length}개 브리핑 데이터 삽입 시작...\n`);

  let success = 0;
  let skipped = 0;
  let failed = 0;

  // 배치로 upsert (5개씩)
  const batchSize = 5;
  for (let i = 0; i < briefings.length; i += batchSize) {
    const batch = briefings.slice(i, i + batchSize);

    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/posts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            Prefer: "resolution=merge-duplicates",
          },
          body: JSON.stringify(batch),
        }
      );

      if (res.ok) {
        success += batch.length;
        batch.forEach(b => console.log(`  ✅ ${b.title}`));
      } else if (res.status === 409) {
        skipped += batch.length;
        batch.forEach(b => console.log(`  ⏭️  ${b.title} (이미 존재)`));
      } else {
        const errText = await res.text();
        // 개별 삽입 시도
        for (const item of batch) {
          try {
            const r2 = await fetch(`${SUPABASE_URL}/rest/v1/posts`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                apikey: SUPABASE_KEY,
                Authorization: `Bearer ${SUPABASE_KEY}`,
                Prefer: "resolution=merge-duplicates",
              },
              body: JSON.stringify(item),
            });
            if (r2.ok) {
              success++;
              console.log(`  ✅ ${item.title}`);
            } else if (r2.status === 409) {
              skipped++;
              console.log(`  ⏭️  ${item.title} (이미 존재)`);
            } else {
              failed++;
              console.log(`  ❌ ${item.title} - ${r2.status}`);
            }
          } catch (e) {
            failed++;
            console.log(`  ❌ ${item.title} - ${e.message}`);
          }
        }
      }
    } catch (e) {
      failed += batch.length;
      console.error(`  ❌ 배치 오류: ${e.message}`);
    }
  }

  console.log(`\n──────────────────────────────`);
  console.log(`✅ 성공: ${success}개`);
  console.log(`⏭️  건너뜀: ${skipped}개`);
  console.log(`❌ 실패: ${failed}개`);
  console.log(`총: ${briefings.length}개\n`);
}

seedBriefings().catch(console.error);
