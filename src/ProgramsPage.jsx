import React, { useState, useEffect } from "react";
import { supabase } from "./storage";

function updateMeta(property, content) {
  let el = document.querySelector(`meta[property="${property}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("property", property);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

const BRAND = "#7c6aff";
const BRAND2 = "#ec4899";
const GRAD = "linear-gradient(135deg, #7c6aff, #ec4899)";

const CATEGORIES = [
  { id: "all", label: "전체" },
  { id: "automation", label: "자동화" },
  { id: "design", label: "디자인" },
  { id: "marketing", label: "마케팅" },
  { id: "utility", label: "유틸리티" },
  { id: "template", label: "템플릿" },
  { id: "free_photo", label: "무료사진", special: true },
  { id: "free_video", label: "무료영상", special: true },
];

/*
  detailContent 구조:
  - { type: "text", value: "직접 작성한 설명 텍스트..." }
  - { type: "image", value: "이미지 URL", alt: "설명" }
  - { type: "heading", value: "소제목" }
  - { type: "divider" }

  나중에 관리자 페이지에서 이 배열을 편집/저장하는 방식으로 확장
*/

const DEMO_PRODUCTS = [
  {
    id: 1, title: "SNS 자동화 봇 v0.1.2",
    desc: "네이버 블로그/카페에 AI 글을 자동 생성하고 발행하는 데스크톱 프로그램입니다. 키워드만 입력하면 글 작성부터 발행까지 원클릭 자동화.",
    category: "automation", price: 0, priceLabel: "무료",
    version: "v0.1.2", platform: "Windows 10/11",
    fileSize: "48MB", downloadCount: 124, viewCount: 312,
    tags: ["자동화", "블로그", "네이버"],
    downloadUrl: "https://github.com/npermovie-design/naverbot-saas/releases/download/v0.1.2/makeit-sns-setup-win.zip",
    thumbnail: null,
    detailContent: [
      { type: "heading", value: "SNS 자동화 봇이란?" },
      { type: "text", value: "SNS 자동화 봇은 네이버 블로그와 카페 운영을 완전히 자동화하는 데스크톱 프로그램입니다.\n키워드를 입력하면 AI가 네이버 상위 노출 글을 분석하고, SEO에 최적화된 제목과 본문을 자동 생성합니다.\n생성된 글은 이미지와 함께 네이버 블로그/카페에 자동 발행되며, 예약 발행과 매일 자동 운영 모드도 지원합니다." },
      { type: "divider" },
      { type: "heading", value: "주요 기능" },
      { type: "text", value: "- AI 글 자동 생성: 키워드만 입력하면 SEO 최적화 글 자동 작성\n- 네이버 상위 글 분석: 크롤링으로 최적 제목 5개 추천\n- 원클릭 자동 발행: 이미지, 태그 포함 자동 발행\n- 자동 운영 모드: 매일 최신 트렌드 분석 후 자동 글 발행\n- 예약 발행: 원하는 시간에 자동 발행\n- 다중 계정 관리: 여러 네이버 계정 독립 관리" },
      { type: "divider" },
      { type: "heading", value: "시스템 요구사항" },
      { type: "text", value: "- Windows 10/11 (64-bit)\n- 8GB RAM 이상 권장\n- 인터넷 연결 필수\n- 네이버 계정 필요" },
    ],
  },
  {
    id: 2, title: "상세페이지 템플릿 팩 Vol.1",
    desc: "쇼핑몰 상세페이지에 바로 적용 가능한 고퀄리티 템플릿 10종. 식품, 뷰티, 패션, 전자제품 등 카테고리별 최적화된 디자인.",
    category: "template", price: 9900, priceLabel: "9,900원",
    version: "v1.0", platform: "PSD / Figma",
    fileSize: "320MB", downloadCount: 56, viewCount: 189,
    tags: ["템플릿", "상세페이지", "디자인"],
    downloadUrl: null, thumbnail: null,
    detailContent: [
      { type: "heading", value: "프로 디자이너가 만든 상세페이지 템플릿" },
      { type: "text", value: "쇼핑몰 상세페이지에 바로 적용 가능한 고퀄리티 템플릿 10종입니다.\nPSD와 Figma 파일을 모두 포함하며, 텍스트와 이미지만 교체하면 바로 사용할 수 있습니다." },
      { type: "divider" },
      { type: "text", value: "- 10종 카테고리별 템플릿 (식품, 뷰티, 패션, 전자제품, 생활용품)\n- PSD + Figma 동시 제공\n- 모바일 최적화 세로형 레이아웃\n- 폰트/컬러 가이드 포함" },
    ],
  },
  {
    id: 3, title: "키워드 분석 리포트 생성기",
    desc: "네이버/구글 키워드를 자동 분석하여 경쟁도, 검색량, 추천 키워드를 포함한 리포트를 생성합니다. 엑셀 내보내기 지원.",
    category: "marketing", price: 19900, priceLabel: "19,900원",
    version: "v2.1", platform: "Windows / Mac",
    fileSize: "28MB", downloadCount: 89, viewCount: 245,
    tags: ["마케팅", "키워드", "SEO"],
    downloadUrl: null, thumbnail: null,
    detailContent: [
      { type: "heading", value: "키워드 분석, 자동으로 끝내세요" },
      { type: "text", value: "네이버와 구글에서 키워드별 월간 검색량, 경쟁도, 클릭률을 분석하고\n연관 키워드와 롱테일 키워드까지 자동으로 추천합니다.\n분석 결과는 시각화된 리포트로 생성되며, 엑셀 파일로 내보내기가 가능합니다." },
    ],
  },
  {
    id: 4, title: "이미지 일괄 리사이즈 툴",
    desc: "수백 장의 이미지를 원하는 사이즈로 일괄 변환합니다. 워터마크 추가, 포맷 변환, 압축률 조절까지 한 번에.",
    category: "utility", price: 0, priceLabel: "무료",
    version: "v1.3", platform: "Windows",
    fileSize: "12MB", downloadCount: 203, viewCount: 478,
    tags: ["유틸리티", "이미지", "일괄처리"],
    downloadUrl: null, thumbnail: null,
    detailContent: [
      { type: "text", value: "쇼핑몰, 블로그, SNS 운영자를 위한 이미지 일괄 처리 도구입니다.\n드래그 앤 드롭으로 수백 장의 이미지를 한 번에 리사이즈하고,\n워터마크를 추가하며, JPEG/PNG/WebP 등 원하는 포맷으로 변환할 수 있습니다." },
    ],
  },
];

/* ── 관리자 프로그램 등록/수정 모달 ── */
function ProgramUploadModal({ C, onClose, onSave, editItem, isMobile }) {
  const [form, setForm] = useState(editItem || {
    title: "", desc: "", category: "automation", price: 0,
    version: "v1.0", platform: "Windows", fileSize: "",
    tags: "", downloadUrl: "",
  });
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState(editItem?.thumbnail || null);
  const [programFile, setProgramFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [detailBlocks, setDetailBlocks] = useState(editItem?.detailContent || []);

  const handleThumbnail = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setThumbnailFile(f);
    const reader = new FileReader();
    reader.onload = (ev) => setThumbnailPreview(ev.target.result);
    reader.readAsDataURL(f);
  };

  const handleProgramFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setProgramFile(f);
    const sizeMB = (f.size / 1024 / 1024).toFixed(1);
    setForm(prev => ({ ...prev, fileSize: sizeMB + "MB" }));
  };

  const handleDetailImage = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setDetailBlocks(prev => [...prev, { type: "image", value: ev.target.result, alt: f.name, _file: f }]);
    };
    reader.readAsDataURL(f);
    e.target.value = "";
  };

  const addDetailBlock = (type) => {
    if (type === "text") setDetailBlocks(prev => [...prev, { type: "text", value: "" }]);
    if (type === "heading") setDetailBlocks(prev => [...prev, { type: "heading", value: "" }]);
    if (type === "divider") setDetailBlocks(prev => [...prev, { type: "divider" }]);
  };

  const updateDetailBlock = (idx, key, val) => {
    setDetailBlocks(prev => prev.map((b, i) => i === idx ? { ...b, [key]: val } : b));
  };

  const removeDetailBlock = (idx) => {
    setDetailBlocks(prev => prev.filter((_, i) => i !== idx));
  };

  const moveDetailBlock = (idx, dir) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= detailBlocks.length) return;
    setDetailBlocks(prev => {
      const arr = [...prev];
      [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
      return arr;
    });
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + "KB";
    return (bytes / 1024 / 1024).toFixed(1) + "MB";
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) { setError("프로그램 이름을 입력하세요."); return; }
    if (!form.desc.trim()) { setError("설명을 입력하세요."); return; }
    setUploading(true); setError("");

    try {
      const ts = Date.now();
      let thumbnailUrl = editItem?.thumbnail || null;
      let downloadUrl = form.downloadUrl || editItem?.downloadUrl || null;

      // 썸네일 업로드
      if (thumbnailFile) {
        const ext = thumbnailFile.name.split(".").pop();
        const path = `programs/thumbnails/${ts}.${ext}`;
        const { error: upErr } = await supabase.storage.from("public-assets").upload(path, thumbnailFile, { upsert: true });
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from("public-assets").getPublicUrl(path);
        thumbnailUrl = urlData.publicUrl;
      }

      // 프로그램 파일 업로드
      if (programFile) {
        const safeName = programFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `programs/files/${ts}_${safeName}`;
        const { error: upErr } = await supabase.storage.from("public-assets").upload(path, programFile, { upsert: true });
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from("public-assets").getPublicUrl(path);
        downloadUrl = urlData.publicUrl;
      }

      // 상세 이미지 업로드
      const finalBlocks = [];
      for (const block of detailBlocks) {
        if (block.type === "image" && block._file) {
          const ext = block._file.name.split(".").pop();
          const imgPath = `programs/detail/${ts}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
          const { error: imgErr } = await supabase.storage.from("public-assets").upload(imgPath, block._file, { upsert: true });
          if (imgErr) throw imgErr;
          const { data: imgUrl } = supabase.storage.from("public-assets").getPublicUrl(imgPath);
          finalBlocks.push({ type: "image", value: imgUrl.publicUrl, alt: block.alt || "" });
        } else {
          const { _file, ...clean } = block;
          finalBlocks.push(clean);
        }
      }

      const tags = form.tags ? form.tags.split(",").map(t => t.trim()).filter(Boolean) : [];
      const price = Number(form.price) || 0;

      const productData = {
        title: form.title.trim(),
        desc: form.desc.trim(),
        category: form.category,
        price,
        price_label: price === 0 ? "무료" : price.toLocaleString("ko-KR") + "원",
        version: form.version || "v1.0",
        platform: form.platform || "Windows",
        file_size: form.fileSize || "",
        tags,
        thumbnail: thumbnailUrl,
        download_url: downloadUrl,
        download_count: editItem?.downloadCount || 0,
        view_count: editItem?.viewCount || 0,
        detail_content: finalBlocks,
      };

      if (editItem?.dbId) {
        // 수정
        const { error: dbErr } = await supabase.from("programs").update(productData).eq("id", editItem.dbId);
        if (dbErr) throw dbErr;
      } else {
        // 신규 등록
        const { error: dbErr } = await supabase.from("programs").insert(productData);
        if (dbErr) throw dbErr;
      }

      onSave();
      onClose();
    } catch (err) {
      console.error(err);
      setError("업로드 실패: " + (err.message || "알 수 없는 오류"));
    } finally {
      setUploading(false);
    }
  };

  const inputStyle = {
    width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid #e5e7eb",
    background: "#f9fafb", color: "#111", fontSize: 14, outline: "none", boxSizing: "border-box",
  };

  const labelStyle = { fontSize: 12, fontWeight: 600, color: "#6b7280", marginBottom: 6, display: "block" };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width: "100%", maxWidth: 640, maxHeight: "90vh", overflowY: "auto",
        background: "#fff", color: "#111",
        borderRadius: 20, padding: isMobile ? "24px 20px" : "36px 32px",
        border: "1px solid #e5e7eb", boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0, color: "#111" }}>
            {editItem ? "프로그램 수정" : "프로그램 등록"}
          </h2>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 8, border: "1px solid #e5e7eb",
            background: "transparent", cursor: "pointer", fontSize: 16, color: "#9ca3af",
          }}>x</button>
        </div>

        {error && (
          <div style={{ padding: "10px 14px", borderRadius: 10, background: "#fef2f2", color: "#ef4444", fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* 썸네일 */}
          <div>
            <label style={labelStyle}>썸네일 이미지</label>
            {thumbnailPreview && (
              <div style={{ marginBottom: 8, borderRadius: 12, overflow: "hidden", border: "1px solid #e5e7eb" }}>
                <img src={thumbnailPreview} alt="" style={{ width: "100%", aspectRatio: "16/9", objectFit: "cover", display: "block" }} />
              </div>
            )}
            <input type="file" accept="image/*" onChange={handleThumbnail} />
          </div>

          {/* 프로그램명 */}
          <div>
            <label style={labelStyle}>프로그램명 *</label>
            <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              placeholder="예: SNS 자동화 봇 v1.0" style={inputStyle} />
          </div>

          {/* 설명 */}
          <div>
            <label style={labelStyle}>간단 설명 *</label>
            <textarea value={form.desc} onChange={e => setForm(p => ({ ...p, desc: e.target.value }))}
              placeholder="프로그램에 대한 간단한 설명을 입력하세요." rows={3}
              style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit", lineHeight: 1.6 }} />
          </div>

          {/* 카테고리 + 가격 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>카테고리</label>
              <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                style={{ ...inputStyle, cursor: "pointer" }}>
                <option value="automation">자동화</option>
                <option value="design">디자인</option>
                <option value="marketing">마케팅</option>
                <option value="utility">유틸리티</option>
                <option value="template">템플릿</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>가격 (0 = 무료)</label>
              <input type="number" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))}
                placeholder="0" style={inputStyle} />
            </div>
          </div>

          {/* 버전 + 플랫폼 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>버전</label>
              <input value={form.version} onChange={e => setForm(p => ({ ...p, version: e.target.value }))}
                placeholder="v1.0" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>플랫폼</label>
              <select value={form.platform} onChange={e => setForm(p => ({ ...p, platform: e.target.value }))}
                style={{ ...inputStyle, cursor: "pointer" }}>
                <option value="Windows">Windows</option>
                <option value="Mac">Mac</option>
                <option value="Windows / Mac">Windows / Mac</option>
                <option value="Web">Web</option>
                <option value="Android">Android</option>
                <option value="iOS">iOS</option>
                <option value="PSD / Figma">PSD / Figma</option>
                <option value="기타">기타</option>
              </select>
            </div>
          </div>

          {/* 태그 */}
          <div>
            <label style={labelStyle}>태그 (쉼표로 구분)</label>
            <input value={form.tags} onChange={e => setForm(p => ({ ...p, tags: e.target.value }))}
              placeholder="자동화, 블로그, 네이버" style={inputStyle} />
          </div>

          {/* 프로그램 파일 업로드 */}
          <div>
            <label style={labelStyle}>프로그램 파일 (ZIP, EXE 등)</label>
            {programFile && (
              <div style={{ padding: "10px 14px", borderRadius: 10, background: "#f0fdf4", border: "1px solid #bbf7d0", marginBottom: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#166534" }}>{programFile.name}</div>
                <div style={{ fontSize: 11, color: "#6b7280" }}>{formatFileSize(programFile.size)}</div>
              </div>
            )}
            <input type="file" onChange={handleProgramFile} />
          </div>

          {/* 외부 링크 (선택) */}
          <div>
            <label style={labelStyle}>또는 외부 다운로드 링크</label>
            <input value={form.downloadUrl} onChange={e => setForm(p => ({ ...p, downloadUrl: e.target.value }))}
              placeholder="https://..." style={inputStyle} />
          </div>

          {/* 상세 설명 편집 */}
          <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 20, marginTop: 4 }}>
            <label style={{ ...labelStyle, fontSize: 14, fontWeight: 700, color: "#111", marginBottom: 12 }}>상세 설명 (이미지 / 텍스트)</label>

            {detailBlocks.map((block, idx) => (
              <div key={idx} style={{
                marginBottom: 10, padding: 12, borderRadius: 10, border: "1px solid #e5e7eb", background: "#fafafa",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600 }}>
                    {block.type === "text" ? "텍스트" : block.type === "heading" ? "소제목" : block.type === "image" ? "이미지" : "구분선"}
                  </span>
                  <div style={{ display: "flex", gap: 3 }}>
                    <button onClick={() => moveDetailBlock(idx, -1)} disabled={idx === 0} style={{
                      width: 24, height: 24, borderRadius: 4, border: "1px solid #d1d5db", background: "#fff",
                      cursor: idx === 0 ? "default" : "pointer", fontSize: 10, color: "#6b7280", opacity: idx === 0 ? 0.3 : 1,
                    }}>&#9650;</button>
                    <button onClick={() => moveDetailBlock(idx, 1)} disabled={idx === detailBlocks.length - 1} style={{
                      width: 24, height: 24, borderRadius: 4, border: "1px solid #d1d5db", background: "#fff",
                      cursor: idx === detailBlocks.length - 1 ? "default" : "pointer", fontSize: 10, color: "#6b7280",
                      opacity: idx === detailBlocks.length - 1 ? 0.3 : 1,
                    }}>&#9660;</button>
                    <button onClick={() => removeDetailBlock(idx)} style={{
                      width: 24, height: 24, borderRadius: 4, border: "1px solid #fca5a5", background: "#fef2f2",
                      cursor: "pointer", fontSize: 12, color: "#ef4444",
                    }}>x</button>
                  </div>
                </div>
                {block.type === "heading" && (
                  <input value={block.value} onChange={e => updateDetailBlock(idx, "value", e.target.value)}
                    placeholder="소제목 입력..." style={{ ...inputStyle, fontWeight: 700 }} />
                )}
                {block.type === "text" && (
                  <textarea value={block.value} onChange={e => updateDetailBlock(idx, "value", e.target.value)}
                    placeholder="설명 텍스트..." rows={3}
                    style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit", lineHeight: 1.6 }} />
                )}
                {block.type === "image" && (
                  <img src={block.value} alt={block.alt || ""} style={{ maxWidth: "100%", borderRadius: 8 }} />
                )}
                {block.type === "divider" && (
                  <hr style={{ border: "none", borderTop: "1px dashed #d1d5db", margin: "4px 0" }} />
                )}
              </div>
            ))}

            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: BRAND }}>+ 이미지:</span>
                <input type="file" accept="image/*" onChange={handleDetailImage} style={{ fontSize: 12 }} />
              </div>
              {[
                { label: "+ 텍스트", action: () => addDetailBlock("text") },
                { label: "+ 소제목", action: () => addDetailBlock("heading") },
                { label: "+ 구분선", action: () => addDetailBlock("divider") },
              ].map(btn => (
                <button key={btn.label} onClick={btn.action} style={{
                  padding: "6px 14px", borderRadius: 8, border: "1px dashed #c4b5fd",
                  background: "#f5f3ff", color: BRAND, fontSize: 12, fontWeight: 600, cursor: "pointer",
                }}>{btn.label}</button>
              ))}
            </div>
          </div>
        </div>

        {/* 하단 버튼 */}
        <div style={{ display: "flex", gap: 10, marginTop: 28, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{
            padding: "12px 28px", borderRadius: 12, border: "1px solid #e5e7eb",
            background: "transparent", color: "#6b7280", fontSize: 14, fontWeight: 600, cursor: "pointer",
          }}>취소</button>
          <button onClick={handleSubmit} disabled={uploading} style={{
            padding: "12px 28px", borderRadius: 12, border: "none",
            background: uploading ? "#a0a0a0" : GRAD,
            color: "#fff", fontSize: 14, fontWeight: 700, cursor: uploading ? "default" : "pointer",
          }}>
            {uploading ? "업로드 중..." : (editItem ? "수정 완료" : "등록하기")}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── 상세 콘텐츠 블록 렌더러 ── */
function DetailContentRenderer({ blocks, C }) {
  if (!blocks || blocks.length === 0) return null;
  return (
    <div>
      {blocks.map((block, i) => {
        if (block.type === "heading") {
          return (
            <h2 key={i} style={{
              fontSize: 20, fontWeight: 700, marginBottom: 12, marginTop: i === 0 ? 0 : 32,
              paddingBottom: 10, borderBottom: `2px solid ${BRAND}20`, color: C.text,
            }}>
              {block.value}
            </h2>
          );
        }
        if (block.type === "text") {
          return (
            <div key={i} style={{ fontSize: 14, color: C.text, lineHeight: 2, marginBottom: 16, whiteSpace: "pre-wrap" }}>
              {block.value}
            </div>
          );
        }
        if (block.type === "image") {
          return (
            <div key={i} style={{ marginBottom: 16, borderRadius: 12, overflow: "hidden" }}>
              <img src={block.value} alt={block.alt || ""} style={{ width: "100%", display: "block", borderRadius: 12 }} />
              {block.alt && <div style={{ fontSize: 12, color: C.muted, textAlign: "center", marginTop: 8 }}>{block.alt}</div>}
            </div>
          );
        }
        if (block.type === "divider") {
          return <hr key={i} style={{ border: "none", borderTop: `1px solid ${C.border}`, margin: "28px 0" }} />;
        }
        return null;
      })}
    </div>
  );
}

/* ── 상세 페이지 ── */
function ProductDetail({ p, C, user, onLogin, onBack, isMobile, isAdmin, onUpdateDetail, onDownload, onEdit, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [editBlocks, setEditBlocks] = useState(p.detailContent || []);

  const addBlock = (type) => {
    if (type === "text") setEditBlocks(prev => [...prev, { type: "text", value: "" }]);
    if (type === "heading") setEditBlocks(prev => [...prev, { type: "heading", value: "" }]);
    if (type === "divider") setEditBlocks(prev => [...prev, { type: "divider" }]);
  };

  const addImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setEditBlocks(prev => [...prev, { type: "image", value: ev.target.result, alt: file.name }]);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const updateBlock = (idx, key, val) => {
    setEditBlocks(prev => prev.map((b, i) => i === idx ? { ...b, [key]: val } : b));
  };

  const removeBlock = (idx) => {
    setEditBlocks(prev => prev.filter((_, i) => i !== idx));
  };

  const moveBlock = (idx, dir) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= editBlocks.length) return;
    setEditBlocks(prev => {
      const arr = [...prev];
      [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
      return arr;
    });
  };

  const saveEdit = () => {
    if (onUpdateDetail) onUpdateDetail(p.id, editBlocks);
    setEditing(false);
  };

  const displayBlocks = editing ? editBlocks : (p.detailContent || []);

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text }}>
      {/* 뒤로가기 + 관리자 액션 */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 20px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button onClick={onBack} style={{
          background: "none", border: "none", color: C.muted, cursor: "pointer",
          fontSize: 14, fontWeight: 500, display: "flex", alignItems: "center", gap: 6, padding: "8px 0",
        }}
        onMouseEnter={e => e.currentTarget.style.color = BRAND}
        onMouseLeave={e => e.currentTarget.style.color = C.muted}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          프로그램 목록
        </button>
        {isAdmin && (
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => onEdit && onEdit(p)} style={{
              padding: "7px 16px", borderRadius: 8, border: `1px solid ${BRAND}40`,
              background: `${BRAND}08`, color: BRAND, fontSize: 12, fontWeight: 600, cursor: "pointer",
            }}>수정</button>
            <button onClick={() => onDelete && onDelete(p.id)} style={{
              padding: "7px 16px", borderRadius: 8, border: "1px solid #ef444440",
              background: "#ef444408", color: "#ef4444", fontSize: 12, fontWeight: 600, cursor: "pointer",
            }}>삭제</button>
          </div>
        )}
      </div>

      {/* 상단: 상품 요약 정보 */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 20px 0" }}>
        <div style={{
          display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.2fr 1fr", gap: isMobile ? 24 : 48,
          padding: isMobile ? "24px 20px" : "40px 44px", borderRadius: 24,
          background: C.bg === "#fff"
            ? "linear-gradient(135deg, #f8f6ff 0%, #fdf2f8 50%, #f0f9ff 100%)"
            : "linear-gradient(135deg, rgba(124,106,255,0.08) 0%, rgba(236,72,153,0.06) 50%, rgba(59,130,246,0.04) 100%)",
          border: `1px solid ${C.border}`,
        }}>
          {/* 썸네일 */}
          <div style={{
            background: C.bg === "#fff" ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.05)",
            borderRadius: 20, aspectRatio: isMobile ? "16/10" : "4/3",
            display: "flex", alignItems: "center", justifyContent: "center",
            border: `1px solid ${C.bg === "#fff" ? "rgba(124,106,255,0.1)" : C.border}`,
            position: "relative", overflow: "hidden",
          }}>
            {p.thumbnail ? (
              <img src={p.thumbnail} alt={p.title} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 20 }} />
            ) : (
              <div style={{ textAlign: "center", padding: 40 }}>
                <svg width="64" height="64" viewBox="0 0 64 64" fill="none" style={{ opacity: 0.15, marginBottom: 12 }}>
                  <rect x="8" y="12" width="48" height="40" rx="4" stroke={C.text} strokeWidth="2.5"/>
                  <path d="M8 20h48M20 12v8" stroke={C.text} strokeWidth="2.5"/>
                  <circle cx="24" cy="32" r="4" stroke={C.text} strokeWidth="2"/>
                  <path d="M36 28l8 8-4 4" stroke={C.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <div style={{ fontSize: 13, color: C.muted, fontWeight: 500 }}>프로그램 미리보기</div>
              </div>
            )}
            <div style={{
              position: "absolute", top: 16, right: 16,
              padding: "6px 16px", borderRadius: 20,
              background: p.price === 0 ? "#10b981" : GRAD,
              color: "#fff", fontSize: 13, fontWeight: 700,
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            }}>
              {p.priceLabel}
            </div>
          </div>

          {/* 우측 정보 */}
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
              {p.tags.map(t => (
                <span key={t} style={{
                  padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 600,
                  background: C.bg === "#fff" ? "rgba(124,106,255,0.08)" : "rgba(124,106,255,0.15)",
                  color: BRAND,
                }}>{t}</span>
              ))}
            </div>
            <h1 style={{ fontSize: isMobile ? 24 : 32, fontWeight: 800, marginBottom: 12, lineHeight: 1.25, letterSpacing: -0.5 }}>
              {p.title}
            </h1>
            <div style={{ fontSize: 14, color: C.muted, lineHeight: 1.8, marginBottom: 24 }}>{p.desc}</div>

            {/* 메타 정보 */}
            <div style={{
              display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 0, marginBottom: 28,
              borderRadius: 14, overflow: "hidden", border: `1px solid ${C.border}`,
              background: C.bg === "#fff" ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.04)",
            }}>
              {[
                { label: "버전", value: p.version },
                { label: "플랫폼", value: p.platform },
                { label: "용량", value: p.fileSize },
                { label: "조회", value: `${(p.viewCount || 0).toLocaleString()}` },
                { label: "다운로드", value: `${(p.downloadCount || 0).toLocaleString()}` },
              ].map((m, i) => (
                <div key={m.label} style={{
                  padding: isMobile ? "12px 6px" : "16px", textAlign: "center",
                  borderRight: i < 4 ? `1px solid ${C.border}` : "none",
                }}>
                  <div style={{ fontSize: 10, color: C.muted, marginBottom: 4, fontWeight: 500, textTransform: "uppercase", letterSpacing: 0.5 }}>{m.label}</div>
                  <div style={{ fontSize: isMobile ? 12 : 14, fontWeight: 700 }}>{m.value}</div>
                </div>
              ))}
            </div>

            {/* CTA - 회원 전용 다운로드 */}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {p.downloadUrl ? (
                <button onClick={() => { if (!user) { onLogin(); return; } if (onDownload) onDownload(p.id); window.open(p.downloadUrl, "_blank"); }} style={{
                  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 10,
                  padding: "15px 40px", borderRadius: 14, background: GRAD, color: "#fff",
                  fontWeight: 700, fontSize: 16, border: "none", cursor: "pointer",
                  boxShadow: "0 4px 16px rgba(124,106,255,0.3)", flex: isMobile ? 1 : "unset",
                }}>
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 2v10M5 8l4 4 4-4M3 14h12" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  {p.price === 0 ? "무료 다운로드" : "구매하기"}
                </button>
              ) : (
                <button style={{
                  padding: "15px 40px", borderRadius: 14,
                  background: C.bg === "#fff" ? "#f0f0f4" : "rgba(255,255,255,0.08)",
                  color: C.muted, fontWeight: 700, fontSize: 16, border: "none", cursor: "default",
                  flex: isMobile ? 1 : "unset",
                }}>준비중</button>
              )}
            </div>
            {!user && (
              <div style={{ fontSize: 12, color: C.muted, marginTop: 10 }}>
                * 다운로드는 회원 로그인 후 이용 가능합니다.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 상세 설명 영역 */}
      <section style={{ maxWidth: 900, margin: "0 auto", padding: "48px 20px 80px" }}>
        {/* 관리자: 편집 토글 */}
        {isAdmin && (
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20, gap: 10 }}>
            {editing ? (
              <>
                <button onClick={() => { setEditBlocks(p.detailContent || []); setEditing(false); }} style={{
                  padding: "8px 20px", borderRadius: 10, border: `1px solid ${C.border}`,
                  background: "transparent", color: C.muted, fontSize: 13, fontWeight: 600, cursor: "pointer",
                }}>취소</button>
                <button onClick={saveEdit} style={{
                  padding: "8px 20px", borderRadius: 10, border: "none",
                  background: GRAD, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
                }}>저장</button>
              </>
            ) : (
              <button onClick={() => setEditing(true)} style={{
                padding: "8px 20px", borderRadius: 10, border: `1px solid ${BRAND}40`,
                background: `${BRAND}08`, color: BRAND, fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}>상세 설명 편집</button>
            )}
          </div>
        )}

        {/* 구분선 + 제목 */}
        <div style={{
          padding: "20px 0 24px", marginBottom: 8,
          borderTop: `1px solid ${C.border}`,
          fontSize: 18, fontWeight: 700, color: C.text,
        }}>
          상세 설명
        </div>

        {/* 편집 모드 */}
        {editing ? (
          <div>
            {editBlocks.map((block, idx) => (
              <div key={idx} style={{
                marginBottom: 12, padding: 16, borderRadius: 12, border: `1px solid ${C.border}`,
                background: C.bg === "#fff" ? "#fafafa" : "rgba(255,255,255,0.03)",
              }}>
                {/* 블록 컨트롤 */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 11, color: C.muted, fontWeight: 600, textTransform: "uppercase" }}>
                    {block.type === "text" ? "텍스트" : block.type === "heading" ? "소제목" : block.type === "image" ? "이미지" : "구분선"}
                  </span>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button onClick={() => moveBlock(idx, -1)} disabled={idx === 0} style={{
                      width: 28, height: 28, borderRadius: 6, border: `1px solid ${C.border}`, background: "transparent",
                      cursor: idx === 0 ? "default" : "pointer", fontSize: 12, color: C.muted, opacity: idx === 0 ? 0.3 : 1,
                    }}>&#9650;</button>
                    <button onClick={() => moveBlock(idx, 1)} disabled={idx === editBlocks.length - 1} style={{
                      width: 28, height: 28, borderRadius: 6, border: `1px solid ${C.border}`, background: "transparent",
                      cursor: idx === editBlocks.length - 1 ? "default" : "pointer", fontSize: 12, color: C.muted,
                      opacity: idx === editBlocks.length - 1 ? 0.3 : 1,
                    }}>&#9660;</button>
                    <button onClick={() => removeBlock(idx)} style={{
                      width: 28, height: 28, borderRadius: 6, border: `1px solid #ef444440`, background: "#ef444410",
                      cursor: "pointer", fontSize: 14, color: "#ef4444",
                    }}>x</button>
                  </div>
                </div>

                {/* 블록 에디터 */}
                {block.type === "heading" && (
                  <input value={block.value} onChange={e => updateBlock(idx, "value", e.target.value)}
                    placeholder="소제목 입력..."
                    style={{
                      width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${C.border}`,
                      background: "transparent", color: C.text, fontSize: 16, fontWeight: 700, outline: "none",
                      boxSizing: "border-box",
                    }} />
                )}
                {block.type === "text" && (
                  <textarea value={block.value} onChange={e => updateBlock(idx, "value", e.target.value)}
                    placeholder="설명 텍스트를 입력하세요..."
                    rows={5}
                    style={{
                      width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${C.border}`,
                      background: "transparent", color: C.text, fontSize: 14, lineHeight: 1.8, outline: "none",
                      resize: "vertical", fontFamily: "inherit", boxSizing: "border-box",
                    }} />
                )}
                {block.type === "image" && (
                  <div>
                    <img src={block.value} alt={block.alt || ""} style={{ maxWidth: "100%", borderRadius: 8, marginBottom: 8 }} />
                    <input value={block.alt || ""} onChange={e => updateBlock(idx, "alt", e.target.value)}
                      placeholder="이미지 설명 (선택)"
                      style={{
                        width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${C.border}`,
                        background: "transparent", color: C.text, fontSize: 13, outline: "none", boxSizing: "border-box",
                      }} />
                  </div>
                )}
                {block.type === "divider" && (
                  <hr style={{ border: "none", borderTop: `1px dashed ${C.border}`, margin: "8px 0" }} />
                )}
              </div>
            ))}

            {/* 블록 추가 버튼들 */}
            <div style={{
              display: "flex", gap: 8, flexWrap: "wrap", padding: "20px 0",
              borderTop: `1px dashed ${C.border}`, marginTop: 12,
            }}>
              <span style={{ fontSize: 12, color: C.muted, fontWeight: 500, alignSelf: "center", marginRight: 4 }}>블록 추가:</span>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: BRAND }}>+ 이미지:</span>
                <input type="file" accept="image/*" onChange={addImage} style={{ fontSize: 12 }} />
              </div>
              {[
                { label: "텍스트", action: () => addBlock("text") },
                { label: "소제목", action: () => addBlock("heading") },
                { label: "구분선", action: () => addBlock("divider") },
              ].map(btn => (
                <button key={btn.label} onClick={btn.action} style={{
                  padding: "6px 16px", borderRadius: 8, border: `1px dashed ${BRAND}40`,
                  background: `${BRAND}06`, color: BRAND, fontSize: 12, fontWeight: 600, cursor: "pointer",
                }}>
                  + {btn.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* 뷰 모드 */
          displayBlocks.length > 0 ? (
            <DetailContentRenderer blocks={displayBlocks} C={C} />
          ) : (
            <div style={{ textAlign: "center", padding: "60px 20px", color: C.muted }}>
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none" style={{ opacity: 0.2, marginBottom: 12 }}>
                <rect x="6" y="8" width="36" height="32" rx="3" stroke={C.muted} strokeWidth="2"/>
                <path d="M14 18h20M14 24h16M14 30h10" stroke={C.muted} strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <div style={{ fontSize: 14, fontWeight: 500 }}>상세 설명이 아직 등록되지 않았습니다.</div>
              {isAdmin && (
                <button onClick={() => setEditing(true)} style={{
                  marginTop: 16, padding: "8px 24px", borderRadius: 10, border: `1px solid ${BRAND}40`,
                  background: `${BRAND}08`, color: BRAND, fontSize: 13, fontWeight: 600, cursor: "pointer",
                }}>상세 설명 작성하기</button>
              )}
            </div>
          )
        )}
      </section>
    </div>
  );
}

/* ── 메인 목록 페이지 ── */
export default function ProgramsPage({ C, navigate, user, onLogin, initialProductId, onProductIdChange }) {
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("latest");

  // 무료 미디어 검색
  const [mediaQuery, setMediaQuery] = useState("");
  const [mediaResults, setMediaResults] = useState([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const isMediaTab = category === "free_photo" || category === "free_video";

  const searchMedia = async (q) => {
    setMediaLoading(true);
    setMediaResults([]);
    try {
      const results = [];
      const isVideo = category === "free_video";
      // Pixabay
      try {
        const suffix = isVideo ? "&video=true" : "&image_type=photo";
        const d = await fetch(`/api/proxy-pixabay?q=${encodeURIComponent(q || "nature")}&per_page=18&page=1&safesearch=true${suffix}`).then(r=>r.json());
        (d.hits||[]).forEach(h => {
          if (isVideo) {
            results.push({ id: "px_"+h.id, title: h.tags, url: h.videos?.medium?.url||"", preview: h.videos?.tiny?.thumbnail||"", type: "video", src: "Pixabay" });
          } else {
            results.push({ id: "px_"+h.id, title: h.tags, url: h.largeImageURL||h.webformatURL, preview: h.webformatURL||h.previewURL, type: "image", src: "Pixabay" });
          }
        });
      } catch {}
      // Pexels
      try {
        const path = isVideo ? (q ? "videos/search" : "videos/popular") : (q ? "v1/search" : "v1/curated");
        const params = q ? `query=${encodeURIComponent(q)}&per_page=18&page=1` : "per_page=18&page=1";
        const d = await fetch(`/api/proxy-pexels?path=${path}&${params}`).then(r=>r.json());
        if (isVideo) {
          (d.videos||[]).forEach(v => {
            results.push({ id: "pe_"+v.id, title: v.user?.name||"Pexels", url: (v.video_files||[]).find(f=>f.quality==="hd")?.link||(v.video_files||[])[0]?.link||"", preview: v.image||"", type: "video", src: "Pexels" });
          });
        } else {
          (d.photos||[]).forEach(p => {
            results.push({ id: "pe_"+p.id, title: p.photographer||"Pexels", url: p.src?.large2x||p.src?.large||"", preview: p.src?.medium||"", type: "image", src: "Pexels" });
          });
        }
      } catch {}
      // Unsplash (사진만)
      if (!isVideo) {
        try {
          const key = import.meta.env.VITE_UNSPLASH_KEY;
          if (key) {
            const uUrl = q ? `https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&per_page=18&page=1&client_id=${key}` : `https://api.unsplash.com/photos?per_page=18&order_by=popular&client_id=${key}`;
            const d = await fetch(uUrl).then(r=>r.json());
            const photos = q ? (d.results||[]) : (Array.isArray(d)?d:[]);
            photos.forEach(p => {
              results.push({ id: "un_"+p.id, title: p.description||p.alt_description||"Unsplash", url: p.urls?.full||p.urls?.regular||"", preview: p.urls?.regular||p.urls?.small||"", type: "image", src: "Unsplash" });
            });
          }
        } catch {}
      }
      setMediaResults(results);
    } catch {}
    setMediaLoading(false);
  };

  // 무료 미디어 탭 진입 시 인기 사진/영상 로드
  React.useEffect(() => {
    if (isMediaTab) searchMedia("");
  }, [category]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
  const isAdmin = user?.role === "admin";

  // DB에서 상품 목록 불러오기
  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("programs")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (data) {
        const mapped = data.map(d => ({
          id: d.id, dbId: d.id,
          title: d.title, desc: d.desc,
          category: d.category, price: d.price,
          priceLabel: d.price_label || (d.price === 0 ? "무료" : d.price.toLocaleString("ko-KR") + "원"),
          version: d.version, platform: d.platform,
          fileSize: d.file_size, downloadCount: d.download_count || 0,
          viewCount: d.view_count || 0,
          tags: d.tags || [], thumbnail: d.thumbnail,
          downloadUrl: d.download_url,
          detailContent: d.detail_content || [],
        }));
        setProducts(mapped);
      }
    } catch (err) {
      console.log("DB 로드 실패:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadProducts(); }, []);

  // URL의 productId로 상품 자동 선택
  useEffect(() => {
    if (initialProductId && products.length > 0 && !selectedProduct) {
      const found = products.find(p => p.id === initialProductId);
      if (found) {
        setSelectedProduct(found);
        // 조회수 증가
        const newCount = (found.viewCount || 0) + 1;
        setProducts(prev => prev.map(p => p.id === found.id ? { ...p, viewCount: newCount } : p));
        if (found.dbId) supabase.from("programs").update({ view_count: newCount }).eq("id", found.dbId).then(() => {});
      }
    }
  }, [initialProductId, products]);

  // 상품 선택/해제 시 URL + OG 메타태그 업데이트
  useEffect(() => {
    if (selectedProduct) {
      // URL 변경
      window.history.replaceState(null, "", "/programs/" + selectedProduct.id);
      if (onProductIdChange) onProductIdChange(selectedProduct.id);
      // 페이지 타이틀
      document.title = selectedProduct.title + " - SNS메이킷";
      // OG 메타태그 업데이트
      updateMeta("og:title", selectedProduct.title);
      updateMeta("og:description", selectedProduct.desc);
      updateMeta("og:url", "https://snsmakeit.com/programs/" + selectedProduct.id);
      if (selectedProduct.thumbnail) updateMeta("og:image", selectedProduct.thumbnail);
      updateMeta("og:type", "product");
    } else {
      window.history.replaceState(null, "", "/programs");
      if (onProductIdChange) onProductIdChange(null);
      document.title = "자료실 - SNS메이킷";
      updateMeta("og:title", "자료실 - SNS메이킷");
      updateMeta("og:description", "프로그램, 무료 사진, 무료 영상 등 다양한 자료를 다운로드하세요.");
      updateMeta("og:url", "https://snsmakeit.com/programs");
      updateMeta("og:image", "https://snsmakeit.com/og-default.png");
      updateMeta("og:type", "website");
    }
  }, [selectedProduct]);

  const handleUpdateDetail = (productId, newBlocks) => {
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, detailContent: newBlocks } : p));
    setSelectedProduct(prev => prev && prev.id === productId ? { ...prev, detailContent: newBlocks } : prev);
    // DB 저장
    supabase.from("programs").update({ detail_content: newBlocks }).eq("id", productId).then(() => {});
  };

  // 조회수 증가
  const handleView = (product) => {
    const newCount = (product.viewCount || 0) + 1;
    const updated = { ...product, viewCount: newCount };
    setProducts(prev => prev.map(p => p.id === product.id ? updated : p));
    setSelectedProduct(updated);
    if (product.dbId) {
      supabase.from("programs").update({ view_count: newCount }).eq("id", product.dbId).then(() => {});
    }
  };

  // 다운로드 카운트 증가
  const handleDownload = (productId) => {
    setProducts(prev => prev.map(p => {
      if (p.id === productId) {
        const newCount = (p.downloadCount || 0) + 1;
        if (p.dbId) supabase.from("programs").update({ download_count: newCount }).eq("id", p.dbId).then(() => {});
        return { ...p, downloadCount: newCount };
      }
      return p;
    }));
    setSelectedProduct(prev => prev && prev.id === productId ? { ...prev, downloadCount: (prev.downloadCount || 0) + 1 } : prev);
  };

  // 프로그램 삭제 (관리자)
  const handleDelete = async (productId) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    const product = products.find(p => p.id === productId);
    if (product?.dbId) {
      await supabase.from("programs").delete().eq("id", product.dbId);
    }
    setProducts(prev => prev.filter(p => p.id !== productId));
    setSelectedProduct(null);
  };

  const filtered = products
    .filter(p => category === "all" || p.category === category)
    .filter(p => !search || p.title.toLowerCase().includes(search.toLowerCase()) || p.desc.toLowerCase().includes(search.toLowerCase()) || p.tags.some(t => t.includes(search)))
    .sort((a, b) => {
      if (sort === "popular") return b.downloadCount - a.downloadCount;
      if (sort === "price_low") return a.price - b.price;
      if (sort === "price_high") return b.price - a.price;
      return b.id - a.id;
    });

  if (selectedProduct) {
    return (
      <ProductDetail
        p={selectedProduct} C={C} user={user} onLogin={onLogin}
        onBack={() => setSelectedProduct(null)} isMobile={isMobile}
        isAdmin={isAdmin} onUpdateDetail={handleUpdateDetail}
        onDownload={handleDownload} onDelete={handleDelete}
        onEdit={(prod) => {
          setEditingProduct({
            ...prod,
            tags: Array.isArray(prod.tags) ? prod.tags.join(", ") : "",
            downloadUrl: prod.downloadUrl || "",
          });
          setShowUploadModal(true);
        }}
      />
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text }}>
      <section style={{ textAlign: "center", padding: "80px 20px 48px", maxWidth: 700, margin: "0 auto" }}>
        <div style={{
          display: "inline-block", padding: "5px 14px", borderRadius: 20,
          background: `${BRAND}12`, color: BRAND, fontSize: 12, fontWeight: 600, marginBottom: 16,
        }}>Resource Library</div>
        <h1 style={{
          fontSize: "clamp(28px, 5vw, 42px)", fontWeight: 800, lineHeight: 1.25, marginBottom: 14, letterSpacing: -0.5,
        }}>
          <span style={{ background: GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>필요한 자료를 한 곳에서.</span>
        </h1>
        <p style={{ fontSize: 15, color: C.muted, lineHeight: 1.7 }}>
          프로그램, 템플릿, 무료 사진, 무료 영상까지.<br />
          SNS 운영에 필요한 모든 자료를 다운로드하세요.
        </p>
      </section>

      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "0 20px 32px" }}>
        <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
          <div style={{
            flex: 1, minWidth: 200, display: "flex", alignItems: "center", gap: 8,
            padding: "10px 16px", borderRadius: 12, background: C.bg === "#fff" ? "#f5f5f8" : "rgba(255,255,255,0.06)",
            border: `1px solid ${C.border}`,
          }}>
            <span style={{ color: C.muted, fontSize: 16 }}>&#128269;</span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="자료실 검색..."
              style={{ flex: 1, border: "none", outline: "none", background: "transparent", color: C.text, fontSize: 14 }} />
          </div>
          <select value={sort} onChange={e => setSort(e.target.value)} style={{
            padding: "10px 16px", borderRadius: 12, border: `1px solid ${C.border}`,
            background: C.bg === "#fff" ? "#f5f5f8" : "rgba(255,255,255,0.06)",
            color: C.text, fontSize: 13, fontWeight: 500, cursor: "pointer", outline: "none",
          }}>
            <option value="latest">최신순</option>
            <option value="popular">인기순</option>
            <option value="price_low">가격 낮은순</option>
            <option value="price_high">가격 높은순</option>
          </select>
          {isAdmin && (
            <button onClick={() => { setEditingProduct(null); setShowUploadModal(true); }} style={{
              padding: "10px 20px", borderRadius: 12, border: "none",
              background: GRAD, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap",
            }}>
              + 프로그램 등록
            </button>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {CATEGORIES.map(c => (
            <button key={c.id} onClick={() => setCategory(c.id)} style={{
              padding: "7px 18px", borderRadius: 20, border: c.special ? `1.5px solid ${category === c.id ? "#10b981" : (C.bg === "#fff" ? "#d1fae5" : "rgba(16,185,129,0.3)")}` : "none", cursor: "pointer",
              fontSize: 13, fontWeight: 600, transition: "all 0.15s",
              background: category === c.id ? (c.special ? "#10b981" : BRAND) : (c.special ? (C.bg === "#fff" ? "#ecfdf5" : "rgba(16,185,129,0.1)") : (C.bg === "#fff" ? "#f0f0f4" : "rgba(255,255,255,0.08)")),
              color: category === c.id ? "#fff" : (c.special ? "#10b981" : C.muted),
            }}>{c.label}</button>
          ))}
        </div>
      </section>

      {/* 무료 미디어 검색 영역 */}
      {isMediaTab && (
        <section style={{ maxWidth: 1100, margin: "0 auto", padding: "0 20px 20px" }}>
          <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderRadius: 12, background: C.bg === "#fff" ? "#f5f5f8" : "rgba(255,255,255,0.06)", border: `1px solid ${C.border}` }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input value={mediaQuery} onChange={e => setMediaQuery(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") searchMedia(mediaQuery); }}
                placeholder={category === "free_photo" ? "무료 사진 검색 (영어 추천)..." : "무료 영상 검색 (영어 추천)..."}
                style={{ flex: 1, border: "none", outline: "none", background: "transparent", color: C.text, fontSize: 14 }} />
            </div>
            <button onClick={() => searchMedia(mediaQuery)} style={{ padding: "10px 20px", borderRadius: 12, border: "none", background: "#10b981", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
              검색
            </button>
          </div>
          <div style={{ display: "flex", gap: 6, marginBottom: 16, fontSize: 11, color: C.muted }}>
            <span style={{ padding: "3px 10px", borderRadius: 12, background: C.bg === "#fff" ? "#f0f0f4" : "rgba(255,255,255,0.06)" }}>Pexels</span>
            <span style={{ padding: "3px 10px", borderRadius: 12, background: C.bg === "#fff" ? "#f0f0f4" : "rgba(255,255,255,0.06)" }}>Pixabay</span>
            {category === "free_photo" && <span style={{ padding: "3px 10px", borderRadius: 12, background: C.bg === "#fff" ? "#f0f0f4" : "rgba(255,255,255,0.06)" }}>Unsplash</span>}
          </div>
        </section>
      )}

      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "0 20px 80px" }}>
        {isMediaTab ? (
          mediaLoading ? (
            <div style={{ textAlign: "center", padding: "60px 20px", color: C.muted }}><div style={{ fontSize: 14 }}>검색 중...</div></div>
          ) : mediaResults.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px", color: C.muted }}>
              <div style={{ fontSize: 14 }}>검색어를 입력하고 Enter를 눌러주세요</div>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
              {mediaResults.map(m => (
                <div key={m.id} style={{ borderRadius: 14, overflow: "hidden", border: `1px solid ${C.border}`, background: C.bg === "#fff" ? "#fff" : "rgba(255,255,255,0.04)", cursor: "pointer", transition: "all 0.2s" }}
                  onClick={() => { const a = document.createElement("a"); a.href = m.url; a.download = (m.title || "media").slice(0,30); a.target = "_blank"; a.click(); }}>
                  <div style={{ aspectRatio: category === "free_video" ? "16/9" : "4/3", overflow: "hidden", background: "#000" }}>
                    {m.type === "video" ? (
                      <video src={m.url} poster={m.preview} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} onMouseEnter={e => e.target.play()} onMouseLeave={e => { e.target.pause(); e.target.currentTime = 0; }} />
                    ) : (
                      <img src={m.preview} alt={m.title} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    )}
                  </div>
                  <div style={{ padding: "10px 12px" }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.title}</div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                      <span style={{ fontSize: 10, color: "#10b981", fontWeight: 600, padding: "2px 8px", borderRadius: 10, background: "rgba(16,185,129,0.1)" }}>{m.src}</span>
                      <span style={{ fontSize: 10, color: C.muted }}>무료</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : loading ? (
          <div style={{ textAlign: "center", padding: "80px 20px", color: C.muted }}>
            <div style={{ fontSize: 15, fontWeight: 500 }}>불러오는 중...</div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 20px", color: C.muted }}>
            <div style={{ fontSize: 40, opacity: 0.3, marginBottom: 12 }}>&#128230;</div>
            <div style={{ fontSize: 15, fontWeight: 500 }}>
              {products.length === 0 ? "등록된 프로그램이 없습니다." : "검색 결과가 없습니다"}
            </div>
          </div>
        ) : (
          <div style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 20,
          }}>
            {filtered.map(p => (
              <div key={p.id} onClick={() => handleView(p)} style={{
                background: C.bg === "#fff" ? "#fff" : "rgba(255,255,255,0.04)",
                borderRadius: 16, border: `1px solid ${C.border}`,
                cursor: "pointer", transition: "all 0.2s", overflow: "hidden",
                boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(124,106,255,0.12)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.04)"; }}
              >
                <div style={{
                  aspectRatio: "16/10", position: "relative",
                  background: `linear-gradient(135deg, ${BRAND}10, ${BRAND2}10)`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  borderBottom: `1px solid ${C.border}`,
                }}>
                  {p.thumbnail
                    ? <img src={p.thumbnail} alt={p.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <div style={{ fontSize: 40, opacity: 0.2 }}>&#128230;</div>
                  }
                </div>
                <div style={{ padding: "20px 20px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <div style={{
                      padding: "4px 12px", borderRadius: 16,
                      background: p.price === 0 ? "#10b98115" : `${BRAND}12`,
                      color: p.price === 0 ? "#10b981" : BRAND,
                      fontSize: 12, fontWeight: 700,
                    }}>{p.priceLabel}</div>
                  </div>
                  <div style={{ display: "flex", gap: 5, marginBottom: 10, flexWrap: "wrap" }}>
                    {p.tags.slice(0, 3).map(t => (
                      <span key={t} style={{
                        padding: "2px 8px", borderRadius: 12, fontSize: 10, fontWeight: 600,
                        background: `${BRAND}10`, color: BRAND,
                      }}>{t}</span>
                    ))}
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6, lineHeight: 1.3 }}>{p.title}</div>
                  <div style={{
                    fontSize: 12, color: C.muted, lineHeight: 1.6, marginBottom: 14,
                    display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
                  }}>{p.desc}</div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 11, color: C.muted }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 2.5C3 2.5 1 6 1 6s2 3.5 5 3.5S11 6 11 6s-2-3.5-5-3.5z" stroke="currentColor" strokeWidth="1.2"/><circle cx="6" cy="6" r="1.5" stroke="currentColor" strokeWidth="1.2"/></svg>
                        {(p.viewCount || 0).toLocaleString()}
                      </span>
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v6M3 4l3 3 3-3M2 9h8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        {(p.downloadCount || 0).toLocaleString()}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 12, fontSize: 11, color: C.muted }}>
                      <span>{p.platform}</span>
                      <span>{p.fileSize}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 등록 모달 */}
      {showUploadModal && (
        <ProgramUploadModal
          C={C} isMobile={isMobile}
          editItem={editingProduct}
          onClose={() => { setShowUploadModal(false); setEditingProduct(null); }}
          onSave={() => { loadProducts(); }}
        />
      )}
    </div>
  );
}
