import { useState } from "react";

const CASES = [
  {
    id: 1,
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

export default function CasePage({ C, isDark }) {
  const [sel, setSel] = useState(null);
  const text = isDark ? "#e8eaed" : "#1a1a2e";
  const muted = isDark ? "rgba(255,255,255,0.45)" : "#888";
  const bdr = isDark ? "rgba(255,255,255,0.08)" : "#e5e7eb";
  const cardBg = isDark ? "rgba(255,255,255,0.04)" : "#fff";
  const accent = "#7c6aff";

  return (
    <div style={{ maxWidth:1100, margin:"0 auto", padding:"60px 20px 80px" }}>
      <div style={{ textAlign:"center", marginBottom:48 }}>
        <div style={{ display:"inline-block", padding:"6px 16px", borderRadius:20, background:`${accent}15`, color:accent, fontSize:13, fontWeight:700, marginBottom:16 }}>
          고객사례
        </div>
        <h1 style={{ fontSize:32, fontWeight:900, color:text, margin:"0 0 12px", letterSpacing:-1 }}>
          SNS메이킷으로 만든<br/>성공 사례를 확인하세요
        </h1>
        <p style={{ fontSize:15, color:muted, lineHeight:1.7, maxWidth:500, margin:"0 auto" }}>
          다양한 브랜드와 크리에이터들이 SNS메이킷을 활용하여 콘텐츠를 제작하고 있습니다.
        </p>
      </div>

      {/* 갤러리 그리드 */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))", gap:20 }}>
        {CASES.map(c => (
          <div key={c.id} onClick={()=>setSel(c)}
            style={{ borderRadius:16, overflow:"hidden", border:`1px solid ${bdr}`, background:cardBg,
              cursor:"pointer", transition:"transform 0.15s,box-shadow 0.15s" }}
            onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-4px)";e.currentTarget.style.boxShadow="0 12px 32px rgba(0,0,0,0.15)";}}
            onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="none";}}>
            {/* 썸네일 */}
            <div style={{ width:"100%", aspectRatio:"16/9", background:isDark?"rgba(99,102,241,0.08)":"rgba(99,102,241,0.04)",
              display:"flex", alignItems:"center", justifyContent:"center", position:"relative" }}>
              {c.thumb
                ? <img src={c.thumb} alt={c.brand} style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
                : <div style={{ fontSize:40 }}>🏆</div>}
              <div style={{ position:"absolute", top:12, left:12, display:"flex", gap:6 }}>
                <span style={{ padding:"3px 10px", borderRadius:6, background:`${accent}dd`, color:"#fff", fontSize:11, fontWeight:700 }}>{c.feature}</span>
              </div>
            </div>
            <div style={{ padding:"18px 20px" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
                <div style={{ width:36, height:36, borderRadius:10, background:`${accent}15`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, fontWeight:900, color:accent }}>
                  {c.brand[0]}
                </div>
                <div>
                  <div style={{ fontSize:14, fontWeight:800, color:text }}>{c.brand}</div>
                  <div style={{ fontSize:11, color:muted }}>{c.field}</div>
                </div>
              </div>
              <div style={{ fontSize:15, fontWeight:700, color:text, marginBottom:8, lineHeight:1.4 }}>{c.title}</div>
              <div style={{ fontSize:13, color:muted, lineHeight:1.6, marginBottom:12,
                overflow:"hidden", textOverflow:"ellipsis", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" }}>
                {c.desc}
              </div>
              <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                {c.tags.map(tag => (
                  <span key={tag} style={{ padding:"3px 8px", borderRadius:5, background:isDark?"rgba(255,255,255,0.06)":"#f0f0f6",
                    color:muted, fontSize:10, fontWeight:600 }}>{tag}</span>
                ))}
              </div>
            </div>
          </div>
        ))}

        {/* 추가 사례 모집 카드 */}
        <div style={{ borderRadius:16, overflow:"hidden", border:`2px dashed ${bdr}`, background:"transparent",
          display:"flex", alignItems:"center", justifyContent:"center", minHeight:280, cursor:"pointer" }}
          onClick={()=>window.location.hash="#contact"}>
          <div style={{ textAlign:"center", padding:30 }}>
            <div style={{ fontSize:40, marginBottom:12 }}>📢</div>
            <div style={{ fontSize:16, fontWeight:800, color:text, marginBottom:6 }}>고객사례 등록하기</div>
            <div style={{ fontSize:13, color:muted, lineHeight:1.6 }}>
              SNS메이킷을 활용한 사례가 있다면<br/>문의하기를 통해 등록해주세요!
            </div>
          </div>
        </div>
      </div>

      {/* 상세 모달 */}
      {sel && (
        <div onClick={()=>setSel(null)} style={{ position:"fixed", inset:0, zIndex:9999, background:"rgba(0,0,0,0.6)", backdropFilter:"blur(4px)",
          display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
          <div onClick={e=>e.stopPropagation()} style={{ width:"min(640px,95vw)", maxHeight:"85vh", overflowY:"auto",
            background:isDark?"#1a1730":"#fff", borderRadius:20, padding:"32px 28px", boxShadow:"0 24px 64px rgba(0,0,0,0.4)", border:`1px solid ${bdr}` }}>
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
              <div style={{ width:48, height:48, borderRadius:12, background:`${accent}15`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, fontWeight:900, color:accent }}>
                {sel.brand[0]}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:18, fontWeight:900, color:text }}>{sel.brand}</div>
                <div style={{ fontSize:13, color:muted }}>{sel.field} · {sel.feature}</div>
              </div>
              <button onClick={()=>setSel(null)} style={{ width:32, height:32, borderRadius:8, border:`1px solid ${bdr}`, background:"transparent", color:muted, cursor:"pointer", fontSize:16 }}>✕</button>
            </div>
            <h2 style={{ fontSize:20, fontWeight:800, color:text, marginBottom:12 }}>{sel.title}</h2>
            <p style={{ fontSize:14, color:muted, lineHeight:1.8, marginBottom:20 }}>{sel.desc}</p>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:20 }}>
              {sel.tags.map(tag => (
                <span key={tag} style={{ padding:"4px 12px", borderRadius:8, background:`${accent}12`, color:accent, fontSize:12, fontWeight:600 }}>{tag}</span>
              ))}
            </div>
            {sel.link && (
              <a href={sel.link} target="_blank" rel="noopener noreferrer"
                style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"12px 24px", borderRadius:12, border:"none",
                  background:accent, color:"#fff", fontSize:14, fontWeight:800, textDecoration:"none" }}>
                🔗 원본 콘텐츠 보기
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
