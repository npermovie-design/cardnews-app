import { useState, useRef, useCallback } from "react";

/* ════════════════════════════════════════════════════════════
   GeminiRemover – Gemini AI 이미지 워터마크 제거
   - Canvas 픽셀 분석으로 우하단 ✦ 로고 자동 감지
   - Patch-based inpainting으로 자연스럽게 복원
════════════════════════════════════════════════════════════ */
export default function GeminiRemover({ isDark }) {
  const [imgSrc,   setImgSrc]   = useState(null);
  const [result,   setResult]   = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [info,     setInfo]     = useState("");
  const fileRef = useRef(null);

  const text   = isDark ? "#fff"                   : "#1a1a2e";
  const muted  = isDark ? "rgba(255,255,255,0.45)" : "#888";
  const cardBg = isDark ? "rgba(255,255,255,0.04)" : "#fff";
  const bdr    = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const accent = "#eab308";

  /* ─── 워터마크 제거 핵심 로직 ─────────────────────────────── */
  const removeWatermark = useCallback((file) => {
    setLoading(true); setResult(null); setInfo("");
    const reader = new FileReader();
    reader.onload = (e) => {
      setImgSrc(e.target.result);
      const img = new Image();

      img.onload = () => {
        const W = img.width;
        const H = img.height;
        const canvas = document.createElement("canvas");
        canvas.width = W; canvas.height = H;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);

        const fullData = ctx.getImageData(0, 0, W, H);
        const data     = fullData.data;

        /* ── Step 1. 밝은 픽셀 클러스터로 워터마크 위치 탐색 ── */
        const baseSize   = Math.round(Math.min(W, H) * 0.055);
        const scanMargin = Math.round(Math.min(W, H) * 0.005);
        const scanX      = W - Math.round(W * 0.15);
        const scanY      = H - Math.round(H * 0.15);

        let sumX = 0, sumY = 0, brightCount = 0;
        for (let py = scanY; py < H; py++) {
          for (let px = scanX; px < W; px++) {
            const i = (py * W + px) * 4;
            const brightness = (data[i] + data[i+1] + data[i+2]) / 3;
            if (brightness > 200 && data[i+3] > 100) {
              sumX += px; sumY += py; brightCount++;
            }
          }
        }

        let cx, cy, mSize;
        if (brightCount > 20) {
          cx    = Math.round(sumX / brightCount);
          cy    = Math.round(sumY / brightCount);
          mSize = Math.round(baseSize * 1.3);
        } else {
          mSize = baseSize;
          cx    = W - mSize / 2 - scanMargin;
          cy    = H - mSize / 2 - scanMargin;
        }

        const half = Math.round(mSize / 2);
        const x0 = Math.max(0, cx - half);
        const y0 = Math.max(0, cy - half);
        const x1 = Math.min(W, cx + half);
        const y1 = Math.min(H, cy + half);

        /* ── Step 2. Patch-based inpainting ── */
        const patchR = Math.round(mSize * 0.8);

        for (let py = y0; py < y1; py++) {
          for (let px = x0; px < x1; px++) {
            const samples = [];

            // 8방향 최근접 외부 픽셀
            const dirs = [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,1],[-1,1],[1,-1]];
            for (const [dy, dx] of dirs) {
              let sx = px + dx, sy = py + dy, steps = 0;
              while (sx >= x0 && sx < x1 && sy >= y0 && sy < y1 && steps < patchR) {
                sx += dx; sy += dy; steps++;
              }
              if (sx >= 0 && sx < W && sy >= 0 && sy < H) {
                const si   = (sy * W + sx) * 4;
                const dist = Math.sqrt((sx-px)**2 + (sy-py)**2);
                samples.push({ r:data[si], g:data[si+1], b:data[si+2], a:data[si+3], w: 1/(dist+0.5) });
              }
            }

            // 방사형 랜덤 샘플링
            for (let k = 0; k < 12; k++) {
              const angle = (k / 12) * Math.PI * 2;
              const dist  = patchR * (0.7 + Math.random() * 0.5);
              const sx    = Math.round(px + Math.cos(angle) * dist);
              const sy    = Math.round(py + Math.sin(angle) * dist);
              if ((sx < x0 || sx >= x1 || sy < y0 || sy >= y1) &&
                  sx >= 0 && sx < W && sy >= 0 && sy < H) {
                const si = (sy * W + sx) * 4;
                samples.push({ r:data[si], g:data[si+1], b:data[si+2], a:data[si+3], w: 1/(dist+0.5) });
              }
            }

            if (samples.length > 0) {
              let tr=0, tg=0, tb=0, ta=0, tw=0;
              for (const s of samples) {
                tr += s.r*s.w; tg += s.g*s.w; tb += s.b*s.w; ta += s.a*s.w; tw += s.w;
              }
              const idx = (py * W + px) * 4;
              data[idx]   = Math.round(tr/tw);
              data[idx+1] = Math.round(tg/tw);
              data[idx+2] = Math.round(tb/tw);
              data[idx+3] = Math.round(ta/tw);
            }
          }
        }
        ctx.putImageData(fullData, 0, 0);

        /* ── Step 3. 경계 블렌딩 (2-pass 평균) ── */
        const blendR = 3;
        for (let pass = 0; pass < 2; pass++) {
          const blend = ctx.getImageData(x0-blendR, y0-blendR, (x1-x0)+blendR*2, (y1-y0)+blendR*2);
          const bd = blend.data;
          const bW = blend.width;
          for (let ly = blendR; ly < blend.height-blendR; ly++) {
            for (let lx = blendR; lx < blend.width-blendR; lx++) {
              const li = (ly*bW+lx)*4;
              let sr=0, sg=0, sb=0, cnt=0;
              for (let dy=-1;dy<=1;dy++) for (let dx=-1;dx<=1;dx++) {
                const ni = ((ly+dy)*bW+(lx+dx))*4;
                sr+=bd[ni]; sg+=bd[ni+1]; sb+=bd[ni+2]; cnt++;
              }
              bd[li]=sr/cnt; bd[li+1]=sg/cnt; bd[li+2]=sb/cnt;
            }
          }
          ctx.putImageData(blend, x0-blendR, y0-blendR);
        }

        setResult(canvas.toDataURL("image/png"));
        setInfo(`✅ 완료! (${W}×${H}px · 감지된 워터마크 ${x1-x0}×${y1-y0}px 제거)`);
        setLoading(false);
      };

      img.onerror = () => { setInfo("❌ 이미지를 불러올 수 없어요"); setLoading(false); };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }, []);

  /* ─── 이벤트 핸들러 ─────────────────────────────────────── */
  const onFile = (file) => {
    if (!file || !file.type.startsWith("image/")) {
      setInfo("❌ 이미지 파일만 업로드 가능해요"); return;
    }
    removeWatermark(file);
  };

  const onDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  };

  const download = () => {
    if (!result) return;
    const a = document.createElement("a");
    a.href     = result;
    a.download = "gemini_removed.png";
    a.click();
  };

  const reset = () => { setImgSrc(null); setResult(null); setInfo(""); };

  /* ─── 렌더 ──────────────────────────────────────────────── */
  return (
    <div style={{ maxWidth: 780, margin: "0 auto", padding: "28px 24px 60px" }}>

      {/* 헤더 */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
          <div style={{ width:38, height:38, borderRadius:11, background:"linear-gradient(135deg,#eab308,#f59e0b)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, fontWeight:900, color:"#fff", boxShadow:"0 4px 12px rgba(234,179,8,0.35)" }}>
            ✦
          </div>
          <div>
            <div style={{ fontSize:20, fontWeight:900, color:text, letterSpacing:-0.5, lineHeight:1.1 }}>제미나이 리무버</div>
            <div style={{ fontSize:12, color:muted, marginTop:2 }}>Gemini AI 이미지 우하단 워터마크(✦) 자동 제거</div>
          </div>
        </div>

        {/* 안내 배너 */}
        <div style={{ background: isDark?"rgba(234,179,8,0.07)":"rgba(234,179,8,0.05)", border:"1px solid rgba(234,179,8,0.2)", borderRadius:12, padding:"12px 16px", display:"flex", gap:10, alignItems:"flex-start" }}>
          <span style={{ fontSize:16, flexShrink:0 }}>💡</span>
          <div style={{ fontSize:12, color: isDark?"#fde68a":"#92400e", lineHeight:1.75 }}>
            <b>Gemini AI</b>가 생성한 이미지 우하단의 <b style={{ color:accent }}>✦ 반짝이 로고</b>를
            자동으로 감지하고 주변 픽셀로 자연스럽게 복원합니다.<br />
            이미지를 드래그하거나 클릭해서 업로드하면 바로 처리돼요.
          </div>
        </div>
      </div>

      {/* 메인 영역 */}
      <div style={{ display:"grid", gridTemplateColumns: (loading||result) ? "1fr 1fr" : "1fr", gap:16 }}>

        {/* ── 업로드 ── */}
        <div>
          <div style={{ fontSize:12, fontWeight:700, color:muted, marginBottom:8 }}>
            {imgSrc ? "원본 이미지" : "이미지 업로드"}
          </div>
          <div
            onClick={() => !loading && fileRef.current?.click()}
            onDrop={onDrop}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            style={{
              border: `2px dashed ${dragOver ? accent : bdr}`,
              borderRadius: 14,
              background: dragOver ? "rgba(234,179,8,0.06)" : cardBg,
              cursor: loading ? "wait" : "pointer",
              transition: "all 0.15s",
              overflow: "hidden",
              minHeight: imgSrc ? "auto" : 240,
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
            }}
            onMouseEnter={e => { if (!imgSrc) e.currentTarget.style.borderColor = accent; }}
            onMouseLeave={e => { if (!imgSrc) e.currentTarget.style.borderColor = bdr; }}
          >
            {imgSrc ? (
              <div style={{ position:"relative", width:"100%" }}>
                <img src={imgSrc} alt="원본" style={{ width:"100%", display:"block", borderRadius:12 }} />
                <div style={{ position:"absolute", bottom:8, right:8, background:"rgba(0,0,0,0.7)", backdropFilter:"blur(4px)", borderRadius:6, padding:"3px 8px", fontSize:11, color:"#fff", fontWeight:700 }}>
                  원본 (✦ 있음)
                </div>
              </div>
            ) : (
              <div style={{ textAlign:"center", padding:40 }}>
                <div style={{ fontSize:52, marginBottom:12 }}>🖼</div>
                <div style={{ fontSize:14, fontWeight:700, color:text, marginBottom:6 }}>클릭 또는 드래그</div>
                <div style={{ fontSize:12, color:muted }}>JPG, PNG, WebP 지원</div>
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display:"none" }}
            onChange={e => { const f = e.target.files[0]; if (f) onFile(f); e.target.value = ""; }} />
          {imgSrc && !loading && (
            <button onClick={reset}
              style={{ marginTop:8, width:"100%", padding:"8px", borderRadius:9, border:`1px solid ${bdr}`, background:"transparent", color:muted, fontSize:12, cursor:"pointer" }}>
              🔄 다른 이미지 업로드
            </button>
          )}
        </div>

        {/* ── 결과 ── */}
        {(loading || result) && (
          <div>
            <div style={{ fontSize:12, fontWeight:700, color:muted, marginBottom:8 }}>처리 결과</div>
            <div style={{ border:`1px solid ${bdr}`, borderRadius:14, background:cardBg, overflow:"hidden", minHeight:240, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
              {loading ? (
                <div style={{ textAlign:"center", padding:40 }}>
                  <div style={{ fontSize:36, marginBottom:12, animation:"spin 1s linear infinite", display:"inline-block" }}>⚙️</div>
                  <div style={{ fontSize:14, color:text, fontWeight:700, marginBottom:4 }}>워터마크 제거 중...</div>
                  <div style={{ fontSize:12, color:muted }}>우하단 ✦ 로고 감지 & 인페인팅</div>
                </div>
              ) : result ? (
                <div style={{ position:"relative", width:"100%" }}>
                  <img src={result} alt="결과" style={{ width:"100%", display:"block", borderRadius:12 }} />
                  <div style={{ position:"absolute", bottom:8, right:8, background:"rgba(34,197,94,0.85)", backdropFilter:"blur(4px)", borderRadius:6, padding:"3px 8px", fontSize:11, color:"#fff", fontWeight:700 }}>
                    ✅ 제거 완료
                  </div>
                </div>
              ) : null}
            </div>
            {result && (
              <button onClick={download}
                style={{ marginTop:8, width:"100%", padding:"12px", borderRadius:10, border:"none", background:"linear-gradient(135deg,#eab308,#f59e0b)", color:"#fff", fontSize:14, fontWeight:800, cursor:"pointer", boxShadow:"0 4px 16px rgba(234,179,8,0.3)" }}>
                ⬇️ PNG 다운로드
              </button>
            )}
          </div>
        )}
      </div>

      {/* 상태 메시지 */}
      {info && (
        <div style={{ marginTop:14, padding:"10px 16px", borderRadius:10, fontSize:12, fontWeight:600,
          background: info.startsWith("✅") ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
          border: `1px solid ${info.startsWith("✅") ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`,
          color: info.startsWith("✅") ? "#4ade80" : "#f87171",
        }}>
          {info}
        </div>
      )}
    </div>
  );
}
