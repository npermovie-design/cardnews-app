import { changePoints, guestLimitExceeded, incrementGuestUsage } from "../storage";
import { CATEGORIES } from "./constants.js";
import { SECTION_TEMPLATES, SECTION_TYPE_LABELS } from "../detailTemplates.js";

export async function runPipeline(ctx) {
  const {
    productName, category, features, options, extraInfo, images, mode, pageCount, designStyle,
    user, showPointConfirm,
    setPhase, setPipeStep, setPipeResults, setPipeError,
    setColorPalette, setSections, setActiveSection,
  } = ctx;

  if (!productName.trim() || !category) return;
  if (!user && guestLimitExceeded()) return;
  if (showPointConfirm && user && !(await showPointConfirm(60))) return;
  if (!user) incrementGuestUsage();

  setPhase("generating");
  setPipeStep(0);
  setPipeResults({});
  setPipeError("");

  const catLabel = CATEGORIES.find(c => c.key === category)?.label || category;

  try {
    // Step 1: 입력 정보 정리
    setPipeStep(1);
    await new Promise(r => setTimeout(r, 1200));
    setPipeResults(prev => ({ ...prev, input: { productName, category: catLabel, features, options, extraInfo } }));

    // Step 2: 이미지 분석 + 색상 추출
    setPipeStep(2);
    let extractedColors = [];
    let aiToneResult = null;
    if (images.length > 0) {
      try {
        const img = new Image();
        img.crossOrigin = "anonymous";
        await new Promise((resolve) => { img.onload = resolve; img.src = images[0].base64; });
        const c = document.createElement("canvas");
        c.width = 64; c.height = 64;
        c.getContext("2d").drawImage(img, 0, 0, 64, 64);
        const data = c.getContext("2d").getImageData(0, 0, 64, 64).data;
        const buckets = {};
        for (let i = 0; i < data.length; i += 4) {
          const r = Math.round(data[i] / 32) * 32;
          const g = Math.round(data[i+1] / 32) * 32;
          const b = Math.round(data[i+2] / 32) * 32;
          const key = `${r},${g},${b}`;
          buckets[key] = (buckets[key] || 0) + 1;
        }
        extractedColors = Object.entries(buckets)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 4)
          .map(([k]) => {
            const [r, g, b] = k.split(",").map(Number);
            return "#" + [r, g, b].map(v => Math.min(255, v).toString(16).padStart(2, "0")).join("");
          });
      } catch (e) { /* color extraction failed */ }

      try {
        const toneRes = await fetch("/api/gemini-generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: `제품:"${productName}" 카테고리:${CATEGORIES.find(c=>c.key===category)?.label||"일반"} 추출색상:${extractedColors.join(",")}
이 제품에 어울리는 톤앤매너를 JSON으로 출력해줘:
{"tone":"톤(예:전문적/따뜻한/고급스러운/활기찬)","voice":"말투(예:~합니다/~해요/~이다)","mood":"분위기 한 줄"}
JSON만 출력.`, maxTokens: 200 }),
        });
        const toneData2 = await toneRes.json();
        const toneParsed = JSON.parse((toneData2.text || "{}").replace(/```json?\s*/g, "").replace(/```/g, "").trim());
        aiToneResult = toneParsed;
      } catch {}
    }
    setPipeResults(prev => ({ ...prev, image: { colors: extractedColors, tone: aiToneResult } }));
    await new Promise(r => setTimeout(r, 1000));

    // Step 3: 톤앤매너 + 색상 팔레트
    setPipeStep(3);
    const sectionCount = pageCount;
    const toneData = {
      tone: aiToneResult?.tone || "전문적", voice: aiToneResult?.voice || "~합니다",
      color_palette: {
        main: extractedColors[0] || "#7c6aff",
        gradient: extractedColors[1] || "#9b8ec4",
        light_bg: "#f8f8f8",
        dark_bg: extractedColors[2] || "#2d2d3a",
      },
      font_style: "bold", section_count: sectionCount,
    };
    setColorPalette(toneData.color_palette);
    setPipeResults(prev => ({ ...prev, tone: toneData }));
    await new Promise(r => setTimeout(r, 1500));

    // Step 4: 레이아웃 + 콘텐츠 생성
    setPipeStep(4);
    const mainColor = toneData.color_palette.main;
    const extraLines = [extraInfo.price, extraInfo.origin, extraInfo.target, extraInfo.shipping, extraInfo.brand, extraInfo.usp].filter(Boolean).join(", ");

    const categoryThemes = {
      "식품": { tone: "내추럴 프리미엄", palette: `메인${mainColor}/화이트#fff/크림#f9f6f2/차콜#2c2c2c — 원색배경 절대금지, 크림+다크만 교차`, layout: "풀블리드 이미지 중심, 텍스트는 보조, 이미지 80%+" },
      "뷰티": { tone: "소프트 클린", palette: `메인${mainColor}/화이트#fff/블러시#f8f5f2/다크#1a1a2e — 파스텔만, 원색금지`, layout: "깔끔한 여백, 제품 클로즈업 중심" },
      "패션": { tone: "매거진 에디토리얼", palette: `메인${mainColor}/화이트#fff/라이트그레이#f5f5f5/블랙#111 — 모노톤+포인트1색`, layout: "큰 이미지+작은 텍스트, 비대칭 그리드" },
      "가전": { tone: "클린 프로페셔널", palette: `메인${mainColor}/화이트#fff/쿨그레이#f0f2f5/네이비#1a1a2e — 차분한 중성톤만`, layout: "정돈된 그리드, 정보형, 아이콘+텍스트" },
      "건강": { tone: "내추럴 오가닉", palette: `메인${mainColor}/화이트#fff/웜베이지#f5f0eb/차콜#333 — 어스톤만`, layout: "자연 질감, 부드러운 곡선" },
      "default": { tone: "미니멀 모던", palette: `메인${mainColor}/화이트#fff/라이트#f8f8f8/다크#1a1a2e — 포인트1색+흰+다크만`, layout: "여백 넉넉, 중앙정렬, 좌우 분할" },
    };
    const catKey = ["식품","음료","건강식품","간식"].some(k => catLabel.includes(k)) ? "식품"
      : ["뷰티","화장품","스킨케어","향수"].some(k => catLabel.includes(k)) ? "뷰티"
      : ["패션","의류","가방","신발","주얼리"].some(k => catLabel.includes(k)) ? "패션"
      : ["가전","전자","IT","디지털"].some(k => catLabel.includes(k)) ? "가전"
      : ["건강","영양","비타민","운동"].some(k => catLabel.includes(k)) ? "건강" : "default";
    let seed = categoryThemes[catKey];

    const categoryCopyExamples = {
      "뷰티": `카피 예시 참고:
- hero: "모공 속 노폐물까지 깨끗하게, 차콜의 흡착력"
- features: "활성탄 성분이 피지와 노폐물을 흡착하여 모공을 깨끗하게 정화합니다"
- howto: "1.세안 후 물기 제거 2.적당량 얼굴에 도포(눈/입 주위 제외) 3.15~20분 건조 4.미온수로 깨끗이 세안"
- 타겟: "모공 고민이 있는 분 / 피지 과다 분비로 고민인 분"`,
      "식품": `카피 예시 참고:
- hero: "하루 한 봉, 간편하게 채우는 하루 영양"
- features: "비타민C 1000mg 함유, 레몬 20개 분량의 항산화 성분"
- howto: "1.1일 1포 물과 함께 섭취 2.식후 30분 이내 권장 3.냉장보관"`,
      "패션": `카피 예시 참고:
- hero: "실루엣이 살아나는 프리미엄 핏"
- features: "4방향 스트레치 원단으로 어떤 움직임에도 편안한 착용감"
- howto: "1.30도 이하 물세탁 2.뒤집어서 세탁 3.자연건조 권장"`,
      "가전": `카피 예시 참고:
- hero: "소음 없이, 강력하게"
- features: "BLDC 인버터 모터로 40dB 저소음 운전, 전기료 월 3,000원"`,
      "건강": `카피 예시 참고:
- hero: "하루 한 알로 시작하는 건강 습관"
- features: "프로바이오틱스 100억 CFU 함유, 장까지 살아서 도달하는 코팅 기술"`,
      "default": `카피 예시 참고:
- hero: 제품의 핵심 효과를 한 문장으로
- features: 각 기능의 구체적 원리와 수치를 포함
- 범용적인 표현 절대 금지`,
    };

    // designStyle 선택 시 프리셋 오버라이드
    const designStylePresets = {
      "minimal_modern": { tone: "미니멀 모던", palette: `메인${mainColor}/화이트#fff/라이트#f5f5f5/다크#111 — 흑백+포인트 1색만`, layout: "여백 넉넉, 가는 산세리프, 좌우 분할, 이미지 중심" },
      "premium_warm": { tone: "프리미엄 웜", palette: `메인${mainColor}/크림#f9f6f2/웜베이지#f5f0eb/다크#2c2218 — 따뜻한 어스톤만`, layout: "풀블리드 이미지, 세리프 포인트, 크림+다크 교차" },
      "clean_beauty": { tone: "클린 뷰티", palette: `메인${mainColor}/화이트#fff/블러시#f8f5f2/소프트핑크#faf5f5 — 파스텔 소프트`, layout: "제품 클로즈업 중심, 깔끔한 여백, 라운드 코너" },
      "magazine_editorial": { tone: "매거진 에디토리얼", palette: `메인${mainColor}/화이트#fff/라이트#f0f0f0/블랙#111 — 모노톤`, layout: "큰 이미지+작은 텍스트, 비대칭 그리드, 강한 타이포" },
      "tech_pro": { tone: "테크 프로페셔널", palette: `메인${mainColor}/쿨그레이#f0f2f5/화이트#fff/다크네이비#0f0f1a — 차분한 중성톤`, layout: "다크 히어로, 정돈된 그리드, 정보형, 아이콘+텍스트" },
      "natural_organic": { tone: "내추럴 오가닉", palette: `메인${mainColor}/베이지#f5f0eb/크림#faf7f3/다크브라운#3a3530 — 어스톤`, layout: "자연 질감, 부드러운 곡선, 그린/브라운 포인트" },
      "bold_pop": { tone: "볼드 팝", palette: `메인${mainColor}/화이트#fff/라이트핑크#fff5f5/다크#1a1a2e — 강렬한 포인트`, layout: "큰 볼드 타이포, 에너지 넘치는 카피, 다이나믹 레이아웃" },
      "luxury_dark": { tone: "럭셔리 다크", palette: `메인${mainColor}/다크#0a0a0a/차콜#1a1a1a/골드#c9a96e — 블랙+골드`, layout: "블랙 베이스 위주, 골드 포인트, 세리프 타이포, 고급 여백" },
      "fresh_green": { tone: "프레시 그린", palette: `메인${mainColor}/밝은그린#f0f5ef/화이트#fff/라이트#f5f8f4 — 청량한 그린톤`, layout: "밝은 톤, 건강/신선 이미지 강조, 깨끗한 레이아웃" },
      "soft_beige": { tone: "소프트 베이지", palette: `메인${mainColor}/베이지#f7f3ef/화이트#fff/웜크림#faf7f3 — 부드러운 톤`, layout: "베이지+화이트 교차, 편안한 가독성, 따뜻한 느낌" },
      "monochrome": { tone: "모노크롬", palette: `블랙#000/화이트#fff/라이트그레이#f5f5f5 — 순수 흑백, 컬러 최소화`, layout: "그래픽적 레이아웃, 강한 대비, 타이포 중심" },
      "playful_pastel": { tone: "플레이풀 파스텔", palette: `메인${mainColor}/라벤더#f8f5ff/핑크#fff5f8/화이트#fff — 밝은 파스텔`, layout: "밝은 파스텔 교차, 라운드 코너, 친근한 카피" },
    };
    if (designStyle && designStylePresets[designStyle]) {
      seed = designStylePresets[designStyle];
    }

    const longFlow = `순서(14섹션 — 전환율 최적화형):
1. hero: 제품 대표 이미지 + 결과 중심 핵심 카피 1줄 + 서브 설명
2. pain_points: 고객이 겪는 불편/고민 3~4개 명확하게 제시 (공감 유도)
3. point(해결 제시): "이 제품이 해결책이다" — 제품 단독 이미지 + 짧은 선언 문장
4. features: 핵심 기능 3~5개 요약 (아이콘+짧은 제목+한줄 설명)
5. point(기능 상세 1): 기능 하나를 깊이 설명 — 기능→효과→결과
6. point(기능 상세 2): 다른 기능 하나를 깊이 설명
7. stats_highlight: 수치/그래프/비교 — 기능을 눈으로 보여줌 (신뢰 확보)
8. point(사용감/텍스처): 실제 사용 느낌 전달 — 발림성, 흡수력, 질감
9. point(성분/기술력): 핵심 성분 강조 + 피부 자극 테스트 완료 등
10. howto: 사용 방법 2~3단계
11. point(추천 대상): 체크형 리스트로 구매 대상 명확화
12. event: 할인/증정/기간 한정 이벤트 혜택
13. review: 실제 후기 3개 + 별점
14. cta: 제품 이미지 + "지금 바로 경험해보세요" + 구매 버튼`;

    const shortFlow = `순서(7섹션 — 전환 빠른형, SNS/랜딩용):
1. hero: 제품 이미지 + 강한 결과 중심 카피
2. pain_points(문제+해결 합침): 고민 2~3개 → 바로 제품이 해결책 제시
3. features: 핵심 기능 3개 (짧고 직관적으로)
4. point(시각 증거): Before/After 또는 수치 비교로 효과 전달
5. point(사용감): 텍스처 컷 + 실제 느낌 전달
6. event: 할인/증정 혜택 — 지금 구매해야 하는 이유
7. cta: 제품 + 한 줄 — 바로 구매 유도`;

    const layoutPrompt = `제품:"${productName}" 카테고리:${catLabel}
특징:${features.slice(0, 400)}${extraLines ? ` 추가정보:${extraLines}` : ""}${options.length ? ` 옵션:${options.join("/")}` : ""}
메인컬러:${mainColor}
디자인 톤:${seed.tone}

한국 프리미엄 상세페이지 ${sectionCount}개 섹션 JSON배열.
핵심 흐름: 문제 인식 → 해결 제시 → 기능 설득 → 신뢰 확보 → 구매 유도

${sectionCount <= 8 ? shortFlow : longFlow}
총 ${sectionCount}개 섹션을 정확히 생성하세요.

[중요] 설계 원칙:
- 텍스트는 짧게, 이미지로 설명
- 한 섹션에 하나의 메시지만 전달
- 중요한 내용은 반복 노출
- 기능 나열이 아니라 "사용 후 변화" 강조

[중요] 색상 규칙:
- bg_color: "#ffffff", "#f9f6f2", "#f5f5f5", "#1a1a2e", "#f5f0eb" 중에서만 선택 (반드시 6자리 hex)
- 원색 배경(하늘/연두/노랑/분홍) 절대 금지
- 밝은 배경과 다크 배경 교차 배치
- 밝은배경 텍스트="#1a1a1a", 다크배경 텍스트="#ffffff"
- 모든 color 값은 반드시 #rrggbb 6자리 형식 사용
- 포인트 컬러: ${mainColor}

형식: [{"type":"","layout":"","bg_color":"#hex","image_prompt":"영문 80단어","elements":[{"type":"text","role":"","content":"","fontSize":숫자,"fontWeight":"400|700|900","color":"#hex","posY":"퍼센트"}]}]

type: hero, pain_points, features, point, stats_highlight, review, cta, event, howto, comparison, guarantee, before_after 중 선택.
layout: hero=full_image, pain_points=centered_text, features=grid_2col/grid_3col, point=left_image_right_text/right_image_left_text/centered_text/full_image, stats=centered_text, review=card_list, cta=centered_text.
role: subtitle, title, body, price, stat_number, stat_label, review_name, star, review_text, question, answer.
- elements의 각 텍스트에 posY 필드 추가 (텍스트 세로 위치, "10%"~"90%" 범위). title은 보통 "35%"~"50%", subtitle은 title 위, body는 title 아래.
- image_prompt: 이 제품 사진을 참조하여 프리미엄 상세페이지 섹션 디자인 이미지를 생성하기 위한 영문 프롬프트. 제품을 배치하고 배경/그라데이션/장식 요소를 포함. 텍스트는 이미지에 절대 포함하지 마세요. 텍스트 영역은 비워두세요. 80단어 영문.
- image_prompt 스타일: "Create a premium e-commerce product detail page section design. Place the given product photo [위치]. Background: [배경]. Leave empty space for text overlay at [텍스트위치]. No text, no letters, no words in the image."
- hero: "Place product centered, dark gradient overlay at bottom half for text. Dramatic studio lighting. Aspect 3:4."
- point: "Product on left/right 60%, clean solid color background on opposite side for text. Minimalist."
- features: "Product at center bottom, clean top area empty for title. Soft gradient background."
- cta: "Product centered with subtle glow, generous padding around for text above and below."
- pain_points: "Soft muted background, small product in corner, large empty area for text cards."
- review: "Clean minimal background, subtle decorative elements, product small at top."
모든 섹션에 image_prompt 필수.
[중요] 카피 품질 규칙 -- 범용 문구 절대 금지:
- "차별화된 기술력", "한 차원 높은 결과", "엄격한 품질 기준", "끊임없는 연구개발" 같은 범용 문구 절대 사용 금지
- 모든 카피는 이 제품만의 구체적 정보를 포함해야 함
- hero 카피: 제품 사용 후 얻는 구체적 결과 1가지 (예: "모공 속 노폐물까지 깨끗하게")
- features 설명: 각 기능의 구체적 원리/성분/수치 포함 (예: "활성탄 성분이 피지를 흡착하여 모공을 정화")
- 사용법(howto): ${catLabel} 카테고리에 맞는 실제 사용 단계 (뷰티=세안->도포->시간->제거, 식품=보관->조리->섭취 등)
- 타겟 고객: 자연스러운 한국어 문장으로 (예: "모공 고민이 있는 분", "건조한 피부를 가진 분")
- 제품 정보: 입력된 특징을 그대로 활용, "상세 페이지 참조" 금지
- body 텍스트: 해당 섹션의 주제에 맞는 구체적 설명, 다른 섹션과 내용 중복 금지
- 모든 텍스트는 15자 이상 작성 (너무 짧은 텍스트 금지)
- 브랜드명/제품명이 포함된 텍스트는 절대 잘리지 않게 전체 이름을 사용
${categoryCopyExamples[catKey] || categoryCopyExamples["default"]}
- 이모지(emoji), 이모티콘, 특수기호(❌, 🎊, 🎁, ✦, ★ 등)를 절대 사용하지 마세요. 텍스트만 작성하세요.
- 모든 elements에 content 필수
JSON배열만 출력.`;

    const abortCtrl = new AbortController();
    const timeoutId = setTimeout(() => abortCtrl.abort(), 300000); // 5분 (백그라운드 대응)
    let geminiRes;
    try {
      geminiRes = await fetch("/api/gemini-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: layoutPrompt, maxTokens: 8000 }),
        signal: abortCtrl.signal,
      });
    } catch (fetchErr) {
      clearTimeout(timeoutId);
      throw new Error(fetchErr.name === "AbortError" ? "생성 시간 초과. 다시 시도해주세요." : fetchErr.message);
    }
    clearTimeout(timeoutId);
    if (!geminiRes.ok) {
      const err = await geminiRes.json().catch(() => ({}));
      throw new Error(err.error || (geminiRes.status === 504 ? "AI 서버 응답 지연 — 잠시 후 다시 시도해주세요." : `생성 실패 (${geminiRes.status})`));
    }
    const geminiJson = await geminiRes.json();
    const layoutResult = geminiJson.text || "";
    if (!layoutResult || layoutResult.length < 10) {
      throw new Error("AI 응답이 비어있습니다. 다시 시도해주세요.");
    }
    let layoutData;
    try {
      let cleaned = layoutResult.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      if (!cleaned.startsWith("[")) {
        const arrMatch = cleaned.match(/\[[\s\S]*\]/);
        if (arrMatch) cleaned = arrMatch[0];
      }
      layoutData = JSON.parse(cleaned);
      if (!Array.isArray(layoutData)) throw new Error("배열이 아닌 응답");
    } catch (e) {
      console.error("Layout parse error:", e, layoutResult?.slice(0, 500));
      try {
        const retryRes = await fetch("/api/gemini-generate", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: layoutPrompt, maxTokens: 8000 }),
        });
        const retryData = await retryRes.json();
        const retryText = (retryData.text || "").replace(/```json?\n?/g, "").replace(/```/g, "").trim();
        const retryArr = retryText.startsWith("[") ? retryText : (retryText.match(/\[[\s\S]*\]/) || [""])[0];
        layoutData = JSON.parse(retryArr);
        if (!Array.isArray(layoutData)) throw new Error("재시도 실패");
      } catch (e2) {
        console.error("Layout parse 재시도 실패:", e2);
        setPipeError("레이아웃 생성 실패. 다시 시도해주세요. (JSON 파싱 오류)");
        return;
      }
    }

    if (mode === "precise" && layoutData.length < 12) {
      try {
        const existingTypes = layoutData.map(s => s.type).join(",");
        const addPrompt = `제품:"${productName}" 카테고리:${catLabel}. 기존 섹션: ${existingTypes}.
부족한 섹션을 추가로 만들어줘(JSON배열). 아래에서 기존에 없는 것 선택:
- point(성분/기술력 상세): 핵심 성분 강조 + 신뢰 확보
- point(추천 대상): 체크형 리스트로 타겟 명확화
- comparison: 일반 제품 vs 우리 제품 비교
- howto: 사용 방법 2~3단계
- guarantee: 보증/인증/신뢰
- before_after: 사용 전후 변화
흐름: 기능 설득 → 신뢰 확보 → 구매 유도. 디자인 톤:${seed.tone}. 색상:${seed.palette}. 이모지(emoji), 이모티콘, 특수기호를 절대 사용하지 마세요. JSON배열만 출력.`;
        const addRes = await fetch("/api/gemini-generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: addPrompt, maxTokens: 5000 }) });
        if (addRes.ok) {
          const { text: addResult } = await addRes.json();
          const addCleaned = addResult.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
          const addData = JSON.parse(addCleaned);
          if (Array.isArray(addData)) layoutData = [...layoutData, ...addData];
        }
      } catch (e2) { /* additional section generation failed */ }
    }

    setPipeResults(prev => ({ ...prev, layout: layoutData }));
    setPipeStep(5);

    // 레이아웃 다양성 + 배경색 교차
    const layoutVariants = {
      hero: ["full_image", "left_image_right_text", "centered_text", "right_image_left_text"],
      pain_points: ["centered_text", "grid_2col", "grid_3col", "left_image_right_text"],
      features: ["grid_2col", "grid_3col", "centered_text", "left_image_right_text", "right_image_left_text"],
      point: ["left_image_right_text", "right_image_left_text", "full_image", "centered_text"],
      stats_highlight: ["centered_text"],
      review: ["card_list"],
      comparison: ["centered_text"],
      guarantee: ["centered_text"],
      cta: ["centered_text", "left_image_right_text"],
      faq: ["centered_text"],
      howto: ["centered_text"],
      before_after: ["centered_text"],
      event: ["centered_text"],
      pricing: ["centered_text"],
      process_steps: ["centered_text"],
      facility: ["centered_text"],
      contact: ["centered_text"],
      info: ["centered_text"],
      cert: ["centered_text"],
      shipping: ["centered_text"],
    };
    // designStyle별 bgPattern 커스터마이징
    const bgPatternByStyle = {
      "luxury_dark": ["#0a0a0a", "#1a1a1a", "#111111", "#0a0a0a", "#1a1a1a", "#0f0f0f", "#111111", "#0a0a0a", "#1a1a1a", "#111111", "#0a0a0a", "#1a1a1a", "#0f0f0f", "#111111"],
      "tech_pro": ["#ffffff", "#f0f2f5", "#ffffff", "#0f0f1a", "#f0f2f5", "#ffffff", "#f5f5f5", "#ffffff", "#0f0f1a", "#f0f2f5", "#ffffff", "#f5f5f5", "#0f0f1a", "#ffffff"],
      "premium_warm": ["#f9f6f2", "#ffffff", "#f5f0eb", "#2c2218", "#f9f6f2", "#ffffff", "#f5f0eb", "#f9f6f2", "#2c2218", "#ffffff", "#f5f0eb", "#f9f6f2", "#ffffff", "#f5f0eb"],
      "fresh_green": ["#ffffff", "#f0f5ef", "#ffffff", "#f5f8f4", "#ffffff", "#f0f5ef", "#f5f8f4", "#ffffff", "#3a3530", "#f0f5ef", "#ffffff", "#f5f8f4", "#ffffff", "#f0f5ef"],
      "clean_beauty": ["#ffffff", "#faf5f5", "#ffffff", "#f8f5f2", "#ffffff", "#faf5f5", "#f8f5f2", "#ffffff", "#1a1a2e", "#ffffff", "#faf5f5", "#f8f5f2", "#ffffff", "#faf5f5"],
    };
    const bgPattern = (designStyle && bgPatternByStyle[designStyle]) || [
      "#ffffff",
      "linear-gradient(180deg, #f8f8f8, #f0f0f0)",
      "linear-gradient(180deg, #faf7f3, #f5f0eb)",
      "#ffffff",
      "linear-gradient(180deg, #f7f5f2, #f0ece6)",
      "linear-gradient(180deg, #f5f5f5, #eeeeee)",
      "#ffffff",
      "linear-gradient(180deg, #faf7f3, #f5f0eb)",
      "#1a1a2e",
      "#ffffff",
      "linear-gradient(180deg, #f8f8f8, #f2f2f2)",
      "linear-gradient(180deg, #faf7f3, #f5f0eb)",
      "#ffffff",
      "linear-gradient(180deg, #f7f5f2, #eeebe6)",
    ];
    // 한국어 조사 후처리 -- "이(가)", "은(는)", "을(를)", "과(와)" 등 자동 보정
    function fixKoreanParticles(text) {
      if (!text || typeof text !== "string") return text;
      return text
        .replace(/([가-힣])이\(가\)/g, (_, ch) => {
          const code = ch.charCodeAt(0) - 0xAC00;
          return (code % 28 !== 0) ? ch + "이" : ch + "가";
        })
        .replace(/([가-힣])은\(는\)/g, (_, ch) => {
          const code = ch.charCodeAt(0) - 0xAC00;
          return (code % 28 !== 0) ? ch + "은" : ch + "는";
        })
        .replace(/([가-힣])을\(를\)/g, (_, ch) => {
          const code = ch.charCodeAt(0) - 0xAC00;
          return (code % 28 !== 0) ? ch + "을" : ch + "를";
        })
        .replace(/([가-힣])과\(와\)/g, (_, ch) => {
          const code = ch.charCodeAt(0) - 0xAC00;
          return (code % 28 !== 0) ? ch + "과" : ch + "와";
        })
        .replace(/([가-힣])으로\(로\)/g, (_, ch) => {
          const code = ch.charCodeAt(0) - 0xAC00;
          const jongseong = code % 28;
          return (jongseong !== 0 && jongseong !== 8) ? ch + "으로" : ch + "로";
        });
    }

    let pointIdx = 0;
    const diversified = layoutData.map((s, i) => {
      const type = s.type || "point";
      if (!s.elements || s.elements.length === 0) {
        const templates = SECTION_TEMPLATES[type];
        if (templates && templates.length > 0) {
          const tmpl = templates[Math.floor(Math.random() * templates.length)];
          s = { ...s, elements: tmpl.elements, layout: tmpl.layout, bg_color: tmpl.bg_color };
        } else {
          s = { ...s, elements: [
            { type: "text", role: "title", content: SECTION_TYPE_LABELS[type] || type, fontSize: 26, fontWeight: "900", color: "#1a1a1a" },
            { type: "text", role: "body", content: "내용을 입력해주세요", fontSize: 14, color: "#666" },
          ] };
        }
      }
      const variants = layoutVariants[type];
      let newLayout = s.layout;
      if (type === "point") {
        newLayout = pointIdx % 2 === 0 ? "left_image_right_text" : "right_image_left_text";
        if (pointIdx === 2) newLayout = "full_image";
        pointIdx++;
      } else if (variants && variants.length > 1) {
        newLayout = variants[Math.floor(Math.random() * variants.length)];
      }
      let newBg = s.bg_color;
      // designStyle에 따른 hero 레이아웃 고정
      if (type === "hero" && designStyle) {
        const heroLayoutMap = {
          "magazine_editorial": "collection_intro", "minimal_modern": "full_image",
          "tech_pro": "full_image", "luxury_dark": "full_image",
          "clean_beauty": "left_image_right_text", "fresh_green": "left_image_right_text",
          "playful_pastel": "left_image_right_text",
        };
        if (heroLayoutMap[designStyle]) newLayout = heroLayoutMap[designStyle];
      }
      if (type === "hero") newBg = `linear-gradient(180deg, #0a0a0a, ${mainColor}25)`;
      else if (type === "ai_notice") newBg = "#fafafa";
      else if (type === "shipping") newBg = "#f5f5f5";
      else {
        newBg = bgPattern[i % bgPattern.length];
        if (i > 0) {
          const prevBg = layoutData[i - 1]?._assignedBg;
          if (prevBg === newBg) {
            newBg = bgPattern[(i + 1) % bgPattern.length];
            if (prevBg === newBg) newBg = bgPattern[(i + 2) % bgPattern.length];
          }
        }
        s._assignedBg = newBg;
      }
      const designVariant = (i * 7 + 3) % 6;

      // 배경 변경 후 텍스트 색상 자동 보정
      const bgHex = (newBg || "#fff").replace("#", "");
      const bR = parseInt(bgHex.slice(0, 2), 16) || 255;
      const bG = parseInt(bgHex.slice(2, 4), 16) || 255;
      const bB = parseInt(bgHex.slice(4, 6), 16) || 255;
      const newIsDark = (bR * 299 + bG * 587 + bB * 114) / 1000 < 128;
      const correctedElements = (s.elements || []).map(el => {
        if (el.type !== "text" && el.type !== "badge") return el;
        const c = (el.color || "").toLowerCase();
        if (newIsDark) {
          if (c === "#1a1a1a" || c === "#1a1a2e" || c === "#333" || c === "#333333" || c === "#2c2c2c" || c === "#111" || c === "#000" || c === "#444" || c === "#555") {
            return { ...el, color: "#fff" };
          }
          if (c === "#666" || c === "#666666" || c === "#777" || c === "#888" || c === "#999") {
            return { ...el, color: "rgba(255,255,255,0.65)" };
          }
        } else {
          if (c === "#fff" || c === "#ffffff" || c === "white") {
            return { ...el, color: el.fontWeight === "900" || el.fontWeight === "700" ? "#1a1a1a" : "#333" };
          }
          if (c.startsWith("rgba(255,255,255")) {
            return { ...el, color: el.fontWeight === "700" ? "#555" : "#888" };
          }
        }
        return el;
      });

      // 한국어 조사 후처리
      const particleFixed = correctedElements.map(el => {
        if (el.type === "text" || el.type === "badge") {
          return { ...el, content: fixKoreanParticles(el.content) };
        }
        return el;
      });

      return { ...s, id: `sec_${i}_${Date.now()}`, enabled: true, layout: newLayout, bg_color: newBg, designVariant, elements: particleFixed };
    });
    setSections(diversified);
    setActiveSection(0);

    try { if (user?.uid) await changePoints(user.uid, -60, "상세페이지 생성"); } catch {}
    if (!user) try { incrementGuestUsage(); } catch {}

    setTimeout(() => setPhase("outline"), 800);

  } catch (e) {
    console.error("Pipeline error:", e);
    setPipeError((e.message || "생성 중 오류가 발생했습니다.") + " — 다시 시도해주세요.");
  }
}
