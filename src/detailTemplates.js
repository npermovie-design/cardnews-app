// DetailPageStudio - Section Templates (확장판)
// 원칙: 섹션별 20+ 템플릿, 각각 구조적으로 완전히 다른 레이아웃
// 흰색/크림 배경 + 검정 텍스트 기본, 세로형 디자인
// 참고자료 100+ 분석 기반 다양한 디자인 패턴

const T = (type, layout, bg, label, preview, elements) => ({ type, layout, bg_color: bg, label, preview, elements });
const txt = (role, content, opts = {}) => ({ type: "text", role, content, ...opts });
const badge = (content, bg = "#c9a961", color = "#fff") => ({ type: "badge", content, bg, color });

export const SECTION_TEMPLATES = {

  // ═══════════════════════════════════════════════════════════
  //  HERO — 메인 비주얼 (20개)
  // ═══════════════════════════════════════════════════════════
  hero: [
    // 1. 풀블리드 + 하단 그라데이션
    T("hero", "full_image", "#111", "풀블리드 그라데이션", "전체 이미지 + 하단 타이틀", [
      badge("BEST SELLER"), txt("subtitle", "고객이 인정한 최고의 품질", { fontSize: 14, color: "rgba(255,255,255,0.7)" }),
      txt("title", "프리미엄 유기농 제품", { fontSize: 42, fontWeight: "900", color: "#fff" }),
      txt("body", "엄선된 원재료로 만든 프리미엄 제품", { fontSize: 16, color: "rgba(255,255,255,0.7)" }),
    ]),
    // 2. 화이트 대형 타이포 (MILDO 스타일)
    T("hero", "centered_text", "#fff", "화이트 대형 타이포", "깨끗한 배경 + 초대형 제목", [
      txt("subtitle", "PREMIUM", { fontSize: 11, fontWeight: "700", color: "#999", letterSpacing: 4 }),
      txt("title", "특별한 순간을 위한 선택", { fontSize: 44, fontWeight: "900", color: "#1a1a1a" }),
      txt("body", "A moment of premium quality", { fontSize: 14, color: "#bbb" }),
    ]),
    // 3. 컬러 오버레이 히어로 (Honey Couple 스타일 — 배경 컬러+이미지 오버레이+대형 카피)
    T("hero", "color_overlay", "#dfc87a", "컬러 오버레이 히어로", "브랜드 컬러 오버레이 + 대형 센터 카피 + 설명문", [
      badge("HONEY COUPLE", "transparent", "rgba(255,255,255,0.7)"),
      txt("title", "발라도 발라도\n건조한 겨울 입술\n사도 사도 없어지는\n나의 립밤", { fontSize: 38, fontWeight: "900", color: "#fff" }),
      txt("body", "파머시의 베스트 셀러, 입술에 꿀 발라놓은 듯\n촉촉하게 만들어주는 허니 버터를\n달달한 구성으로 만나볼수 있는 기회!", { fontSize: 14, color: "rgba(255,255,255,0.85)", lineHeight: 1.8 }),
    ]),
    // 4. 세트 소개 히어로 (Honey Couple 하단 — 브랜드 테두리 박스+영문 서브+제품 이미지)
    T("hero", "set_intro", "#fff", "세트 소개 히어로", "화이트 + 브랜드 테두리 박스 + 영문 서브 + 하단 제품 이미지", [
      txt("title", "Honey Couple", { fontSize: 36, fontWeight: "300", color: "#1a1a1a", fontStyle: "italic", letterSpacing: 2 }),
      txt("subtitle", "HONEY BUTTER SET", { fontSize: 14, fontWeight: "600", color: "#999", letterSpacing: 3 }),
    ]),
    // 에코 히어로 + 특징바 + 3열 카드 (ROUTINE 스타일)
    T("hero", "eco_hero_features", "#a0b898", "에코 히어로 종합", "그린 그라데이션 + 브랜드+NEW + 대형타이틀 + 3열 특징바 + 3열 이미지카드", [
      badge("ROUTINE", "transparent", "rgba(255,255,255,0.8)"),
      txt("subtitle", "NEW ARRIVAL", { fontSize: 12, fontWeight: "600", color: "rgba(255,255,255,0.6)", letterSpacing: 2, fontStyle: "italic" }),
      txt("title", "친환경 해조류\n소재 티셔츠", { fontSize: 36, fontWeight: "900", color: "#fff" }),
      txt("body", "세대를 넘는 새로운 소재", { fontSize: 20, color: "rgba(255,255,255,0.85)", role_hint: "hero_sub" }),
      txt("body", "COOLMAX 기술 적용\n하루종일 쾌적한 착용감", { fontSize: 12, color: "rgba(255,255,255,0.6)", role_hint: "hero_desc" }),
      txt("body", "생분해성|환경 보호를 위한 자연 분해 소재", { role_hint: "feat_bar" }),
      txt("body", "시원한 촉감|피부 접촉 시 쿨링 효과", { role_hint: "feat_bar" }),
      txt("body", "에너지 절약|세탁 시 적은 물 사용 에코 프렌들리", { role_hint: "feat_bar" }),
      txt("body", "ECO FABRIC|해조류 소재 티셔츠", { role_hint: "detail_card" }),
      txt("body", "COOL TOUCH|쿨링 원단 클로즈업", { role_hint: "detail_card" }),
      txt("body", "TEXTURE|원단 텍스쳐 디테일", { role_hint: "detail_card" }),
    ]),
    // 5. 패턴 배경 룩북 히어로 (Amour Moier 스타일 — 컬러패턴+중앙이미지+좌우세로텍스트)
    T("hero", "pattern_lookbook", "#f0a0b0", "패턴 룩북 히어로", "브랜드 컬러 패턴 배경 + 중앙 이미지 + 좌우 세로 텍스트", [
      txt("subtitle", "Exclusive Brand", { fontSize: 11, fontWeight: "600", color: "rgba(255,255,255,0.7)", letterSpacing: 3, role_hint: "side_left" }),
      txt("title", "Amour moier", { fontSize: 28, fontWeight: "300", color: "#fff", fontStyle: "italic", letterSpacing: 2 }),
      txt("body", "New Arrivals 2024", { fontSize: 11, fontWeight: "600", color: "rgba(255,255,255,0.7)", letterSpacing: 3, role_hint: "side_right" }),
    ]),
    // 6. 컬렉션 소개 (다크 — 대형 세리프 타이틀+좌이미지+우설명)
    T("hero", "collection_intro", "#1a1a1a", "컬렉션 소개 (다크)", "다크 + 대형 세리프 브랜드명+컬렉션 타이틀 + 좌이미지 우설명", [
      txt("title", "AMOUR\nMOIER", { fontSize: 48, fontWeight: "900", color: "#fff", letterSpacing: -1 }),
      txt("subtitle", "THE 1ST COLLECTION", { fontSize: 48, fontWeight: "400", color: "rgba(255,255,255,0.5)", fontStyle: "italic" }),
      txt("body", "SPRING BLOSSOM", { fontSize: 13, fontWeight: "700", color: "rgba(255,255,255,0.5)", letterSpacing: 3, role_hint: "season" }),
      txt("body", "자연의 다양하고 아름다운 요소를 바탕으로 사람 스스로 부드럽고 편안하며 활력이 되는 패션을 만들어 실루엣에서 여성의 아름다운 바디라인을 조명합니다.", { fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.8 }),
    ]),
    // 7. 컬렉션 소개 (라이트)
    T("hero", "collection_intro", "#f9f6f2", "컬렉션 소개 (라이트)", "크림 + 대형 세리프 브랜드명 + 좌이미지 우설명", [
      txt("title", "AMOUR\nMOIER", { fontSize: 48, fontWeight: "900", color: "#1a1a1a", letterSpacing: -1 }),
      txt("subtitle", "THE 1ST COLLECTION", { fontSize: 48, fontWeight: "400", color: "#c08080", fontStyle: "italic" }),
      txt("body", "SPRING BLOSSOM", { fontSize: 13, fontWeight: "700", color: "#999", letterSpacing: 3, role_hint: "season" }),
      txt("body", "자연의 다양하고 아름다운 요소를 바탕으로 사람 스스로 부드럽고 편안하며 활력이 되는 패션을 만들어 실루엣에서 여성의 아름다운 바디라인을 조명합니다.", { fontSize: 13, color: "#777", lineHeight: 1.8 }),
    ]),
  ],

  // ═══════════════════════════════════════════════════════════
  //  PAIN POINTS — 고민/공감 (20개)
  // ═══════════════════════════════════════════════════════════
  pain_points: [
    // 1. 다크 글라스 카드
    T("pain_points", "centered_text", "#1a1a2e", "다크 글라스 카드", "다크 + 반투명 카드 그리드", [
      txt("title", "이런 고민 있으셨나요?", { fontSize: 28, fontWeight: "900", color: "#fff" }),
      txt("body", "매번 같은 결과에 실망", { fontWeight: "700", color: "#fff" }),
      txt("body", "기대했지만 달라진 게 없는 경험", { color: "rgba(255,255,255,0.5)" }),
      txt("body", "비용은 들지만 효과는 미미", { fontWeight: "700", color: "#fff" }),
      txt("body", "검증되지 않은 방법에 지침", { color: "rgba(255,255,255,0.5)" }),
    ]),
    // Q&A 말풍선형 (Ph.Drop 스타일 — Q말풍선+A말풍선+CTA헤드라인+제품이미지)
    T("pain_points", "qa_bubble", "#d5dce4", "Q&A 말풍선형", "블루그레이 + Q 흰말풍선 + A 네이비말풍선 + 큰따옴표 CTA + 제품이미지", [
      txt("title", "이제는\n[데일리 각질 케어]\n하세요!", { fontSize: 32, fontWeight: "400", color: "#1a1a1a" }),
      txt("body", "피부가 계속 거칠어져요.", { role_hint: "q_bubble" }),
      txt("body", "크림을 발라도 잘 흡수가 안되는 것 같아요.", { role_hint: "q_bubble" }),
      txt("body", "메이크업이 자꾸만 떠요.", { role_hint: "q_bubble" }),
      txt("body", "피부의 각질 케어가 제대로 이뤄지지 않았기 때문입니다.", { role_hint: "a_bubble" }),
    ]),
    // Q&A 말풍선형 (다크)
    T("pain_points", "qa_bubble", "#1a1e24", "Q&A 말풍선형 (다크)", "다크 + Q 말풍선 + A 말풍선 + CTA 헤드라인", [
      txt("title", "이제는\n[데일리 각질 케어]\n하세요!", { fontSize: 32, fontWeight: "400", color: "rgba(255,255,255,0.8)" }),
      txt("body", "피부가 계속 거칠어져요.", { role_hint: "q_bubble" }),
      txt("body", "크림을 발라도 잘 흡수가 안되는 것 같아요.", { role_hint: "q_bubble" }),
      txt("body", "메이크업이 자꾸만 떠요.", { role_hint: "q_bubble" }),
      txt("body", "피부의 각질 케어가 제대로 이뤄지지 않았기 때문입니다.", { role_hint: "a_bubble" }),
    ]),
    // 2. 화이트 숫자 데이터
    T("pain_points", "centered_text", "#fff", "화이트 숫자 데이터", "통계 숫자로 고민 시각화", [
      txt("title", "소비자 10명 중 8명이 겪는 문제", { fontSize: 30, fontWeight: "900", color: "#1a1a1a" }),
      txt("body", "83%가 품질에 불만족", { fontWeight: "700", color: "#1a1a1a" }),
      txt("body", "반복 구매 시 실망하는 비율이 높습니다", { color: "#888" }),
      txt("body", "76%가 성분 확인의 어려움 호소", { fontWeight: "700", color: "#1a1a1a" }),
    ]),
  ],

  // ═══════════════════════════════════════════════════════════
  //  FEATURES — 특장점 (20개)
  // ═══════════════════════════════════════════════════════════
  features: [
    // 지그재그 제품 쇼케이스 (레퍼런스 기반)
    T("features", "grid_2col", "#f8f8f8", "지그재그 쇼케이스", "Z자 교차 배치 + 컬러 스머지 배경 + 다이아몬드 패턴", [
      txt("subtitle", "피부 고민까지 동시 해결!", { fontSize: 14, fontWeight: "600", color: "#888" }),
      txt("title", "속 시원한 모공 청소", { fontSize: 36, fontWeight: "900", color: "#1a1a1a" }),
      txt("body", "제주 화산재 클레이", { fontWeight: "700", color: "#333" }), txt("body", "오리지널-포어 퍼펙션", { color: "#888" }),
      txt("body", "하와이안 핑크 클레이", { fontWeight: "700", color: "#333" }), txt("body", "핑크칼라민-카밍&헬씨", { color: "#888" }),
      txt("body", "그린 스크럽 클레이", { fontWeight: "700", color: "#333" }), txt("body", "민트티트리-쿨링&타이트닝", { color: "#888" }),
    ]),
    T("features", "grid_2col", "#fff", "2열 이미지 카드", "2열 카드 그리드", [
      txt("title", "왜 특별한가요?", { fontSize: 28, fontWeight: "900", color: "#1a1a1a" }),
      txt("body", "천연 원재료 100%", { fontWeight: "700", color: "#333" }), txt("body", "국내 최고 품질의 원재료만 엄선", { color: "#666" }),
      txt("body", "특허 받은 제조 공법", { fontWeight: "700", color: "#333" }), txt("body", "독자적 기술로 영양 손실 최소화", { color: "#666" }),
      txt("body", "엄격한 품질 관리", { fontWeight: "700", color: "#333" }), txt("body", "HACCP 인증, 매 로트 검사", { color: "#666" }),
      txt("body", "친환경 포장", { fontWeight: "700", color: "#333" }), txt("body", "재활용 가능한 소재 사용", { color: "#666" }),
    ]),
    // 제품소개 포인트형 (Clearly 스타일 — 중앙 제품 + 4포인트 배치)
    T("features", "center_product_4point", "#fff", "제품소개 포인트형", "중앙 제품 + 4포인트 사방 배치 + 큰따옴표 헤드라인", [
      txt("subtitle", "PRODUCT NAME", { fontSize: 13, fontWeight: "600", color: "#e8799a", letterSpacing: 1.5 }),
      txt("title", '상쾌한 [청량감]\n제품 이름', { fontSize: 34, fontWeight: "900", color: "#1a1a1a" }),
      txt("body", "청결유지", { fontWeight: "700", color: "#333", role_hint: "point_label" }),
      txt("body", "보습효과", { fontWeight: "700", color: "#333", role_hint: "point_label" }),
      txt("body", "피지억제", { fontWeight: "700", color: "#333", role_hint: "point_label" }),
      txt("body", "미백효과", { fontWeight: "700", color: "#333", role_hint: "point_label" }),
      txt("body", "피부 청결 및 미백 효과를 줄 수 있는 성분으로 피부를 청결하고 청량하게 유지시켜줍니다.", { fontSize: 15, color: "#666", lineHeight: 1.8 }),
    ]),
    // 제품소개 포인트형 (다크 버전)
    T("features", "center_product_4point", "#1a1520", "제품소개 포인트형 (다크)", "다크 + 중앙 제품 + 4포인트 사방 배치", [
      txt("subtitle", "PRODUCT NAME", { fontSize: 13, fontWeight: "600", color: "#e8799a", letterSpacing: 1.5 }),
      txt("title", '상쾌한 [청량감]\n제품 이름', { fontSize: 34, fontWeight: "900", color: "#fff" }),
      txt("body", "청결유지", { fontWeight: "700", color: "rgba(255,255,255,0.9)", role_hint: "point_label" }),
      txt("body", "보습효과", { fontWeight: "700", color: "rgba(255,255,255,0.9)", role_hint: "point_label" }),
      txt("body", "피지억제", { fontWeight: "700", color: "rgba(255,255,255,0.9)", role_hint: "point_label" }),
      txt("body", "미백효과", { fontWeight: "700", color: "rgba(255,255,255,0.9)", role_hint: "point_label" }),
      txt("body", "피부 청결 및 미백 효과를 줄 수 있는 성분으로 피부를 청결하고 청량하게 유지시켜줍니다.", { fontSize: 15, color: "rgba(255,255,255,0.5)", lineHeight: 1.8 }),
    ]),
  ],

  // ═══════════════════════════════════════════════════════════
  //  POINT — 상세 설명 (20개)
  // ═══════════════════════════════════════════════════════════
  point: [
    // 체크포인트형 (RUSTIQUE 스타일 — 브랜드+헤드라인+이미지+체크리스트 2컬럼)
    T("point", "checkpoint_list", "#fff", "체크포인트형", "브랜드 헤더 + 히어로 이미지 + 2컬럼 체크리스트", [
      txt("subtitle", "BRAND", { fontSize: 14, fontWeight: "600", color: "#999", letterSpacing: 4 }),
      txt("title", "천연 코코넛 유지로 만들어지는 [실키 버블]", { fontSize: 22, fontWeight: "400", color: "#333" }),
      txt("body", "비벼짤 필요도 풍성하고 촘촘한 거품을 볼 수 있어요!", { fontSize: 13, color: "#aaa", role_hint: "caption" }),
      txt("body", "코코넛 유지로 만든 비누의 좋은 점", { fontSize: 13, fontWeight: "700", color: "#999", role_hint: "col_title" }),
      txt("body", "피지, 노폐물을 제거하는 뛰어난 천연 세정력", { fontSize: 14, color: "#555", role_hint: "check" }),
      txt("body", "약한 비드로젤로 사용 후에도 당김없는 보습감", { fontSize: 14, color: "#555", role_hint: "check" }),
      txt("body", "일반 비누보다 피부 자극에 매우 적음", { fontSize: 14, color: "#555", role_hint: "check" }),
      txt("body", "오일 파우더의 프레스 공법으로 쉽게 무르지 않음", { fontSize: 14, color: "#555", role_hint: "check" }),
    ]),
    // 체크포인트형 (다크)
    T("point", "checkpoint_list", "#111", "체크포인트형 (다크)", "다크 + 브랜드 헤더 + 히어로 이미지 + 체크리스트", [
      txt("subtitle", "BRAND", { fontSize: 14, fontWeight: "600", color: "rgba(255,255,255,0.35)", letterSpacing: 4 }),
      txt("title", "천연 코코넛 유지로 만들어지는 [실키 버블]", { fontSize: 22, fontWeight: "400", color: "rgba(255,255,255,0.7)" }),
      txt("body", "비벼짤 필요도 풍성하고 촘촘한 거품을 볼 수 있어요!", { fontSize: 13, color: "rgba(255,255,255,0.3)", role_hint: "caption" }),
      txt("body", "코코넛 유지로 만든 비누의 좋은 점", { fontSize: 13, fontWeight: "700", color: "rgba(255,255,255,0.35)", role_hint: "col_title" }),
      txt("body", "피지, 노폐물을 제거하는 뛰어난 천연 세정력", { fontSize: 14, color: "rgba(255,255,255,0.6)", role_hint: "check" }),
      txt("body", "약한 비드로젤로 사용 후에도 당김없는 보습감", { fontSize: 14, color: "rgba(255,255,255,0.6)", role_hint: "check" }),
      txt("body", "일반 비누보다 피부 자극에 매우 적음", { fontSize: 14, color: "rgba(255,255,255,0.6)", role_hint: "check" }),
      txt("body", "오일 파우더의 프레스 공법으로 쉽게 무르지 않음", { fontSize: 14, color: "rgba(255,255,255,0.6)", role_hint: "check" }),
    ]),
    // 원재료 그리드형 (RUSTIQUE 스타일 — 4x2 원형 이미지 그리드)
    T("point", "ingredient_grid", "#fff", "원재료 그리드", "브랜드 헤더 + 정보박스 + 4열 원형 원재료 이미지 그리드", [
      txt("subtitle", "BRAND", { fontSize: 14, fontWeight: "600", color: "#999", letterSpacing: 4 }),
      txt("title", "페이스&바디 바 [제품 주원료]", { fontSize: 24, fontWeight: "400", color: "#333" }),
      txt("body", "천연재료를 통째로 갈아넣은 페이스&바디 바", { fontSize: 14, color: "#555", role_hint: "info_desc" }),
      txt("body", "카렌듈라|피부진정, 트러블케어", { role_hint: "ingredient" }),
      txt("body", "코코넛 오일|보습, 영양공급, 진정", { role_hint: "ingredient" }),
      txt("body", "장석 파우더|노폐물제거, 피지제거", { role_hint: "ingredient" }),
      txt("body", "씨드 오일|피부 보습, 트러블케어", { role_hint: "ingredient" }),
      txt("body", "참외인삼|노폐물, 독소배출", { role_hint: "ingredient" }),
      txt("body", "아마씨|오메가3지방산, 항산화", { role_hint: "ingredient" }),
      txt("body", "불가리안 로즈|항산화, 스킨소프너", { role_hint: "ingredient" }),
      txt("body", "장미수 오일|피부 보습, 톤업케어", { role_hint: "ingredient" }),
    ]),
    // 원재료 그리드형 (다크)
    T("point", "ingredient_grid", "#111", "원재료 그리드 (다크)", "다크 + 4열 원형 원재료 이미지 그리드", [
      txt("subtitle", "BRAND", { fontSize: 14, fontWeight: "600", color: "rgba(255,255,255,0.35)", letterSpacing: 4 }),
      txt("title", "페이스&바디 바 [제품 주원료]", { fontSize: 24, fontWeight: "400", color: "rgba(255,255,255,0.7)" }),
      txt("body", "천연재료를 통째로 갈아넣은 페이스&바디 바", { fontSize: 14, color: "rgba(255,255,255,0.5)", role_hint: "info_desc" }),
      txt("body", "카렌듈라|피부진정, 트러블케어", { role_hint: "ingredient" }),
      txt("body", "코코넛 오일|보습, 영양공급, 진정", { role_hint: "ingredient" }),
      txt("body", "장석 파우더|노폐물제거, 피지제거", { role_hint: "ingredient" }),
      txt("body", "씨드 오일|피부 보습, 트러블케어", { role_hint: "ingredient" }),
      txt("body", "참외인삼|노폐물, 독소배출", { role_hint: "ingredient" }),
      txt("body", "아마씨|오메가3지방산, 항산화", { role_hint: "ingredient" }),
      txt("body", "불가리안 로즈|항산화, 스킨소프너", { role_hint: "ingredient" }),
      txt("body", "장미수 오일|피부 보습, 톤업케어", { role_hint: "ingredient" }),
    ]),
    // 미니멀 제품 소개형 (EUNYUL 스타일 — 서브+대형타이틀+설명+제품이미지+4열 아이콘 특징)
    T("point", "minimal_product_features", "#f7f7f7", "미니멀 제품 소개", "서브타이틀+대형 헤드라인+설명+제품이미지+하단 4열 아이콘 특징", [
      txt("subtitle", "씻어낼 필요없는", { fontSize: 15, color: "#888" }),
      txt("title", "간편한 15분 팩", { fontSize: 36, fontWeight: "900", color: "#1a1a1a" }),
      txt("body", "세안 후에 사용하는 도포형 마스크 팩으로서 15~20분 간 방치 후 가볍게 떼어내면 모공 속 노폐물과 피지 등의 트러블을 유발하는 요소들이 깨끗하게 제거됩니다.", { fontSize: 14, color: "#777", lineHeight: 1.8 }),
      txt("body", "참숯의 흡착력과 피부 정화 효과", { fontSize: 13, fontWeight: "600", color: "#444", role_hint: "feature_item" }),
      txt("body", "저자극 자연유래 성분", { fontSize: 13, fontWeight: "600", color: "#444", role_hint: "feature_item" }),
      txt("body", "모공을 좁히고 깨끗하게", { fontSize: 13, fontWeight: "600", color: "#444", role_hint: "feature_item" }),
      txt("body", "화사하고 깨끗하게 뛰어난 피부 진정", { fontSize: 13, fontWeight: "600", color: "#444", role_hint: "feature_item" }),
    ]),
    // 미니멀 제품 소개형 (다크)
    T("point", "minimal_product_features", "#111", "미니멀 제품 소개 (다크)", "다크 + 서브타이틀+대형 헤드라인+제품이미지+4열 특징", [
      txt("subtitle", "씻어낼 필요없는", { fontSize: 15, color: "rgba(255,255,255,0.4)" }),
      txt("title", "간편한 15분 팩", { fontSize: 36, fontWeight: "900", color: "#fff" }),
      txt("body", "세안 후에 사용하는 도포형 마스크 팩으로서 15~20분 간 방치 후 가볍게 떼어내면 모공 속 노폐물과 피지 등의 트러블을 유발하는 요소들이 깨끗하게 제거됩니다.", { fontSize: 14, color: "rgba(255,255,255,0.45)", lineHeight: 1.8 }),
      txt("body", "참숯의 흡착력과 피부 정화 효과", { fontSize: 13, fontWeight: "600", color: "rgba(255,255,255,0.65)", role_hint: "feature_item" }),
      txt("body", "저자극 자연유래 성분", { fontSize: 13, fontWeight: "600", color: "rgba(255,255,255,0.65)", role_hint: "feature_item" }),
      txt("body", "모공을 좁히고 깨끗하게", { fontSize: 13, fontWeight: "600", color: "rgba(255,255,255,0.65)", role_hint: "feature_item" }),
      txt("body", "화사하고 깨끗하게 뛰어난 피부 진정", { fontSize: 13, fontWeight: "600", color: "rgba(255,255,255,0.65)", role_hint: "feature_item" }),
    ]),
    T("point", "left_image_right_text", "#fff", "좌 이미지 우 텍스트", "50:50 분할 — 왼쪽 사진+오른쪽", [
      txt("subtitle", "POINT 01", { fontSize: 12, fontWeight: "700", color: "#8B7355" }),
      txt("title", "차별화된 핵심 포인트", { fontSize: 28, fontWeight: "900", color: "#1a1a1a" }),
      txt("body", "다른 제품과는 차원이 다른 품질과 효과를 직접 경험해보세요.", { fontSize: 16, color: "#555", lineHeight: 1.8 }),
    ]),
    T("point", "full_image", "#111", "풀블리드 오버레이", "전체 이미지 위 하단 텍스트", [
      txt("subtitle", "HIGHLIGHT", { fontSize: 11, fontWeight: "700", color: "#c9a961" }),
      txt("title", "감각적인 비주얼", { fontSize: 32, fontWeight: "900", color: "#fff" }),
      txt("body", "모든 디테일에 정성을 담았습니다", { fontSize: 16, color: "rgba(255,255,255,0.7)" }),
    ]),
    // 포인트 성분 카드형 (연그레이 배경 + POINT 배지 + 헤드라인 + 둥근카드 2열 원형이미지)
    T("point", "point_ingredient_card", "#eef1f5", "포인트 성분 카드", "연그레이 + POINT 배지 + 헤드라인 + 둥근카드 내 2열 원형 성분 이미지", [
      txt("subtitle", "POINT 03", { fontSize: 14, fontWeight: "800", color: "#888", letterSpacing: 2 }),
      txt("title", "순한 안심 처방으로 내 피부는 맑음", { fontSize: 28, fontWeight: "900", color: "#1a1a1a" }),
      txt("body", "논나노 무기자차 성분과 마일드 처방으로 안심 사용\n미백/주름개선 기능으로 케어까지 OK", { fontSize: 15, color: "#777", lineHeight: 1.8 }),
      txt("body", "MultiEx BSASM|7가지 천연 식물 추출물함유", { role_hint: "ingredient_card" }),
      txt("body", "5중 히알루론산|무게의 6000배 수분을 끌어당기는 히알루론산을 피부 위 겹겹이 쌓아 강력한 보습/수분 유지", { role_hint: "ingredient_card" }),
    ]),
    // 제품 라인업 3열 (종근당 스타일 — 컬러 그라데이션 카드+말풍선+제품명+성분)
    T("point", "product_lineup", "#fff", "제품 라인업 3열", "헤드라인 + 3열 컬러 카드(말풍선+제품이미지) + 하단 제품명/성분", [
      txt("title", "종근당건강의 젤리 스틱 [NEW] 라인업", { fontSize: 24, fontWeight: "400", color: "#333" }),
      txt("body", "활기차고 가벼운 하루를 위한 한 포!|자몽나린진 스틱|스페인산 자몽혼합농축액 (자몽, 오렌지 과라나)|저분자 콜라겐 2,000mg|#f0b8b0,#e89888", { role_hint: "lineup_item" }),
      txt("body", "생기있는 자신감을 위한 진한 한 포!|석류콜라겐 스틱|스페인산 100% 석류농축액|저분자 콜라겐 1,200mg|#c0484a,#a03838", { role_hint: "lineup_item" }),
      txt("body", "무더운 여름 자기 전 한 포!|타트체리 스틱|미국산 몽모랑시 품종 타트체리|저분자 콜라겐 750mg|#6e2030,#4e1020", { role_hint: "lineup_item" }),
    ]),
    // 제품 라인업 3열 (다크)
    T("point", "product_lineup", "#111", "제품 라인업 3열 (다크)", "다크 + 3열 컬러 카드(말풍선+제품이미지)", [
      txt("title", "종근당건강의 젤리 스틱 [NEW] 라인업", { fontSize: 24, fontWeight: "400", color: "rgba(255,255,255,0.7)" }),
      txt("body", "활기차고 가벼운 하루를 위한 한 포!|자몽나린진 스틱|스페인산 자몽혼합농축액 (자몽, 오렌지 과라나)|저분자 콜라겐 2,000mg|#f0b8b0,#e89888", { role_hint: "lineup_item" }),
      txt("body", "생기있는 자신감을 위한 진한 한 포!|석류콜라겐 스틱|스페인산 100% 석류농축액|저분자 콜라겐 1,200mg|#c0484a,#a03838", { role_hint: "lineup_item" }),
      txt("body", "무더운 여름 자기 전 한 포!|타트체리 스틱|미국산 몽모랑시 품종 타트체리|저분자 콜라겐 750mg|#6e2030,#4e1020", { role_hint: "lineup_item" }),
    ]),
    // 포인트 성분 카드형 (다크)
    T("point", "point_ingredient_card", "#1a1e24", "포인트 성분 카드 (다크)", "다크 + POINT 배지 + 둥근카드 2열 원형 성분", [
      txt("subtitle", "POINT 03", { fontSize: 14, fontWeight: "800", color: "rgba(255,255,255,0.5)", letterSpacing: 2 }),
      txt("title", "순한 안심 처방으로 내 피부는 맑음", { fontSize: 28, fontWeight: "900", color: "#fff" }),
      txt("body", "논나노 무기자차 성분과 마일드 처방으로 안심 사용\n미백/주름개선 기능으로 케어까지 OK", { fontSize: 15, color: "rgba(255,255,255,0.45)", lineHeight: 1.8 }),
      txt("body", "MultiEx BSASM|7가지 천연 식물 추출물함유", { role_hint: "ingredient_card" }),
      txt("body", "5중 히알루론산|무게의 6000배 수분을 끌어당기는 히알루론산을 피부 위 겹겹이 쌓아 강력한 보습/수분 유지", { role_hint: "ingredient_card" }),
    ]),
  ],

  // ═══════════════════════════════════════════════════════════
  //  STATS — 스펙/통계 (10개)
  // ═══════════════════════════════════════════════════════════
  stats_highlight: [
    T("stats_highlight", "centered_text", "#1a1a2e", "다크 골드 3열", "다크 + 골드 대형 숫자 3개", [
      txt("title", "숫자로 증명합니다", { fontSize: 26, fontWeight: "900", color: "#fff" }),
      txt("stat_number", "4,200+", { fontSize: 56, fontWeight: "900", color: "#c9a961" }), txt("stat_label", "누적 판매", { fontSize: 14, color: "rgba(255,255,255,0.5)" }),
      txt("stat_number", "98%", { fontSize: 56, fontWeight: "900", color: "#c9a961" }), txt("stat_label", "재구매율", { fontSize: 14, color: "rgba(255,255,255,0.5)" }),
      txt("stat_number", "4.9", { fontSize: 56, fontWeight: "900", color: "#c9a961" }), txt("stat_label", "평균 별점", { fontSize: 14, color: "rgba(255,255,255,0.5)" }),
    ]),
    T("stats_highlight", "centered_text", "#fff", "화이트 대형 단일", "밝은 배경 + 거대 숫자 1개", [
      txt("subtitle", "SATISFACTION", { fontSize: 11, fontWeight: "700", color: "#8B7355" }),
      txt("stat_number", "98.7%", { fontSize: 80, fontWeight: "900", color: "#1a1a1a" }),
      txt("title", "고객 만족도", { fontSize: 22, fontWeight: "700", color: "#888" }),
    ]),
  ],

  // ═══════════════════════════════════════════════════════════
  //  나머지 섹션들 (각 최소 3-5개)
  // ═══════════════════════════════════════════════════════════
  review: [
    T("review", "card_list", "#f9f6f2", "크림 카드 3열", "상단 이미지 + 카드", [
      txt("title", "실제 고객 후기", { fontSize: 26, fontWeight: "900", color: "#1a1a1a" }),
      txt("review_name", "김**"), txt("star", "5"), txt("review_text", "기대 이상이에요! 품질이 정말 좋고 배송도 빨랐습니다.", { color: "#555" }),
      txt("review_name", "이**"), txt("star", "5"), txt("review_text", "선물용으로 구매했는데 포장도 고급스러워요.", { color: "#555" }),
      txt("review_name", "박**"), txt("star", "4"), txt("review_text", "재구매 의사 있습니다. 가성비 최고!", { color: "#555" }),
    ]),
    T("review", "card_list", "#fff", "화이트 말풍선", "밝은 + 말풍선 카드 + 별점", [
      txt("subtitle", "REAL REVIEW", { fontSize: 11, fontWeight: "700", color: "#999" }),
      txt("title", "실 구매 고객님의 리얼 리뷰", { fontSize: 26, fontWeight: "900", color: "#1a1a1a" }),
      txt("review_name", "lim****"), txt("star", "5"), txt("review_text", "편리하고 좋아요! 가격도 좋다고 생각해요.", { color: "#555" }),
      txt("review_name", "jess***"), txt("star", "5"), txt("review_text", "품질이 정말 좋네요. 주변에도 추천!", { color: "#555" }),
      txt("review_name", "pipe****"), txt("star", "5"), txt("review_text", "기대 이상으로 만족스럽습니다.", { color: "#555" }),
    ]),
  ],

  comparison: [
    T("comparison", "centered_text", "#fff", "화이트 비교표", "밝은 + 체크/X 비교", [
      txt("title", "비교해보세요", { fontSize: 26, fontWeight: "900", color: "#1a1a1a" }),
      txt("body", "원재료|일반: 혼합 원료|우리: 100% 국내산", { color: "#555" }),
      txt("body", "인증|일반: 기본 인증|우리: HACCP + ISO", { color: "#555" }),
      txt("body", "포장|일반: 기본 포장|우리: 프리미엄 밀봉", { color: "#555" }),
    ]),
    // 3열 비교표형 (Biodance 스타일 — 영문 서브+헤드라인+행라벨+3열+마지막열 강조)
    T("comparison", "detail_compare_table", "#fff", "3열 비교표", "영문 서브 + 볼드키워드 헤드라인 + 좌측 행라벨 + 3열 비교 + 마지막열 브랜드 강조", [
      txt("subtitle", "Biodance Hydro Ceramide Cleansing Powder", { fontSize: 14, color: "#999" }),
      txt("title", "민감성 피부도 [안심]할 수 있는\n저자극 [각질케어]를 경험해보세요.", { fontSize: 28, fontWeight: "400", color: "#333" }),
      badge("Biodance", "#fff", "#1a1a1a"),
      txt("body", "물리적|화학적|효소분해", { role_hint: "col_headers" }),
      txt("body", "방법|피부를 문지르며 각질 제거|피부에 성분을 흡수시켜 각질을 녹임|각질 사이의 연결고리를 분해", { role_hint: "table_row" }),
      txt("body", "성분|스크럽, 고마쥬 (소금, 아몬드 등)|산 성분 (AHA, BHA, PHA)|단백질 분해 효소 (파파인)", { role_hint: "table_row" }),
      txt("body", "자극도|피부 자극 有|피부 자극 有|저자극 (자극지수 0.00)", { role_hint: "table_row" }),
      txt("body", "사용주기|주 1~2회|주 1~2회|데일리", { role_hint: "table_row" }),
    ]),
    // 3열 비교표형 (다크)
    T("comparison", "detail_compare_table", "#111", "3열 비교표 (다크)", "다크 + 3열 비교 + 마지막열 브랜드 강조", [
      txt("subtitle", "Biodance Hydro Ceramide Cleansing Powder", { fontSize: 14, color: "rgba(255,255,255,0.35)" }),
      txt("title", "민감성 피부도 [안심]할 수 있는\n저자극 [각질케어]를 경험해보세요.", { fontSize: 28, fontWeight: "400", color: "rgba(255,255,255,0.7)" }),
      badge("Biodance", "transparent", "#fff"),
      txt("body", "물리적|화학적|효소분해", { role_hint: "col_headers" }),
      txt("body", "방법|피부를 문지르며 각질 제거|피부에 성분을 흡수시켜 각질을 녹임|각질 사이의 연결고리를 분해", { role_hint: "table_row" }),
      txt("body", "성분|스크럽, 고마쥬 (소금, 아몬드 등)|산 성분 (AHA, BHA, PHA)|단백질 분해 효소 (파파인)", { role_hint: "table_row" }),
      txt("body", "자극도|피부 자극 有|피부 자극 有|저자극 (자극지수 0.00)", { role_hint: "table_row" }),
      txt("body", "사용주기|주 1~2회|주 1~2회|데일리", { role_hint: "table_row" }),
    ]),
  ],

  guarantee: [
    T("guarantee", "centered_text", "#f9f6f2", "크림 대형 보증", "크림 + 큰 보증 카피 + 배지", [
      txt("subtitle", "OUR PROMISE", { fontSize: 11, fontWeight: "700", color: "#8B7355" }),
      txt("title", "맛에 대한 약속", { fontSize: 36, fontWeight: "900", color: "#1a1a1a" }),
      txt("body", "만족하지 못하시면 100% 환불해드립니다. 30일 이내 무조건 전액 환불 보장.", { fontSize: 16, color: "#666", lineHeight: 1.8 }),
      badge("30일 환불 보증", "#1a1a2e", "#fff"),
    ]),
    T("guarantee", "centered_text", "#1a1a2e", "다크 인증 3분할", "다크 + 인증 마크 3개 카드", [
      txt("title", "신뢰할 수 있는 품질", { fontSize: 32, fontWeight: "900", color: "#fff" }),
      txt("body", "HACCP 인증 완료", { fontWeight: "700", color: "#c9a961" }),
      txt("body", "ISO 9001 품질 경영", { fontWeight: "700", color: "#c9a961" }),
      txt("body", "100% 국내산 원료", { fontWeight: "700", color: "#c9a961" }),
    ]),
    T("guarantee", "centered_text", "#fff", "화이트 체크포인트", "밝은 + CHECK POINT + 보증 항목", [
      txt("subtitle", "CHECK POINT", { fontSize: 11, fontWeight: "700", color: "#999" }),
      txt("title", "안전의 약속", { fontSize: 28, fontWeight: "900", color: "#1a1a1a" }),
      txt("body", "무자극 테스트 완료", { fontWeight: "700", color: "#333" }),
      txt("body", "피부과 전문의 테스트 통과", { fontWeight: "700", color: "#333" }),
      txt("body", "유해 성분 무첨가", { fontWeight: "700", color: "#333" }),
    ]),
    T("guarantee", "centered_text", "#f5f5f5", "원산지 증명서", "그레이 + CERTIFICATE + 증명", [
      txt("subtitle", "CERTIFICATE OF THE PRODUCT", { fontSize: 11, fontWeight: "700", color: "#8B7355" }),
      txt("title", "원산지 증명서", { fontSize: 24, fontWeight: "900", color: "#1a1a1a" }),
      txt("body", "청정 자연에서 자라는 원료를 사용합니다.", { fontSize: 15, color: "#666" }),
      txt("body", "외부 자극으로 인해 민감해진 피부에 편안함 부여", { fontWeight: "600", color: "#333" }),
      txt("body", "물을 끌어당기는 성질로 마르지 않는 수분 선사", { fontWeight: "600", color: "#333" }),
    ]),
  ],

  cta: [
    T("cta", "centered_text", "#1a1a2e", "다크 가격+CTA", "다크 + 큰 가격 + 구매 버튼", [
      txt("subtitle", "지금이 가장 좋은 기회", { fontSize: 13, color: "rgba(255,255,255,0.7)" }),
      txt("title", "오늘만 특별 할인", { fontSize: 32, fontWeight: "900", color: "#fff" }),
      txt("price", "29,900원", { fontSize: 40, fontWeight: "900", color: "#c9a961" }),
      badge("무료배송", "rgba(255,255,255,0.15)", "#fff"),
    ]),
    T("cta", "left_image_right_text", "#1a1a1a", "좌 이미지 우 CTA", "왼쪽 이미지 + 오른쪽 가격/버튼", [
      txt("subtitle", "LIMITED OFFER", { fontSize: 12, fontWeight: "700", color: "#c9a961" }),
      txt("title", "지금 바로 시작하세요", { fontSize: 28, fontWeight: "900", color: "#fff" }),
      txt("price", "39,900원", { fontSize: 32, fontWeight: "900", color: "#c9a961" }),
    ]),
    T("cta", "centered_text", "#f9f6f2", "크림 할인율 강조", "크림 + 할인율 배지 + 가격", [
      badge("50% OFF", "#c9a961", "#fff"),
      txt("title", "반값에 만나보세요", { fontSize: 34, fontWeight: "900", color: "#1a1a1a" }),
      txt("body", "정가 59,800원", { fontSize: 14, color: "#999" }),
      txt("price", "29,900원", { fontSize: 40, fontWeight: "900", color: "#c9a961" }),
    ]),
    T("cta", "centered_text", "#fff", "화이트 가격 카드", "밝은 + 가격 박스 + CTA", [
      txt("subtitle", "SPECIAL PRICE", { fontSize: 11, fontWeight: "700", color: "#999" }),
      txt("title", "지금 주문하면 무료배송", { fontSize: 28, fontWeight: "900", color: "#1a1a1a" }),
      txt("price", "49,900원", { fontSize: 36, fontWeight: "900", color: "#1a1a1a" }),
    ]),
  ],

  faq: [
    T("faq", "centered_text", "#f9f6f2", "크림 아코디언", "크림 + Q&A 아코디언", [
      txt("title", "자주 묻는 질문", { fontSize: 26, fontWeight: "900", color: "#1a1a1a" }),
      txt("question", "Q. 배송은 얼마나 걸리나요?", { fontWeight: "700", color: "#333" }),
      txt("answer", "A. 결제 확인 후 1~2일 이내 출고됩니다.", { color: "#666" }),
      txt("question", "Q. 교환/반품이 가능한가요?", { fontWeight: "700", color: "#333" }),
      txt("answer", "A. 수령 후 7일 이내 미개봉 상태에서 가능합니다.", { color: "#666" }),
    ]),
    T("faq", "centered_text", "#1a1a2e", "다크 FAQ", "다크 + Q&A", [
      txt("title", "궁금하신 점", { fontSize: 26, fontWeight: "900", color: "#fff" }),
      txt("question", "Q. 원재료는 어디서 오나요?", { fontWeight: "700", color: "#fff" }),
      txt("answer", "A. 100% 국내 계약 농가에서 직접 공수합니다.", { color: "rgba(255,255,255,0.6)" }),
      txt("question", "Q. 냉동 배송인가요?", { fontWeight: "700", color: "#fff" }),
      txt("answer", "A. 냉장/냉동 신선 배송으로 발송됩니다.", { color: "rgba(255,255,255,0.6)" }),
    ]),
    T("faq", "centered_text", "#fff", "화이트 미니멀 FAQ", "밝은 + 깔끔한 Q&A", [
      txt("subtitle", "FAQ", { fontSize: 11, fontWeight: "700", color: "#999" }),
      txt("title", "자주 묻는 질문", { fontSize: 24, fontWeight: "900", color: "#1a1a1a" }),
      txt("question", "Q. 민감한 피부에도 사용할 수 있나요?", { fontWeight: "700", color: "#333" }),
      txt("answer", "A. 네, 저자극 테스트를 완료한 제품입니다.", { color: "#666" }),
      txt("question", "Q. 개봉 후 사용 기한은?", { fontWeight: "700", color: "#333" }),
      txt("answer", "A. 개봉 후 6개월 이내 사용 권장합니다.", { color: "#666" }),
    ]),
  ],

  cert: [
    T("cert", "centered_text", "#fff", "인증 카드 나열", "밝은 + 인증 마크 카드", [
      txt("title", "인증 및 수상 내역", { fontSize: 26, fontWeight: "900", color: "#1a1a1a" }),
      txt("body", "HACCP 식품안전관리인증", { fontWeight: "700", color: "#333" }),
      txt("body", "ISO 22000 국제 인증", { fontWeight: "700", color: "#333" }),
      txt("body", "대한민국 브랜드 대상 수상", { fontWeight: "700", color: "#333" }),
    ]),
    T("cert", "centered_text", "#f9f6f2", "기능성 인증 증명", "크림 + 인증서 + 설명", [
      txt("subtitle", "CERTIFIED", { fontSize: 11, fontWeight: "700", color: "#8B7355" }),
      txt("title", "3중 기능성 인증", { fontSize: 28, fontWeight: "900", color: "#1a1a1a" }),
      txt("body", "자외선 차단", { fontWeight: "700", color: "#333" }),
      txt("body", "주름 개선", { fontWeight: "700", color: "#333" }),
      txt("body", "미백", { fontWeight: "700", color: "#333" }),
    ]),
    T("cert", "centered_text", "#f5f5f5", "스탬프 인증", "그레이 + 스탬프 + 인증 상세", [
      txt("subtitle", "QUALITY ASSURANCE", { fontSize: 11, fontWeight: "700", color: "#999" }),
      txt("title", "품질 보증 인증", { fontSize: 26, fontWeight: "900", color: "#1a1a1a" }),
      txt("body", "피부 무자극 테스트 완료", { fontWeight: "600", color: "#333" }),
      txt("body", "EWG 그린 등급 원료 사용", { fontWeight: "600", color: "#333" }),
      txt("body", "동물 실험 미실시", { fontWeight: "600", color: "#333" }),
    ]),
  ],

  howto: [
    T("howto", "centered_text", "#fff", "좌우 교차 스텝", "좌우 교차 이미지 + 스텝", [
      txt("title", "간편한 사용법", { fontSize: 28, fontWeight: "900", color: "#1a1a1a" }),
      txt("body", "포장을 개봉합니다", { fontWeight: "700", color: "#333" }), txt("body", "간단한 준비로 시작", { color: "#666" }),
      txt("body", "조리/사용합니다", { fontWeight: "700", color: "#333" }), txt("body", "설명서대로 따라하세요", { color: "#666" }),
      txt("body", "완성!", { fontWeight: "700", color: "#333" }), txt("body", "맛있게 즐기세요", { color: "#666" }),
    ]),
    T("howto", "centered_text", "#f5f5f5", "STEP 가로 프로세스", "그레이 + STEP 01/02/03", [
      txt("subtitle", "HOW TO USE", { fontSize: 11, fontWeight: "700", color: "#999" }),
      txt("title", "3단계로 간편하게", { fontSize: 26, fontWeight: "900", color: "#1a1a1a" }),
      txt("body", "STEP 01 | 세안 후 피부결 정돈", { fontWeight: "600", color: "#333" }),
      txt("body", "STEP 02 | 적당량을 부드럽게 도포", { fontWeight: "600", color: "#333" }),
      txt("body", "STEP 03 | 두드려 흡수시키면 완료", { fontWeight: "600", color: "#333" }),
    ]),
    T("howto", "centered_text", "#f9f6f2", "세로 타임라인", "크림 + 세로 연결선 + 단계별", [
      txt("title", "사용 순서", { fontSize: 26, fontWeight: "900", color: "#1a1a1a" }),
      txt("body", "01. 클렌징 | 세안 후 물기 제거", { fontWeight: "600", color: "#333" }),
      txt("body", "02. 토너 | 화장솜이나 손으로 도포", { fontWeight: "600", color: "#333" }),
      txt("body", "03. 에센스 | 2-3방울 고르게", { fontWeight: "600", color: "#333" }),
      txt("body", "04. 크림 | 마지막으로 발라 마무리", { fontWeight: "600", color: "#333" }),
    ]),
  ],

  before_after: [
    T("before_after", "centered_text", "#1a1a2e", "다크 비포/애프터", "다크 + 좌우 비교", [
      txt("title", "확실한 변화", { fontSize: 30, fontWeight: "900", color: "#fff" }),
      txt("body", "사용 전: 기존 방식의 불편함", { color: "rgba(255,255,255,0.6)" }),
      txt("body", "사용 후: 확연히 달라진 결과", { fontWeight: "700", color: "#c9a961" }),
    ]),
    T("before_after", "centered_text", "#fff", "화이트 전후 비교", "밝은 + 좌 BEFORE / 우 AFTER", [
      txt("subtitle", "BEFORE & AFTER", { fontSize: 11, fontWeight: "700", color: "#999" }),
      txt("title", "사용 전후 비교", { fontSize: 28, fontWeight: "900", color: "#1a1a1a" }),
      txt("body", "사용 전: 건조하고 칙칙한 피부", { color: "#888" }),
      txt("body", "사용 후: 촉촉하고 윤기 있는 피부", { fontWeight: "700", color: "#333" }),
    ]),
    T("before_after", "centered_text", "#f9f6f2", "시간 경과 변화", "크림 + 기간별 변화 단계", [
      txt("title", "시간이 말해주는 효과", { fontSize: 26, fontWeight: "900", color: "#1a1a1a" }),
      txt("body", "1주차 | 피부 결이 부드러워지기 시작", { fontWeight: "600", color: "#333" }),
      txt("body", "2주차 | 눈에 띄는 보습 효과 체감", { fontWeight: "600", color: "#333" }),
      txt("body", "4주차 | 전체적인 피부톤 개선 확인", { fontWeight: "600", color: "#333" }),
      txt("body", "8주차 | 주변의 칭찬이 쏟아지는 변화", { fontWeight: "700", color: "#1a1a1a" }),
    ]),
  ],

  event: [
    // 2톤 분할 이벤트 배너 (레퍼런스 기반)
    T("event", "centered_text", "#f5f0e8", "2톤 이벤트 배너", "상단 크림+골드 타이틀+제품 / 하단 다크 혜택 배너", [
      badge("BRAND", "#c0392b", "#fff"),
      txt("subtitle", "SPECIAL EVENT", { fontSize: 14, fontWeight: "600", color: "#8B7355" }),
      txt("title", "특별한 선물 세트", { fontSize: 52, fontWeight: "900", color: "#c9a961" }),
      txt("body", "소중한 분께 감사의 마음을 전하세요", { fontSize: 14, color: "#8B7355" }),
      txt("body", "엄선된 프리미엄 구성으로 특별한 순간을 빛내드립니다", { fontSize: 14, color: "#8B7355" }),
      txt("body", "지금 구매하시면 특별 혜택을 드립니다", { fontSize: 20, fontWeight: "900", color: "#fff" }),
      txt("body", "한정판 에코백을 증정합니다", { fontSize: 14, color: "rgba(255,255,255,0.6)" }),
    ]),
    T("event", "centered_text", "#1a1a2e", "다크 이벤트", "다크 + 이벤트 텍스트", [
      badge("EVENT", "rgba(255,255,255,0.15)", "#fff"),
      txt("title", "특별 이벤트 진행중", { fontSize: 36, fontWeight: "900", color: "#fff" }),
      txt("body", "지금 구매하시면 사은품을 드립니다", { fontSize: 16, color: "rgba(255,255,255,0.7)" }),
    ]),
    T("event", "centered_text", "#fff", "화이트 혜택 리스트", "밝은 + 혜택1/혜택2 카드", [
      txt("subtitle", "SPECIAL EVENT", { fontSize: 11, fontWeight: "700", color: "#c9a961" }),
      txt("title", "특별 혜택 모음", { fontSize: 28, fontWeight: "900", color: "#1a1a1a" }),
      txt("body", "혜택 1 | 세트 구매시 사은품 증정", { fontWeight: "700", color: "#333" }),
      txt("body", "혜택 2 | 적립금 2배 지급", { fontWeight: "700", color: "#333" }),
    ]),
    T("event", "centered_text", "#f9f6f2", "기간 한정 세일", "크림 + 할인율 + 기간", [
      badge("20% SALE", "#c9a961", "#fff"),
      txt("title", "전품목 20% SALE", { fontSize: 32, fontWeight: "900", color: "#1a1a1a" }),
      txt("body", "Sale 기간: 04.01 - 04.30", { fontSize: 14, fontWeight: "600", color: "#888" }),
    ]),
    // 번들 프로모션형 (아로마티카 스타일 — 상단 히어로+가격 / 하단 2분할 특별구성)
    T("event", "bundle_promo", "#f4f1ec", "번들 프로모션형", "상단 제품+할인가 히어로 / 하단 2분할 특별구성 + 사은품", [
      txt("subtitle", "3월 한달 간 특별구성", { fontSize: 13, fontWeight: "700", color: "#fff", bg: "#7a8c6e" }),
      txt("title", "아로마티카 치약\n(티트리)", { fontSize: 30, fontWeight: "900", color: "#1a1a1a" }),
      txt("body", "1개 사면 6,900, 뭐 이것도 괜찮지만...", { fontSize: 14, color: "#888" }),
      txt("body", "5개 추가 발송 + 친환경 칫솔 증정!", { fontSize: 15, fontWeight: "700", color: "#333", role_hint: "benefit" }),
      txt("body", "69,000|34,500", { role_hint: "pricing", color: "#1a1a1a" }),
      txt("body", "3월 한 달 간! 특별 구성", { fontSize: 18, fontWeight: "800", color: "#1a1a1a", role_hint: "bundle_title" }),
      txt("body", "5개 추가 발송", { fontWeight: "800", color: "#1a1a1a", role_hint: "bundle_left" }),
      txt("body", "친환경 칫솔 증정!", { fontWeight: "800", color: "#1a1a1a", role_hint: "bundle_right" }),
      txt("body", "생 분해성 원료를 함유한 친환경 수저로 만들어 폐기 시 일반 플라스틱 칫솔보다 더 빠르게 퇴비화 되는 친환경 칫솔입니다.", { fontSize: 13, color: "#888", role_hint: "bundle_right_desc" }),
      badge("선착순 300명 증정", "#7a8c6e", "#fff"),
    ]),
    // 번들 프로모션형 (다크)
    T("event", "bundle_promo", "#1a2018", "번들 프로모션형 (다크)", "다크 + 상단 제품+할인가 / 하단 2분할 특별구성", [
      txt("subtitle", "3월 한달 간 특별구성", { fontSize: 13, fontWeight: "700", color: "#fff", bg: "#5a7a4e" }),
      txt("title", "아로마티카 치약\n(티트리)", { fontSize: 30, fontWeight: "900", color: "#fff" }),
      txt("body", "1개 사면 6,900, 뭐 이것도 괜찮지만...", { fontSize: 14, color: "rgba(255,255,255,0.4)" }),
      txt("body", "5개 추가 발송 + 친환경 칫솔 증정!", { fontSize: 15, fontWeight: "700", color: "rgba(255,255,255,0.85)", role_hint: "benefit" }),
      txt("body", "69,000|34,500", { role_hint: "pricing", color: "#fff" }),
      txt("body", "3월 한 달 간! 특별 구성", { fontSize: 18, fontWeight: "800", color: "#fff", role_hint: "bundle_title" }),
      txt("body", "5개 추가 발송", { fontWeight: "800", color: "#fff", role_hint: "bundle_left" }),
      txt("body", "친환경 칫솔 증정!", { fontWeight: "800", color: "#fff", role_hint: "bundle_right" }),
      txt("body", "생 분해성 원료를 함유한 친환경 수저로 만들어 폐기 시 일반 플라스틱 칫솔보다 더 빠르게 퇴비화 되는 친환경 칫솔입니다.", { fontSize: 13, color: "rgba(255,255,255,0.4)", role_hint: "bundle_right_desc" }),
      badge("선착순 300명 증정", "#5a7a4e", "#fff"),
    ]),
    // 종합 프로모션형 (닥터벨머 스타일 — 서브+타이틀+기간+Gift+효능+제품+설명+브랜드소개)
    T("event", "promo_full", "#e8f0f8", "종합 프로모션형", "그라데이션 + 서브+타이틀+기간 + Gift바 + 3컬럼(효능/제품/설명) + 브랜드박스", [
      txt("subtitle", "촉촉한 가을 피부를 위한", { fontSize: 16, color: "#555" }),
      txt("title", "닥터벨머 아토솔트크림", { fontSize: 30, fontWeight: "900", color: "#1a1a1a" }),
      txt("body", "이벤트 기간 2024.10.2 - 10.25", { fontSize: 12, color: "#aaa", role_hint: "period" }),
      txt("body", "닥터벨머 데일리리페어 모이스처라이징 립밤 증정!|민감하고 건조해진 입술을 촉촉하게 보호해주는 스틱 타입의 고보습 립밤", { role_hint: "gift" }),
      txt("body", "피부 보습 개선", { fontWeight: "700", color: "#333", role_hint: "benefit_check" }),
      txt("body", "피부 장벽 개선", { fontWeight: "700", color: "#333", role_hint: "benefit_check" }),
      txt("body", "각질 상태 개선", { fontWeight: "700", color: "#333", role_hint: "benefit_check" }),
      txt("body", "자극테스트제 민감피부 용|데일리리페어 아토 솔트 크림|피부 건조에 의한 가려움 완화 및 깊은 보습에 도움을 주는 미네랄 솔트 크림", { role_hint: "product_info" }),
      txt("body", "닥터벨머란?|새롭게 선보이는 닥터벨머는 피부 전문가가 처방하는 솔루션 브랜드로, 아름다운 피부와 좋은 기분을 전하는 더마 코스메틱 브랜드입니다.", { role_hint: "brand_intro" }),
    ]),
    // 종합 프로모션형 (다크)
    T("event", "promo_full", "#0e1520", "종합 프로모션형 (다크)", "다크 + 종합 프로모션 레이아웃", [
      txt("subtitle", "촉촉한 가을 피부를 위한", { fontSize: 16, color: "rgba(255,255,255,0.5)" }),
      txt("title", "닥터벨머 아토솔트크림", { fontSize: 30, fontWeight: "900", color: "#fff" }),
      txt("body", "이벤트 기간 2024.10.2 - 10.25", { fontSize: 12, color: "rgba(255,255,255,0.3)", role_hint: "period" }),
      txt("body", "닥터벨머 데일리리페어 모이스처라이징 립밤 증정!|민감하고 건조해진 입술을 촉촉하게 보호해주는 스틱 타입의 고보습 립밤", { role_hint: "gift" }),
      txt("body", "피부 보습 개선", { fontWeight: "700", color: "rgba(255,255,255,0.8)", role_hint: "benefit_check" }),
      txt("body", "피부 장벽 개선", { fontWeight: "700", color: "rgba(255,255,255,0.8)", role_hint: "benefit_check" }),
      txt("body", "각질 상태 개선", { fontWeight: "700", color: "rgba(255,255,255,0.8)", role_hint: "benefit_check" }),
      txt("body", "자극테스트제 민감피부 용|데일리리페어 아토 솔트 크림|피부 건조에 의한 가려움 완화 및 깊은 보습에 도움을 주는 미네랄 솔트 크림", { role_hint: "product_info" }),
      txt("body", "닥터벨머란?|새롭게 선보이는 닥터벨머는 피부 전문가가 처방하는 솔루션 브랜드로, 아름다운 피부와 좋은 기분을 전하는 더마 코스메틱 브랜드입니다.", { role_hint: "brand_intro" }),
    ]),
  ],

  pricing: [
    T("pricing", "centered_text", "#fff", "3열 가격 카드", "밝은 + 3개 티어 카드", [
      txt("title", "나에게 맞는 플랜", { fontSize: 26, fontWeight: "900", color: "#1a1a1a" }),
      txt("plan_name", "베이직"), txt("plan_price", "19,900원"), txt("plan_desc", "입문자 기본 구성"),
      txt("plan_feature", "기본 구성 1개"), txt("plan_feature", "무료 배송"), txt("plan_feature", "30일 보증"),
      txt("plan_name", "스탠다드"), txt("plan_price", "39,900원"), txt("plan_desc", "가장 인기 구성"),
      txt("plan_feature", "풀 구성 2개"), txt("plan_feature", "무료 배송"), txt("plan_feature", "60일 보증"),
      txt("plan_name", "프리미엄"), txt("plan_price", "59,900원"), txt("plan_desc", "최고급 올인원"),
      txt("plan_feature", "프리미엄 3개"), txt("plan_feature", "무료 배송"), txt("plan_feature", "1년 보증"),
    ]),
    T("pricing", "centered_text", "#f9f6f2", "단일 가격 포커스", "크림 + 큰 가격 + 구성 리스트", [
      txt("subtitle", "BEST VALUE", { fontSize: 11, fontWeight: "700", color: "#c9a961" }),
      txt("title", "합리적인 가격", { fontSize: 28, fontWeight: "900", color: "#1a1a1a" }),
      txt("body", "본품 + 미니 + 전용 파우치", { fontWeight: "600", color: "#333" }),
      txt("price", "39,900원", { fontSize: 36, fontWeight: "900", color: "#c9a961" }),
    ]),
  ],

  process_steps: [
    T("process_steps", "centered_text", "#fff", "3스텝 세로", "밝은 + 큰 넘버 + 단계별", [
      txt("subtitle", "PROCESS", { fontSize: 11, fontWeight: "700", color: "#999" }),
      txt("title", "간단한 3단계로 완성", { fontSize: 28, fontWeight: "900", color: "#1a1a1a" }),
      txt("body", "01 | 선택하기 | 원하는 옵션을 골라주세요", { fontWeight: "600", color: "#333" }),
      txt("body", "02 | 주문하기 | 간편하게 결제 완료", { fontWeight: "600", color: "#333" }),
      txt("body", "03 | 받아보기 | 빠른 배송으로 바로 만나보세요", { fontWeight: "600", color: "#333" }),
    ]),
    // 성분 메커니즘 3스텝 (POINT 넘버 + 2줄 헤드라인 + 설명 + 3스텝 일러스트)
    T("process_steps", "mechanism_steps", "#fff", "성분 메커니즘 3스텝", "POINT 넘버 + 2줄 헤드라인 + 설명 + 번호 연결선 3스텝 + 일러스트 영역", [
      txt("subtitle", "POINT 02", { fontSize: 16, fontWeight: "900", color: "#1a1a1a", letterSpacing: 3 }),
      txt("title", "촉촉 보습\n판테놀", { fontSize: 36, fontWeight: "900", color: "#1a1a1a" }),
      txt("body", "강한 보습 성분 판테놀이 [피부 속 깊이 수분을 공급]하고 수분 보호막을 형성하며, [피부장벽 개선]에 도움을 줍니다.", { fontSize: 15, color: "#666", lineHeight: 1.8 }),
      txt("body", "비타민 B5 전환|판테놀이 피부에 흡수될 때 비타민 B5로 전환", { role_hint: "mech_step" }),
      txt("body", "수분 공급|수분을 끌어당기고 수분 보호막을 형성해 피부를 촉촉하게 케어", { role_hint: "mech_step" }),
      txt("body", "장벽 강화|피부장벽 개선에 도움을 주어 피부컨디션 향상", { role_hint: "mech_step" }),
      txt("body", "* 상기 내용은 원료적 특성에 한 함", { fontSize: 11, color: "#ccc", role_hint: "footnote" }),
    ]),
    // 성분 메커니즘 3스텝 (다크)
    T("process_steps", "mechanism_steps", "#111", "성분 메커니즘 3스텝 (다크)", "다크 + POINT 넘버 + 3스텝 일러스트", [
      txt("subtitle", "POINT 02", { fontSize: 16, fontWeight: "900", color: "#fff", letterSpacing: 3 }),
      txt("title", "촉촉 보습\n판테놀", { fontSize: 36, fontWeight: "900", color: "#fff" }),
      txt("body", "강한 보습 성분 판테놀이 [피부 속 깊이 수분을 공급]하고 수분 보호막을 형성하며, [피부장벽 개선]에 도움을 줍니다.", { fontSize: 15, color: "rgba(255,255,255,0.5)", lineHeight: 1.8 }),
      txt("body", "비타민 B5 전환|판테놀이 피부에 흡수될 때 비타민 B5로 전환", { role_hint: "mech_step" }),
      txt("body", "수분 공급|수분을 끌어당기고 수분 보호막을 형성해 피부를 촉촉하게 케어", { role_hint: "mech_step" }),
      txt("body", "장벽 강화|피부장벽 개선에 도움을 주어 피부컨디션 향상", { role_hint: "mech_step" }),
      txt("body", "* 상기 내용은 원료적 특성에 한 함", { fontSize: 11, color: "rgba(255,255,255,0.2)", role_hint: "footnote" }),
    ]),
    T("process_steps", "centered_text", "#f9f6f2", "크림 타임라인", "크림 + 세로선 + 단계", [
      txt("title", "제작 과정", { fontSize: 26, fontWeight: "900", color: "#1a1a1a" }),
      txt("body", "원료 선별 | 최상급 원료 엄선", { fontWeight: "600", color: "#333" }),
      txt("body", "정밀 가공 | 영양 손실 최소화", { fontWeight: "600", color: "#333" }),
      txt("body", "품질 검사 | 7단계 검사 통과", { fontWeight: "600", color: "#333" }),
      txt("body", "위생 포장 | 특수 포장", { fontWeight: "600", color: "#333" }),
    ]),
  ],

  shipping: [
    T("shipping", "centered_text", "#f5f5f5", "배송/교환 안내", "배송 정보 테이블", [
      txt("title", "배송 및 교환/반품 안내", { fontSize: 22, fontWeight: "900", color: "#1a1a1a" }),
      txt("body", "결제 완료 후 1~2일 이내 출고 (주말/공휴일 제외)", { color: "#555" }),
      txt("body", "제주/도서산간 지역은 추가 1~2일 소요", { color: "#555" }),
      txt("body", "수령 후 7일 이내 미개봉 제품 교환/반품 가능", { color: "#555" }),
    ]),
    T("shipping", "centered_text", "#fff", "화이트 배송 테이블", "밝은 + 배송/교환/반품 정보", [
      txt("subtitle", "DELIVERY INFO", { fontSize: 11, fontWeight: "700", color: "#999" }),
      txt("title", "배송 안내", { fontSize: 22, fontWeight: "900", color: "#1a1a1a" }),
      txt("body", "배송비 | 전 제품 무료배송", { color: "#555" }),
      txt("body", "배송기간 | 결제 후 1~3일", { color: "#555" }),
      txt("body", "교환/반품 | 수령 후 7일 이내", { color: "#555" }),
    ]),
  ],

  ai_notice: [
    T("ai_notice", "centered_text", "#fafafa", "AI 생성 안내", "AI 콘텐츠 고지", [
      txt("body", "본 페이지의 일부 콘텐츠는 AI로 생성되었습니다.", { fontSize: 12, color: "#999" }),
    ]),
    T("ai_notice", "centered_text", "#fff", "미니멀 AI 고지", "최소한 AI 안내 문구", [
      txt("body", "이 상세페이지는 AI 기술을 활용하여 제작되었습니다.", { fontSize: 11, color: "#bbb" }),
    ]),
  ],

  facility: [
    T("facility", "centered_text", "#fff", "시설 소개", "밝은 + 생산시설 설명", [
      txt("subtitle", "OUR FACILITY", { fontSize: 11, fontWeight: "700", color: "#999" }),
      txt("title", "HACCP 인증 클린 제조시설", { fontSize: 26, fontWeight: "900", color: "#1a1a1a" }),
      txt("body", "온도/습도 24시간 자동 관리 시스템", { fontWeight: "600", color: "#333" }),
      txt("body", "클린룸 기준 위생 관리", { fontWeight: "600", color: "#333" }),
      txt("body", "매일 3회 시설 점검 및 소독", { fontWeight: "600", color: "#333" }),
    ]),
    T("facility", "centered_text", "#f9f6f2", "제조 과정 소개", "크림 + 제조 단계", [
      txt("title", "정성을 담은 제조 과정", { fontSize: 26, fontWeight: "900", color: "#1a1a1a" }),
      txt("body", "01 원료 입고 검사", { fontWeight: "600", color: "#333" }),
      txt("body", "02 정밀 계량 배합", { fontWeight: "600", color: "#333" }),
      txt("body", "03 자동화 위생 포장", { fontWeight: "600", color: "#333" }),
      txt("body", "04 이중 검품 완료", { fontWeight: "600", color: "#333" }),
    ]),
  ],

  contact: [
    T("contact", "centered_text", "#fff", "고객센터 안내", "밝은 + 연락처 정보", [
      txt("subtitle", "CUSTOMER SERVICE", { fontSize: 11, fontWeight: "700", color: "#999" }),
      txt("title", "고객센터", { fontSize: 24, fontWeight: "900", color: "#1a1a1a" }),
      txt("body", "전화 | 1588-0000 (평일 10:00~18:00)", { fontWeight: "600", color: "#333" }),
      txt("body", "이메일 | support@brand.com", { fontWeight: "600", color: "#333" }),
    ]),
  ],

  info: [
    T("info", "centered_text", "#f5f5f5", "구매 전 확인사항", "그레이 + 주의사항 리스트", [
      txt("subtitle", "NOTICE", { fontSize: 11, fontWeight: "700", color: "#999" }),
      txt("title", "구매 전 확인해주세요", { fontSize: 22, fontWeight: "900", color: "#1a1a1a" }),
      txt("body", "모니터 환경에 따라 실제 색상과 다를 수 있습니다", { color: "#555" }),
      txt("body", "제품 특성상 개봉 후 교환/반품이 불가합니다", { color: "#555" }),
      txt("body", "직사광선을 피해 서늘한 곳에 보관해주세요", { color: "#555" }),
    ]),
  ],
};

export const SECTION_TYPE_LABELS = {
  hero: "히어로 (메인 비주얼)",
  pain_points: "고민 포인트",
  features: "특장점 소개",
  point: "상세 설명",
  stats_highlight: "스펙/통계",
  comparison: "비교",
  review: "고객 후기",
  guarantee: "신뢰/보증",
  cert: "인증/수상",
  howto: "사용법/프로세스",
  before_after: "비포/애프터",
  event: "이벤트/프로모션",
  faq: "자주 묻는 질문",
  cta: "구매 유도 (CTA)",
  shipping: "배송/교환/반품",
  ai_notice: "AI 생성 안내",
  pricing: "가격표",
  process_steps: "진행 과정",
  facility: "시설/환경",
  contact: "고객센터",
  info: "구매 전 확인",
};
