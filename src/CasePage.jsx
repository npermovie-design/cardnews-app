import { useState, useEffect } from "react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY;

// 기본 하드코딩 사례 (DB 없을 때 폴백)
const DEFAULT_CASES = [
  {
    id: "default_1",
    brand: "두컴퍼니",
    field: "커스텀 주얼리",
    feature: "네이버 블로그 글쓰기",
    title: "커스텀 주얼리 브랜드의 네이버 블로그 SEO 마케팅",
    desc: "SNS메이킷의 네이버 블로그 AI 글쓰기로 SEO 최적화된 블로그 콘텐츠를 제작했습니다. 키워드 기반 자동 구성으로 검색 노출이 크게 향상되었습니다.",
    link: "https://blog.naver.com/goldnlbo/224225808617",
    thumb: "/20260323_145122.png",
    tags: ["네이버 블로그", "SEO", "주얼리"],
  },
];

async function sbFetch(path, options = {}) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: options.method === "POST" ? "return=representation" : undefined,
      ...options.headers,
    },
  });
  if (!res.ok) return null;
  return res.json();
}

export default function CasePage({ C, isDark, user }) {
  const text = isDark ? "#e8eaed" : "#1a1a2e";
  const muted = isDark ? "rgba(255,255,255,0.45)" : "#888";
  const bdr = isDark ? "rgba(255,255,255,0.08)" : "#e5e7eb";
  const cardBg = isDark ? "rgba(255,255,255,0.04)" : "#fff";
  const inputBg = isDark ? "rgba(255,255,255,0.06)" : "#f5f5f5";
  const accent = "#7c6aff";
  const isAdmin = user?.role === "admin";

  const [cases, setCases] = useState(DEFAULT_CASES);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ brand: "", field: "", feature: "", title: "", desc: "", link: "", thumb: "", tags: "" });

  // Supabase에서 사례 로드
  useEffect(() => {
    (async () => {
      const data = await sbFetch("customer_cases?select=*&order=created_at.desc");
      if (data && data.length > 0) {
        setCases(data.map(d => ({
          id: d.id, brand: d.brand, field: d.field, feature: d.feature,
          title: d.title, desc: d.description, link: d.link,
          thumb: d.thumb_url, tags: d.tags || [],
        })));
      }
    })();
  }, []);

  // 썸네일 이미지 업로드 → base64 또는 URL
  const handleThumbUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm(f => ({ ...f, thumb: reader.result }));
    reader.readAsDataURL(file);
  };

  // 사례 저장
  const saveCase = async () => {
    if (!form.brand || !form.title) return alert("브랜드명과 제목은 필수입니다.");
    setSaving(true);
    try {
      const payload = {
        brand: form.brand, field: form.field, feature: form.feature,
        title: form.title, description: form.desc, link: form.link,
        thumb_url: form.thumb, tags: form.tags.split(",").map(s => s.trim()).filter(Boolean),
        created_at: new Date().toISOString(),
      };
      const data = await sbFetch("customer_cases", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (data?.[0]) {
        const d = data[0];
        setCases(prev => [{
          id: d.id, brand: d.brand, field: d.field, feature: d.feature,
          title: d.title, desc: d.description, link: d.link,
          thumb: d.thumb_url, tags: d.tags || [],
        }, ...prev]);
      }
      setForm({ brand: "", field: "", feature: "", title: "", desc: "", link: "", thumb: "", tags: "" });
      setShowForm(false);
    } catch (e) { alert("저장 실패: " + e.message); }
    setSaving(false);
  };

  // 사례 삭제 (관리자)
  const deleteCase = async (id) => {
    if (!confirm("이 사례를 삭제하시겠습니까?")) return;
    await sbFetch(`customer_cases?id=eq.${id}`, { method: "DELETE" });
    setCases(prev => prev.filter(c => c.id !== id));
  };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "60px 20px 80px" }}>
      <div style={{ textAlign: "center", marginBottom: 48 }}>
        <div style={{ display: "inline-block", padding: "6px 16px", borderRadius: 20, background: `${accent}15`, color: accent, fontSize: 13, fontWeight: 700, marginBottom: 16 }}>
          고객사례
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 900, color: text, margin: "0 0 12px", letterSpacing: -1 }}>
          SNS메이킷으로 만든<br />성공 사례를 확인하세요
        </h1>
        <p style={{ fontSize: 15, color: muted, lineHeight: 1.7, maxWidth: 500, margin: "0 auto" }}>
          다양한 브랜드와 크리에이터들이 SNS메이킷을 활용하여 콘텐츠를 제작하고 있습니다.
        </p>
      </div>

      {/* 갤러리 그리드 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))", gap: 20 }}>
        {cases.map(c => (
          <a key={c.id} href={c.link || "#"} target="_blank" rel="noopener noreferrer"
            style={{ borderRadius: 16, overflow: "hidden", border: `1px solid ${bdr}`, background: cardBg,
              cursor: "pointer", transition: "transform 0.15s,box-shadow 0.15s", textDecoration: "none", display: "block", position: "relative" }}
            onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 12px 32px rgba(0,0,0,0.15)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}>
            {/* 관리자 삭제 버튼 */}
            {isAdmin && (
              <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); deleteCase(c.id); }}
                style={{ position: "absolute", top: 8, right: 8, zIndex: 5, width: 28, height: 28, borderRadius: 8,
                  background: "rgba(239,68,68,0.9)", border: "none", color: "#fff", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                ✕
              </button>
            )}
            {/* 썸네일 */}
            <div style={{ width: "100%", aspectRatio: "16/9", background: isDark ? "rgba(99,102,241,0.08)" : "rgba(99,102,241,0.04)",
              display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
              {c.thumb
                ? <img src={c.thumb} alt={c.brand} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <div style={{ fontSize: 40 }}>🏆</div>}
              <div style={{ position: "absolute", top: 12, left: 12, display: "flex", gap: 6 }}>
                <span style={{ padding: "3px 10px", borderRadius: 6, background: `${accent}dd`, color: "#fff", fontSize: 11, fontWeight: 700 }}>{c.feature}</span>
              </div>
            </div>
            <div style={{ padding: "18px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: `${accent}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 900, color: accent }}>
                  {c.brand[0]}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: text }}>{c.brand}</div>
                  <div style={{ fontSize: 11, color: muted }}>{c.field}</div>
                </div>
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: text, marginBottom: 8, lineHeight: 1.4 }}>{c.title}</div>
              <div style={{ fontSize: 13, color: muted, lineHeight: 1.6, marginBottom: 12,
                overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                {c.desc}
              </div>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                {(c.tags || []).map(tag => (
                  <span key={tag} style={{ padding: "3px 8px", borderRadius: 5, background: isDark ? "rgba(255,255,255,0.06)" : "#f0f0f6",
                    color: muted, fontSize: 10, fontWeight: 600 }}>{tag}</span>
                ))}
              </div>
            </div>
          </a>
        ))}

        {/* 고객사례 등록하기 카드 */}
        {isAdmin ? (
          <div style={{ borderRadius: 16, overflow: "hidden", border: `2px dashed ${accent}40`, background: "transparent",
            display: "flex", alignItems: "center", justifyContent: "center", minHeight: 280, cursor: "pointer" }}
            onClick={() => setShowForm(true)}>
            <div style={{ textAlign: "center", padding: 30 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>+</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: accent, marginBottom: 6 }}>고객사례 등록하기</div>
              <div style={{ fontSize: 13, color: muted, lineHeight: 1.6 }}>
                새로운 고객 사례를 직접 등록하세요
              </div>
            </div>
          </div>
        ) : (
          <div style={{ borderRadius: 16, overflow: "hidden", border: `2px dashed ${bdr}`, background: "transparent",
            display: "flex", alignItems: "center", justifyContent: "center", minHeight: 280, cursor: "pointer" }}
            onClick={() => window.location.hash = "#contact"}>
            <div style={{ textAlign: "center", padding: 30 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📢</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: text, marginBottom: 6 }}>고객사례 등록하기</div>
              <div style={{ fontSize: 13, color: muted, lineHeight: 1.6 }}>
                SNS메이킷을 활용한 사례가 있다면<br />문의하기를 통해 등록해주세요!
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 관리자 등록 모달 */}
      {showForm && isAdmin && (
        <div onClick={() => setShowForm(false)} style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: "min(560px,95vw)", maxHeight: "85vh", overflowY: "auto",
            background: isDark ? "#1a1730" : "#fff", borderRadius: 20, padding: "28px 24px", boxShadow: "0 24px 64px rgba(0,0,0,0.4)", border: `1px solid ${bdr}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: text }}>고객사례 등록</div>
              <button onClick={() => setShowForm(false)}
                style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${bdr}`, background: "transparent", color: muted, cursor: "pointer", fontSize: 16 }}>✕</button>
            </div>

            {/* 썸네일 업로드 */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: text, marginBottom: 6 }}>썸네일 이미지</div>
              {form.thumb && (
                <div style={{ marginBottom: 8, borderRadius: 12, overflow: "hidden", border: `1px solid ${bdr}` }}>
                  <img src={form.thumb} alt="" style={{ width: "100%", height: 160, objectFit: "cover" }} />
                </div>
              )}
              <label style={{ display: "inline-block", padding: "10px 20px", borderRadius: 10, border: `1px solid ${bdr}`,
                background: inputBg, color: text, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                이미지 선택
                <input type="file" accept="image/*" onChange={handleThumbUpload} style={{ display: "none" }} />
              </label>
              <span style={{ fontSize: 11, color: muted, marginLeft: 8 }}>또는 URL 직접 입력:</span>
              <input type="text" value={form.thumb} onChange={e => setForm(f => ({ ...f, thumb: e.target.value }))}
                placeholder="https://example.com/image.jpg"
                style={{ width: "100%", marginTop: 6, padding: "8px 12px", borderRadius: 8, border: `1px solid ${bdr}`, background: inputBg, color: text, fontSize: 12, outline: "none", boxSizing: "border-box" }} />
            </div>

            {/* 폼 필드 */}
            {[
              { key: "brand", label: "브랜드명 *", placeholder: "예: 두컴퍼니" },
              { key: "field", label: "업종/분야", placeholder: "예: 커스텀 주얼리" },
              { key: "feature", label: "사용 기능", placeholder: "예: 네이버 블로그 글쓰기" },
              { key: "title", label: "사례 제목 *", placeholder: "성과를 포함한 제목" },
              { key: "link", label: "연결 링크", placeholder: "https://example.com" },
              { key: "tags", label: "태그 (쉼표 구분)", placeholder: "네이버 블로그, SEO, 마케팅" },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: text, marginBottom: 4 }}>{f.label}</div>
                <input type="text" value={form[f.key]} onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${bdr}`, background: inputBg, color: text, fontSize: 13, outline: "none", boxSizing: "border-box" }} />
              </div>
            ))}

            {/* 설명 */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: text, marginBottom: 4 }}>설명</div>
              <textarea value={form.desc} onChange={e => setForm(f => ({ ...f, desc: e.target.value }))}
                placeholder="고객 사례에 대한 상세 설명을 입력해주세요"
                style={{ width: "100%", minHeight: 80, padding: "10px 12px", borderRadius: 10, border: `1px solid ${bdr}`, background: inputBg, color: text, fontSize: 13, outline: "none", resize: "vertical", boxSizing: "border-box", fontFamily: "inherit" }} />
            </div>

            <button onClick={saveCase} disabled={saving}
              style={{ width: "100%", padding: "14px", borderRadius: 12, border: "none",
                background: `linear-gradient(135deg,${accent},#8b5cf6)`, color: "#fff", fontSize: 15, fontWeight: 800,
                cursor: saving ? "wait" : "pointer", opacity: saving ? 0.6 : 1 }}>
              {saving ? "저장 중..." : "고객사례 등록"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
