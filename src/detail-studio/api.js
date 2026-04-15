import { getAuthToken } from "../storage";
import { fileToBase64, resizeImage } from "./utils.jsx";
import { CATEGORIES } from "./constants.js";

// AI 에이전트 텍스트/이미지 수정
export async function handleAgentSend(msg, ctx) {
  const { sections, activeSection, selectedEl, sectionImages, images,
    setAgentMessages, setAgentInput, setAgentLoading, setSections, setSectionImages } = ctx;
  if (!msg?.trim()) return;
  setAgentMessages(prev => [...prev, { role: "user", content: msg }]);
  setAgentInput("");
  setAgentLoading(true);
  try {
    const sec = sections[activeSection];
    const isImageEdit = selectedEl?.el?._type === "image";

    if (isImageEdit) {
      const secId = sec?.id;
      const prompt = `상세페이지용 ${sec?.type || "제품"} 이미지를 생성해주세요. 사용자 요청: "${msg}". 배경은 깔끔하게, 상품/주제가 돋보이도록.`;
      setAgentMessages(prev => [...prev, { role: "assistant", content: "이미지 생성 중..." }]);
      await generateSectionImage(secId, prompt, ctx);
      setAgentMessages(prev => {
        const filtered = prev.filter(m => m.content !== "이미지 생성 중...");
        return [...filtered, { role: "assistant", content: "이미지가 생성되었습니다. 캔버스에서 확인해보세요." }];
      });
    } else {
      const secJson = JSON.stringify(sec?.elements?.filter(e => e.type === "text").map(e => ({ role: e.role, content: e.content })) || []);
      const prompt = `상세페이지 에디터의 AI 에이전트입니다. 현재 섹션의 텍스트 요소들:
${secJson}

사용자 요청: "${msg}"

위 요청에 맞게 텍스트를 수정해서 JSON 배열로 반환해줘.
이모지(emoji), 이모티콘, 특수기호를 절대 사용하지 마세요. 텍스트만 작성하세요.
형식: [{"role":"기존role","content":"수정된텍스트"}]
JSON배열만 출력.`;
      const agentRes = await fetch("/api/gemini-generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt, maxTokens: 2000 }) });
      const agentData = await agentRes.json();
      const result = agentData.text || agentData.error || "";
      const cleaned = result.replace(/```json?\s*/g, "").replace(/```/g, "").trim();
      try {
        const updates = JSON.parse(cleaned);
        if (Array.isArray(updates)) {
          setSections(prev => prev.map((s, si) => si !== activeSection ? s : {
            ...s, elements: s.elements.map(el => {
              if (el.type !== "text") return el;
              const upd = updates.find(u => u.role === el.role);
              return upd ? { ...el, content: upd.content } : el;
            }),
          }));
          setAgentMessages(prev => [...prev, { role: "assistant", content: "수정 완료! 변경된 내용을 확인해보세요." }]);
        }
      } catch {
        setAgentMessages(prev => [...prev, { role: "assistant", content: cleaned }]);
      }
    }
  } catch (e) {
    setAgentMessages(prev => [...prev, { role: "assistant", content: `오류: ${e.message}` }]);
  }
  setAgentLoading(false);
}

// 스톡 이미지 검색
export async function fetchStockImages(query, ctx) {
  const { setStockImages } = ctx;
  try {
    const pixKey = import.meta.env.VITE_PIXABAY_KEY || "";
    const pexKey = import.meta.env.VITE_PEXELS_KEY || "";
    const results = [];
    if (pixKey) {
      try {
        const res = await fetch(`/api/proxy?url=${encodeURIComponent(`https://pixabay.com/api/?key=${pixKey}&q=${query}&image_type=photo&per_page=8&lang=ko`)}`);
        const data = await res.json();
        (data.hits || []).forEach(h => results.push({ url: h.webformatURL, thumb: h.previewURL, title: h.tags, src: "Pixabay" }));
      } catch {}
    }
    if (pexKey) {
      try {
        const res = await fetch(`/api/proxy?url=${encodeURIComponent(`https://api.pexels.com/v1/search?query=${query}&per_page=8&locale=ko-KR`)}&headers=${encodeURIComponent(JSON.stringify({ Authorization: pexKey }))}`);
        const data = await res.json();
        (data.photos || []).forEach(p => results.push({ url: p.src.medium, thumb: p.src.small, title: p.alt || "", src: "Pexels" }));
      } catch {}
    }
    setStockImages(results.length > 0 ? results : []);
  } catch { setStockImages([]); }
}

// 섹션별 AI 이미지 생성
export async function generateSectionImage(secId, prompt, ctx, productImageB64) {
  const { user, setSectionImages } = ctx;
  if (!prompt) {
    console.warn(`[generateSectionImage] 섹션 ${secId}: prompt가 비어있음, 스킵`);
    return;
  }
  if (!user) { alert("이미지 생성은 로그인 후 이용 가능합니다."); return; }
  setSectionImages(prev => ({ ...prev, [secId]: { loading: true, url: null, error: null } }));
  try {
    const token = await getAuthToken() || "";
    if (!token) {
      console.warn(`[generateSectionImage] 섹션 ${secId}: 인증 토큰 없음`);
    }
    const body = { prompt, aspectRatio: "3:4" };
    if (productImageB64) {
      body.productImageB64 = productImageB64;
      body.productImageMime = "image/jpeg";
    }
    console.log(`[generateSectionImage] 섹션 ${secId}: 이미지 생성 요청 시작`);
    const res = await fetch("/api/image?action=generate", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (data.image) {
      console.log(`[generateSectionImage] 섹션 ${secId}: 이미지 생성 성공 (모델: ${data.model || "unknown"})`);
      setSectionImages(prev => ({ ...prev, [secId]: { loading: false, url: data.image, error: null } }));
    } else {
      console.error(`[generateSectionImage] 섹션 ${secId}: 생성 실패 -`, data.error);
      setSectionImages(prev => ({ ...prev, [secId]: { loading: false, url: null, error: data.error || "생성 실패" } }));
    }
  } catch (e) {
    console.error(`[generateSectionImage] 섹션 ${secId}: fetch 에러 -`, e.message);
    setSectionImages(prev => ({ ...prev, [secId]: { loading: false, url: null, error: e.message } }));
  }
}

// 전체 섹션 이미지 일괄 생성 (진행률 콜백 지원)
export async function generateAllImages(ctx, onProgress) {
  const { user, sections, sectionImages, images } = ctx;
  if (!user) {
    await fillStockImages(ctx);
    if (onProgress) onProgress(sections.length, sections.length, "done");
    return;
  }

  // image_prompt가 없는 섹션(ai_notice, shipping 등 텍스트 전용) 제외
  const imageSections = sections.filter(sec => sec.type !== "ai_notice" && sec.type !== "shipping");
  const needGen = imageSections.filter(sec => !sectionImages[sec.id]?.url);
  const total = needGen.length;

  // 생성할 이미지가 없으면 바로 완료 처리
  if (total === 0) {
    console.log("[generateAllImages] 생성할 이미지 없음, 바로 에디터로 전환");
    if (onProgress) onProgress(1, 1, "done");
    return;
  }

  // 제품 이미지 base64 (첫 번째 업로드 이미지)
  const productB64 = images?.[0]?.base64 || null;
  for (let i = 0; i < needGen.length; i++) {
    const sec = needGen[i];
    if (onProgress) onProgress(i, total, sec.id);
    // image_prompt가 없으면 기본 프롬프트 생성
    const prompt = sec.image_prompt || `Create a premium e-commerce product detail page section background for a ${sec.type || "product"} section. Clean, professional, minimalist design. No text, no letters, no words in the image. Aspect ratio 3:4.`;
    try {
      await generateSectionImage(sec.id, prompt, ctx, productB64);
    } catch (e) {
      console.error(`[generateAllImages] 섹션 ${sec.id} 이미지 생성 실패:`, e);
      // 실패 시 유저 제품 이미지로 폴백 (스톡 이미지 사용 안 함)
      if (images?.length > 0) {
        const fallbackUrl = images[i % images.length]?.preview;
        if (fallbackUrl) {
          ctx.setSectionImages(prev => ({ ...prev, [sec.id]: { url: fallbackUrl, loading: false, error: null } }));
        }
      }
    }
    if (i < needGen.length - 1) await new Promise(r => setTimeout(r, 1200));
  }
  if (onProgress) onProgress(total, total, "done");
}

// 제품 이미지 기반 섹션 이미지 채우기 (스톡 이미지 사용 안 함)
// 유저가 업로드한 제품 사진만 사용. 없으면 이미지 없이 진행.
export async function fillStockImages(ctx) {
  const { images, sections, sectionImages, setSectionImages } = ctx;
  // 유저 업로드 이미지만 사용
  const productUrls = images.map(img => img.preview).filter(Boolean);
  if (productUrls.length === 0) return; // 제품 사진 없으면 이미지 없이 진행

  const newImgs = {};
  sections.forEach((sec, idx) => {
    if (sec.type === "ai_notice" || sec.type === "shipping") return;
    if (sectionImages[sec.id]?.url) return;
    // 제품 이미지를 순환 배치
    newImgs[sec.id] = { url: productUrls[idx % productUrls.length], loading: false, error: null };
  });
  if (Object.keys(newImgs).length > 0) {
    setSectionImages(prev => ({ ...prev, ...newImgs }));
  }
}

// 이미지 업로드
export async function handleImageUpload(e, ctx) {
  const { images, setImages } = ctx;
  const files = Array.from(e.target.files || []);
  if (images.length + files.length > 10) {
    alert("이미지는 최대 10장까지 업로드 가능합니다.");
    return;
  }
  const newImages = [];
  for (const file of files) {
    const preview = URL.createObjectURL(file);
    const raw = await fileToBase64(file);
    const base64 = await resizeImage(raw, 800);
    newImages.push({ file, preview, base64 });
  }
  setImages(prev => [...prev, ...newImages]);
  e.target.value = "";
}

// AI로 내용 채우기 (이미지 비전 분석 포함)
// 제품 분석 (색상 추출 + 톤앤매너 + 추천 구성)
export async function analyzeProduct(ctx) {
  const { productName, category, features, images, setAnalysisResult } = ctx;
  const result = { colors: [], tone: null, sections: [], status: "analyzing" };
  setAnalysisResult({ ...result });

  try {
    // 1) 색상 추출
    let extractedColors = [];
    if (images.length > 0) {
      try {
        const img = new Image();
        img.crossOrigin = "anonymous";
        await new Promise((resolve) => { img.onload = resolve; img.src = images[0].base64 || images[0].preview; });
        const c = document.createElement("canvas");
        c.width = 64; c.height = 64;
        c.getContext("2d").drawImage(img, 0, 0, 64, 64);
        const data = c.getContext("2d").getImageData(0, 0, 64, 64).data;
        const buckets = {};
        for (let k = 0; k < data.length; k += 4) {
          const r = Math.round(data[k] / 32) * 32;
          const g = Math.round(data[k+1] / 32) * 32;
          const b = Math.round(data[k+2] / 32) * 32;
          const key = `${r},${g},${b}`;
          buckets[key] = (buckets[key] || 0) + 1;
        }
        extractedColors = Object.entries(buckets)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([k]) => {
            const [r, g, b] = k.split(",").map(Number);
            return "#" + [r, g, b].map(v => Math.min(255, v).toString(16).padStart(2, "0")).join("");
          });
      } catch {}
    }
    result.colors = extractedColors;
    setAnalysisResult({ ...result });

    // 2) 톤앤매너 분석
    const catLabel = CATEGORIES.find(c => c.key === category)?.label || category || "일반";
    try {
      const toneRes = await fetch("/api/gemini-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `제품:"${productName}" 카테고리:${catLabel} 특징:${(features || "").slice(0, 200)} 추출색상:${extractedColors.join(",")}
이 제품에 어울리는 상세페이지 분석을 JSON으로 출력:
{"tone":"톤(예:전문적/따뜻한/고급스러운/활기찬)","voice":"말투(예:~합니다/~해요)","mood":"분위기 한 줄","targetAge":"타겟 연령대","keyMessage":"핵심 메시지 한 줄","recommendSections":"추천 섹션 구성 설명 2줄"}
JSON만 출력.`, maxTokens: 300
        }),
      });
      const toneData = await toneRes.json();
      const toneParsed = JSON.parse((toneData.text || "{}").replace(/```json?\s*/g, "").replace(/```/g, "").trim());
      result.tone = toneParsed;
    } catch {}
    setAnalysisResult({ ...result });

    // 3) 추천 섹션 구성
    result.sections = [
      "히어로 (제품 대표 이미지 + 핵심 카피)",
      "고민/공감 (고객이 겪는 문제 제시)",
      "핵심 기능 (셀링포인트 3~5개)",
      "상세 설명 (기능별 깊이 있는 설명)",
      "사용 후기 (실제 리뷰 + 별점)",
      "구매 유도 (CTA + 가격 + 혜택)",
    ];
    result.status = "done";
    setAnalysisResult({ ...result });
    return result;
  } catch (e) {
    console.error("제품 분석 실패:", e);
    result.status = "done";
    setAnalysisResult({ ...result });
    return result;
  }
}

export async function autoFillWithAI(ctx) {
  const { productName, images, setAiFilling, setFeatures, setCategory, setProductName } = ctx;
  if (!productName.trim() && images.length === 0) return;
  setAiFilling(true);
  try {
    const hasImage = images.length > 0 && images[0].base64;
    const prompt = hasImage
      ? `이 제품 사진을 분석해서 JSON으로 응답해줘.${productName ? ` 참고 상품명: "${productName}"` : ""}
{
  "category": "food|farm|tech|living|fashion|beauty|health|education|pet|kids 중 하나",
  "productName": "사진에서 파악한 상품명 (한국어)",
  "features": "사진에서 보이는 제품 특징 5가지 (번호 포함, 자연스러운 한국어, 쇼핑몰 수준)"
}
features는 줄바꿈(\\n)으로 구분. JSON만 출력.`
      : `상품명: "${productName}"
이 상품을 분석해서 JSON으로 응답해줘:
{
  "category": "food|farm|tech|living|fashion|beauty|health|education|pet|kids 중 하나",
  "productName": "${productName}",
  "features": "제품 특징 5가지 (번호 포함, 자연스러운 한국어, 쇼핑몰 수준)"
}
features는 줄바꿈(\\n)으로 구분. JSON만 출력.`;
    const reqBody = { prompt, maxTokens: 800 };
    if (hasImage) {
      try {
        const smallBase64 = await resizeImage(images[0].base64, 512);
        const raw = smallBase64;
        reqBody.imageBase64 = raw.includes(",") ? raw.split(",")[1] : raw;
        reqBody.imageMimeType = images[0].file?.type || "image/jpeg";
      } catch {}
    }
    const geminiRes = await fetch("/api/gemini-generate", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reqBody),
    });
    const geminiData = await geminiRes.json();
    const result = geminiData.text || "";
    const cleaned = result.replace(/```json?\s*/g, "").replace(/```/g, "").trim();
    try {
      const parsed = JSON.parse(cleaned);
      if (parsed.features) {
        const featText = parsed.features.replace(/\\n/g, "\n").replace(/#{1,6}\s*/g, "").replace(/\*{1,2}([^*]+)\*{1,2}/g, "$1").replace(/`([^`]+)`/g, "$1").trim();
        setFeatures(featText);
      }
      if (parsed.category && CATEGORIES.find(c => c.key === parsed.category)) {
        setCategory(parsed.category);
      }
      if (parsed.productName && !productName.trim()) {
        setProductName(parsed.productName);
      }
    } catch {
      const text = cleaned.replace(/\\n/g, "\n").replace(/#{1,6}\s*/g, "").replace(/\*{1,2}([^*]+)\*{1,2}/g, "$1").replace(/`([^`]+)`/g, "$1").trim();
      setFeatures(text);
    }
  } catch (e) { console.error("AI 분석 실패:", e); }
  setAiFilling(false);
}
