import { useState, useRef, useCallback } from "react";

/* ════════════════════════════════════════════════════════════
   GeminiRemover v4 – Replicate AI 인페인팅
   - stable-diffusion-inpainting 모델 사용
   - 워터마크 위치 자동 감지 → 마스크 생성 → AI 복원
   - API 키는 Vercel 환경변수로 서버에만 보관
════════════════════════════════════════════════════════════ */

/* ── 워터마크 탐지 (Canvas 기반) ───────────────────────── */
function detectWatermark(imageData, W, H) {
  const data = imageData.data;
  const scanW = Math.max(80, Math.round(W * 0.10));
  const scanH = Math.max(80, Math.round(H * 0.10));
  const scanX = W - scanW;
  const scanY = H - scanH;

  const pixels = [];
  for (let py = scanY; py < H; py++) {
    for (let px = scanX; px < W; px++) {
      const i   = (py * W + px) * 4;
      const brt = (data[i] + data[i+1] + data[i+2]) / 3;
      pixels.push({ px, py, brt });
    }
  }

  const borderPx = pixels.filter(
    p => p.px < scanX + scanW * 0.35 || p.py < scanY + scanH * 0.35
  );
  const bgMean = borderPx.reduce((s, p) => s + p.brt, 0) / Math.max(1, borderPx.length);
  const threshold = Math.max(15, bgMean * 0.10);

  const diffPx = pixels.filter(p => p.brt - bgMean > threshold);

  if (diffPx.length < 3) {
    const sz = Math.round(Math.min(W, H) * 0.022);
    return {
      x: W - sz - Math.round(W * 0.012),
      y: H - sz - Math.round(H * 0.012),
      w: sz, h: sz,
    };
  }

  diffPx.sort((a, b) => (b.px + b.py) - (a.px + a.py));
  const top = diffPx.slice(0, Math.min(60, diffPx.length));
  const xs  = top.map(p => p.px);
  const ys  = top.map(p => p.py);
  const pad = Math.round(Math.min(W, H) * 0.008);
  return {
    x: Math.max(0, Math.min(...xs) - pad),
    y: Math.max(0, Math.min(...ys) - pad),
    w: Math.min(W, Math.max(...xs) - Math.min(...xs) + pad * 2 + 4),
    h: Math.min(H, Math.max(...ys) - Math.min(...ys) + pad * 2 + 4),
  };
}

/* ── 마스크 이미지 생성 (흰=제거, 검=유지) ─────────────── */
function buildMask(W, H, box, blur = 4) {
  const c   = document.createElement("canvas");
  c.width   = W; c.height = H;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);
  // 박스 약간 확장
  const pad = blur + 4;
  ctx.filter = `blur(${blur}px)`;
  ctx.fillStyle = "#fff";
  ctx.fillRect(
    Math.max(0, box.x - pad),
    Math.max(0, box.y - pad),
    Math.min(W, box.w + pad * 2),
    Math.min(H, box.h + pad * 2)
  );
  ctx.filter = "none";
  return c.toDataURL("image/png");
}

/* ── 서버리스 함수 경유 호출 (/api/inpaint) ─────────────── */
async function callInpaintAPI(imageB64, maskB64) {
  const res = await fetch("/api/inpaint", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image: imageB64, mask: maskB64 }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data.output;
}

