// DetailPageStudio - Section Templates
// Extracted from 133+ HTML detail page templates (figma-templates/generated/)
// Each section type contains multiple layout variations with realistic Korean e-commerce text.

export const SECTION_TEMPLATES = {

  // ============================================================
  // HERO - 히어로 / 메인 비주얼
  // ============================================================
  hero: [
    {
      type: "hero",
      layout: "centered_text",
      bg_color: "#1B5E20",
      label: "다크 히어로 - 뱃지 + 통계 그리드",
      preview: "어두운 배경에 뱃지, 타이틀, 2x2 통계 그리드, CTA 버튼",
      elements: [
        { type: "badge", content: "BEST SELLER", bg: "#FF6F00", color: "#1B5E20", fontSize: 12, fontWeight: "800" },
        { type: "image", role: "main", placeholder: "[제품 메인 이미지]", aspectRatio: "1/1", borderRadius: 20 },
        { type: "text", role: "title", content: "프리미엄 유기농 제품", fontSize: 28, fontWeight: "900", color: "#ffffff" },
        { type: "text", role: "subtitle", content: "고객이 인정한 최고의 품질", fontSize: 15, color: "#ffffff", opacity: 0.6 },
        { type: "text", role: "urgency", content: "오늘 주문 시 내일 도착 - 한정 수량", fontSize: 12, fontWeight: "700", color: "#FF6F00" },
        { type: "stats_grid", columns: 2, items: [
          { value: "4.9", label: "평점", color: "#FF6F00" },
          { value: "2,847+", label: "구매후기", color: "#FF6F00" },
          { value: "98%", label: "만족도", color: "#FF6F00" },
          { value: "12만+", label: "누적판매", color: "#FF6F00" },
        ]},
        { type: "button", content: "지금 구매하기", bg: "#FF6F00", color: "#1B5E20", fontSize: 17, fontWeight: "800", borderRadius: 14 },
      ],
    },
    {
      type: "hero",
      layout: "centered_text",
      bg_color: "#880E4F",
      label: "핑크 히어로 - 여성 패션 스타일",
      preview: "로즈톤 배경에 세련된 뱃지, 통계, CTA 구성",
      elements: [
        { type: "badge", content: "BEST SELLER", bg: "#FCE4EC", color: "#880E4F", fontSize: 12, fontWeight: "800" },
        { type: "image", role: "main", placeholder: "[제품 메인 이미지]", aspectRatio: "1/1", borderRadius: 20 },
        { type: "text", role: "title", content: "오버핏 린넨 블라우스", fontSize: 28, fontWeight: "900", color: "#ffffff" },
        { type: "text", role: "subtitle", content: "고객이 인정한 최고의 품질", fontSize: 15, color: "#ffffff", opacity: 0.6 },
        { type: "text", role: "urgency", content: "오늘 주문 시 내일 도착 - 한정 수량", fontSize: 12, fontWeight: "700", color: "#FCE4EC" },
        { type: "stats_grid", columns: 2, items: [
          { value: "4.9", label: "평점", color: "#FCE4EC" },
          { value: "2,847+", label: "구매후기", color: "#FCE4EC" },
          { value: "98%", label: "만족도", color: "#FCE4EC" },
          { value: "12만+", label: "누적판매", color: "#FCE4EC" },
        ]},
        { type: "button", content: "지금 구매하기", bg: "#FCE4EC", color: "#880E4F", fontSize: 17, fontWeight: "800", borderRadius: 14 },
      ],
    },
    {
      type: "hero",
      layout: "centered_text",
      bg_color: "#6B5CE7",
      label: "퍼플 히어로 - 서비스/코칭 스타일",
      preview: "보라색 배경에 프리미엄 서비스 뱃지, 와이드 이미지, CTA",
      elements: [
        { type: "badge", content: "PREMIUM SERVICE", bg: "#FF6B9D", color: "#6B5CE7", fontSize: 12, fontWeight: "800" },
        { type: "image", role: "main", placeholder: "[서비스 메인 이미지]", aspectRatio: "3/2", borderRadius: 20 },
        { type: "text", role: "title", content: "1:1 맞춤 컨설팅 8주 과정", fontSize: 28, fontWeight: "900", color: "#ffffff" },
        { type: "text", role: "subtitle", content: "전문가가 직접 만든 프리미엄 서비스", fontSize: 15, color: "#ffffff", opacity: 0.6 },
        { type: "text", role: "urgency", content: "이번 달 신규 상담 접수 마감 임박", fontSize: 12, fontWeight: "700", color: "#FF6B9D" },
        { type: "stats_grid", columns: 2, items: [
          { value: "4.9", label: "평점", color: "#FF6B9D" },
          { value: "1,200+", label: "이용후기", color: "#FF6B9D" },
          { value: "98%", label: "재이용률", color: "#FF6B9D" },
          { value: "5,000+", label: "누적고객", color: "#FF6B9D" },
        ]},
        { type: "button", content: "지금 시작하기", bg: "#FF6B9D", color: "#6B5CE7", fontSize: 17, fontWeight: "800", borderRadius: 14 },
      ],
    },
    {
      type: "hero",
      layout: "centered_text",
      bg_color: "#F8BBD0",
      label: "라이트핑크 히어로 - 뷰티/스킨케어",
      preview: "밝은 핑크 배경에 다크 텍스트, 뷰티 제품 스타일",
      elements: [
        { type: "badge", content: "BEST SELLER", bg: "#4A148C", color: "#ffffff", fontSize: 12, fontWeight: "800" },
        { type: "image", role: "main", placeholder: "[제품 메인 이미지]", aspectRatio: "1/1", borderRadius: 20 },
        { type: "text", role: "title", content: "비타민C 세럼 30ml", fontSize: 28, fontWeight: "900", color: "#1a1a1a" },
        { type: "text", role: "subtitle", content: "고객이 인정한 최고의 품질", fontSize: 15, color: "#1a1a1a", opacity: 0.6 },
        { type: "text", role: "urgency", content: "오늘 주문 시 내일 도착 - 한정 수량", fontSize: 12, fontWeight: "700", color: "#4A148C" },
        { type: "stats_grid", columns: 2, items: [
          { value: "4.9", label: "평점", color: "#4A148C" },
          { value: "2,847+", label: "구매후기", color: "#4A148C" },
          { value: "98%", label: "만족도", color: "#4A148C" },
          { value: "12만+", label: "누적판매", color: "#4A148C" },
        ]},
        { type: "button", content: "지금 구매하기", bg: "#4A148C", color: "#ffffff", fontSize: 17, fontWeight: "800", borderRadius: 14 },
      ],
    },
    {
      type: "hero",
      layout: "centered_text",
      bg_color: "#B71C1C",
      label: "레드 히어로 - 피트니스/스포츠",
      preview: "강렬한 레드 배경에 다크 액센트, 스포츠 스타일",
      elements: [
        { type: "badge", content: "BEST SELLER", bg: "#212121", color: "#B71C1C", fontSize: 12, fontWeight: "800" },
        { type: "image", role: "main", placeholder: "[제품 메인 이미지]", aspectRatio: "1/1", borderRadius: 20 },
        { type: "text", role: "title", content: "홈트 조립식 스미스머신", fontSize: 28, fontWeight: "900", color: "#ffffff" },
        { type: "text", role: "subtitle", content: "고객이 인정한 최고의 품질", fontSize: 15, color: "#ffffff", opacity: 0.6 },
        { type: "text", role: "urgency", content: "오늘 주문 시 내일 도착 - 한정 수량", fontSize: 12, fontWeight: "700", color: "#212121" },
        { type: "stats_grid", columns: 2, items: [
          { value: "4.9", label: "평점", color: "#212121" },
          { value: "2,847+", label: "구매후기", color: "#212121" },
          { value: "98%", label: "만족도", color: "#212121" },
          { value: "12만+", label: "누적판매", color: "#212121" },
        ]},
        { type: "button", content: "지금 구매하기", bg: "#212121", color: "#B71C1C", fontSize: 17, fontWeight: "800", borderRadius: 14 },
      ],
    },
  ],

  // ============================================================
  // PAIN POINTS - 고민 섹션
  // ============================================================
  pain_points: [
    {
      type: "pain_points",
      layout: "card_list",
      bg_color: "#f5f3f0",
      label: "고민 카드 리스트 - 라이트 배경",
      preview: "밝은 배경에 고민 포인트 카드 나열, 아이콘 + 텍스트",
      elements: [
        { type: "text", role: "label", content: "PAIN POINT", fontSize: 12, fontWeight: "700", color: "#FF6F00" },
        { type: "text", role: "title", content: "이런 고민\n있으시죠?", fontSize: 22, fontWeight: "900", color: "#1a1a1a" },
        { type: "text", role: "subtitle", content: "하나라도 해당된다면, 저희가 해결해드리겠습니다", fontSize: 13, color: "#1a1a1a", opacity: 0.5 },
        { type: "card_list", items: [
          { icon: "frustrated", title: "품질 불만", body: "저렴한 제품을 샀다가 금방 망가져서 오히려 돈 낭비한 경험" },
          { icon: "anxious", title: "선택 장애", body: "비슷해 보이는 제품이 너무 많아서 뭘 골라야 할지 모르겠는 분" },
          { icon: "worried", title: "가품 걱정", body: "온라인 구매 시 정품인지 확인할 수 없어 불안한 경험" },
          { icon: "sad", title: "사후관리 부재", body: "구매 후 문제가 생겨도 연락이 안 되는 판매처 경험" },
          { icon: "disappointed", title: "기대와 다름", body: "사진과 실물이 달라서 실망했던 경험이 있으신 분" },
        ]},
      ],
    },
    {
      type: "pain_points",
      layout: "card_list",
      bg_color: "#1a1a1a",
      label: "고민 카드 리스트 - 다크 배경",
      preview: "어두운 배경에 반투명 카드, 고민 포인트 나열",
      elements: [
        { type: "text", role: "label", content: "PAIN POINT", fontSize: 12, fontWeight: "700", color: "#4A148C" },
        { type: "text", role: "title", content: "이런 고민\n있으시죠?", fontSize: 22, fontWeight: "900", color: "#ffffff" },
        { type: "text", role: "subtitle", content: "하나라도 해당된다면, 저희가 해결해드리겠습니다", fontSize: 13, color: "#ffffff", opacity: 0.5 },
        { type: "card_list", cardBg: "rgba(255,255,255,0.06)", items: [
          { icon: "frustrated", title: "품질 불만", body: "저렴한 제품을 샀다가 금방 망가져서 오히려 돈 낭비한 경험", titleColor: "#ffffff", bodyColor: "#ffffff" },
          { icon: "anxious", title: "선택 장애", body: "비슷해 보이는 제품이 너무 많아서 뭘 골라야 할지 모르겠는 분", titleColor: "#ffffff", bodyColor: "#ffffff" },
          { icon: "worried", title: "가품 걱정", body: "온라인 구매 시 정품인지 확인할 수 없어 불안한 경험", titleColor: "#ffffff", bodyColor: "#ffffff" },
          { icon: "sad", title: "사후관리 부재", body: "구매 후 문제가 생겨도 연락이 안 되는 판매처 경험", titleColor: "#ffffff", bodyColor: "#ffffff" },
        ]},
      ],
    },
    {
      type: "pain_points",
      layout: "card_list",
      bg_color: "#f5f3f0",
      label: "고민 카드 - 서비스 업종",
      preview: "서비스/코칭 맞춤 고민 포인트",
      elements: [
        { type: "text", role: "label", content: "PAIN POINT", fontSize: 12, fontWeight: "700", color: "#FF6B9D" },
        { type: "text", role: "title", content: "이런 고민\n있으시죠?", fontSize: 22, fontWeight: "900", color: "#1a1a1a" },
        { type: "text", role: "subtitle", content: "하나라도 해당된다면, 저희가 해결해드리겠습니다", fontSize: 13, color: "#1a1a1a", opacity: 0.5 },
        { type: "card_list", items: [
          { icon: "frustrated", title: "시간 낭비", body: "혼자 해보려다 시간만 낭비하고 결과는 만족스럽지 않았던 경험" },
          { icon: "anxious", title: "비용 부담", body: "전문 서비스는 너무 비싸서 엄두가 나지 않는다고 느끼시는 분" },
          { icon: "worried", title: "어디서 시작?", body: "무엇부터 어떻게 시작해야 할지 막막하신 분" },
          { icon: "sad", title: "실패 경험", body: "이전에 다른 곳에서 진행했다가 만족스럽지 못했던 경험" },
          { icon: "disappointed", title: "소통 문제", body: "담당자와 소통이 안 되어 원하는 결과를 얻지 못한 경험" },
        ]},
      ],
    },
  ],

  // ============================================================
  // FEATURES - 특장점 / 소개
  // ============================================================
  features: [
    {
      type: "features",
      layout: "grid_2col",
      bg_color: "#1B5E20",
      label: "특장점 그리드 2열 - 다크 배경",
      preview: "다크 배경에 2열 그리드로 6개 특장점 카드 배치",
      elements: [
        { type: "text", role: "label", content: "ABOUT PRODUCT", fontSize: 12, fontWeight: "700", color: "#FF6F00" },
        { type: "text", role: "title", content: "왜 이 제품이\n특별한가요?", fontSize: 22, fontWeight: "900", color: "#ffffff" },
        { type: "divider", color: "#FF6F00", width: 40, height: 3 },
        { type: "feature_grid", columns: 2, cardBg: "rgba(255,111,0,0.08)", items: [
          { title: "프리미엄 품질", body: "엄선된 소재와 꼼꼼한 제조 공정으로 완성한 최상급 퀄리티", titleColor: "#ffffff", bodyColor: "#ffffff" },
          { title: "안전 인증", body: "국가 공인 기관의 안전성 인증을 모두 통과했습니다", titleColor: "#ffffff", bodyColor: "#ffffff" },
          { title: "빠른 배송", body: "주문 후 당일 출고, 다음날 안전하게 도착합니다", titleColor: "#ffffff", bodyColor: "#ffffff" },
          { title: "100% 만족", body: "불만족 시 전액 환불, 교환도 무료로 진행됩니다", titleColor: "#ffffff", bodyColor: "#ffffff" },
          { title: "합리적 가격", body: "유통 마진을 줄여 최고 품질을 합리적 가격에 제공", titleColor: "#ffffff", bodyColor: "#ffffff" },
          { title: "풍성한 구성", body: "본품 외 사은품과 특별 혜택을 함께 드립니다", titleColor: "#ffffff", bodyColor: "#ffffff" },
        ]},
      ],
    },
    {
      type: "features",
      layout: "grid_2col",
      bg_color: "#F8BBD0",
      label: "특장점 그리드 2열 - 라이트 배경",
      preview: "밝은 핑크 배경에 2열 그리드, 다크 텍스트",
      elements: [
        { type: "text", role: "label", content: "ABOUT PRODUCT", fontSize: 12, fontWeight: "700", color: "#4A148C" },
        { type: "text", role: "title", content: "왜 이 제품이\n특별한가요?", fontSize: 22, fontWeight: "900", color: "#1a1a1a" },
        { type: "divider", color: "#4A148C", width: 40, height: 3 },
        { type: "feature_grid", columns: 2, cardBg: "rgba(74,20,140,0.08)", items: [
          { title: "프리미엄 품질", body: "엄선된 소재와 꼼꼼한 제조 공정으로 완성한 최상급 퀄리티", titleColor: "#1a1a1a", bodyColor: "#1a1a1a" },
          { title: "안전 인증", body: "국가 공인 기관의 안전성 인증을 모두 통과했습니다", titleColor: "#1a1a1a", bodyColor: "#1a1a1a" },
          { title: "빠른 배송", body: "주문 후 당일 출고, 다음날 안전하게 도착합니다", titleColor: "#1a1a1a", bodyColor: "#1a1a1a" },
          { title: "100% 만족", body: "불만족 시 전액 환불, 교환도 무료로 진행됩니다", titleColor: "#1a1a1a", bodyColor: "#1a1a1a" },
          { title: "합리적 가격", body: "유통 마진을 줄여 최고 품질을 합리적 가격에 제공", titleColor: "#1a1a1a", bodyColor: "#1a1a1a" },
          { title: "풍성한 구성", body: "본품 외 사은품과 특별 혜택을 함께 드립니다", titleColor: "#1a1a1a", bodyColor: "#1a1a1a" },
        ]},
      ],
    },
    {
      type: "features",
      layout: "grid_2col",
      bg_color: "#6B5CE7",
      label: "특장점 그리드 - 서비스 업종",
      preview: "보라색 배경에 서비스 특화 특장점 6개",
      elements: [
        { type: "text", role: "label", content: "ABOUT SERVICE", fontSize: 12, fontWeight: "700", color: "#FF6B9D" },
        { type: "text", role: "title", content: "왜 이 서비스를\n선택해야 할까요?", fontSize: 22, fontWeight: "900", color: "#ffffff" },
        { type: "divider", color: "#FF6B9D", width: 40, height: 3 },
        { type: "feature_grid", columns: 2, cardBg: "rgba(255,107,157,0.08)", items: [
          { title: "맞춤 설계", body: "고객 상황에 딱 맞는 최적의 솔루션을 설계합니다", titleColor: "#ffffff", bodyColor: "#ffffff" },
          { title: "전문가 직접", body: "해당 분야 현업 전문가가 처음부터 끝까지 직접 담당", titleColor: "#ffffff", bodyColor: "#ffffff" },
          { title: "빠른 결과", body: "효율적인 프로세스로 기대 이상의 빠른 결과를 제공", titleColor: "#ffffff", bodyColor: "#ffffff" },
          { title: "사후 관리", body: "완료 후에도 지속적인 케어와 피드백을 드립니다", titleColor: "#ffffff", bodyColor: "#ffffff" },
          { title: "실시간 소통", body: "진행 과정을 실시간으로 공유하고 즉각 소통합니다", titleColor: "#ffffff", bodyColor: "#ffffff" },
          { title: "성과 리포트", body: "결과를 수치화한 성과 보고서를 제공합니다", titleColor: "#ffffff", bodyColor: "#ffffff" },
        ]},
      ],
    },
    {
      type: "features",
      layout: "grid_2col",
      bg_color: "#880E4F",
      label: "특장점 그리드 - 로즈 다크",
      preview: "로즈 배경에 고급스러운 특장점 6개",
      elements: [
        { type: "text", role: "label", content: "ABOUT PRODUCT", fontSize: 12, fontWeight: "700", color: "#FCE4EC" },
        { type: "text", role: "title", content: "왜 이 제품이\n특별한가요?", fontSize: 22, fontWeight: "900", color: "#ffffff" },
        { type: "divider", color: "#FCE4EC", width: 40, height: 3 },
        { type: "feature_grid", columns: 2, cardBg: "rgba(252,228,236,0.08)", items: [
          { title: "프리미엄 품질", body: "엄선된 소재와 꼼꼼한 제조 공정으로 완성한 최상급 퀄리티", titleColor: "#ffffff", bodyColor: "#ffffff" },
          { title: "안전 인증", body: "국가 공인 기관의 안전성 인증을 모두 통과했습니다", titleColor: "#ffffff", bodyColor: "#ffffff" },
          { title: "빠른 배송", body: "주문 후 당일 출고, 다음날 안전하게 도착합니다", titleColor: "#ffffff", bodyColor: "#ffffff" },
          { title: "100% 만족", body: "불만족 시 전액 환불, 교환도 무료로 진행됩니다", titleColor: "#ffffff", bodyColor: "#ffffff" },
          { title: "합리적 가격", body: "유통 마진을 줄여 최고 품질을 합리적 가격에 제공", titleColor: "#ffffff", bodyColor: "#ffffff" },
          { title: "풍성한 구성", body: "본품 외 사은품과 특별 혜택을 함께 드립니다", titleColor: "#ffffff", bodyColor: "#ffffff" },
        ]},
      ],
    },
  ],

  // ============================================================
  // POINT - 상세 설명 / 디테일
  // ============================================================
  point: [
    {
      type: "point",
      layout: "full_image",
      bg_color: "#880E4F",
      label: "상세 포인트 - 이미지 + 본문 (다크)",
      preview: "다크 배경에 이미지와 상세 설명 본문 교차 배치",
      elements: [
        { type: "text", role: "label", content: "DETAIL", fontSize: 12, fontWeight: "700", color: "#FCE4EC" },
        { type: "text", role: "title", content: "제품을\n꼼꼼하게 살펴보세요", fontSize: 22, fontWeight: "900", color: "#ffffff" },
        { type: "image", role: "detail_1", placeholder: "[상세 이미지 1 - 전체 외관]", aspectRatio: "3/2", borderRadius: 16 },
        { type: "text", role: "body", content: "수많은 테스트와 고객 피드백을 거쳐 완성되었습니다. 최고 품질의 원료만을 엄선하고, 꼼꼼한 품질 관리 공정을 통해 한 제품 한 제품 정성을 다해 만들었습니다.\n\n디테일 하나까지 놓치지 않는 장인 정신으로, 고객님이 실제로 사용하실 때의 편의성과 만족도를 최우선으로 고려하여 설계했습니다.", fontSize: 14, color: "#ffffff", opacity: 0.75 },
        { type: "image", role: "detail_2", placeholder: "[상세 이미지 2 - 디테일 컷]", aspectRatio: "3/2", borderRadius: 16 },
        { type: "image", role: "detail_3", placeholder: "[상세 이미지 3 - 사용 장면]", aspectRatio: "3/2", borderRadius: 16 },
      ],
    },
    {
      type: "point",
      layout: "full_image",
      bg_color: "#F8BBD0",
      label: "상세 포인트 - 이미지 + 본문 (라이트)",
      preview: "밝은 배경에 이미지와 상세 설명, 다크 텍스트",
      elements: [
        { type: "text", role: "label", content: "DETAIL", fontSize: 12, fontWeight: "700", color: "#4A148C" },
        { type: "text", role: "title", content: "제품을\n꼼꼼하게 살펴보세요", fontSize: 22, fontWeight: "900", color: "#1a1a1a" },
        { type: "image", role: "detail_1", placeholder: "[상세 이미지 1 - 전체 외관]", aspectRatio: "3/2", borderRadius: 16 },
        { type: "text", role: "body", content: "수많은 테스트와 고객 피드백을 거쳐 완성되었습니다. 최고 품질의 원료만을 엄선하고, 꼼꼼한 품질 관리 공정을 통해 한 제품 한 제품 정성을 다해 만들었습니다.\n\n디테일 하나까지 놓치지 않는 장인 정신으로, 고객님이 실제로 사용하실 때의 편의성과 만족도를 최우선으로 고려하여 설계했습니다.", fontSize: 14, color: "#1a1a1a", opacity: 0.75 },
        { type: "image", role: "detail_2", placeholder: "[상세 이미지 2 - 디테일 컷]", aspectRatio: "3/2", borderRadius: 16 },
        { type: "image", role: "detail_3", placeholder: "[상세 이미지 3 - 사용 장면]", aspectRatio: "3/2", borderRadius: 16 },
      ],
    },
    {
      type: "point",
      layout: "full_image",
      bg_color: "#6B5CE7",
      label: "상세 포인트 - 서비스 키 피처",
      preview: "보라 배경에 서비스 핵심 특징 이미지 + 설명",
      elements: [
        { type: "text", role: "label", content: "KEY FEATURES", fontSize: 12, fontWeight: "700", color: "#FF6B9D" },
        { type: "text", role: "title", content: "이렇게\n다릅니다", fontSize: 22, fontWeight: "900", color: "#ffffff" },
        { type: "image", role: "detail_1", placeholder: "[핵심 특징 이미지 1]", aspectRatio: "3/2", borderRadius: 16 },
        { type: "text", role: "body", content: "고객님의 상황과 목표를 깊이 이해하고, 최적의 솔루션을 제시합니다. 단순한 서비스 제공이 아닌, 고객 성공을 위한 진정한 파트너가 되겠습니다.\n\n업계 최고 수준의 프로세스와 노하우를 바탕으로, 기대 이상의 결과를 만들어 드립니다.", fontSize: 14, color: "#ffffff", opacity: 0.75 },
        { type: "image", role: "detail_2", placeholder: "[핵심 특징 이미지 2]", aspectRatio: "3/2", borderRadius: 16 },
        { type: "image", role: "detail_3", placeholder: "[핵심 특징 이미지 3]", aspectRatio: "3/2", borderRadius: 16 },
      ],
    },
  ],

  // ============================================================
  // REVIEW - 후기 섹션
  // ============================================================
  review: [
    {
      type: "review",
      layout: "card_list",
      bg_color: "#880E4F",
      label: "구매 후기 - 다크 배경 카드",
      preview: "다크 배경에 프로필 아바타, 별점, 후기 텍스트",
      elements: [
        { type: "text", role: "label", content: "REVIEW", fontSize: 12, fontWeight: "700", color: "#FCE4EC" },
        { type: "text", role: "title", content: "구매 후기", fontSize: 22, fontWeight: "900", color: "#ffffff" },
        { type: "text", role: "subtitle", content: "실제 고객님들의 솔직한 후기입니다", fontSize: 13, color: "#ffffff", opacity: 0.5 },
        { type: "review_list", cardBg: "rgba(255,255,255,0.06)", items: [
          { name: "김서연", meta: "구매 고객 - 2개월 사용", avatar: "김", avatarBg: "rgba(252,228,236,0.2)", avatarColor: "#FCE4EC", stars: 5, text: "솔직히 처음엔 가격이 좀 있다 싶었는데, 실물 받아보니 바로 이해됐어요. 마감이 정말 깔끔하고 품질이 확실히 다르더라고요. 지인들한테도 추천했더니 다들 만족하고 있어요.", nameColor: "#ffffff", textColor: "#ffffff" },
          { name: "이준혁", meta: "재구매 고객 - 5회 구매", avatar: "이", avatarBg: "rgba(252,228,236,0.2)", avatarColor: "#FCE4EC", stars: 5, text: "이미 5번째 구매입니다. 처음 써보고 나서 다른 제품은 눈에 안 들어오더라고요. 특히 내구성이 뛰어나서 오래 쓸 수 있는 게 가장 큰 장점입니다.", nameColor: "#ffffff", textColor: "#ffffff" },
          { name: "박하은", meta: "구매 고객 - 1주일 사용", avatar: "박", avatarBg: "rgba(252,228,236,0.2)", avatarColor: "#FCE4EC", stars: 5, text: "인스타에서 보고 반신반의하면서 샀는데, 기대 이상이에요! 디자인도 세련되고 기능도 완벽합니다. 고객센터 응대도 너무 친절해서 감동받았어요.", nameColor: "#ffffff", textColor: "#ffffff" },
        ]},
      ],
    },
    {
      type: "review",
      layout: "card_list",
      bg_color: "#f5f3f0",
      label: "구매 후기 - 라이트 배경 카드",
      preview: "밝은 배경에 프로필 아바타, 별점, 후기 텍스트",
      elements: [
        { type: "text", role: "label", content: "MORE REVIEWS", fontSize: 12, fontWeight: "700", color: "#FF6B9D" },
        { type: "text", role: "title", content: "더 많은 고객 후기", fontSize: 22, fontWeight: "900", color: "#1a1a1a" },
        { type: "text", role: "subtitle", content: "수백 건의 후기 중 엄선했습니다", fontSize: 13, color: "#1a1a1a", opacity: 0.5 },
        { type: "review_list", cardBg: "rgba(26,26,26,0.03)", items: [
          { name: "최민수", meta: "구매 고객 - 선물용", avatar: "최", avatarBg: "rgba(255,107,157,0.2)", avatarColor: "#FF6B9D", stars: 5, text: "부모님 선물로 구매했는데 너무 좋아하세요! 포장도 고급스럽고 제품 자체의 품질도 훌륭합니다. 선물용으로 이만한 게 없는 것 같아요.", nameColor: "#1a1a1a", textColor: "#1a1a1a" },
          { name: "정수빈", meta: "개인 고객 - 2회차 구매", avatar: "정", avatarBg: "rgba(255,107,157,0.2)", avatarColor: "#FF6B9D", stars: 5, text: "첫 번째 구매 후 결과가 너무 좋아서 바로 두 번째도 주문했어요. 매번 기대 이상의 품질이라 신뢰가 갑니다.", nameColor: "#1a1a1a", textColor: "#1a1a1a" },
          { name: "윤지호", meta: "추천으로 구매 - 1개월 사용", avatar: "윤", avatarBg: "rgba(255,107,157,0.2)", avatarColor: "#FF6B9D", stars: 5, text: "블로그 후기 보고 구매했는데 후기가 과장이 아니었어요. 오히려 직접 써보니 더 만족스러웠습니다.", nameColor: "#1a1a1a", textColor: "#1a1a1a" },
        ]},
      ],
    },
    {
      type: "review",
      layout: "card_list",
      bg_color: "#6B5CE7",
      label: "서비스 이용 후기 - 보라 배경",
      preview: "보라 배경에 서비스 이용 후기 3건",
      elements: [
        { type: "text", role: "label", content: "REVIEW", fontSize: 12, fontWeight: "700", color: "#FF6B9D" },
        { type: "text", role: "title", content: "이용 후기", fontSize: 22, fontWeight: "900", color: "#ffffff" },
        { type: "text", role: "subtitle", content: "실제 고객님들의 솔직한 후기입니다", fontSize: 13, color: "#ffffff", opacity: 0.5 },
        { type: "review_list", cardBg: "rgba(255,255,255,0.06)", items: [
          { name: "김서연", meta: "이용 고객 - 서비스 완료", avatar: "김", avatarBg: "rgba(255,107,157,0.2)", avatarColor: "#FF6B9D", stars: 5, text: "다른 업체에서 두 번이나 실패하고 이곳에 맡겼는데, 처음부터 달랐어요. 상담 때부터 제 상황을 정확히 파악하고 맞춤형으로 진행해주셨어요.", nameColor: "#ffffff", textColor: "#ffffff" },
          { name: "이준혁", meta: "3개월 이용 - 재이용 예정", avatar: "이", avatarBg: "rgba(255,107,157,0.2)", avatarColor: "#FF6B9D", stars: 5, text: "가격 대비 퀄리티가 놀랍습니다. 솔직히 이 가격에 이 정도 퀄리티를 기대하지 않았거든요. 진행 과정도 투명하게 공유해주시고, 피드백도 바로바로 반영해주셨습니다.", nameColor: "#ffffff", textColor: "#ffffff" },
          { name: "박하은", meta: "신규 고객 - 서비스 완료", avatar: "박", avatarBg: "rgba(255,107,157,0.2)", avatarColor: "#FF6B9D", stars: 5, text: "주변 추천으로 시작했는데 추천해준 사람한테 감사 인사를 전했습니다. 전문가 분이 직접 상담해주시고 꼼꼼하게 진행해주셔서 안심이 됐어요.", nameColor: "#ffffff", textColor: "#ffffff" },
        ]},
      ],
    },
  ],

  // ============================================================
  // STATS HIGHLIGHT - 통계 / 스펙 테이블
  // ============================================================
  stats_highlight: [
    {
      type: "stats_highlight",
      layout: "table",
      bg_color: "#f5f3f0",
      label: "제품 스펙 테이블 - 라이트",
      preview: "밝은 배경에 줄무늬 테이블로 제품 상세 스펙 표시",
      elements: [
        { type: "text", role: "label", content: "SPECIFICATIONS", fontSize: 12, fontWeight: "700", color: "#FF6F00" },
        { type: "text", role: "title", content: "상세 스펙", fontSize: 22, fontWeight: "900", color: "#1a1a1a" },
        { type: "spec_table", borderColor: "rgba(26,26,26,0.08)", items: [
          { key: "제품명", value: "프리미엄 제품", keyColor: "#1a1a1a", valueColor: "#1a1a1a" },
          { key: "구성품", value: "본품 + 전용 케이스 + 사용 설명서", keyColor: "#1a1a1a", valueColor: "#1a1a1a" },
          { key: "소재/원료", value: "프리미엄 등급 엄선 소재", keyColor: "#1a1a1a", valueColor: "#1a1a1a" },
          { key: "사이즈/용량", value: "기본형 (상세 옵션 선택 가능)", keyColor: "#1a1a1a", valueColor: "#1a1a1a" },
          { key: "제조국", value: "대한민국", keyColor: "#1a1a1a", valueColor: "#1a1a1a" },
          { key: "제조사", value: "자체 생산 (OEM 아님)", keyColor: "#1a1a1a", valueColor: "#1a1a1a" },
          { key: "인증사항", value: "KC인증 / 품질보증마크", keyColor: "#1a1a1a", valueColor: "#1a1a1a" },
          { key: "보증기간", value: "구매일로부터 1년", keyColor: "#1a1a1a", valueColor: "#1a1a1a" },
          { key: "배송정보", value: "무료배송 - 당일출고 (영업일 기준)", keyColor: "#1a1a1a", valueColor: "#1a1a1a" },
          { key: "A/S", value: "1년 무상 A/S - 이후 유상 수리", keyColor: "#1a1a1a", valueColor: "#1a1a1a" },
        ]},
      ],
    },
    {
      type: "stats_highlight",
      layout: "table",
      bg_color: "#1a1a1a",
      label: "제품 스펙 테이블 - 다크",
      preview: "어두운 배경에 반투명 줄무늬 테이블",
      elements: [
        { type: "text", role: "label", content: "SPECIFICATIONS", fontSize: 12, fontWeight: "700", color: "#4A148C" },
        { type: "text", role: "title", content: "상세 스펙", fontSize: 22, fontWeight: "900", color: "#ffffff" },
        { type: "spec_table", borderColor: "rgba(255,255,255,0.08)", items: [
          { key: "제품명", value: "프리미엄 제품", keyColor: "#ffffff", valueColor: "#ffffff" },
          { key: "구성품", value: "본품 + 전용 케이스 + 사용 설명서", keyColor: "#ffffff", valueColor: "#ffffff" },
          { key: "소재/원료", value: "프리미엄 등급 엄선 소재", keyColor: "#ffffff", valueColor: "#ffffff" },
          { key: "사이즈/용량", value: "기본형 (상세 옵션 선택 가능)", keyColor: "#ffffff", valueColor: "#ffffff" },
          { key: "제조국", value: "대한민국", keyColor: "#ffffff", valueColor: "#ffffff" },
          { key: "인증사항", value: "KC인증 / 품질보증마크", keyColor: "#ffffff", valueColor: "#ffffff" },
          { key: "배송정보", value: "무료배송 - 당일출고 (영업일 기준)", keyColor: "#ffffff", valueColor: "#ffffff" },
          { key: "A/S", value: "1년 무상 A/S - 이후 유상 수리", keyColor: "#ffffff", valueColor: "#ffffff" },
        ]},
      ],
    },
    {
      type: "stats_highlight",
      layout: "table",
      bg_color: "#f5f3f0",
      label: "서비스 범위 테이블",
      preview: "서비스 업종 맞춤 스펙 테이블",
      elements: [
        { type: "text", role: "label", content: "SPECIFICATIONS", fontSize: 12, fontWeight: "700", color: "#FF6B9D" },
        { type: "text", role: "title", content: "서비스 범위", fontSize: 22, fontWeight: "900", color: "#1a1a1a" },
        { type: "spec_table", borderColor: "rgba(26,26,26,0.08)", items: [
          { key: "서비스명", value: "맞춤형 컨설팅 과정", keyColor: "#1a1a1a", valueColor: "#1a1a1a" },
          { key: "진행 방식", value: "온라인 / 오프라인 선택 가능", keyColor: "#1a1a1a", valueColor: "#1a1a1a" },
          { key: "소요 기간", value: "패키지에 따라 상이 (상담 시 확정)", keyColor: "#1a1a1a", valueColor: "#1a1a1a" },
          { key: "포함 사항", value: "기획 > 진행 > 결과물 > 사후관리", keyColor: "#1a1a1a", valueColor: "#1a1a1a" },
          { key: "수정 횟수", value: "스탠다드 이상 무제한 수정", keyColor: "#1a1a1a", valueColor: "#1a1a1a" },
          { key: "담당 인력", value: "해당 분야 전문가 1인 전담", keyColor: "#1a1a1a", valueColor: "#1a1a1a" },
          { key: "중간 보고", value: "주 1회 진행 상황 리포트", keyColor: "#1a1a1a", valueColor: "#1a1a1a" },
          { key: "사후 관리", value: "완료 후 30일간 무상 A/S", keyColor: "#1a1a1a", valueColor: "#1a1a1a" },
          { key: "환불 정책", value: "시작 전 100% 환불 가능", keyColor: "#1a1a1a", valueColor: "#1a1a1a" },
        ]},
      ],
    },
  ],

  // ============================================================
  // COMPARISON - Before/After 비교
  // ============================================================
  comparison: [
    {
      type: "comparison",
      layout: "grid_2col",
      bg_color: "#f5f3f0",
      label: "Before/After 비교 - 라이트",
      preview: "2열로 Before/After 이미지와 체크리스트 비교",
      elements: [
        { type: "text", role: "label", content: "RESULTS", fontSize: 12, fontWeight: "700", color: "#FF6F00" },
        { type: "text", role: "title", content: "사용 전 vs 사용 후", fontSize: 22, fontWeight: "900", color: "#1a1a1a" },
        { type: "image_compare", before: "[Before 이미지]", after: "[After 이미지]", aspectRatio: "1/1", borderRadius: 16 },
        { type: "compare_list",
          before: {
            label: "BEFORE", labelColor: "#e74c3c",
            items: ["기존 제품 불만족", "잦은 교체 비용 발생", "품질에 대한 불안감"],
            iconColor: "#e74c3c", textColor: "#1a1a1a",
          },
          after: {
            label: "AFTER", labelColor: "#FF6F00",
            items: ["압도적 품질 만족", "오랜 사용 수명으로 경제적", "검증된 안전성으로 안심 사용"],
            iconColor: "#FF6F00", textColor: "#1a1a1a",
          },
        },
      ],
    },
    {
      type: "comparison",
      layout: "grid_2col",
      bg_color: "#1a1a1a",
      label: "Before/After 비교 - 다크",
      preview: "다크 배경에 Before/After 비교 레이아웃",
      elements: [
        { type: "text", role: "label", content: "RESULTS", fontSize: 12, fontWeight: "700", color: "#4A148C" },
        { type: "text", role: "title", content: "사용 전 vs 사용 후", fontSize: 22, fontWeight: "900", color: "#ffffff" },
        { type: "image_compare", before: "[Before 이미지]", after: "[After 이미지]", aspectRatio: "1/1", borderRadius: 16 },
        { type: "compare_list",
          before: {
            label: "BEFORE", labelColor: "#e74c3c",
            items: ["기존 제품 불만족", "잦은 교체 비용 발생", "품질에 대한 불안감"],
            iconColor: "#e74c3c", textColor: "#ffffff",
          },
          after: {
            label: "AFTER", labelColor: "#4A148C",
            items: ["압도적 품질 만족", "오랜 사용 수명으로 경제적", "검증된 안전성으로 안심 사용"],
            iconColor: "#4A148C", textColor: "#ffffff",
          },
        },
      ],
    },
  ],

  // ============================================================
  // FAQ - 자주 묻는 질문
  // ============================================================
  faq: [
    {
      type: "faq",
      layout: "accordion",
      bg_color: "#880E4F",
      label: "FAQ - 제품 배송/교환 (다크)",
      preview: "다크 배경에 Q&A 아코디언 리스트",
      elements: [
        { type: "text", role: "label", content: "FAQ", fontSize: 12, fontWeight: "700", color: "#FCE4EC" },
        { type: "text", role: "title", content: "자주 묻는 질문", fontSize: 22, fontWeight: "900", color: "#ffffff" },
        { type: "faq_list", dividerColor: "rgba(255,255,255,0.08)", items: [
          { q: "배송은 얼마나 걸리나요?", a: "결제 완료 후 당일 출고되며, 수도권 기준 다음날, 지방은 2~3일 내 도착합니다. 제주/도서산간은 추가 1~2일 소요될 수 있습니다.", qColor: "#ffffff", aColor: "#ffffff" },
          { q: "교환/환불이 가능한가요?", a: "네, 수령 후 7일 이내 100% 교환/환불 가능합니다. 단순 변심에도 무료 반품이 가능하니 부담 없이 구매하세요.", qColor: "#ffffff", aColor: "#ffffff" },
          { q: "선물 포장이 되나요?", a: "네, 주문 시 선물 포장 옵션을 무료로 선택하실 수 있습니다. 프리미엄 패키지의 경우 고급 선물 상자에 포장됩니다.", qColor: "#ffffff", aColor: "#ffffff" },
          { q: "대량 주문 할인이 있나요?", a: "10개 이상 대량 주문 시 별도 견적을 드립니다. 기업 판촉, 단체 선물 등 맞춤 견적이 필요하시면 고객센터로 문의해주세요.", qColor: "#ffffff", aColor: "#ffffff" },
          { q: "A/S는 어떻게 받나요?", a: "구매일로부터 1년간 무상 A/S가 제공됩니다. 이후에도 합리적인 비용으로 유상 수리가 가능합니다.", qColor: "#ffffff", aColor: "#ffffff" },
        ]},
      ],
    },
    {
      type: "faq",
      layout: "accordion",
      bg_color: "#6B5CE7",
      label: "FAQ - 서비스 이용 안내 (퍼플)",
      preview: "보라 배경에 서비스 FAQ",
      elements: [
        { type: "text", role: "label", content: "FAQ", fontSize: 12, fontWeight: "700", color: "#FF6B9D" },
        { type: "text", role: "title", content: "자주 묻는 질문", fontSize: 22, fontWeight: "900", color: "#ffffff" },
        { type: "faq_list", dividerColor: "rgba(255,255,255,0.08)", items: [
          { q: "상담은 어떻게 진행되나요?", a: "신청 후 24시간 이내에 전문가가 연락드립니다. 화상/전화/대면 중 편하신 방법을 선택하실 수 있으며, 첫 상담은 무료입니다.", qColor: "#ffffff", aColor: "#ffffff" },
          { q: "환불 정책은 어떻게 되나요?", a: "서비스 시작 전 100% 환불, 시작 후에는 진행 비율에 따라 잔여 기간 비례 환불됩니다.", qColor: "#ffffff", aColor: "#ffffff" },
          { q: "진행 기간은 얼마나 걸리나요?", a: "패키지와 프로젝트 규모에 따라 다르며, 초기 상담 시 정확한 일정을 안내해 드립니다. 급한 경우 빠른 진행 옵션도 있습니다.", qColor: "#ffffff", aColor: "#ffffff" },
          { q: "중간에 수정 요청이 가능한가요?", a: "물론입니다. 스탠다드 이상 패키지는 무제한 수정이 포함되어 있으며, 베이직도 2회까지 무료 수정이 가능합니다.", qColor: "#ffffff", aColor: "#ffffff" },
          { q: "비밀유지가 보장되나요?", a: "모든 프로젝트는 NDA(비밀유지계약) 체결 후 진행됩니다. 고객님의 정보와 프로젝트 내용은 철저히 보호됩니다.", qColor: "#ffffff", aColor: "#ffffff" },
        ]},
      ],
    },
  ],

  // ============================================================
  // PRICING - 가격 / 상품 구성
  // ============================================================
  pricing: [
    {
      type: "pricing",
      layout: "card_list",
      bg_color: "#f5f3f0",
      label: "상품 구성 3단 - 라이트",
      preview: "3단 가격 카드 (기본/인기/프리미엄), 추천 강조",
      elements: [
        { type: "text", role: "label", content: "PACKAGE", fontSize: 12, fontWeight: "700", color: "#FCE4EC" },
        { type: "text", role: "title", content: "상품 구성", fontSize: 22, fontWeight: "900", color: "#1a1a1a" },
        { type: "pricing_cards", items: [
          { name: "기본 구성", originalPrice: "39,000", price: "29,000", desc: "단품 1개 - 무료배송 - 기본 구성", recommended: false, borderColor: "rgba(26,26,26,0.06)" },
          { name: "인기 세트 (BEST)", originalPrice: "78,000", price: "49,000", desc: "3개 세트 - 무료배송 - 사은품 - 37% 할인", recommended: true, accentColor: "#FCE4EC", badgeText: "추천" },
          { name: "프리미엄 패키지", originalPrice: "150,000", price: "79,000", desc: "5개 세트 - 무료배송 - 사은품 - VIP 혜택 - 47% 할인", recommended: false, borderColor: "rgba(26,26,26,0.06)" },
        ]},
      ],
    },
    {
      type: "pricing",
      layout: "card_list",
      bg_color: "#f5f3f0",
      label: "서비스 요금 3단 - 라이트",
      preview: "서비스 업종 요금 카드 (베이직/스탠다드/프리미엄)",
      elements: [
        { type: "text", role: "label", content: "PRICING", fontSize: 12, fontWeight: "700", color: "#FF6B9D" },
        { type: "text", role: "title", content: "요금 안내", fontSize: 22, fontWeight: "900", color: "#1a1a1a" },
        { type: "pricing_cards", items: [
          { name: "베이직", originalPrice: "150,000", price: "99,000", desc: "기본 서비스 - 1회 상담 - 결과 보고서 포함", recommended: false, borderColor: "rgba(26,26,26,0.06)" },
          { name: "스탠다드 (BEST)", originalPrice: "350,000", price: "199,000", desc: "심화 서비스 - 무제한 수정 - 1:1 피드백 - 사후관리 30일", recommended: true, accentColor: "#FF6B9D", badgeText: "추천" },
          { name: "프리미엄", originalPrice: "700,000", price: "399,000", desc: "올인원 패키지 - 평생 관리 - VIP 전용 - 우선 진행", recommended: false, borderColor: "rgba(26,26,26,0.06)" },
        ]},
      ],
    },
  ],

  // ============================================================
  // GUARANTEE - 신뢰 / 보증
  // ============================================================
  guarantee: [
    {
      type: "guarantee",
      layout: "centered_text",
      bg_color: "#880E4F",
      label: "신뢰 뱃지 - 다크 로즈",
      preview: "로즈 배경에 신뢰 뱃지 태그 + 인증 이미지",
      elements: [
        { type: "text", role: "label", content: "TRUST", fontSize: 12, fontWeight: "700", color: "#FCE4EC" },
        { type: "text", role: "title", content: "믿을 수 있는\n품질 보증", fontSize: 22, fontWeight: "900", color: "#ffffff" },
        { type: "badge_list", items: [
          { content: "국내 생산", bg: "rgba(252,228,236,0.12)", color: "#FCE4EC" },
          { content: "품질 인증", bg: "rgba(252,228,236,0.12)", color: "#FCE4EC" },
          { content: "무료 배송", bg: "rgba(252,228,236,0.12)", color: "#FCE4EC" },
          { content: "100% 환불보장", bg: "rgba(252,228,236,0.12)", color: "#FCE4EC" },
          { content: "KC인증", bg: "rgba(252,228,236,0.12)", color: "#FCE4EC" },
          { content: "특허 기술", bg: "rgba(252,228,236,0.12)", color: "#FCE4EC" },
        ]},
        { type: "image_grid", columns: 2, items: [
          { placeholder: "[인증/신뢰 이미지 1]", aspectRatio: "1/1", borderRadius: 14 },
          { placeholder: "[인증/신뢰 이미지 2]", aspectRatio: "1/1", borderRadius: 14 },
        ]},
      ],
    },
    {
      type: "guarantee",
      layout: "centered_text",
      bg_color: "#6B5CE7",
      label: "신뢰 뱃지 - 퍼플 서비스",
      preview: "보라 배경에 서비스 신뢰 뱃지 + 인증 이미지",
      elements: [
        { type: "text", role: "label", content: "TRUST", fontSize: 12, fontWeight: "700", color: "#FF6B9D" },
        { type: "text", role: "title", content: "검증된\n전문성과 신뢰", fontSize: 22, fontWeight: "900", color: "#ffffff" },
        { type: "badge_list", items: [
          { content: "전문가 직접", bg: "rgba(255,107,157,0.12)", color: "#FF6B9D" },
          { content: "맞춤형 서비스", bg: "rgba(255,107,157,0.12)", color: "#FF6B9D" },
          { content: "만족도 98%", bg: "rgba(255,107,157,0.12)", color: "#FF6B9D" },
          { content: "A/S 보장", bg: "rgba(255,107,157,0.12)", color: "#FF6B9D" },
          { content: "누적 5000+건", bg: "rgba(255,107,157,0.12)", color: "#FF6B9D" },
          { content: "NDA 보장", bg: "rgba(255,107,157,0.12)", color: "#FF6B9D" },
        ]},
        { type: "image_grid", columns: 2, items: [
          { placeholder: "[인증/신뢰 이미지 1]", aspectRatio: "1/1", borderRadius: 14 },
          { placeholder: "[인증/신뢰 이미지 2]", aspectRatio: "1/1", borderRadius: 14 },
        ]},
      ],
    },
  ],

  // ============================================================
  // CTA - 최종 구매 유도
  // ============================================================
  cta: [
    {
      type: "cta",
      layout: "centered_text",
      bg_color: "#f5f3f0",
      label: "CTA - 제품 구매 유도 (라이트)",
      preview: "밝은 배경에 긴급성 뱃지, 강력한 헤드라인, CTA 버튼",
      elements: [
        { type: "badge", content: "LIMITED TIME OFFER", bg: "rgba(252,228,236,0.15)", color: "#FCE4EC", fontSize: 12, fontWeight: "800" },
        { type: "text", role: "title", content: "지금 주문하시면\n내일 만나실 수 있습니다", fontSize: 26, fontWeight: "900", color: "#1a1a1a" },
        { type: "text", role: "subtitle", content: "지금이 가장 좋은 시작입니다", fontSize: 14, color: "#1a1a1a", opacity: 0.55 },
        { type: "text", role: "urgency", content: "오늘 주문 시 내일 도착 - 한정 수량", fontSize: 12, fontWeight: "700", color: "#e74c3c" },
        { type: "button", content: "지금 주문하기", bg: "#FCE4EC", color: "#f5f3f0", fontSize: 18, fontWeight: "800", borderRadius: 16 },
        { type: "text", role: "micro", content: "무료배송 - 100% 환불보장 - 당일출고", fontSize: 11, color: "#1a1a1a", opacity: 0.35 },
      ],
    },
    {
      type: "cta",
      layout: "centered_text",
      bg_color: "#f5f3f0",
      label: "CTA - 서비스 시작 유도 (라이트)",
      preview: "밝은 배경에 서비스 CTA, 긴급성 메시지",
      elements: [
        { type: "badge", content: "LIMITED TIME OFFER", bg: "rgba(255,107,157,0.15)", color: "#FF6B9D", fontSize: 12, fontWeight: "800" },
        { type: "text", role: "title", content: "지금 시작하면\n가장 빠른 결과를 얻습니다", fontSize: 26, fontWeight: "900", color: "#1a1a1a" },
        { type: "text", role: "subtitle", content: "지금이 가장 좋은 시작입니다", fontSize: 14, color: "#1a1a1a", opacity: 0.55 },
        { type: "text", role: "urgency", content: "이번 달 신규 상담 접수 마감 임박", fontSize: 12, fontWeight: "700", color: "#e74c3c" },
        { type: "button", content: "지금 시작하기", bg: "#FF6B9D", color: "#f5f3f0", fontSize: 18, fontWeight: "800", borderRadius: 16 },
        { type: "text", role: "micro", content: "무료상담 - 100% 만족보장 - 즉시 시작", fontSize: 11, color: "#1a1a1a", opacity: 0.35 },
      ],
    },
    {
      type: "cta",
      layout: "centered_text",
      bg_color: "#1B5E20",
      label: "CTA - 다크 그린 제품",
      preview: "짙은 그린 배경에 강렬한 CTA",
      elements: [
        { type: "badge", content: "LIMITED TIME OFFER", bg: "rgba(255,111,0,0.15)", color: "#FF6F00", fontSize: 12, fontWeight: "800" },
        { type: "text", role: "title", content: "지금 주문하시면\n내일 만나실 수 있습니다", fontSize: 26, fontWeight: "900", color: "#ffffff" },
        { type: "text", role: "subtitle", content: "지금이 가장 좋은 시작입니다", fontSize: 14, color: "#ffffff", opacity: 0.55 },
        { type: "text", role: "urgency", content: "오늘 주문 시 내일 도착 - 한정 수량", fontSize: 12, fontWeight: "700", color: "#e74c3c" },
        { type: "button", content: "지금 주문하기", bg: "#FF6F00", color: "#1B5E20", fontSize: 18, fontWeight: "800", borderRadius: 16 },
        { type: "text", role: "micro", content: "무료배송 - 100% 환불보장 - 당일출고", fontSize: 11, color: "#ffffff", opacity: 0.35 },
      ],
    },
  ],

  // ============================================================
  // SHIPPING - 배송/교환/반품 안내
  // ============================================================
  shipping: [
    {
      type: "shipping",
      layout: "table",
      bg_color: "#f5f3f0",
      label: "배송/교환/반품 안내 - 라이트",
      preview: "밝은 배경에 배송 정보 테이블",
      elements: [
        { type: "text", role: "label", content: "INFO", fontSize: 12, fontWeight: "700", color: "#FCE4EC" },
        { type: "text", role: "title", content: "배송 - 교환 - 반품 안내", fontSize: 22, fontWeight: "900", color: "#1a1a1a" },
        { type: "info_table", keyWidth: 90, borderColor: "rgba(26,26,26,0.08)", items: [
          { key: "배송비", value: "전 상품 무료배송 (제주/도서산간 3,000원 추가)", keyColor: "#FCE4EC", valueColor: "#1a1a1a" },
          { key: "배송기간", value: "당일 출고 - 수도권 다음날 / 지방 2~3일", keyColor: "#FCE4EC", valueColor: "#1a1a1a" },
          { key: "교환/반품", value: "수령 후 7일 이내 무료 교환/반품 가능", keyColor: "#FCE4EC", valueColor: "#1a1a1a" },
          { key: "환불", value: "반품 접수 후 3영업일 이내 환불 처리", keyColor: "#FCE4EC", valueColor: "#1a1a1a" },
          { key: "보증기간", value: "구매일로부터 1년 무상 A/S", keyColor: "#FCE4EC", valueColor: "#1a1a1a" },
          { key: "고객센터", value: "평일 09:00~18:00 - 카카오톡 실시간 상담", keyColor: "#FCE4EC", valueColor: "#1a1a1a" },
        ]},
      ],
    },
    {
      type: "shipping",
      layout: "table",
      bg_color: "#f5f3f0",
      label: "이용 안내 / 환불 정책 - 서비스",
      preview: "서비스 업종 이용 안내 및 환불 정책 테이블",
      elements: [
        { type: "text", role: "label", content: "INFO", fontSize: 12, fontWeight: "700", color: "#FF6B9D" },
        { type: "text", role: "title", content: "이용 안내 - 환불 정책", fontSize: 22, fontWeight: "900", color: "#1a1a1a" },
        { type: "info_table", keyWidth: 90, borderColor: "rgba(26,26,26,0.08)", items: [
          { key: "상담 방법", value: "화상 / 전화 / 대면 중 선택 가능", keyColor: "#FF6B9D", valueColor: "#1a1a1a" },
          { key: "응답 시간", value: "문의 후 24시간 이내 전문가 연락", keyColor: "#FF6B9D", valueColor: "#1a1a1a" },
          { key: "시작 전 환불", value: "서비스 시작 전 100% 전액 환불", keyColor: "#FF6B9D", valueColor: "#1a1a1a" },
          { key: "시작 후 환불", value: "진행 비율에 따라 잔여분 비례 환불", keyColor: "#FF6B9D", valueColor: "#1a1a1a" },
          { key: "수정 정책", value: "스탠다드 이상 무제한 - 베이직 2회 무료", keyColor: "#FF6B9D", valueColor: "#1a1a1a" },
          { key: "사후 관리", value: "완료 후 30일간 무상 A/S 제공", keyColor: "#FF6B9D", valueColor: "#1a1a1a" },
        ]},
      ],
    },
  ],

  // ============================================================
  // SOCIAL PROOF - 미디어/수상
  // ============================================================
  social_proof: [
    {
      type: "social_proof",
      layout: "grid_3col",
      bg_color: "#f5f3f0",
      label: "미디어 & 인증 - 라이트",
      preview: "미디어 로고 3열 그리드 + 실적 뱃지 2열",
      elements: [
        { type: "text", role: "label", content: "SOCIAL PROOF", fontSize: 12, fontWeight: "700", color: "#FCE4EC" },
        { type: "text", role: "title", content: "미디어 & 인증", fontSize: 22, fontWeight: "900", color: "#1a1a1a" },
        { type: "media_grid", columns: 3, items: [
          { name: "KBS" }, { name: "MBC" }, { name: "SBS" },
          { name: "YTN" }, { name: "NAVER" }, { name: "KAKAO" },
        ]},
        { type: "achievement_grid", columns: 2, cardBg: "rgba(252,228,236,0.08)", items: [
          { text: "TV 방영 제품" },
          { text: "네이버 쇼핑 1위" },
          { text: "인플루언서 추천" },
          { text: "KBS/MBC/SBS 소개" },
          { text: "누적 판매 12만+" },
          { text: "고객 만족도 98%" },
        ]},
      ],
    },
  ],

  // ============================================================
  // SPECIAL OFFER - 특별 혜택
  // ============================================================
  special_offer: [
    {
      type: "special_offer",
      layout: "grid_2col",
      bg_color: "#880E4F",
      label: "특별 혜택 - 제품 (다크 로즈)",
      preview: "긴급성 + 2열 혜택 카드 4개",
      elements: [
        { type: "text", role: "label", content: "SPECIAL OFFER", fontSize: 12, fontWeight: "700", color: "#FCE4EC" },
        { type: "text", role: "title", content: "지금 구매 시 특별 혜택", fontSize: 22, fontWeight: "900", color: "#ffffff" },
        { type: "text", role: "urgency", content: "이번 달 한정 - 수량 소진 시 조기 마감", fontSize: 12, fontWeight: "700", color: "#e74c3c" },
        { type: "feature_grid", columns: 2, cardBg: "rgba(252,228,236,0.08)", items: [
          { title: "사은품 증정", body: "10,000원 상당 전용 악세서리 무료 증정", titleColor: "#ffffff", bodyColor: "#ffffff" },
          { title: "세트 할인", body: "2개 이상 구매 시 최대 40% 추가 할인", titleColor: "#ffffff", bodyColor: "#ffffff" },
          { title: "무료 배송", body: "전 상품 무료배송 + 당일 출고", titleColor: "#ffffff", bodyColor: "#ffffff" },
          { title: "무료 교환", body: "30일 이내 무료 교환/반품 보장", titleColor: "#ffffff", bodyColor: "#ffffff" },
        ]},
      ],
    },
    {
      type: "special_offer",
      layout: "grid_2col",
      bg_color: "#6B5CE7",
      label: "특별 혜택 - 서비스 (퍼플)",
      preview: "보라 배경에 선착순 혜택 카드 4개",
      elements: [
        { type: "text", role: "label", content: "SPECIAL OFFER", fontSize: 12, fontWeight: "700", color: "#FF6B9D" },
        { type: "text", role: "title", content: "지금 신청하면 드리는 혜택", fontSize: 22, fontWeight: "900", color: "#ffffff" },
        { type: "text", role: "urgency", content: "이번 달 선착순 20명 한정", fontSize: 12, fontWeight: "700", color: "#e74c3c" },
        { type: "feature_grid", columns: 2, cardBg: "rgba(255,107,157,0.08)", items: [
          { title: "무료 상담 1회", body: "30분 전문가 1:1 무료 상담 (5만원 상당)", titleColor: "#ffffff", bodyColor: "#ffffff" },
          { title: "맞춤 분석 리포트", body: "고객님 상황에 맞는 전문 분석 리포트 무료 제공", titleColor: "#ffffff", bodyColor: "#ffffff" },
          { title: "빠른 진행", body: "이번 달 신청 시 우선 착수/일정 단축", titleColor: "#ffffff", bodyColor: "#ffffff" },
          { title: "사후관리 연장", body: "30일에서 60일 무상 사후관리 기간 연장", titleColor: "#ffffff", bodyColor: "#ffffff" },
        ]},
      ],
    },
  ],

  // ============================================================
  // TARGET - 추천 대상
  // ============================================================
  target: [
    {
      type: "target",
      layout: "card_list",
      bg_color: "#880E4F",
      label: "추천 대상 - 제품 (다크 로즈)",
      preview: "추천/비추천 분리 카드, 체크리스트 스타일",
      elements: [
        { type: "text", role: "label", content: "WHO IS IT FOR", fontSize: 12, fontWeight: "700", color: "#FCE4EC" },
        { type: "text", role: "title", content: "이런 분께 추천합니다", fontSize: 22, fontWeight: "900", color: "#ffffff" },
        { type: "recommend_card", cardBg: "rgba(252,228,236,0.08)", titleColor: "#FCE4EC", items: [
          "품질 좋은 제품을 오래 쓰고 싶으신 분",
          "가격 대비 최고의 가치를 찾으시는 분",
          "안전하고 검증된 제품만 사용하시는 분",
          "선물용으로 고급스러운 제품이 필요하신 분",
          "기존 제품에 불만족하여 업그레이드를 원하시는 분",
        ]},
        { type: "not_recommend_card", cardBg: "rgba(255,255,255,0.06)", items: [
          "최저가만 찾으시는 분 (품질 우선 제품입니다)",
          "일회용으로 잠깐 쓸 제품을 찾으시는 분",
          "브랜드 로고가 크게 노출된 제품을 원하시는 분",
        ]},
      ],
    },
  ],

  // ============================================================
  // PROCESS - 주문/이용 과정 타임라인
  // ============================================================
  process: [
    {
      type: "process",
      layout: "timeline",
      bg_color: "#f5f3f0",
      label: "주문 과정 타임라인 - 제품",
      preview: "번호 원형 + 타임라인 형태의 주문 과정 5단계",
      elements: [
        { type: "text", role: "label", content: "HOW TO ORDER", fontSize: 12, fontWeight: "700", color: "#FCE4EC" },
        { type: "text", role: "title", content: "간단한 주문 과정", fontSize: 22, fontWeight: "900", color: "#1a1a1a" },
        { type: "timeline", accentColor: "#FCE4EC", lineColor: "rgba(252,228,236,0.2)", items: [
          { step: 1, title: "상품 선택", body: "원하시는 구성을 선택하고 옵션을 지정합니다" },
          { step: 2, title: "결제 완료", body: "안전한 결제 시스템으로 간편하게 결제합니다" },
          { step: 3, title: "당일 출고", body: "전문 포장 후 안전하게 당일 발송합니다" },
          { step: 4, title: "배송 도착", body: "택배로 안전하게 도착, 문자 알림을 드립니다" },
          { step: 5, title: "사용 시작", body: "동봉된 가이드를 참고하여 바로 사용하세요" },
        ]},
      ],
    },
    {
      type: "process",
      layout: "timeline",
      bg_color: "#f5f3f0",
      label: "이용 과정 타임라인 - 서비스",
      preview: "번호 원형 + 타임라인 형태의 서비스 이용 5단계",
      elements: [
        { type: "text", role: "label", content: "HOW IT WORKS", fontSize: 12, fontWeight: "700", color: "#FF6B9D" },
        { type: "text", role: "title", content: "이렇게 진행됩니다", fontSize: 22, fontWeight: "900", color: "#1a1a1a" },
        { type: "timeline", accentColor: "#FF6B9D", lineColor: "rgba(255,107,157,0.2)", items: [
          { step: 1, title: "무료 상담 신청", body: "간단한 정보 입력 후 무료 상담을 신청합니다" },
          { step: 2, title: "전문가 매칭", body: "고객님의 니즈에 맞는 최적의 전문가를 배정합니다" },
          { step: 3, title: "맞춤 설계", body: "상황 분석 후 최적의 솔루션과 일정을 설계합니다" },
          { step: 4, title: "진행 & 중간보고", body: "체계적으로 진행하며 과정을 투명하게 공유합니다" },
          { step: 5, title: "최종 완료 & 사후관리", body: "결과물 전달 후에도 30일간 무상 A/S를 제공합니다" },
        ]},
      ],
    },
  ],

};

// 전체 섹션 타입 목록 (순서대로 상세페이지 구성 시 참고)
export const SECTION_ORDER = [
  "hero",
  "pain_points",
  "features",
  "comparison",
  "point",
  "stats_highlight",
  "guarantee",
  "social_proof",
  "review",
  "process",
  "target",
  "pricing",
  "special_offer",
  "review",       // 추가 후기
  "shipping",
  "faq",
  "cta",
];

// 섹션 타입별 한글 라벨
export const SECTION_TYPE_LABELS = {
  hero: "히어로 (메인 비주얼)",
  pain_points: "고민 포인트",
  features: "특장점 소개",
  comparison: "Before/After 비교",
  point: "상세 설명",
  stats_highlight: "스펙/통계",
  guarantee: "신뢰/보증",
  social_proof: "미디어/수상",
  review: "고객 후기",
  process: "주문/이용 과정",
  target: "추천 대상",
  pricing: "가격/상품 구성",
  special_offer: "특별 혜택",
  shipping: "배송/교환/반품 안내",
  faq: "자주 묻는 질문",
  cta: "구매 유도 (CTA)",
};
