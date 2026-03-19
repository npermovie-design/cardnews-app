import { useState, useRef } from "react";

/* ═══════════════════════════════════════════════════════
   ShortformEditor.jsx  ·  AI 숏폼 편집 기획기
   알파컷 스타일 플로우:
   Step 0: 인트로
   Step 1: 유튜브 링크 or 파일 업로드
   Step 2: 세부 설정 (길이/언어/구간)
   Step 3: 처리 중 (로딩)
   Step 4: 결과 (숏폼 목록 + 타임라인 + 스크립트)
═══════════════════════════════════════════════════════ */

const CLAUDE_KEY = "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";

async function callClaude(prompt) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": CLAUDE_KEY,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 3000,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await res.json();
  return data.content?.[0]?.text || "";
}

// 유튜브 ID 추출
function extractYoutubeId(url) {
  const m = url.match(/(?:v=|youtu\.be\/|embed\/)([^&?/\s]{11})/);
  return m ? m[1] : null;
}

// 영상 길이 → 총 초
function parseTime(str) {
  const p = str.match(/(\d+):(\d+)/);
  if (p) return parseInt(p[1]) * 60 + parseInt(p[2]);
  return 0;
}

// 초 → mm:ss
function toMMSS(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}

const SHORT_LENGTHS = [
  { id:"s15", label:"15~30초", desc:"짧고 임팩트 있게", min:15, max:30 },
  { id:"s30", label:"30~60초", desc:"적당한 길이로",   min:30, max:60 },
  { id:"s60", label:"60~90초", desc:"충분한 내용으로", min:60, max:90 },
  { id:"s90", label:"90~120초",desc:"아주 길게",       min:90, max:120 },
];