/* ════════════════════════════════════════════════════════════
   메인 컴포넌트
════════════════════════════════════════════════════════════ */
export default function GeminiRemover({ isDark }) {
  const [imgSrc,    setImgSrc]    = useState(null);
  const [maskSrc,   setMaskSrc]   = useState(null);
  const [result,    setResult]    = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [step,      setStep]      = useState("");   // 진행 단계 메시지
  const [info,      setInfo]      = useState("");
  const [dragOver,  setDragOver]  = useState(false);
  const [markBox,   setMarkBox]   = useState(null);
  const [imgSize,   setImgSize]   = useState(null);
  const [manualBox, setManualBox] = useState(null);
  const [showAdj,   setShowAdj]   = useState(false);
  const [tab,       setTab]       = useState("ai"); // "ai" | "canvas"
  const fileRef = useRef(null);
  const origImgRef = useRef(null); // 원본 Image 객체 캐시

  const text   = isDark ? "#fff"                   : "#1a1a2e";
  const muted  = isDark ? "rgba(255,255,255,0.45)" : "#888";
  const cardBg = isDark ? "rgba(255,255,255,0.04)" : "#fff";
  const bdr    = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const accent = "#eab308";


  /* ── 파일 로드 & 워터마크 감지 ──────────────────────────── */
  const loadFile = useCallback((file) => {
    if (!file?.type.startsWith("image/")) { setInfo("❌ 이미지 파일만 가능해요"); return; }
    setResult(null); setInfo(""); setMarkBox(null); setManualBox(null); setShowAdj(false);

    const reader = new FileReader();
    reader.onload = (e) => {
      setImgSrc(e.target.result);
      const img = new Image();
      img.onload = () => {
        origImgRef.current = img;
        const W = img.width, H = img.height;
        setImgSize({ w: W, h: H });
        // 감지만 수행 (아직 제거 안 함)
        const canvas = document.createElement("canvas");
        canvas.width = W; canvas.height = H;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        const rawData = ctx.getImageData(0, 0, W, H);
        const box = detectWatermark(rawData, W, H);
        setMarkBox(box);
        setInfo(`✅ 워터마크 감지 완료 — ${box.w}×${box.h}px @ (${box.x}, ${box.y}) · 아래 버튼으로 제거하세요`);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }, []);

  /* ── AI 제거 (Replicate) ────────────────────────────────── */
  const removeWithAI = async () => {
    const box = manualBox || markBox;
    if (!imgSrc || !box) return;

    setLoading(true); setResult(null); setInfo("");

    try {
      const img = origImgRef.current;
      const W   = img.width, H = img.height;

      // 1. 원본 → base64
      setStep("🔍 이미지 준비 중...");
      const canvas = document.createElement("canvas");
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);

      // SD inpainting은 512 또는 768 배수를 선호 → 리사이즈
      const MAX = 768;
      let rW = W, rH = H;
      if (W > MAX || H > MAX) {
        const ratio = Math.min(MAX / W, MAX / H);
        rW = Math.round(W * ratio / 8) * 8;
        rH = Math.round(H * ratio / 8) * 8;
      } else {
        rW = Math.round(W / 8) * 8;
        rH = Math.round(H / 8) * 8;
      }
      const scaleX = rW / W;
      const scaleY = rH / H;

      // 리사이즈된 이미지
      const rCanvas = document.createElement("canvas");
      rCanvas.width = rW; rCanvas.height = rH;
      rCanvas.getContext("2d").drawImage(canvas, 0, 0, rW, rH);
      const imageB64 = rCanvas.toDataURL("image/png");

      // 리사이즈된 마스크
      const scaledBox = {
        x: Math.round(box.x * scaleX),
        y: Math.round(box.y * scaleY),
        w: Math.max(8, Math.round(box.w * scaleX)),
        h: Math.max(8, Math.round(box.h * scaleY)),
      };
      const maskB64 = buildMask(rW, rH, scaledBox, 6);
      setMaskSrc(maskB64);

      // 2. Replicate 호출
      setStep("🤖 AI 인페인팅 요청 중... (10~30초)");
      const outputUrl = await callInpaintAPI(imageB64, maskB64);

      // 3. 결과 가져와서 원본 크기로 복원
      setStep("🖼 결과 합성 중...");
      const resultImg = await new Promise((res, rej) => {
        const i = new Image();
        i.crossOrigin = "anonymous";
        i.onload  = () => res(i);
        i.onerror = () => rej(new Error("결과 이미지 로드 실패"));
        i.src = outputUrl;
      });

      // 원본 크기 캔버스에 결과 합성
      const finalCanvas = document.createElement("canvas");
      finalCanvas.width  = W; finalCanvas.height = H;
      const fCtx = finalCanvas.getContext("2d");
      fCtx.drawImage(canvas, 0, 0);                              // 원본
      // 처리된 부분(박스)만 원본 크기로 덮어씌우기
      fCtx.drawImage(
        resultImg,
        scaledBox.x, scaledBox.y, scaledBox.w, scaledBox.h,   // 소스(리사이즈 결과에서)
        box.x,       box.y,       box.w,        box.h          // 원본 크기로 복원
      );

      setResult(finalCanvas.toDataURL("image/png"));
      setInfo(`✅ AI 제거 완료! (${W}×${H}px)`);
    } catch (e) {
      setInfo("❌ 오류: " + e.message);
    } finally {
      setLoading(false); setStep("");
    }
  };

  /* ── Canvas 폴백 제거 ───────────────────────────────────── */
  const removeWithCanvas = () => {
    const box = manualBox || markBox;
    if (!imgSrc || !box) return;
    setLoading(true); setResult(null); setInfo("");

    const img = origImgRef.current;
    const W = img.width, H = img.height;
    const canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);

    const imageData = ctx.getImageData(0, 0, W, H);
    const data = imageData.data;
    const { x, y, w, h } = box;
    const x1 = x + w, y1 = y + h;

    for (let py = y; py < y1; py++) {
      for (let px = x; px < x1; px++) {
        const samples = [];
        const dirs = [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,1],[-1,1],[1,-1]];
        for (const [dy, dx] of dirs) {
          for (let d = 2; d <= 12; d++) {
            const sx = px + dx*d, sy = py + dy*d;
            if ((sx<x||sx>=x1||sy<y||sy>=y1) && sx>=0&&sx<W&&sy>=0&&sy<H) {
              const si=(sy*W+sx)*4;
              samples.push({ r:data[si],g:data[si+1],b:data[si+2],a:data[si+3], w:1/(d*d) });
              break;
            }
          }
        }
        for (let step=2; step<=14; step++) {
          [[px-step,py],[px,py-step],[px-step,py-step]].forEach(([sx,sy]) => {
            if (sx>=0&&sy>=0&&(sx<x||sy<y)) {
              const si=(sy*W+sx)*4;
              samples.push({ r:data[si],g:data[si+1],b:data[si+2],a:data[si+3], w:2/(step*step) });
            }
          });
        }
        if (samples.length) {
          let tr=0,tg=0,tb=0,ta=0,tw=0;
          samples.forEach(s => { tr+=s.r*s.w;tg+=s.g*s.w;tb+=s.b*s.w;ta+=s.a*s.w;tw+=s.w; });
          const idx=(py*W+px)*4;
          data[idx]=tr/tw; data[idx+1]=tg/tw; data[idx+2]=tb/tw; data[idx+3]=ta/tw;
        }
      }
    }
    ctx.putImageData(imageData, 0, 0);
    setResult(canvas.toDataURL("image/png"));
    setInfo(`✅ Canvas 제거 완료 (${W}×${H}px) · 배경이 복잡하면 AI 모드를 사용하세요`);
    setLoading(false);
  };

  const download = () => {
    if (!result) return;
    const a = document.createElement("a");
    a.href = result; a.download = "gemini_removed.png"; a.click();
  };

  const reset = () => {
    setImgSrc(null); setResult(null); setInfo(""); setMarkBox(null);
    setManualBox(null); setShowAdj(false); setMaskSrc(null);
    origImgRef.current = null;
  };

  const adjBox = manualBox || markBox;

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "28px 24px 60px" }}>

      {/* ── 헤더 ── */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
          <div style={{ width:38, height:38, borderRadius:11, background:"linear-gradient(135deg,#eab308,#f59e0b)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, fontWeight:900, color:"#fff", boxShadow:"0 4px 12px rgba(234,179,8,0.35)" }}>✦</div>
          <div>
            <div style={{ fontSize:20, fontWeight:900, color:text, letterSpacing:-0.5 }}>제미나이 리무버</div>
            <div style={{ fontSize:12, color:muted, marginTop:2 }}>Gemini AI 이미지 ✦ 워터마크 · AI 인페인팅으로 완벽 제거</div>
          </div>
        </div>

        {/* ── 모드 탭 ── */}
        <div style={{ display:"flex", gap:4, background:isDark?"rgba(255,255,255,0.05)":"#eeeef5", borderRadius:10, padding:4, width:"fit-content", marginBottom:16 }}>
          {[["ai","🤖 AI 모드 (고품질)"],["canvas","⚡ 빠른 모드"]].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              style={{ padding:"7px 16px", borderRadius:8, border:"none", cursor:"pointer", fontSize:12, fontWeight:700,
                background: tab===id ? (isDark?"rgba(234,179,8,0.5)":"#fff") : "transparent",
                color: tab===id ? (isDark?"#fff":accent) : muted,
                boxShadow: tab===id ? "0 1px 4px rgba(0,0,0,0.1)" : "none" }}>
              {label}
            </button>
          ))}
        </div>

        {/* ── AI 모드: 서버 안내 ── */}
        {tab === "ai" && (
          <div style={{ background:isDark?"rgba(99,102,241,0.07)":"rgba(99,102,241,0.04)", border:"1px solid rgba(99,102,241,0.2)", borderRadius:12, padding:"12px 16px", marginBottom:4 }}>
            <div style={{ fontSize:12, color:isDark?"#a5b4fc":"#4338ca", lineHeight:1.75 }}>
              🔒 API 키는 서버에 안전하게 보관됩니다 · 이미지가 서버를 경유해 AI로 처리돼요
            </div>
          </div>
        )}
        {tab === "canvas" && (
          <div style={{ background:isDark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.03)", border:`1px solid ${bdr}`, borderRadius:12, padding:"12px 16px", marginBottom:4 }}>
            <div style={{ fontSize:12, color:muted, lineHeight:1.7 }}>
              ⚡ API 없이 브라우저에서 즉시 처리 · 단순한 배경에 적합<br/>
              배경이 복잡하거나 결과가 부자연스러우면 <b style={{ color:accent }}>AI 모드</b>를 사용하세요
            </div>
          </div>
        )}
      </div>

      {/* ── 메인 영역 ── */}
      <div style={{ display:"grid", gridTemplateColumns: result ? "1fr 1fr" : "1fr", gap:16 }}>

        {/* 원본 */}
        <div>
          <div style={{ fontSize:12, fontWeight:700, color:muted, marginBottom:8 }}>
            {imgSrc ? "원본 이미지" : "이미지 업로드"}
          </div>
          {!imgSrc ? (
            <div
              onClick={() => fileRef.current?.click()}
              onDrop={e => { e.preventDefault(); setDragOver(false); loadFile(e.dataTransfer.files[0]); }}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              style={{ border:`2px dashed ${dragOver ? accent : bdr}`, borderRadius:14,
                background: dragOver?"rgba(234,179,8,0.06)":cardBg, cursor:"pointer",
                transition:"all 0.15s", minHeight:280,
                display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}
              onMouseEnter={e => e.currentTarget.style.borderColor = accent}
              onMouseLeave={e => e.currentTarget.style.borderColor = bdr}
            >
              <div style={{ textAlign:"center", padding:40 }}>
                <div style={{ fontSize:52, marginBottom:12 }}>🖼</div>
                <div style={{ fontSize:14, fontWeight:700, color:text, marginBottom:6 }}>클릭 또는 드래그</div>
                <div style={{ fontSize:12, color:muted }}>JPG, PNG, WebP 지원</div>
              </div>
            </div>
          ) : (
            <div style={{ position:"relative", borderRadius:14, overflow:"hidden", border:`1px solid ${bdr}` }}>
              <img src={imgSrc} alt="원본" style={{ width:"100%", display:"block" }} />
              {/* 감지 박스 표시 */}
              {(adjBox) && imgSize && (
                <div style={{
                  position:"absolute",
                  left:`${(adjBox.x / imgSize.w) * 100}%`,
                  top: `${(adjBox.y / imgSize.h) * 100}%`,
                  width:`${(adjBox.w / imgSize.w) * 100}%`,
                  height:`${(adjBox.h / imgSize.h) * 100}%`,
                  border:"2px solid #ef4444", borderRadius:3,
                  pointerEvents:"none", boxShadow:"0 0 0 1px rgba(0,0,0,0.5)",
                }}>
                  <div style={{ position:"absolute", top:-20, left:0, background:"#ef4444",
                    borderRadius:4, padding:"2px 7px", fontSize:9, color:"#fff",
                    fontWeight:700, whiteSpace:"nowrap" }}>
                    ✦ 감지됨 {adjBox.w}×{adjBox.h}px
                  </div>
                </div>
              )}
              <div style={{ position:"absolute", bottom:8, left:8,
                background:"rgba(0,0,0,0.65)", backdropFilter:"blur(4px)",
                borderRadius:6, padding:"3px 10px", fontSize:11, color:"#fff", fontWeight:700 }}>
                원본
              </div>
            </div>
          )}
          <input ref={fileRef} type="file" accept="image/*" style={{ display:"none" }}
            onChange={e => { loadFile(e.target.files[0]); e.target.value=""; }} />

          {/* 액션 버튼 */}
          {imgSrc && !loading && (
            <div style={{ display:"flex", gap:8, marginTop:8 }}>
              {tab === "ai" ? (
                <button onClick={removeWithAI}
                  style={{ flex:1, padding:"11px", borderRadius:10, border:"none",
                    background:"linear-gradient(135deg,#6366f1,#8b5cf6)",
                    color:"#fff", fontSize:13, fontWeight:800, cursor:"pointer",
                    boxShadow:"0 4px 14px rgba(99,102,241,0.35)" }}>
                  🤖 AI로 워터마크 제거
                </button>
              ) : (
                <button onClick={removeWithCanvas}
                  style={{ flex:1, padding:"11px", borderRadius:10, border:"none",
                    background:"linear-gradient(135deg,#eab308,#f59e0b)",
                    color:"#fff", fontSize:13, fontWeight:800, cursor:"pointer",
                    boxShadow:"0 4px 14px rgba(234,179,8,0.3)" }}>
                  ⚡ 빠른 제거
                </button>
              )}
              <button onClick={reset}
                style={{ padding:"11px 14px", borderRadius:10, border:`1px solid ${bdr}`,
                  background:"transparent", color:muted, fontSize:12, cursor:"pointer" }}>
                🔄
              </button>
            </div>
          )}

          {/* 수동 조정 토글 */}
          {imgSrc && markBox && (
            <button onClick={() => setShowAdj(p => !p)}
              style={{ marginTop:6, width:"100%", padding:"7px", borderRadius:9,
                border:`1px solid ${bdr}`, background:"transparent",
                color: showAdj ? accent : muted, fontSize:11, cursor:"pointer", fontWeight: showAdj?700:400 }}>
              🎯 {showAdj ? "조정 숨기기" : "감지 영역 수동 조정"}
            </button>
          )}
        </div>

        {/* 결과 */}
        {(loading || result) && (
          <div>
            <div style={{ fontSize:12, fontWeight:700, color:muted, marginBottom:8 }}>처리 결과</div>
            <div style={{ border:`1px solid ${bdr}`, borderRadius:14, background:cardBg,
              overflow:"hidden", minHeight:200,
              display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
              {loading ? (
                <div style={{ textAlign:"center", padding:40 }}>
                  <div style={{ fontSize:40, marginBottom:12, animation:"spin 1.2s linear infinite", display:"inline-block" }}>🤖</div>
                  <div style={{ fontSize:14, color:text, fontWeight:700, marginBottom:6 }}>{step || "처리 중..."}</div>
                  <div style={{ fontSize:11, color:muted, lineHeight:1.8 }}>
                    AI가 배경 패턴을 학습하여 자연스럽게 복원합니다<br/>
                    보통 10~30초 소요
                  </div>
                  {/* 진행 바 애니메이션 */}
                  <div style={{ width:200, height:4, background:isDark?"rgba(255,255,255,0.1)":"#e0e0e0", borderRadius:4, overflow:"hidden", margin:"16px auto 0" }}>
                    <div style={{ height:"100%", borderRadius:4, background:"linear-gradient(90deg,#6366f1,#8b5cf6)", animation:"progress 2s ease-in-out infinite" }} />
                  </div>
                  <style>{`@keyframes progress{0%{width:0%}50%{width:70%}100%{width:100%}}`}</style>
                </div>
              ) : (
                <div style={{ position:"relative", width:"100%" }}>
                  <img src={result} alt="결과" style={{ width:"100%", display:"block", borderRadius:13 }} />
                  <div style={{ position:"absolute", bottom:8, right:8,
                    background:"rgba(34,197,94,0.85)", backdropFilter:"blur(4px)",
                    borderRadius:6, padding:"3px 10px", fontSize:11, color:"#fff", fontWeight:700 }}>
                    ✅ 제거 완료
                  </div>
                </div>
              )}
            </div>
            {result && (
              <button onClick={download}
                style={{ marginTop:8, width:"100%", padding:"11px", borderRadius:10,
                  border:"none", background:"linear-gradient(135deg,#22c55e,#4ade80)",
                  color:"#fff", fontSize:14, fontWeight:800, cursor:"pointer",
                  boxShadow:"0 4px 14px rgba(34,197,94,0.3)" }}>
                ⬇️ PNG 다운로드
              </button>
            )}
          </div>
        )}
      </div>

      {/* 수동 조정 패널 */}
      {showAdj && adjBox && imgSize && (
        <div style={{ marginTop:14, background:isDark?"rgba(234,179,8,0.06)":"rgba(234,179,8,0.04)",
          border:"1px solid rgba(234,179,8,0.2)", borderRadius:14, padding:"16px 18px" }}>
          <div style={{ fontSize:12, fontWeight:800, color:text, marginBottom:10 }}>🎯 수동 영역 조정</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:10, marginBottom:12 }}>
            {[["X","x"],["Y","y"],["너비","w"],["높이","h"]].map(([label, key]) => (
              <div key={key}>
                <div style={{ fontSize:10, color:muted, fontWeight:700, marginBottom:4 }}>{label}</div>
                <input type="number" value={adjBox[key]}
                  onChange={e => {
                    const v = parseInt(e.target.value) || 0;
                    setManualBox({ ...markBox, ...(manualBox||{}), [key]:v });
                  }}
                  style={{ width:"100%", padding:"7px 10px", borderRadius:8, border:`1px solid ${bdr}`,
                    background:isDark?"rgba(255,255,255,0.06)":"#fff",
                    color:text, fontSize:12, outline:"none", boxSizing:"border-box" }}
                />
              </div>
            ))}
          </div>
          <button onClick={() => setManualBox(null)}
            style={{ padding:"6px 14px", borderRadius:8, border:`1px solid ${bdr}`,
              background:"transparent", color:muted, fontSize:11, cursor:"pointer" }}>
            감지 위치로 초기화
          </button>
        </div>
      )}

      {/* 상태 메시지 */}
      {info && (
        <div style={{ marginTop:14, padding:"10px 16px", borderRadius:10, fontSize:12, fontWeight:600,
          background: info.startsWith("✅")?"rgba(34,197,94,0.08)":"rgba(239,68,68,0.08)",
          border:`1px solid ${info.startsWith("✅")?"rgba(34,197,94,0.2)":"rgba(239,68,68,0.2)"}`,
          color: info.startsWith("✅")?"#4ade80":"#f87171" }}>
          {info}
        </div>
      )}
    </div>
  );
}
