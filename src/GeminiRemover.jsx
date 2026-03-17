import { useState, useRef, useCallback, useEffect } from "react";

/* ════════════════════════════════════════════════════════════
   GeminiRemover v4 – Replicate AI 인페인팅
   - stable-diffusion-inpainting 모델 사용
   - 워터마크 위치 자동 감지 → 마스크 생성 → AI 복원
   - API 키는 Vercel 환경변수로 서버에만 보관
════════════════════════════════════════════════════════════ */

/* ── Gemini 워터마크 고정 위치 계산 ─────────────────────
   실측 분석:
   - ✦ 중심 위치: 이미지 우측 끝에서 약 2~4%, 하단 끝에서 약 5~8%
   - 크기: 이미지 단변의 약 4~6%
──────────────────────────────────────────────────────── */
function detectWatermark(imageData, W, H) {
  const sz = Math.round(Math.min(W, H) * 0.08);  // 단변의 8% (넉넉하게)
  return {
    x: W - sz - Math.round(W * 0.005),   // 오른쪽 끝에서 0.5% 안쪽
    y: H - sz - Math.round(H * 0.005),   // 아래쪽 끝에서 0.5% 안쪽
    w: sz,
    h: sz,
  };
}

/* ── 마스크 생성 (흰=제거 영역, 검=유지 영역) ───────────── */
function buildMask(W, H, box, blur = 8) {
  const c   = document.createElement("canvas");
  c.width   = W; c.height = H;
  const ctx = c.getContext("2d");
  // 전체 검정
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);
  // 제거 영역: 박스보다 넉넉히 키워서 확실히 커버
  const pad = Math.round(Math.min(W, H) * 0.015) + blur;
  ctx.filter = `blur(${blur}px)`;
  ctx.fillStyle = "#fff";
  ctx.fillRect(
    Math.max(0, box.x - pad),
    Math.max(0, box.y - pad),
    Math.min(W - Math.max(0, box.x - pad), box.w + pad * 2),
    Math.min(H - Math.max(0, box.y - pad), box.h + pad * 2)
  );
  ctx.filter = "none";
  return c.toDataURL("image/png");
}