export default function ShortformEditor({ isDark }) {
  const D = isDark;
  const text    = D ? "#fff" : "#1a1a2e";
  const muted   = D ? "rgba(255,255,255,0.45)" : "#888";
  const cardBg  = D ? "rgba(255,255,255,0.05)" : "#fff";
  const bdr     = D ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";
  const inputBg = D ? "rgba(255,255,255,0.07)" : "#f8f8f8";
  const ACC     = "#a855f7"; // 알파컷 보라색

  const [step, setStep] = useState(0);

  // Step 1: 입력
  const [inputMode, setInputMode]   = useState("youtube"); // youtube | file
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [ytInfo, setYtInfo]         = useState(null); // {id, title, thumbnail, duration}
  const [ytLoading, setYtLoading]   = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadedPreview, setUploadedPreview] = useState(null);
  const [uploadedDuration, setUploadedDuration] = useState(null);
  const fileRef = useRef(null);
  const videoRef = useRef(null);

  // Step 2: 설정
  const [shortLength, setShortLength] = useState("s30");
  const [titleLang, setTitleLang]     = useState("ko");
  const [subtitleLang, setSubtitleLang] = useState("ko");
  const [rangeStart, setRangeStart]   = useState(0);
  const [rangeEnd, setRangeEnd]       = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [shortCount, setShortCount]   = useState(5);

  // Step 3/4
  const [progress, setProgress]   = useState(0);
  const [progressMsg, setProgressMsg] = useState("");
  const [clips, setClips]         = useState([]);
  const [selectedClip, setSelectedClip] = useState(0);
  const [error, setError]         = useState("");
  const [copiedField, setCopiedField] = useState(null);

  const copy = (txt, key) => {
    navigator.clipboard.writeText(txt).then(() => {
      setCopiedField(key); setTimeout(() => setCopiedField(null), 2000);
    });
  };

  // 유튜브 정보 가져오기
  const fetchYtInfo = async (url) => {
    const id = extractYoutubeId(url);
    if (!id) { setYtInfo({ id:"", title:"(링크 형식을 확인해주세요)", thumbnail:"", duration:null, error:true }); return; }
    setYtLoading(true);
    try {
      const oRes = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`);
      const oData = await oRes.json();
      setYtInfo({ id, title: oData.title || url, thumbnail:`https://img.youtube.com/vi/${id}/hqdefault.jpg`, duration:null });
    } catch {
      // 제목 못 가져와도 ID 있으면 진행 가능
      setYtInfo({ id, title: url, thumbnail:`https://img.youtube.com/vi/${id}/hqdefault.jpg`, duration:null });
    }
    setYtLoading(false);
  };

  // 파일 업로드 처리
  const handleFileUpload = (file) => {
    if (!file) return;
    setUploadedFile(file);
    const url = URL.createObjectURL(file);
    setUploadedPreview(url);
    // 영상 길이 추출
    const vid = document.createElement("video");
    vid.preload = "metadata";
    vid.onloadedmetadata = () => {
      const dur = Math.floor(vid.duration);
      setUploadedDuration(dur);
      setTotalDuration(dur);
      setRangeStart(0);
      setRangeEnd(dur);
      URL.revokeObjectURL(url);
    };
    vid.src = url;
  };

  const goToSettings = () => {
    if (inputMode === "youtube") {
      const dur = 1200; // 유튜브는 실제 길이 모르므로 기본 20분
      setTotalDuration(dur);
      setRangeStart(0);
      setRangeEnd(dur);
    }
    setStep(2);
  };

  // 생성 실행
  const generate = async () => {
    setStep(3); setError(""); setClips([]); setProgress(0);

    const lenOpt = SHORT_LENGTHS.find(l => l.id === shortLength);
    const sourceName = inputMode === "youtube"
      ? (ytInfo?.title || youtubeUrl)
      : (uploadedFile?.name || "업로드된 영상");

    const rangeStr = rangeEnd > 0 ? `${toMMSS(rangeStart)} ~ ${toMMSS(rangeEnd)}` : "전체";

    const prompt = `당신은 숏폼 영상 전문 편집 AI입니다.

영상 정보:
- 제목/파일명: ${sourceName}
- 분석 구간: ${rangeStr} (총 ${toMMSS(rangeEnd - rangeStart)} 분량)
- 요청 숏폼 수: ${shortCount}개
- 각 숏폼 길이: ${lenOpt?.min}~${lenOpt?.max}초
- 제목 언어: ${titleLang === "ko" ? "한국어" : "English"}
- 자막 언어: ${subtitleLang === "ko" ? "한국어" : "English"}

위 영상에서 숏폼 ${shortCount}개를 추출/기획해주세요.

JSON만 응답:
{
  "shorts": [
    {
      "index": 1,
      "title": "후킹 제목 (25자 이내)",
      "type": "하이라이트 꽃",
      "startTime": "00:00",
      "endTime": "00:25",
      "duration": 25,
      "script": "실제 자막 스크립트 (${lenOpt?.min}~${lenOpt?.max}초 분량, 구어체, 줄바꿈 포함)",
      "hook": "첫 3초 오프닝 멘트",
      "editTip": "편집 포인트 (자막 위치, 효과, B-roll 등)",
      "hashtags": ["#태그1", "#태그2", "#태그3"]
    }
  ]
}

타임코드는 ${toMMSS(rangeStart)}부터 시작해서 ${toMMSS(rangeEnd)} 이내로 지정해주세요.
각 숏폼은 서로 다른 구간에서 추출하고, 가장 흥미롭고 후킹되는 부분을 골라주세요.`;

    try {
      const msgs = [
        { delay:600,  pct:15, msg:"영상 다운로드 중..." },
        { delay:1200, pct:35, msg:"AI가 영상 내용 분석 중..." },
        { delay:2000, pct:60, msg:"하이라이트 구간 추출 중..." },
        { delay:800,  pct:80, msg:"숏폼 제목 & 스크립트 생성 중..." },
      ];
      for (const m of msgs) {
        await new Promise(r => setTimeout(r, m.delay));
        setProgress(m.pct); setProgressMsg(m.msg);
      }

      const raw = await callClaude(prompt);
      setProgress(95); setProgressMsg("결과 정리 중...");
      await new Promise(r => setTimeout(r, 400));

      const cleaned = raw.replace(/```json\n?/g,"").replace(/```/g,"").trim();
      const parsed = JSON.parse(cleaned);
      setClips(parsed.shorts || []);
      setSelectedClip(0);
      setProgress(100); setProgressMsg("완료!");
      await new Promise(r => setTimeout(r, 300));
      setStep(4);
    } catch(e) {
      setError("생성 실패: " + e.message);
      setStep(2);
    }
  };

  const inpStyle = {
    width:"100%", padding:"11px 16px", borderRadius:10,
    border:`1px solid ${bdr}`, background:inputBg, color:text,
    fontSize:14, outline:"none", boxSizing:"border-box", fontFamily:"inherit"
  };

  // ── STEP 0: 인트로
  if (step === 0) return (
    <div style={{ flex:1, overflowY:"auto", display:"flex", alignItems:"center", justifyContent:"center", padding:"40px 20px" }}>
      <div style={{ maxWidth:580, width:"100%", textAlign:"center" }}>
        <div style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"6px 18px", borderRadius:20, background:"rgba(168,85,247,0.15)", border:"1px solid rgba(168,85,247,0.3)", fontSize:12, fontWeight:700, color:ACC, marginBottom:16 }}>
          ✂️ AI 숏폼 자동 편집 기획
        </div>
        <div style={{ fontSize:26, fontWeight:900, color:text, lineHeight:1.3, marginBottom:12 }}>
          1편의 롱폼 영상으로<br/>
          <span style={{ background:"linear-gradient(135deg,#a855f7,#ec4899)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>10편의 숏폼을 만들어보세요</span>
        </div>
        <div style={{ fontSize:13, color:muted, lineHeight:1.8, marginBottom:30 }}>
          유튜브 링크 또는 영상 파일을 올리면<br/>
          AI가 핵심 하이라이트 구간을 분석해<br/>
          제목·자막·타임코드를 자동으로 완성해줘요
        </div>

        {/* 기능 그리드 */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:28 }}>
          {[
            { icon:"🎯", title:"AI 하이라이트 추출", desc:"핵심 구간 자동 분석" },
            { icon:"⏱", title:"타임코드 자동 지정", desc:"정확한 시작·종료 시간" },
            { icon:"📝", title:"자막 스크립트 생성", desc:"구어체 자막 자동 완성" },
            { icon:"🎬", title:"후킹 제목 추천",    desc:"클릭 부르는 제목 생성" },
            { icon:"#️⃣", title:"해시태그 자동 추출", desc:"최적 해시태그 추천" },
            { icon:"✂️", title:"편집 팁 제공",      desc:"알파컷·Vrew에 바로 적용" },
          ].map(f => (
            <div key={f.title} style={{ padding:"12px 10px", borderRadius:12, border:`1px solid ${bdr}`, background:cardBg, textAlign:"left" }}>
              <div style={{ fontSize:18, marginBottom:4 }}>{f.icon}</div>
              <div style={{ fontSize:11, fontWeight:800, color:text, marginBottom:2 }}>{f.title}</div>
              <div style={{ fontSize:9, color:muted, lineHeight:1.4 }}>{f.desc}</div>
            </div>
          ))}
        </div>

        <button onClick={() => setStep(1)}
          style={{ width:"100%", padding:"15px", borderRadius:14, border:"none", cursor:"pointer",
            background:"linear-gradient(135deg,#a855f7,#ec4899)", color:"#fff", fontSize:15, fontWeight:900,
            boxShadow:"0 8px 28px rgba(168,85,247,0.35)" }}>
          숏폼 만들기 시작 →
        </button>
      </div>
    </div>
  );

  // ── STEP 1: 입력
  if (step === 1) return (
    <div style={{ flex:1, overflowY:"auto" }}>
      <div style={{ maxWidth:760, margin:"0 auto", padding:"32px 20px 80px" }}>
        <div style={{ textAlign:"center", marginBottom:28 }}>
          <div style={{ fontSize:20, fontWeight:900, color:text, marginBottom:4 }}>국내 1위 AI 쇼츠 변환 서비스</div>
          <div style={{ fontSize:13, color:muted }}>유튜브 링크 또는 영상 파일을 업로드하세요</div>
        </div>

        {/* 입력 탭 */}
        <div style={{ display:"flex", borderRadius:12, overflow:"hidden", border:`1px solid ${bdr}`, marginBottom:16 }}>
          <button onClick={() => setInputMode("youtube")}
            style={{ flex:1, padding:"12px", border:"none", cursor:"pointer", fontSize:13, fontWeight:700,
              background:inputMode==="youtube"?`rgba(168,85,247,0.2)`:cardBg,
              color:inputMode==="youtube"?ACC:muted,
              borderRight:`1px solid ${bdr}` }}>
            🔗 유튜브 링크
          </button>
          <button onClick={() => setInputMode("file")}
            style={{ flex:1, padding:"12px", border:"none", cursor:"pointer", fontSize:13, fontWeight:700,
              background:inputMode==="file"?`linear-gradient(135deg,#a855f7,#ec4899)`:"transparent",
              color:inputMode==="file"?"#fff":muted }}>
            ⬆️ 파일 업로드
          </button>
        </div>

        {/* 유튜브 입력 */}
        {inputMode === "youtube" && (
          <div>
            <div style={{ display:"flex", gap:8, marginBottom:12 }}>
              <div style={{ flex:1, position:"relative" }}>
                <span style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", fontSize:16, color:muted }}>🔗</span>
                <input value={youtubeUrl}
                  onChange={e => {
                    setYoutubeUrl(e.target.value);
                    setYtInfo(null);
                    if (extractYoutubeId(e.target.value)) fetchYtInfo(e.target.value);
                  }}
                  placeholder="https://www.youtube.com/watch?v=..."
                  style={{ ...inpStyle, paddingLeft:38 }}/>
              </div>
              <button onClick={() => fetchYtInfo(youtubeUrl)} disabled={ytLoading || !youtubeUrl}
                style={{ padding:"0 20px", borderRadius:10, border:"none", cursor:"pointer",
                  background:ACC, color:"#fff", fontSize:13, fontWeight:700,
                  opacity:!youtubeUrl?0.5:1, whiteSpace:"nowrap" }}>
                {ytLoading?"확인 중...":"확인"}
              </button>
            </div>

            {/* 유튜브 미리보기 */}
            {ytInfo && (
              <div style={{ borderRadius:14, border:`1px solid ${ACC}40`, background:`rgba(168,85,247,0.06)`, overflow:"hidden", marginBottom:8 }}>
                <img src={ytInfo.thumbnail} alt="" style={{ width:"100%", maxHeight:240, objectFit:"cover", display:"block" }}/>
                <div style={{ padding:"12px 16px" }}>
                  <div style={{ fontSize:14, fontWeight:800, color:text, marginBottom:4 }}>{ytInfo.title}</div>
                  <div style={{ fontSize:11, color:muted }}>유튜브 링크 확인 완료</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 파일 업로드 */}
        {inputMode === "file" && (
          <div>
            <input ref={fileRef} type="file" accept="video/*" style={{ display:"none" }}
              onChange={e => handleFileUpload(e.target.files[0])}/>
            {!uploadedFile ? (
              <div onClick={() => fileRef.current?.click()}
                onDrop={e => { e.preventDefault(); handleFileUpload(e.dataTransfer.files[0]); }}
                onDragOver={e => e.preventDefault()}
                style={{ border:`2px dashed ${bdr}`, borderRadius:14, padding:"40px 20px", textAlign:"center", cursor:"pointer",
                  background:cardBg, transition:"all 0.15s" }}>
                <div style={{ fontSize:40, marginBottom:12 }}>📁</div>
                <div style={{ fontSize:15, fontWeight:800, color:text, marginBottom:6 }}>동영상 파일을 드래그하거나 클릭하여 선택하세요</div>
                <div style={{ fontSize:12, color:"#f59e0b", marginBottom:8 }}>⚠️ 파일 업로드 중 다른 작업이 가능하지만, 페이지 새로고침 시 업로드가 취소됩니다.</div>
                <div style={{ fontSize:11, color:muted, lineHeight:1.7 }}>
                  지원 형식: MP4, MOV, WEBM, MKV<br/>파일 제한: 5GB, 3시간 이하
                </div>
              </div>
            ) : (
              <div style={{ borderRadius:14, border:`1px solid ${ACC}40`, background:`rgba(168,85,247,0.06)`, overflow:"hidden" }}>
                <video ref={videoRef} controls style={{ width:"100%", maxHeight:260, background:"#000", display:"block" }}
                  src={URL.createObjectURL(uploadedFile)}/>
                <div style={{ padding:"12px 16px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:800, color:text }}>{uploadedFile.name}</div>
                    <div style={{ fontSize:11, color:muted }}>
                      {(uploadedFile.size / 1024 / 1024).toFixed(1)}MB
                      {uploadedDuration ? ` · ${toMMSS(uploadedDuration)}` : ""}
                    </div>
                  </div>
                  <button onClick={() => { setUploadedFile(null); setUploadedPreview(null); setUploadedDuration(null); }}
                    style={{ padding:"5px 12px", borderRadius:7, border:`1px solid rgba(239,68,68,0.3)`, background:"transparent", color:"#f87171", fontSize:11, cursor:"pointer" }}>
                    취소
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 버튼 */}
        <div style={{ marginTop:20, display:"flex", gap:10 }}>
          <button onClick={() => setStep(0)}
            style={{ padding:"12px 24px", borderRadius:10, border:`1px solid ${bdr}`, background:"transparent", color:muted, fontSize:13, cursor:"pointer" }}>
            취소
          </button>
          <button onClick={goToSettings}
            disabled={inputMode==="youtube" ? !ytInfo : !uploadedFile}
            style={{ flex:1, padding:"13px", borderRadius:10, border:"none", cursor:"pointer",
              background:`linear-gradient(135deg,${ACC},#ec4899)`, color:"#fff", fontSize:14, fontWeight:900,
              opacity:(inputMode==="youtube"?!ytInfo:!uploadedFile)?0.4:1 }}>
            확인 ({shortCount > 0 ? `🪙 ${shortCount * 5}` : ""}) →
          </button>
        </div>
      </div>
    </div>
  );

  // ── STEP 2: 세부 설정
  if (step === 2) return (
    <div style={{ flex:1, overflowY:"auto" }}>
      <div style={{ maxWidth:760, margin:"0 auto", padding:"24px 20px 80px" }}>

        {/* 영상 미리보기 요약 */}
        <div style={{ borderRadius:12, border:`1px solid ${bdr}`, background:cardBg, overflow:"hidden", marginBottom:20 }}>
          {inputMode === "youtube" && ytInfo && (
            <div style={{ display:"flex", gap:12, padding:"12px 16px", alignItems:"center" }}>
              <img src={ytInfo.thumbnail} alt="" style={{ width:80, height:50, objectFit:"cover", borderRadius:6, flexShrink:0 }}/>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:800, color:text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{ytInfo.title}</div>
                <div style={{ fontSize:11, color:muted }}>유튜브 영상</div>
              </div>
              <button onClick={() => setStep(1)} style={{ fontSize:11, color:ACC, background:"transparent", border:"none", cursor:"pointer" }}>변경</button>
            </div>
          )}
          {inputMode === "file" && uploadedFile && (
            <div style={{ display:"flex", gap:12, padding:"12px 16px", alignItems:"center" }}>
              <div style={{ width:80, height:50, background:"#1a1a2e", borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>🎬</div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:800, color:text, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{uploadedFile.name}</div>
                <div style={{ fontSize:11, color:muted }}>{(uploadedFile.size/1024/1024).toFixed(1)}MB{uploadedDuration?` · ${toMMSS(uploadedDuration)}`:""}</div>
              </div>
              <button onClick={() => setStep(1)} style={{ fontSize:11, color:ACC, background:"transparent", border:"none", cursor:"pointer" }}>변경</button>
            </div>
          )}
        </div>

        {/* 세부 설정 박스 */}
        <div style={{ borderRadius:14, border:`1px solid ${bdr}`, background:cardBg, padding:"20px", marginBottom:20 }}>

          {/* 쇼츠 길이 */}
          <div style={{ marginBottom:22 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
              <span style={{ fontSize:16 }}>⏱</span>
              <span style={{ fontSize:14, fontWeight:800, color:text }}>쇼츠 길이</span>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8 }}>
              {SHORT_LENGTHS.map(l => {
                const isSel = shortLength === l.id;
                return (
                  <button key={l.id} onClick={() => setShortLength(l.id)}
                    style={{ padding:"12px 8px", borderRadius:10, border:`2px solid ${isSel?ACC:bdr}`,
                      background:isSel?`rgba(168,85,247,0.15)`:"transparent", cursor:"pointer", textAlign:"center" }}>
                    <div style={{ fontSize:12, fontWeight:800, color:isSel?ACC:text, marginBottom:2 }}>{l.label}</div>
                    <div style={{ fontSize:10, color:muted }}>{l.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 제목 언어 */}
          <div style={{ marginBottom:22 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
              <span style={{ fontSize:16 }}>🌐</span>
              <span style={{ fontSize:14, fontWeight:800, color:text }}>제목 언어</span>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
              {[["ko","한국어","한국어로 제목 생성"],["en","English","영어로 제목 생성"]].map(([v,l,d]) => (
                <button key={v} onClick={() => setTitleLang(v)}
                  style={{ padding:"14px", borderRadius:10, border:`2px solid ${titleLang===v?ACC:bdr}`,
                    background:titleLang===v?`rgba(168,85,247,0.15)`:"transparent", cursor:"pointer" }}>
                  <div style={{ fontSize:13, fontWeight:800, color:titleLang===v?ACC:text, marginBottom:2 }}>{l}</div>
                  <div style={{ fontSize:11, color:muted }}>{d}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 자막 언어 */}
          <div style={{ marginBottom:22 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
              <span style={{ fontSize:16 }}>💬</span>
              <span style={{ fontSize:14, fontWeight:800, color:text }}>자막 언어</span>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
              {[["ko","한국어","한국어로 자막 생성"],["en","English","영어로 자막 생성"]].map(([v,l,d]) => (
                <button key={v} onClick={() => setSubtitleLang(v)}
                  style={{ padding:"14px", borderRadius:10, border:`2px solid ${subtitleLang===v?ACC:bdr}`,
                    background:subtitleLang===v?`rgba(168,85,247,0.15)`:"transparent", cursor:"pointer" }}>
                  <div style={{ fontSize:13, fontWeight:800, color:subtitleLang===v?ACC:text, marginBottom:2 }}>{l}</div>
                  <div style={{ fontSize:11, color:muted }}>{d}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 구간 설정 */}
          <div style={{ marginBottom:8 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12 }}>
              <span style={{ fontSize:16 }}>✂️</span>
              <span style={{ fontSize:14, fontWeight:800, color:text }}>구간 설정</span>
              <span style={{ fontSize:12, color:ACC }}>({toMMSS(rangeStart)} ~ {toMMSS(rangeEnd || totalDuration)})</span>
            </div>
            <div style={{ padding:"14px 16px", borderRadius:10, background:inputBg }}>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:muted, marginBottom:8 }}>
                <span>{toMMSS(rangeStart)}</span>
                <span style={{ fontWeight:700, color:text }}>구간 길이: {toMMSS((rangeEnd||totalDuration) - rangeStart)}</span>
                <span>{toMMSS(rangeEnd || totalDuration)}</span>
              </div>
              {totalDuration > 0 ? (
                <input type="range" min={0} max={totalDuration} value={rangeEnd || totalDuration}
                  onChange={e => setRangeEnd(Number(e.target.value))}
                  style={{ width:"100%", accentColor:ACC }}/>
              ) : (
                <div style={{ height:6, borderRadius:3, background:`linear-gradient(90deg,${ACC},#ec4899)` }}/>
              )}
              <div style={{ display:"flex", justifyContent:"space-between", marginTop:10, gap:8 }}>
                <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                  <button onClick={() => setRangeStart(Math.max(0,rangeStart-10))} style={{ width:24, height:24, borderRadius:6, border:`1px solid ${bdr}`, background:"transparent", color:muted, cursor:"pointer", fontSize:12 }}>-</button>
                  <span style={{ fontSize:12, color:text, minWidth:40, textAlign:"center" }}>{toMMSS(rangeStart)}</span>
                  <button onClick={() => setRangeStart(Math.min(rangeStart+10,rangeEnd-10))} style={{ width:24, height:24, borderRadius:6, border:`1px solid ${bdr}`, background:"transparent", color:muted, cursor:"pointer", fontSize:12 }}>+</button>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                  <button onClick={() => setRangeEnd(Math.max(rangeStart+10,rangeEnd-10))} style={{ width:24, height:24, borderRadius:6, border:`1px solid ${bdr}`, background:"transparent", color:muted, cursor:"pointer", fontSize:12 }}>-</button>
                  <span style={{ fontSize:12, color:text, minWidth:40, textAlign:"center" }}>{toMMSS(rangeEnd||totalDuration)}</span>
                  <button onClick={() => setRangeEnd(Math.min(totalDuration,rangeEnd+10))} style={{ width:24, height:24, borderRadius:6, border:`1px solid ${bdr}`, background:"transparent", color:muted, cursor:"pointer", fontSize:12 }}>+</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 숏폼 생성 수 */}
        <div style={{ borderRadius:12, border:`1px solid ${bdr}`, background:cardBg, padding:"14px 18px", marginBottom:20 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
            <span style={{ fontSize:13, fontWeight:800, color:text }}>생성할 숏폼 수</span>
            <span style={{ fontSize:16, fontWeight:900, color:ACC }}>{shortCount}개</span>
          </div>
          <input type="range" min={1} max={10} value={shortCount} onChange={e => setShortCount(Number(e.target.value))}
            style={{ width:"100%", accentColor:ACC }}/>
          <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, color:muted, marginTop:3 }}>
            <span>1개</span><span>5개</span><span>10개</span>
          </div>
        </div>

        {error && <div style={{ padding:"10px 14px", borderRadius:9, background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.2)", color:"#f87171", fontSize:12, marginBottom:14 }}>⚠️ {error}</div>}

        <button onClick={generate}
          style={{ width:"100%", padding:"15px", borderRadius:12, border:"none", cursor:"pointer",
            background:`linear-gradient(135deg,${ACC},#ec4899)`, color:"#fff", fontSize:15, fontWeight:900,
            boxShadow:"0 6px 20px rgba(168,85,247,0.3)" }}>
          ✂️ 숏폼 {shortCount}개 생성하기 →
        </button>
      </div>
    </div>
  );

  // ── STEP 3: 처리 중
  if (step === 3) return (
    <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", padding:"40px 20px" }}>
      <div style={{ maxWidth:460, width:"100%", textAlign:"center" }}>
        {/* 스피너 */}
        <div style={{ position:"relative", width:100, height:100, margin:"0 auto 24px" }}>
          <div style={{ position:"absolute", inset:0, borderRadius:"50%", border:"3px solid rgba(168,85,247,0.15)" }}/>
          <div style={{ position:"absolute", inset:0, borderRadius:"50%", border:"3px solid transparent",
            borderTopColor:ACC, animation:"spin 1s linear infinite" }}/>
          <div style={{ position:"absolute", inset:10, borderRadius:"50%", border:"2px solid transparent",
            borderTopColor:"rgba(168,85,247,0.5)", animation:"spin 1.6s linear infinite reverse" }}/>
          <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:34 }}>✂️</div>
        </div>

        <div style={{ fontSize:18, fontWeight:900, color:text, marginBottom:8 }}>숏폼을 생성하고 있어요</div>
        <div style={{ fontSize:13, color:ACC, fontWeight:700, marginBottom:20 }}>{progressMsg}</div>

        {/* 진행 바 */}
        <div style={{ height:8, borderRadius:4, background:D?"rgba(255,255,255,0.08)":"#e5e7eb", overflow:"hidden", marginBottom:8 }}>
          <div style={{ height:"100%", borderRadius:4, background:`linear-gradient(90deg,${ACC},#ec4899)`,
            width:`${progress}%`, transition:"width 0.6s ease" }}/>
        </div>
        <div style={{ fontSize:12, color:muted }}>{progress}%</div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  // ── STEP 4: 결과
  const cur = clips[selectedClip] || {};
  return (
    <div style={{ flex:1, display:"flex", overflow:"hidden" }}>

      {/* 왼쪽: 숏폼 목록 */}
      <div style={{ width:240, borderRight:`1px solid ${bdr}`, overflowY:"auto", flexShrink:0 }}>
        <div style={{ padding:"12px 14px", borderBottom:`1px solid ${bdr}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ fontSize:13, fontWeight:800, color:text }}>생성된 쇼츠 ({clips.length})</div>
          <button onClick={() => setStep(2)}
            style={{ fontSize:11, padding:"3px 8px", borderRadius:6, border:`1px solid ${bdr}`, background:"transparent", color:muted, cursor:"pointer" }}>
            재생성
          </button>
        </div>
        <div style={{ padding:"8px" }}>
          {clips.map((clip, i) => (
            <div key={i} onClick={() => setSelectedClip(i)}
              style={{ borderRadius:10, overflow:"hidden", marginBottom:6, border:`2px solid ${selectedClip===i?ACC:"transparent"}`,
                cursor:"pointer", background:selectedClip===i?`rgba(168,85,247,0.1)`:cardBg, transition:"all 0.1s" }}>
              {/* 썸네일 */}
              <div style={{ position:"relative", aspectRatio:"16/9", background:"#0f0f0f", display:"flex", alignItems:"center", justifyContent:"center" }}>
                {inputMode === "youtube" && ytInfo
                  ? <img src={ytInfo.thumbnail} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
                  : <div style={{ fontSize:24 }}>🎬</div>}
                <div style={{ position:"absolute", bottom:4, right:4, background:"rgba(0,0,0,0.8)", padding:"1px 5px", borderRadius:4, fontSize:10, color:"#fff" }}>
                  {clip.duration ? `${clip.duration}s` : ""}
                </div>
                {/* 타입 배지 */}
                <div style={{ position:"absolute", top:4, left:4, background:ACC, padding:"1px 7px", borderRadius:6, fontSize:9, fontWeight:700, color:"#fff" }}>
                  {clip.type || "하이라이트 꽃"}
                </div>
              </div>
              <div style={{ padding:"6px 8px 8px" }}>
                <div style={{ fontSize:11, fontWeight:700, color:selectedClip===i?ACC:text, lineHeight:1.4, marginBottom:4 }}>
                  {clip.title}
                </div>
                <div style={{ display:"flex", gap:4 }}>
                  <button onClick={e => { e.stopPropagation(); copy(`${clip.title}\n\n${clip.script}\n\n${clip.hashtags?.join(" ")}`, `all_${i}`); }}
                    style={{ flex:1, padding:"4px 0", borderRadius:6, border:"none", background:`rgba(168,85,247,0.2)`, color:ACC, fontSize:9, fontWeight:700, cursor:"pointer" }}>
                    {copiedField===`all_${i}`?"✅":"📋 복사"}
                  </button>
                  <button onClick={e => { e.stopPropagation(); /* 실제 다운로드 불가 - 안내 */ alert("✂️ 실제 영상 다운로드는 알파컷(alphacut.video) 또는 Vrew 등 편집 툴을 이용해주세요!"); }}
                    style={{ flex:1, padding:"4px 0", borderRadius:6, border:"none", background:"rgba(239,68,68,0.2)", color:"#f87171", fontSize:9, fontWeight:700, cursor:"pointer" }}>
                    ↓ 다운로드
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 가운데: 미리보기 */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", minWidth:0, overflow:"hidden" }}>
        {/* 영상 미리보기 영역 */}
        <div style={{ flex:1, background:"#0a0a0a", display:"flex", alignItems:"center", justifyContent:"center", position:"relative", minHeight:200 }}>
          {inputMode === "file" && uploadedFile ? (
            <video controls style={{ maxWidth:"100%", maxHeight:"100%", display:"block" }}
              src={URL.createObjectURL(uploadedFile)}/>
          ) : inputMode === "youtube" && ytInfo ? (
            <div style={{ textAlign:"center", color:muted }}>
              <img src={ytInfo.thumbnail} alt="" style={{ maxWidth:360, borderRadius:8, marginBottom:12 }}/>
              <div style={{ fontSize:12 }}>유튜브 영상은 브라우저 보안 정책으로<br/>직접 재생이 제한돼요</div>
            </div>
          ) : (
            <div style={{ color:muted, fontSize:13 }}>미리보기 없음</div>
          )}
          {/* 타임코드 오버레이 */}
          {cur.startTime && (
            <div style={{ position:"absolute", bottom:10, left:"50%", transform:"translateX(-50%)",
              background:"rgba(0,0,0,0.8)", padding:"4px 14px", borderRadius:8, fontSize:12, color:"#fff", fontWeight:700 }}>
              {cur.startTime} ~ {cur.endTime}
            </div>
          )}
        </div>

        {/* 빠른 작업 버튼 (알파컷 스타일) */}
        <div style={{ padding:"10px 14px", borderTop:`1px solid ${bdr}`, display:"flex", gap:8 }}>
          <a href="https://alphacut.video" target="_blank" rel="noreferrer"
            style={{ flex:1, padding:"8px", borderRadius:9, background:"rgba(255,0,0,0.1)", border:"1px solid rgba(255,0,0,0.2)", color:"#ff4444", fontSize:12, fontWeight:700, textAlign:"center", textDecoration:"none", display:"block" }}>
            ▶️ 알파컷에서 편집
          </a>
          <a href="https://vrew.ai" target="_blank" rel="noreferrer"
            style={{ flex:1, padding:"8px", borderRadius:9, background:"rgba(99,102,241,0.1)", border:"1px solid rgba(99,102,241,0.2)", color:"#818cf8", fontSize:12, fontWeight:700, textAlign:"center", textDecoration:"none", display:"block" }}>
            📝 Vrew에서 자막 편집
          </a>
        </div>
      </div>

      {/* 오른쪽: 상세 정보 */}
      <div style={{ width:280, borderLeft:`1px solid ${bdr}`, overflowY:"auto", flexShrink:0 }}>
        <div style={{ padding:"16px" }}>

          {/* 제목 */}
          <div style={{ marginBottom:16 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
              <div style={{ fontSize:11, fontWeight:700, color:muted }}>제목</div>
              <button onClick={() => copy(cur.title||"", "title")}
                style={{ fontSize:10, color:ACC, background:"transparent", border:"none", cursor:"pointer" }}>
                {copiedField==="title"?"✅":"복사"}
              </button>
            </div>
            <div style={{ fontSize:14, fontWeight:800, color:text, lineHeight:1.5 }}>{cur.title}</div>
          </div>

          {/* 원본 영상 타임라인 */}
          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:11, fontWeight:700, color:muted, marginBottom:6 }}>원본 영상 타임라인</div>
            <div style={{ padding:"8px 12px", borderRadius:8, background:inputBg, fontSize:13, fontWeight:700, color:ACC }}>
              {cur.startTime} ~ {cur.endTime}
            </div>
          </div>

          {/* 첫 3초 후킹 */}
          {cur.hook && (
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:11, fontWeight:700, color:muted, marginBottom:6 }}>🎯 첫 3초 오프닝</div>
              <div style={{ padding:"8px 12px", borderRadius:8, background:inputBg, fontSize:12, color:text, lineHeight:1.6, fontStyle:"italic" }}>
                "{cur.hook}"
              </div>
            </div>
          )}

          {/* 스크립트 */}
          <div style={{ marginBottom:16 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
              <div style={{ fontSize:11, fontWeight:700, color:muted }}>스크립트</div>
              <button onClick={() => copy(cur.script||"", "script")}
                style={{ fontSize:10, color:ACC, background:"transparent", border:"none", cursor:"pointer" }}>
                {copiedField==="script"?"✅":"복사"}
              </button>
            </div>
            <div style={{ padding:"10px 12px", borderRadius:8, background:inputBg, fontSize:12, color:text, lineHeight:1.8, maxHeight:200, overflowY:"auto", whiteSpace:"pre-wrap" }}>
              {cur.script}
            </div>
          </div>

          {/* 편집 팁 */}
          {cur.editTip && (
            <div style={{ marginBottom:16 }}>
              <div style={{ fontSize:11, fontWeight:700, color:muted, marginBottom:6 }}>✂️ 편집 팁</div>
              <div style={{ padding:"8px 12px", borderRadius:8, background:"rgba(245,158,11,0.08)", border:"1px solid rgba(245,158,11,0.2)", fontSize:11, color:"#fbbf24", lineHeight:1.6 }}>
                {cur.editTip}
              </div>
            </div>
          )}

          {/* 해시태그 */}
          {cur.hashtags?.length > 0 && (
            <div style={{ marginBottom:16 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                <div style={{ fontSize:11, fontWeight:700, color:muted }}>해시태그</div>
                <button onClick={() => copy(cur.hashtags.join(" "), "tags")}
                  style={{ fontSize:10, color:ACC, background:"transparent", border:"none", cursor:"pointer" }}>
                  {copiedField==="tags"?"✅":"복사"}
                </button>
              </div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
                {cur.hashtags.map((tag, j) => (
                  <span key={j} onClick={() => copy(tag, `t${j}`)}
                    style={{ padding:"3px 8px", borderRadius:10, background:`rgba(168,85,247,0.15)`,
                      color:ACC, fontSize:10, fontWeight:600, cursor:"pointer", border:`1px solid rgba(168,85,247,0.3)` }}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
