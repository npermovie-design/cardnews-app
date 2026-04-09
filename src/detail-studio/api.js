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
export async function generateSectionImage(secId, prompt, ctx) {
  const { user, setSectionImages } = ctx;
  if (!prompt) return;
  if (!user) { alert("이미지 생성은 로그인 후 이용 가능합니다."); return; }
  setSectionImages(prev => ({ ...prev, [secId]: { loading: true, url: null, error: null } }));
  try {
    const token = await getAuthToken() || "";
    const res = await fetch("/api/image?action=generate", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ prompt, aspectRatio: "3:4" }),
    });
    const data = await res.json();
    if (data.image) {
      setSectionImages(prev => ({ ...prev, [secId]: { loading: false, url: data.image, error: null } }));
    } else {
      setSectionImages(prev => ({ ...prev, [secId]: { loading: false, url: null, error: data.error || "생성 실패" } }));
    }
  } catch (e) {
    setSectionImages(prev => ({ ...prev, [secId]: { loading: false, url: null, error: e.message } }));
  }
}

// 전체 섹션 이미지 일괄 생성
export async function generateAllImages(ctx) {
  const { user, sections, sectionImages } = ctx;
  if (user) {
    for (const sec of sections) {
      if (sec.image_prompt && !sectionImages[sec.id]?.url) {
        await generateSectionImage(sec.id, sec.image_prompt, ctx);
        await new Promise(r => setTimeout(r, 1500));
      }
    }
  } else {
    await fillStockImages(ctx);
  }
}

// 스톡 이미지 자동 채우기
export async function fillStockImages(ctx) {
  const { category, productName, images, sections, sectionImages, setSectionImages } = ctx;
  try {
    const catLabel = CATEGORIES.find(c => c.key === category)?.label || "";
    const shortName = (productName || "").split(/\s+/).slice(0, 2).join(" ");
    const searchTerm = shortName || catLabel || "product";
    let stockUrls = [];
    try {
      const res = await fetch(`/api/proxy?action=pixabay&q=${encodeURIComponent(searchTerm)}&per_page=30&image_type=photo&lang=ko`);
      if (res.ok) {
        const data = await res.json();
        stockUrls = (data.hits || []).map(h => h.webformatURL || h.largeImageURL).filter(Boolean);
      }
    } catch {}
    if (stockUrls.length === 0 && images.length > 0) {
      stockUrls = images.map(img => img.preview).filter(Boolean);
    }
    if (stockUrls.length > 0) {
      const newImgs = {};
      sections.forEach((sec, idx) => {
        if (sec.type === "ai_notice" || sec.type === "shipping") return;
        if (sectionImages[sec.id]?.url) return;
        newImgs[sec.id] = { url: stockUrls[idx % stockUrls.length], loading: false, error: null };
      });
      if (Object.keys(newImgs).length > 0) {
        setSectionImages(prev => ({ ...prev, ...newImgs }));
      }
    }
  } catch (e) { /* stock fill failed */ }
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