/* ── 서버리스 함수 경유 호출 (/api/inpaint) ─────────────── */
async function callInpaintAPI(imageB64, maskB64, onCountdown) {
  const doRequest = async () => {
    const res = await fetch("/api/inpaint", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: imageB64, mask: maskB64 }),
    });
    const data = await res.json();
    return { ok: res.ok, status: res.status, data };
  };

  let { ok, status, data } = await doRequest();

  // 429 Rate limit → 카운트다운 후 자동 재시도 (최대 3회)
  for (let attempt = 0; attempt < 3 && (status === 429 || data.error === "rate_limit"); attempt++) {
    const wait = 12; // 12초 대기
    for (let t = wait; t > 0; t--) {
      if (onCountdown) onCountdown(t);
      await new Promise(r => setTimeout(r, 1000));
    }
    if (onCountdown) onCountdown(0);
    ({ ok, status, data } = await doRequest());
  }

  if (!ok) throw new Error(data.error || `HTTP ${status}`);
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
  const [countdown, setCountdown] = useState(0);    // 재시도 카운트다운
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
      const W = img.width, H = img.height;

      setStep("🔍 이미지 준비 중...");

      // 원본 캔버스
      const origCanvas = document.createElement("canvas");
      origCanvas.width = W; origCanvas.height = H;
      const origCtx = origCanvas.getContext("2d");
      origCtx.drawImage(img, 0, 0);

      // ── 전략: 전체 이미지를 AI에 전송 (문맥 인식) ──
      // LaMa는 전체 이미지를 보고 주변 패턴으로 자연스럽게 채움
      // 이미지를 AI용 크기로 리사이즈 (LaMa는 크기 제한 없지만 512~1024 권장)
      const MAX = 1024;
      let rW = W, rH = H;
      if (W > MAX || H > MAX) {
        const ratio = Math.min(MAX / W, MAX / H);
        rW = Math.round(W * ratio);
        rH = Math.round(H * ratio);
      }
      const scaleX = rW / W;
      const scaleY = rH / H;

      // 전체 이미지 리사이즈
      const rCanvas = document.createElement("canvas");
      rCanvas.width = rW; rCanvas.height = rH;
      rCanvas.getContext("2d").drawImage(origCanvas, 0, 0, rW, rH);
      const imageB64 = rCanvas.toDataURL("image/png");

      // 마스크: 리사이즈 비율에 맞게 워터마크 영역만 흰색
      const scaledBox = {
        x: Math.round(box.x * scaleX),
        y: Math.round(box.y * scaleY),
        w: Math.max(8, Math.round(box.w * scaleX)),
        h: Math.max(8, Math.round(box.h * scaleY)),
      };
      const maskB64 = buildMask(rW, rH, scaledBox, 6);
      setMaskSrc(maskB64);

      // AI 호출
      setStep("🤖 AI 처리 중... (5~15초)");
      const outputUrl = await callInpaintAPI(imageB64, maskB64, (t) => {
        setCountdown(t);
        if (t > 0) setStep(`⏳ 잠시 대기 중... ${t}초 후 자동 재시도`);
        else setStep("🔄 재시도 중...");
      });

      // 결과 로드
      setStep("🖼 원본 해상도로 합성 중...");
      const resultImg = await new Promise((res, rej) => {
        const i = new Image();
        i.crossOrigin = "anonymous";
        i.onload  = () => res(i);
        i.onerror = () => rej(new Error("결과 이미지 로드 실패"));
        i.src = outputUrl;
      });

      // ── 핵심 합성: 원본 전체 유지 + 워터마크 영역만 AI 결과로 교체 ──
      const finalCanvas = document.createElement("canvas");
      finalCanvas.width = W; finalCanvas.height = H;
      const fCtx = finalCanvas.getContext("2d");

      // 1) 원본 전체 복사 (원본 해상도 유지)
      fCtx.drawImage(origCanvas, 0, 0);

      // 2) AI 결과에서 워터마크 영역만 추출해서 원본 위에 합성
      //    (AI 결과의 scaledBox 위치 → 원본의 box 위치로 복원)
      fCtx.drawImage(
        resultImg,
        scaledBox.x, scaledBox.y, scaledBox.w, scaledBox.h, // AI 결과에서 마크 영역
        box.x,       box.y,       box.w,        box.h        // 원본 위치로 붙여넣기
      );

      setResult(finalCanvas.toDataURL("image/png"));
      setInfo(`✅ AI 제거 완료! 원본 해상도 유지 (${W}×${H}px)`);
    } catch (e) {
      setInfo("❌ 오류: " + e.message);
    } finally {
      setLoading(false); setStep(""); setCountdown(0);
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
    setLoading(false); setStep(""); setTab("ai"); setCountdown(0);
    origImgRef.current = null;
  };

  // 브라우저 뒤로가기 → 이전 페이지로 이동 (컴포넌트 내부 X)
  useEffect(() => {
    // 현재 상태를 히스토리에 추가 (뒤로가기 감지용)
    window.history.pushState({ geminiRemover: true }, "");
    const handlePop = (e) => {
      // 이미지가 업로드된 상태면 초기화, 아니면 진짜 뒤로가기
      if (imgSrc) {
        e.preventDefault();
        reset();
        window.history.pushState({ geminiRemover: true }, "");
      }
      // imgSrc 없으면 브라우저 기본 뒤로가기 동작 (이전 페이지로)
    };
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, [imgSrc]);

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

        {/* 면책 안내 */}
        <div style={{ background:isDark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.03)",
          border:`1px solid ${bdr}`, borderRadius:10,
          padding:"10px 14px", display:"flex", gap:8, alignItems:"flex-start", marginTop:8 }}>
          <span style={{ fontSize:13, flexShrink:0 }}>⚠️</span>
          <div style={{ fontSize:11, color:muted, lineHeight:1.75 }}>
            이미지에 따라 <b style={{ color:text }}>완벽하게 제거되지 않을 수 있어요.</b>{" "}
            배경이 복잡하거나 워터마크 영역이 큰 경우 흔적이 남을 수 있습니다.
            결과가 만족스럽지 않으면 <b style={{ color:text }}>빠른 모드</b> 또는 수동 영역 조정을 시도해보세요.
          </div>
        </div>

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
                  background:"transparent", color:muted, fontSize:12, cursor:"pointer", whiteSpace:"nowrap" }}>
                🔄 다시 시작
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
                  {/* 카운트다운 중일 때 */}
                  {countdown > 0 ? (
                    <>
                      <div style={{ fontSize:44, marginBottom:10, fontWeight:900, color:"#eab308", lineHeight:1 }}>{countdown}</div>
                      <div style={{ fontSize:13, color:text, fontWeight:700, marginBottom:4 }}>잠시 후 자동 재시도</div>
                      <div style={{ fontSize:11, color:muted, lineHeight:1.8 }}>
                        요청이 많아 대기 중입니다<br/>
                        자동으로 재시도하니 기다려주세요 😊
                      </div>
                      <div style={{ width:200, height:4, background:isDark?"rgba(255,255,255,0.1)":"#e0e0e0", borderRadius:4, overflow:"hidden", margin:"14px auto 0" }}>
                        <div style={{ height:"100%", borderRadius:4, background:"linear-gradient(90deg,#eab308,#f59e0b)", width:`${(countdown/12)*100}%`, transition:"width 1s linear" }} />
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize:40, marginBottom:12, animation:"spin 1.2s linear infinite", display:"inline-block" }}>🤖</div>
                      <div style={{ fontSize:14, color:text, fontWeight:700, marginBottom:6 }}>{step || "처리 중..."}</div>
                      <div style={{ fontSize:11, color:muted, lineHeight:1.8 }}>
                        AI가 배경 패턴을 학습하여 자연스럽게 복원합니다<br/>
                        보통 10~30초 소요
                      </div>
                      <div style={{ width:200, height:4, background:isDark?"rgba(255,255,255,0.1)":"#e0e0e0", borderRadius:4, overflow:"hidden", margin:"16px auto 0" }}>
                        <div style={{ height:"100%", borderRadius:4, background:"linear-gradient(90deg,#6366f1,#8b5cf6)", animation:"progress 2s ease-in-out infinite" }} />
                      </div>
                      <style>{`@keyframes progress{0%{width:0%}50%{width:70%}100%{width:100%}}`}</style>
                    </>
                  )}
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
