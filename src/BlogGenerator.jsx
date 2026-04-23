import React, { useState, useEffect, useRef, Suspense } from "react";
const ShortsCreator = React.lazy(() => import("./ShortsCreator"));
const LongFormEditor = React.lazy(() => import("./LongFormEditor"));
import { changePoints, getAiUsage, setAiUsage, guestLimitExceeded, incrementGuestUsage, getAuthToken } from "./storage";
import { useGeneratingGuard } from "./useGeneratingGuard";
import { useI18n } from "./i18n.jsx";

import { callAI, callAIStream } from "./aiClient";
import { isDarkTheme } from "./theme";
import DOMPurify from "dompurify";
import ShareButton from "./ShareButton";

// ── 네이버 자동발행 모달 ──
function NaverAutoPublishModal({ result, keyword, isDark, onClose }) {
  const { t } = useI18n();
  const [naverId, setNaverId] = useState("");
  const [naverPw, setNaverPw] = useState("");
  const [downloaded, setDownloaded] = useState(false);
  const green = "#10b981";
  const text = isDark ? "#fff" : "#1a1a2e";
  const muted = isDark ? "rgba(255,255,255,0.4)" : "#888";
  const border = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
  const bg = isDark ? "#1a1a2e" : "#fff";

  const cleanContent = (raw) => {
    return raw
      .replace(/\[TITLE\]\s*\n[^\n]+\n?/, "")
      .replace(/\[BODY\]\s*\n?/, "")
      .replace(/\[TAGS\]\s*\n?[^\n]*/, "")
      .replace(/\[image:[^\]]+\]/g, "")
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/#{1,6}\s*/g, "")
      .replace(/^[-*]\s+/gm, "")
      .trim();
  };

  const getTitle = () => {
    const m = result.match(/\[TITLE\]\s*\n([^\n]+)/);
    return m ? m[1].trim() : keyword.slice(0, 30);
  };

  const getTags = () => {
    const m = result.match(/\[TAGS\]\s*\n([^\n]+)/);
    return m ? m[1].trim() : keyword;
  };

  const downloadScript = () => {
    if (!naverId.trim()) return alert(t("bg_alertNaverId"));
    if (!naverPw.trim()) return alert(t("bg_alertNaverPw"));

    const title = getTitle().replace(/"""/g, "'''");
    const body = cleanContent(result).replace(/"""/g, "'''").slice(0, 10000);
    const tags = getTags().replace(/"/g, "");

    const script = `# -*- coding: utf-8 -*-
"""
메이킷 SNS 자동화 - 네이버 블로그 자동 발행
이 파일을 더블클릭하거나 python publish.py 로 실행하세요.
"""
from playwright.sync_api import sync_playwright
import time, os, sys

NAVER_ID = "${naverId}"
NAVER_PW = "${naverPw}"

TITLE = """${title}"""

BODY = """${body}"""

TAGS = """${tags}"""

def main():
    print()
    print("=" * 50)
    print("  메이킷 SNS 자동화 - 네이버 블로그 발행")
    print("=" * 50)
    print()

    profile_dir = os.path.join(
        os.environ.get("APPDATA", os.path.expanduser("~")),
        "MakeitBot", "profile", NAVER_ID
    )
    os.makedirs(profile_dir, exist_ok=True)

    print("[1/5] 브라우저 실행 중...")
    with sync_playwright() as pw:
        # 브라우저 실행 (여러 방법 시도)
        ctx = None
        for channel in [None, "chrome", "msedge"]:
            try:
                kwargs = dict(
                    user_data_dir=profile_dir,
                    headless=False,
                    viewport={"width": 1280, "height": 900},
                    locale="ko-KR",
                    args=["--disable-blink-features=AutomationControlled", "--no-sandbox"],
                )
                if channel:
                    kwargs["channel"] = channel
                ctx = pw.chromium.launch_persistent_context(**kwargs)
                break
            except Exception as e:
                if channel == "msedge":
                    print(f"[!] 브라우저 실행 실패: {e}")
                    print("    Playwright 설치를 확인해주세요: playwright install chromium")
                    input("Enter를 누르면 종료됩니다...")
                    return
                continue

        page = ctx.pages[0] if ctx.pages else ctx.new_page()

        # 로그인
        print("[2/5] 네이버 로그인 중...")
        page.goto("https://nid.naver.com/nidlogin.login", wait_until="domcontentloaded")
        time.sleep(2)

        if "nidlogin" in page.url:
            page.evaluate(
                """([id, pw]) => {
                    const idEl = document.querySelector('#id');
                    const pwEl = document.querySelector('#pw');
                    if (idEl) { idEl.value = id; idEl.dispatchEvent(new Event('input', {bubbles: true})); }
                    if (pwEl) { pwEl.value = pw; pwEl.dispatchEvent(new Event('input', {bubbles: true})); }
                }""",
                [NAVER_ID, NAVER_PW],
            )
            time.sleep(0.5)
            btn = page.query_selector(".btn_login, #log\\\\.login, button[type='submit']")
            if btn:
                btn.click()

            for i in range(20):
                time.sleep(1)
                if "nidlogin" not in page.url:
                    print("       로그인 성공!")
                    break
            else:
                print()
                print("  [!] 자동 로그인 실패 (캡차 또는 2차인증)")
                print("      브라우저에서 직접 로그인해주세요.")
                print()
                input("  로그인 완료 후 Enter를 눌러주세요...")

        # 글쓰기 페이지
        print("[3/5] 글쓰기 페이지 열기...")
        page.goto(f"https://blog.naver.com/{NAVER_ID}/postwrite", wait_until="domcontentloaded")
        time.sleep(4)

        # 팝업 닫기
        try:
            page.evaluate("""() => {
                document.querySelectorAll('.se-popup-button-cancel, .se-popup-alert button').forEach(b => {
                    try { b.click(); } catch(e) {}
                });
                document.querySelectorAll('.se-popup, .se-popup-dim').forEach(el => {
                    try { el.remove(); } catch(e) {}
                });
            }""")
        except Exception:
            pass
        time.sleep(1)

        # 제목 입력
        print("[4/5] 글 작성 중...")
        title_el = page.query_selector(".se-documentTitle .se-text-paragraph")
        if title_el:
            title_el.click()
            time.sleep(0.3)
            page.keyboard.type(TITLE, delay=20)

        page.keyboard.press("Enter")
        time.sleep(0.5)

        # 본문 입력
        paragraphs = BODY.split("\\n\\n")
        total = len(paragraphs)
        for idx, p in enumerate(paragraphs):
            p = p.strip()
            if not p:
                continue
            page.keyboard.type(p, delay=3)
            page.keyboard.press("Enter")
            page.keyboard.press("Enter")
            time.sleep(0.05)
            if (idx + 1) % 10 == 0:
                pct = int((idx + 1) / total * 100)
                print(f"       본문 입력 중... {pct}%")

        # 태그 입력
        print("[5/5] 태그 입력 중...")
        try:
            tag_area = page.query_selector(".se-tag-label, button[class*='tag'], .se-section-tag")
            if tag_area:
                tag_area.click()
                time.sleep(0.5)
                for tag in TAGS.split(","):
                    tag = tag.strip().replace("#", "")
                    if tag:
                        tag_input = page.query_selector(".se-tag-input input, input[placeholder*='태그'], input[placeholder*='tag']")
                        if tag_input:
                            tag_input.fill(tag)
                            page.keyboard.press("Enter")
                            time.sleep(0.2)
        except Exception:
            print("       태그 입력 건너뜀")

        print()
        print("=" * 50)
        print("  글 작성이 완료되었습니다!")
        print("  브라우저에서 내용을 확인하고")
        print("  [발행] 버튼을 클릭해주세요.")
        print("=" * 50)
        print()
        input("  브라우저를 닫으려면 Enter...")
        ctx.close()

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\\n종료되었습니다.")
    except Exception as e:
        print(f"\\n[오류] {e}")
        input("Enter를 누르면 종료됩니다...")
`;

    const blob = new Blob([script], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "publish.py";
    a.click();
    URL.revokeObjectURL(url);
    setDownloaded(true);
  };

  return (
    <div style={{ position:"fixed", inset:0, zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(0,0,0,0.5)", backdropFilter:"blur(4px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ width:440, maxWidth:"90vw", background:bg, borderRadius:18, padding:"28px 28px 24px", boxShadow:"0 20px 60px rgba(0,0,0,0.3)" }}>
        {/* 헤더 */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:green+"15", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={green} strokeWidth="2.5" strokeLinecap="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
            </div>
            <span style={{ fontSize:17, fontWeight:800, color:text }}>{t("bg_naverAutoPublish")}</span>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", color:muted, fontSize:20, cursor:"pointer", padding:4 }}>x</button>
        </div>

        {!downloaded ? (
          <>
            {/* 네이버 계정 입력 */}
            <div style={{ fontSize:13, color:muted, marginBottom:14, lineHeight:1.6 }}>
              {t("bg_naverAutoPublishDesc")}
              <br/><span style={{ fontSize:11, color:muted }}>{t("bg_naverAutoPublishSafe")}</span>
            </div>
            <input value={naverId} onChange={e => setNaverId(e.target.value)} placeholder={t("bg_naverIdPlaceholder")}
              style={{ width:"100%", padding:"12px 14px", borderRadius:10, border:`1.5px solid ${border}`, background:"transparent", color:text, fontSize:14, marginBottom:10, outline:"none", boxSizing:"border-box" }} />
            <input value={naverPw} onChange={e => setNaverPw(e.target.value)} placeholder={t("bg_naverPwPlaceholder")} type="password"
              onKeyDown={e => e.key === "Enter" && downloadScript()}
              style={{ width:"100%", padding:"12px 14px", borderRadius:10, border:`1.5px solid ${border}`, background:"transparent", color:text, fontSize:14, marginBottom:16, outline:"none", boxSizing:"border-box" }} />
            <button onClick={downloadScript}
              style={{ width:"100%", padding:"14px", borderRadius:12, border:"none", background:`linear-gradient(135deg,${green},#059669)`, color:"#fff", fontSize:15, fontWeight:800, cursor:"pointer" }}>
              {t("bg_downloadPublishFile")}
            </button>
          </>
        ) : (
          <>
            {/* 다운로드 완료 안내 */}
            <div style={{ textAlign:"center", padding:"10px 0 6px" }}>
              <div style={{ width:52, height:52, borderRadius:"50%", background:green+"15", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 14px" }}>
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={green} strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <div style={{ fontSize:16, fontWeight:800, color:text, marginBottom:8 }}>{t("bg_downloadComplete")}</div>
              <div style={{ fontSize:13, color:muted, lineHeight:1.7 }}>
                다운로드된 <b style={{color:text}}>publish.py</b> 파일을 더블클릭하거나<br/>
                명령 프롬프트에서 아래 명령어로 실행하세요.
              </div>
            </div>
            <div style={{ margin:"14px 0", padding:"12px 16px", borderRadius:10, background:isDark?"#0f1116":"#1e293b", fontFamily:"monospace", fontSize:14, color:"#e2e8f0", textAlign:"center" }}>
              python publish.py
            </div>
            <div style={{ fontSize:12, color:muted, lineHeight:1.7, padding:"12px 14px", borderRadius:10, background:isDark?"rgba(255,255,255,0.03)":"#f8fafc", marginBottom:14 }}>
              <b style={{color:text}}>실행하면 이렇게 진행됩니다:</b><br/>
              1. 브라우저가 자동으로 열립니다<br/>
              2. 네이버에 자동 로그인합니다<br/>
              3. 글쓰기 페이지에서 제목/본문/태그를 자동 입력합니다<br/>
              4. 내용을 확인하고 발행 버튼만 클릭하면 끝!
            </div>
            <button onClick={onClose}
              style={{ width:"100%", padding:"12px", borderRadius:10, border:`1.5px solid ${border}`, background:"transparent", color:text, fontSize:13, fontWeight:700, cursor:"pointer" }}>
              {t("bg_close")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
// ── 자동화 패널 (exe 앱 스타일 + 설치안내 + 계정확인) ──
function AutomationPanel({ isDark, text, muted, accent, border, cardBg, user, onLoginRequest }) {
  const { t } = useI18n();
  const green = "#10b981";
  const [naverId, setNaverId] = useState(() => { try { return localStorage.getItem("makeit_naver_id") || ""; } catch { return ""; } });
  const [naverPw, setNaverPw] = useState(() => { try { return localStorage.getItem("makeit_naver_pw") || ""; } catch { return ""; } });
  const [acctSaved, setAcctSaved] = useState(false);
  const [kw, setKw] = useState("");
  const [subtype, setSub] = useState("info");
  const [tone, setTone] = useState("friendly");
  const [speech, setSp] = useState("polite_yo");
  const [wordCount, setWc] = useState("medium");
  const [extra, setExtra] = useState("");
  const [status, setStatus] = useState("idle");
  const [progress, setProgress] = useState("");
  const [showSetup, setShowSetup] = useState(false);
  const [resultPreview, setResultPreview] = useState("");
  const [liveSteps, setLiveSteps] = useState([]);
  const [loginChecking, setLoginChecking] = useState(false);
  const [pendingSession, setPendingSession] = useState(null);
  const [zoomScreenshot, setZoomScreenshot] = useState(null);
  const [captchaInput, setCaptchaInput] = useState("");
  const [loginConfirmed, setLoginConfirmed] = useState(false);
  const [blogCategories, setBlogCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");

  const chip = (active, c) => ({
    padding:"7px 14px", borderRadius:8, border: active ? `1.5px solid ${c}` : `1px solid ${border}`,
    background: active ? c+"15" : "transparent", color: active ? c : muted,
    fontSize:12, fontWeight: active ? 700 : 500, cursor:"pointer", transition:"all 0.12s",
  });

  const onLoginSuccess = async () => {
    setLoginConfirmed(true);
  };

  const saveAccount = () => {
    if (!naverId.trim() || !naverPw.trim()) return alert(t("bg_alertIdPw"));
    try { localStorage.setItem("makeit_naver_id", naverId); localStorage.setItem("makeit_naver_pw", naverPw); } catch {}
    setAcctSaved(true); setTimeout(() => setAcctSaved(false), 2000);
  };

  const handleStart = async () => {
    if (!kw.trim()) return alert(t("bg_alertTopicRequired"));
    if (!naverId.trim() || !naverPw.trim()) return alert(t("bg_alertNaverIdPwFirst"));
    saveAccount();
    setStatus("generating"); setProgress(t("bg_aiWritingProgress")); setResultPreview("");
    try {
      const { callAI } = await import("./aiClient.js");
      const spMap = { polite_yo:"해요체(~요, ~이에요, ~했어요)", formal:"합니다체(~입니다, ~했습니다)", casual:"반말(~야, ~거든, ~했어)", friendly:"친근한 경험 공유체(~거든요, ~해보세요, ~더라고요)", mixed:"상황에 맞게 존댓말과 반말을 자연스럽게 섞어서" };
      const toneMap = { friendly:"친근하고 대화하듯이", diary:"일기/에세이처럼 개인 경험 중심으로", review:"리뷰/후기 느낌으로 장단점 분석", professional:"전문적이고 신뢰감 있게 데이터 기반으로" };
      const wcMap = { short:"3000자", medium:"5000자", long:"7000자" };
      const subtypeMap = { info:"정보성 글 (핵심 정보 전달)", visit:"방문기/체험기 (장소 소개)", review:"리뷰/비교 분석 (장단점)", product:"제품/서비스 소개", column:"칼럼/의견 (전문가 관점)" };

      const result = await callAI("claude-haiku-4-5", [{role:"user",content:`"${kw}" 주제로 네이버 블로그 글 작성.
유형:${subtypeMap[subtype]||"정보성"} / 말투:${spMap[speech]||"해요체"} / 톤:${toneMap[tone]||"친근하게"} / 분량:${wcMap[wordCount]||"5000자"}이상
${extra ? "추가:"+extra : ""}
[TITLE] 제목30자이내
[BODY] 본문 (소제목은 빈줄구분, 마크다운/#/*/-금지, 이모지금지)
[TAGS] 태그10개`}], wordCount==="long"?6000:wordCount==="short"?3000:4500);

      const title = (result.match(/\[TITLE\]\s*\n([^\n]+)/)||["",kw])[1].trim().replace(/'/g,"\\'");
      const body = result.replace(/\[TITLE\]\s*\n[^\n]+\n?/,"").replace(/\[BODY\]\s*\n?/,"").replace(/\[TAGS\]\s*\n?[^\n]*/,"").replace(/\[image:[^\]]+\]/g,"").replace(/\*\*([^*]+)\*\*/g,"$1").replace(/#{1,6}\s*/g,"").replace(/^[-*]\s+/gm,"").trim().replace(/'/g,"\\'").slice(0,10000);
      const tags = (result.match(/\[TAGS\]\s*\n([^\n]+)/)||["",kw])[1].replace(/'/g,"");
      setResultPreview(`제목: ${title}\n\n${body.slice(0,500)}...`);

      // 발행 서버로 직접 발행 요청
      setProgress(t("bg_publishingNaver"));
      setLiveSteps([{ step: "Render 서버에 발행 요청 중...", screenshot: null }]);
      const PUBLISH_SERVER = "https://shorts-factory-r33o.onrender.com";
      try {
        const pubRes = await fetch(`${PUBLISH_SERVER}/naver-publish`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            naverId: naverId.replace(/@.*$/, ""),
            naverPw: naverPw,
            post: {
              title,
              body,
              tags: tags ? tags.split(",").map(t => t.trim().replace("#", "")).filter(Boolean) : [],
              category: selectedCategory || "",
            },
          }),
        });
        const pubData = await pubRes.json();
        if (pubData.success) {
          setStatus("done");
          setProgress(t("bg_publishDone"));
          setLiveSteps([{ step: t("bg_publishSuccess"), screenshot: null }]);
          if (pubData.postUrl) setResultPreview(prev => prev + `\n\n블로그 확인: ${pubData.postUrl}`);
        } else {
          setStatus("error");
          const errMsg = pubData.error || t("bg_publishFail");
          const isCaptcha = errMsg.includes("캡차") || errMsg.includes("인증") || errMsg.includes("로그인 실패");
          setProgress(isCaptcha
            ? t("bg_captchaRequired")
            : errMsg);
          setLiveSteps(isCaptcha ? [
            { step: t("bg_captchaBlocked"), screenshot: null },
            { step: t("bg_captchaTip"), screenshot: null },
            { step: t("bg_captchaWait"), screenshot: null },
          ] : [{ step: errMsg, screenshot: null }]);
        }
      } catch (pubErr) {
        setStatus("error");
        setProgress(t("bg_serverConnFail"));
        setLiveSteps([]);
      }
    } catch(e) {
      const msg = e.message || t("bg_unknownError");
      if (msg.includes("role") || msg.includes("null") || msg.includes("로그인")) {
        setStatus("error"); setProgress(t("bg_loginRequired"));
      } else {
        setStatus("error"); setProgress(t("bg_failPrefix") + msg);
      }
    }
  };

  return (
    <div style={{ maxWidth:640, margin:"0 auto", padding:"0 0 30px" }}>

      {/* ── 1. 초기 설정 안내 (경고 스타일) ── */}
      <div style={{ marginBottom:16, borderRadius:14, border:`2px solid #f59e0b`, overflow:"hidden", background:isDark?"rgba(245,158,11,0.06)":"#fffbeb" }}>
        <button onClick={() => setShowSetup(!showSetup)}
          style={{ width:"100%", padding:"16px 20px", background:"transparent", border:"none", cursor:"pointer",
            display:"flex", alignItems:"center", gap:10, color:text, fontSize:15, fontWeight:800, textAlign:"left" }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="#f59e0b" stroke="#fff" strokeWidth="2" strokeLinecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <span>{t("bg_firstTimeGuide")}</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={muted} strokeWidth="2.5" strokeLinecap="round" style={{marginLeft:"auto",transform:showSetup?"rotate(180deg)":"none",transition:"transform 0.2s"}}><path d="M6 9l6 6 6-6"/></svg>
        </button>
        {showSetup && (
          <div style={{ padding:"0 20px 20px", borderTop:`1px solid rgba(245,158,11,0.2)` }}>
            <div style={{ fontSize:13, color:text, lineHeight:1.8, marginTop:16, marginBottom:18, padding:"14px 16px", borderRadius:10, background:isDark?"rgba(245,158,11,0.08)":"#fef3c7" }}>
              네이버 블로그에 자동으로 글을 발행하려면 PC에 <b>2가지 프로그램</b>을 설치해야 합니다.<br/>
              모두 <b>무료</b>이고, <b>최초 1회만</b> 설치하면 그 다음부터는 바로 사용 가능합니다.<br/>
              아래 순서대로 따라해주세요. 5분이면 끝납니다!
            </div>

            {/* STEP 1 */}
            <div style={{ marginBottom:16, padding:"16px 18px", borderRadius:12, background:isDark?"rgba(255,255,255,0.03)":"#fff", border:`1px solid ${border}` }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                <span style={{ width:28, height:28, borderRadius:"50%", background:green, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:900 }}>1</span>
                <span style={{ fontSize:15, fontWeight:800, color:text }}>{t("bg_pythonInstall")}</span>
              </div>
              <div style={{ fontSize:13, color:muted, lineHeight:1.8, marginBottom:12 }}>
                1. 아래 버튼을 클릭해서 Python 공식 사이트에 접속하세요.<br/>
                2. 노란색 <b style={{color:text}}>"Download Python"</b> 버튼을 클릭하세요.<br/>
                3. 다운로드된 파일을 실행하세요.<br/>
                4. <b style={{color:"#ef4444"}}>중요!</b> 설치 화면 맨 아래 <b style={{color:text}}>"Add Python to PATH"</b>를 <b style={{color:"#ef4444"}}>반드시 체크</b>하세요.<br/>
                5. "Install Now"를 클릭하면 설치 완료!
              </div>
              <a href="https://www.python.org/downloads/" target="_blank" rel="noopener noreferrer"
                style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"10px 20px", borderRadius:10, background:accent, color:"#fff", fontSize:13, fontWeight:700, textDecoration:"none" }}>
                {t("bg_pythonDownload")}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/></svg>
              </a>
            </div>

            {/* STEP 2 */}
            <div style={{ marginBottom:16, padding:"16px 18px", borderRadius:12, background:isDark?"rgba(255,255,255,0.03)":"#fff", border:`1px solid ${border}` }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                <span style={{ width:28, height:28, borderRadius:"50%", background:green, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:900 }}>2</span>
                <span style={{ fontSize:15, fontWeight:800, color:text }}>{t("bg_autoToolInstall")}</span>
              </div>
              <div style={{ fontSize:13, color:muted, lineHeight:1.8, marginBottom:12 }}>
                <b style={{color:text}}>명령 프롬프트</b>라는 검은 창을 열어야 합니다:<br/>
                1. 키보드에서 <span style={{padding:"3px 10px",borderRadius:5,background:isDark?"rgba(255,255,255,0.1)":"#e2e8f0",fontWeight:700,fontSize:12,color:text}}>Windows 키</span> + <span style={{padding:"3px 10px",borderRadius:5,background:isDark?"rgba(255,255,255,0.1)":"#e2e8f0",fontWeight:700,fontSize:12,color:text}}>R</span> 을 동시에 누르세요.<br/>
                2. 작은 창이 뜨면 <span style={{padding:"3px 10px",borderRadius:5,background:isDark?"rgba(255,255,255,0.1)":"#e2e8f0",fontWeight:700,fontSize:12,color:text}}>cmd</span> 라고 입력하고 Enter를 누르세요.<br/>
                3. 검은 창이 열리면, 아래 명령어를 <b style={{color:text}}>복사</b> 버튼으로 복사하세요.<br/>
                4. 검은 창에서 <b style={{color:text}}>마우스 우클릭</b>하면 자동으로 붙여넣기됩니다.<br/>
                5. Enter를 누르면 설치가 시작됩니다. (1~2분 소요)
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <code style={{ flex:1, padding:"10px 14px", borderRadius:8, background:isDark?"#1a1a2e":"#1e293b", color:"#e2e8f0", fontSize:13, fontFamily:"'Consolas',monospace" }}>pip install playwright requests</code>
                <button onClick={() => navigator.clipboard.writeText("pip install playwright requests")} style={{ padding:"8px 16px", borderRadius:8, border:"none", background:accent, color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer", flexShrink:0 }}>복사</button>
              </div>
            </div>

            {/* STEP 3 */}
            <div style={{ marginBottom:16, padding:"16px 18px", borderRadius:12, background:isDark?"rgba(255,255,255,0.03)":"#fff", border:`1px solid ${border}` }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                <span style={{ width:28, height:28, borderRadius:"50%", background:green, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:900 }}>3</span>
                <span style={{ fontSize:15, fontWeight:800, color:text }}>{t("bg_browserDownload")}</span>
              </div>
              <div style={{ fontSize:13, color:muted, lineHeight:1.8, marginBottom:12 }}>
                같은 검은 창에서 아래 명령어를 복사 → 붙여넣기 → Enter<br/>
                자동화에 사용할 브라우저가 다운로드됩니다. (1~3분 소요)
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <code style={{ flex:1, padding:"10px 14px", borderRadius:8, background:isDark?"#1a1a2e":"#1e293b", color:"#e2e8f0", fontSize:13, fontFamily:"'Consolas',monospace" }}>playwright install chromium</code>
                <button onClick={() => navigator.clipboard.writeText("playwright install chromium")} style={{ padding:"8px 16px", borderRadius:8, border:"none", background:accent, color:"#fff", fontSize:12, fontWeight:700, cursor:"pointer", flexShrink:0 }}>복사</button>
              </div>
            </div>

            {/* 완료/도움 안내 */}
            <div style={{ padding:"14px 16px", borderRadius:10, background:isDark?"rgba(16,185,129,0.06)":"#f0fdf4", border:"1px solid rgba(16,185,129,0.15)", marginBottom:12 }}>
              <div style={{ fontSize:13, fontWeight:700, color:green, marginBottom:4 }}>{t("bg_setupAllDone")}</div>
              <div style={{ fontSize:12, color:muted }}>{t("bg_setupReady")}</div>
            </div>

            <div style={{ padding:"14px 16px", borderRadius:10, background:isDark?"rgba(239,68,68,0.06)":"#fef2f2", border:"1px solid rgba(239,68,68,0.12)" }}>
              <div style={{ fontSize:13, fontWeight:700, color:"#ef4444", marginBottom:6, display:"flex", alignItems:"center", gap:6 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                {t("bg_setupDifficult")}
              </div>
              <div style={{ fontSize:12, color:muted, lineHeight:1.7 }}>
                설치 과정이 어렵거나 오류가 발생하면 <b style={{color:text}}>원격 지원</b>을 요청해주세요.<br/>
                화면을 공유하면서 직접 도와드리겠습니다.
              </div>
              <a href="https://snsmakeit.com/contact" target="_blank" rel="noopener noreferrer"
                style={{ display:"inline-flex", alignItems:"center", gap:6, marginTop:8, padding:"8px 16px", borderRadius:8, background:"#ef4444", color:"#fff", fontSize:12, fontWeight:700, textDecoration:"none" }}>
                {t("bg_remoteSupport")}
              </a>
            </div>
          </div>
        )}
      </div>

      {/* ── 2. 네이버 계정 ── */}
      <div style={{ padding:"18px 20px", borderRadius:14, background:isDark?"rgba(16,185,129,0.05)":"#f7fdf9", border:`1px solid ${green}22`, marginBottom:16 }}>
        <div style={{ fontSize:14, fontWeight:800, color:text, marginBottom:12, display:"flex", alignItems:"center", gap:8 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={green} strokeWidth="2.5" strokeLinecap="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          {t("bg_naverAccountSetting")}
          {loginConfirmed && (
            <button onClick={() => {
              try { localStorage.removeItem("makeit_naver_id"); localStorage.removeItem("makeit_naver_pw"); } catch {}
              setNaverId(""); setNaverPw(""); setLoginConfirmed(false); setLiveSteps([]); setBlogCategories([]); setStatus("idle"); setResultPreview("");
            }}
              style={{ marginLeft:"auto", padding:"4px 12px", borderRadius:6, border:`1px solid #ef4444`, background:"transparent", color:"#ef4444", fontSize:11, fontWeight:600, cursor:"pointer" }}>
              {t("bg_accountRelease")}
            </button>
          )}
        </div>
        <div style={{ display:"flex", gap:8, marginBottom:8 }}>
          <input value={naverId} onChange={e=>setNaverId(e.target.value)} placeholder={t("bg_naverIdPlaceholder")}
            style={{ flex:1, padding:"11px 14px", borderRadius:10, border:`1px solid ${border}`, background:"transparent", color:text, fontSize:13, outline:"none" }} />
          <input value={naverPw} onChange={e=>setNaverPw(e.target.value)} placeholder={t("bg_pwPlaceholder")} type="password"
            style={{ flex:1, padding:"11px 14px", borderRadius:10, border:`1px solid ${border}`, background:"transparent", color:text, fontSize:13, outline:"none" }} />
          <button onClick={saveAccount}
            style={{ padding:"11px 14px", borderRadius:10, border:"none", background: acctSaved ? green : accent, color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap", flexShrink:0, transition:"all 0.2s" }}>
            {acctSaved ? t("bg_saved") : t("save")}
          </button>
          <button onClick={async () => {
            if (!naverId.trim() || !naverPw.trim()) return alert(t("bg_alertIdPw"));
            saveAccount();
            setLoginChecking(true);
            try {
              const r = await fetch("https://shorts-factory-r33o.onrender.com/health");
              const d = await r.json();
              if (d.status === "ok") {
                onLoginSuccess();
                setLiveSteps([{ step: t("bg_serverConnOk"), screenshot: null }]);
              }
            } catch {
              setLiveSteps([{ step: t("bg_serverConnFail"), screenshot: null }]);
            }
            setLoginChecking(false);
          }} disabled={loginChecking}
            style={{ padding:"11px 14px", borderRadius:10, border:`1px solid ${green}`, background:loginChecking?green+"15":"transparent", color:green, fontSize:12, fontWeight:700, cursor:loginChecking?"wait":"pointer", whiteSpace:"nowrap", flexShrink:0 }}>
            {loginChecking ? t("bg_checking") : t("bg_connCheck")}
          </button>
        </div>
        <div style={{ fontSize:11, color:muted }}>{t("bg_connCheckDesc")}</div>
      </div>

      {/* ── 실시간 스크린샷 뷰어 (글 설정 위에) ── */}
      {liveSteps.length > 0 && (
        <div style={{ marginBottom:16, padding:"18px 20px", borderRadius:14, background:cardBg, border:`1px solid ${loginConfirmed ? green+"40" : border}` }}>
          <div style={{ fontSize:14, fontWeight:800, color:text, marginBottom:12, display:"flex", alignItems:"center", gap:8 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={green} strokeWidth="2.5" strokeLinecap="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
            {t("bg_naverAutoProgress")}
            {(loginChecking) && <div style={{ width:12, height:12, borderRadius:"50%", border:"2px solid "+green+"40", borderTopColor:green, animation:"spin 0.8s linear infinite", marginLeft:4 }} />}
            {!loginChecking && !pendingSession && <button onClick={() => { setLiveSteps([]); }} style={{ marginLeft:"auto", background:"none", border:"none", color:muted, fontSize:14, cursor:"pointer" }}>x</button>}
          </div>
          {/* 단계 */}
          <div style={{ display:"flex", flexDirection:"column", gap:4, marginBottom:10 }}>
            {liveSteps.map((s, i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:8, fontSize:12 }}>
                <span style={{ width:16, height:16, borderRadius:"50%", background: i === liveSteps.length-1 ? green : green+"30", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:8, fontWeight:800, flexShrink:0 }}>
                  {i === liveSteps.length-1 && loginChecking ? "..." : "\u2713"}
                </span>
                <span style={{ color: i === liveSteps.length-1 ? text : muted }}>{s.step}</span>
              </div>
            ))}
          </div>
          {/* 스크린샷 (클릭하면 확대) */}
          {liveSteps.filter(s => s.screenshot).length > 0 && (() => {
            const latestShot = liveSteps.filter(s => s.screenshot).slice(-1)[0].screenshot;
            return (
              <div style={{ borderRadius:10, overflow:"hidden", border:`1px solid ${border}`, cursor:"pointer", position:"relative" }}
                onClick={() => setZoomScreenshot(latestShot)}>
                <img src={`data:image/jpeg;base64,${latestShot}`} alt="진행 상황" style={{ width:"100%", display:"block" }} />
                <div style={{ position:"absolute", bottom:8, right:8, padding:"4px 10px", borderRadius:6, background:"rgba(0,0,0,0.6)", color:"#fff", fontSize:11, fontWeight:600 }}>
                  {t("bg_clickToEnlarge")}
                </div>
              </div>
            );
          })()}
          {/* 캡차/2차인증 입력 */}
          {pendingSession && (
            <div style={{ marginTop:12, padding:"14px 16px", borderRadius:10, background:isDark?"rgba(245,158,11,0.08)":"#fffbeb", border:"1px solid rgba(245,158,11,0.2)" }}>
              <div style={{ fontSize:14, fontWeight:700, color:"#d97706", marginBottom:8 }}>{pendingSession.hint}</div>
              <div style={{ fontSize:12, color:muted, marginBottom:8 }}>{t("bg_captchaHint")}</div>
              <div style={{ display:"flex", gap:8 }}>
                <input value={captchaInput} onChange={e => setCaptchaInput(e.target.value)}
                  placeholder={t("bg_captchaInputPlaceholder")}
                  onKeyDown={async e => {
                    if (e.key !== "Enter" || !captchaInput.trim()) return;
                    setLoginChecking(true);
                    try {
                      const r = await fetch("https://shorts-factory-r33o.onrender.com/api/naver-input", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: pendingSession.id, value: captchaInput }) });
                      const d = await r.json();
                      if (d.steps) setLiveSteps(prev => [...prev, ...d.steps]);
                      if (d.loggedIn) { setPendingSession(null); setCaptchaInput(""); onLoginSuccess(); }
                      else if (d.needInput) setPendingSession({ ...pendingSession, hint: t("bg_retryInput") });
                      else setPendingSession(null);
                    } catch {}
                    setLoginChecking(false);
                  }}
                  style={{ flex:1, padding:"12px 16px", borderRadius:8, border:"1.5px solid #d97706", background:"transparent", color:text, fontSize:15, outline:"none" }} />
                <button disabled={loginChecking} onClick={async () => {
                  if (!captchaInput.trim()) return;
                  setLoginChecking(true);
                  try {
                    const r = await fetch("https://shorts-factory-r33o.onrender.com/api/naver-input", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: pendingSession.id, value: captchaInput }) });
                    const d = await r.json();
                    if (d.steps) setLiveSteps(prev => [...prev, ...d.steps]);
                    if (d.loggedIn) { setPendingSession(null); setCaptchaInput(""); onLoginSuccess(); }
                    else if (d.needInput) setPendingSession({ ...pendingSession, hint: "다시 입력해주세요" });
                    else setPendingSession(null);
                  } catch {}
                  setLoginChecking(false);
                }}
                  style={{ padding:"12px 24px", borderRadius:8, border:"none", background:loginChecking?"#92400e":"#d97706", color:"#fff", fontSize:14, fontWeight:700, cursor:loginChecking?"wait":"pointer", flexShrink:0, display:"flex", alignItems:"center", gap:6 }}>
                  {loginChecking ? <><div style={{width:14,height:14,border:"2px solid rgba(255,255,255,0.3)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>{t("bg_inProgress")}</> : t("confirm")}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 로그인 미완료 안내 */}
      {!loginConfirmed && !loginChecking && liveSteps.length === 0 && (
        <div style={{ marginBottom:16, padding:"16px 20px", borderRadius:12, background:isDark?"rgba(245,158,11,0.06)":"#fffbeb", border:"1px solid rgba(245,158,11,0.15)", textAlign:"center" }}>
          <div style={{ fontSize:13, color:"#d97706", fontWeight:600 }}>{t("bg_naverAccountFirst")}</div>
        </div>
      )}

      {/* ── 3. 글 설정 (로그인 완료 후에만 표시) ── */}
      {loginConfirmed && <>
      <div style={{ padding:"18px 20px", borderRadius:14, background:cardBg, border:`1px solid ${border}`, marginBottom:16 }}>
        <div style={{ fontSize:14, fontWeight:800, color:text, marginBottom:14, display:"flex", alignItems:"center", gap:8 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round"><path d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4z"/></svg>
          {t("bg_postSettings")}
        </div>

        {/* 주제 입력 */}
        <input value={kw} onChange={e=>setKw(e.target.value)} placeholder={t("bg_topicPlaceholder")}
          style={{ width:"100%", padding:"14px 16px", borderRadius:12, border:`1.5px solid ${border}`, background:"transparent", color:text, fontSize:15, outline:"none", boxSizing:"border-box", marginBottom:14 }} />

        {/* 칩 설정 */}
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
            <span style={{ fontSize:12, color:muted, fontWeight:600, width:44 }}>{t("bg_chipType")}</span>
            {[{v:"info",l:t("bg_typeInfo")},{v:"visit",l:t("bg_typeVisit")},{v:"review",l:t("bg_typeReview")},{v:"product",l:t("bg_typeProduct")},{v:"column",l:t("bg_typeColumn")}].map(o=>
              <button key={o.v} onClick={()=>setSub(o.v)} style={chip(subtype===o.v, green)}>{o.l}</button>)}
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
            <span style={{ fontSize:12, color:muted, fontWeight:600, width:44 }}>{t("bg_chipTone")}</span>
            {[{v:"friendly",l:t("bg_toneFriendly")},{v:"diary",l:t("bg_toneDiary")},{v:"review",l:t("bg_toneReview")},{v:"professional",l:t("bg_toneProfessional")}].map(o=>
              <button key={o.v} onClick={()=>setTone(o.v)} style={chip(tone===o.v, "#ec4899")}>{o.l}</button>)}
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
            <span style={{ fontSize:12, color:muted, fontWeight:600, width:44 }}>{t("bg_chipSpeech")}</span>
            {[{v:"polite_yo",l:t("bg_speechPolite")},{v:"formal",l:t("bg_speechFormal")},{v:"friendly",l:t("bg_speechFriendly")},{v:"casual",l:t("bg_speechCasual")},{v:"mixed",l:t("bg_speechMixed")}].map(o=>
              <button key={o.v} onClick={()=>setSp(o.v)} style={chip(speech===o.v, accent)}>{o.l}</button>)}
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
            <span style={{ fontSize:12, color:muted, fontWeight:600, width:44 }}>{t("bg_chipVolume")}</span>
            {[{v:"short",l:t("bg_volumeShort")},{v:"medium",l:t("bg_volumeMedium")},{v:"long",l:t("bg_volumeLong")}].map(o=>
              <button key={o.v} onClick={()=>setWc(o.v)} style={chip(wordCount===o.v, "#f59e0b")}>{o.l}</button>)}
          </div>
        </div>

        {/* 추가 요청 */}
        {/* 카테고리 선택 */}
        {blogCategories.length > 0 && (
          <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:12, flexWrap:"wrap" }}>
            <span style={{ fontSize:12, color:muted, fontWeight:600, width:44 }}>{t("bg_categoryLabel")}</span>
            <select value={selectedCategory} onChange={e=>setSelectedCategory(e.target.value)}
              style={{ flex:1, padding:"8px 12px", borderRadius:8, border:`1px solid ${border}`, background:"transparent", color:text, fontSize:12, outline:"none", maxWidth:200 }}>
              <option value="">{t("bg_categoryNone")}</option>
              {blogCategories.map((c,i) => <option key={i} value={c.name}>{c.name}</option>)}
            </select>
          </div>
        )}

        <input value={extra} onChange={e=>setExtra(e.target.value)} placeholder={t("bg_extraPlaceholder")}
          style={{ width:"100%", padding:"10px 14px", borderRadius:10, border:`1px solid ${border}`, background:"transparent", color:text, fontSize:12, outline:"none", boxSizing:"border-box", marginTop:12 }} />
      </div>

      {/* ── 4. 발행 버튼 ── */}
      <button onClick={handleStart} disabled={status==="generating"}
        style={{ width:"100%", padding:"18px", borderRadius:14, border:"none",
          background: status==="generating" ? muted : `linear-gradient(135deg,${green},#059669)`,
          color:"#fff", fontSize:17, fontWeight:800, cursor: status==="generating"?"not-allowed":"pointer",
          display:"flex", alignItems:"center", justifyContent:"center", gap:10, boxShadow: status==="generating" ? "none" : `0 4px 16px rgba(16,185,129,0.3)` }}>
        {status==="generating"
          ? <><div style={{ width:18, height:18, border:"2.5px solid rgba(255,255,255,0.3)", borderTopColor:"#fff", borderRadius:"50%", animation:"spin 0.8s linear infinite" }}/>{t("bg_aiGenInProgress")}</>
          : <><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4"/></svg>{t("bg_aiGenPublish")}</>}
      </button>

      {/* ── 5. 상태 + 결과 미리보기 ── */}
      {status !== "idle" && (
        <div style={{ marginTop:16, padding:"18px 20px", borderRadius:14,
          background: status==="done"?(isDark?"rgba(16,185,129,0.06)":"#f0fdf4"):status==="error"?(isDark?"rgba(239,68,68,0.06)":"#fef2f2"):(isDark?"rgba(255,255,255,0.03)":"#f8fafc"),
          border:`1px solid ${status==="done"?"rgba(16,185,129,0.2)":status==="error"?"rgba(239,68,68,0.2)":border}` }}>
          <div style={{ fontSize:14, fontWeight:700, color: status==="done"?green:status==="error"?"#ef4444":text, marginBottom: status==="done"?10:0, display:"flex", alignItems:"center", gap:8 }}>
            {status==="done" && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={green} strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>}
            {status==="error" && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>}
            {progress}
          </div>
          {status==="done" && (
            <>
              {resultPreview && (
                <div style={{ maxHeight:180, overflow:"auto", padding:"12px 14px", borderRadius:10, background:isDark?"#0f1116":"#fff", border:`1px solid ${border}`, fontSize:12, color:muted, lineHeight:1.7, whiteSpace:"pre-wrap", marginBottom:12 }}>
                  {resultPreview.split("\n").map((line, i) => {
                    const urlMatch = line.match(/(https?:\/\/[^\s]+)/);
                    if (urlMatch) return <div key={i}>{line.replace(urlMatch[0], "")} <a href={urlMatch[0]} target="_blank" rel="noopener noreferrer" style={{color:green, fontWeight:700}}>{urlMatch[0]} &rarr;</a></div>;
                    return <div key={i}>{line}</div>;
                  })}
                </div>
              )}
              <div style={{ display:"flex", gap:8, marginTop:4 }}>
                <button onClick={()=>{ setStatus("idle"); setKw(""); setResultPreview(""); setLiveSteps([]); }} style={{ padding:"10px 20px", borderRadius:10, border:`1.5px solid ${green}`, background:"transparent", color:green, fontSize:13, fontWeight:700, cursor:"pointer" }}>
                  {t("bg_anotherTopic")}
                </button>
                <a href={`https://blog.naver.com/${(naverId||"").replace(/@.*$/,"")}`} target="_blank" rel="noopener noreferrer"
                  style={{ padding:"10px 20px", borderRadius:10, border:"none", background:green, color:"#fff", fontSize:13, fontWeight:700, cursor:"pointer", textDecoration:"none", display:"flex", alignItems:"center", gap:6 }}>
                  {t("bg_checkMyBlog")}
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/></svg>
                </a>
              </div>
            </>
          )}
          {status==="error" && (
            <button onClick={()=>setStatus("idle")} style={{ marginTop:10, padding:"8px 16px", borderRadius:8, border:`1px solid ${border}`, background:"transparent", color:text, fontSize:12, fontWeight:600, cursor:"pointer" }}>
              {t("bg_retryBtn")}
            </button>
          )}
        </div>
      )}
      </>}

      {/* 스크린샷 확대 모달 */}
      {zoomScreenshot && (
        <div onClick={() => setZoomScreenshot(null)}
          style={{ position:"fixed", inset:0, zIndex:9999, background:"rgba(0,0,0,0.85)", display:"flex", alignItems:"center", justifyContent:"center", cursor:"zoom-out", padding:20 }}>
          <img src={`data:image/jpeg;base64,${zoomScreenshot}`} alt="확대 보기"
            style={{ maxWidth:"95vw", maxHeight:"90vh", borderRadius:12, boxShadow:"0 20px 60px rgba(0,0,0,0.5)" }} />
          <div style={{ position:"absolute", top:20, right:20, color:"#fff", fontSize:14, fontWeight:600, background:"rgba(255,255,255,0.15)", padding:"8px 16px", borderRadius:8 }}>
            {t("bg_clickToClose")}
          </div>
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ── .bat 파일 생성 유틸 ──
function generateBatFile(naverId, naverPw, title, body, tags, keyword) {
  const safeTitle = title.replace(/'/g, "\\'");
  const safeBody = body.replace(/'/g, "\\'");
  const safeTags = tags.replace(/'/g, "\\'");
  const bat = `@echo off
chcp 65001 >nul
echo.
echo ============================================
echo   메이킷 SNS 자동화 - 네이버 블로그 발행
echo ============================================
echo.
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [!] Python이 설치되어 있지 않습니다.
    echo.
    echo     1. https://www.python.org/downloads/ 접속
    echo     2. 노란색 Download 버튼 클릭
    echo     3. 설치 시 "Add Python to PATH" 반드시 체크!
    echo     4. 설치 완료 후 이 파일을 다시 실행하세요.
    echo.
    start https://www.python.org/downloads/
    pause
    exit /b
)
python -c "import playwright" >nul 2>nul
if %errorlevel% neq 0 (
    echo [설치] 자동화 도구 설치 중... (최초 1회, 2~3분 소요)
    echo.
    pip install playwright requests
    echo.
    echo [설치] 브라우저 다운로드 중...
    playwright install chromium
    echo.
    echo [설치] 설치 완료!
    echo.
)
python -c "
# -*- coding: utf-8 -*-
from playwright.sync_api import sync_playwright
import time, os, sys
NID='${naverId}'
NPW='${naverPw}'
T='''${safeTitle}'''
B='''${safeBody}'''
TG='''${safeTags}'''
print()
print('[1/5] 브라우저 실행 중...')
pf=os.path.join(os.environ.get('APPDATA',os.path.expanduser('~')),'MakeitBot','profile',NID)
os.makedirs(pf,exist_ok=True)
with sync_playwright() as pw:
    ctx=None
    for ch in [None,'chrome','msedge']:
        try:
            kw=dict(user_data_dir=pf,headless=False,viewport={'width':1280,'height':900},locale='ko-KR',args=['--disable-blink-features=AutomationControlled','--no-sandbox'])
            if ch:kw['channel']=ch
            ctx=pw.chromium.launch_persistent_context(**kw);break
        except:continue
    if not ctx:print('[!] 브라우저 실행 실패');input('Enter...');sys.exit(1)
    pg=ctx.pages[0] if ctx.pages else ctx.new_page()
    print('[2/5] 네이버 로그인 중...')
    pg.goto('https://nid.naver.com/nidlogin.login',wait_until='domcontentloaded');time.sleep(2)
    if 'nidlogin' in pg.url:
        pg.evaluate('''([i,p])=>{const a=document.querySelector('#id');const b=document.querySelector('#pw');if(a){a.value=i;a.dispatchEvent(new Event('input',{bubbles:true}))}if(b){b.value=p;b.dispatchEvent(new Event('input',{bubbles:true}))}}''',[NID,NPW])
        time.sleep(0.5)
        bt=pg.query_selector('.btn_login,button[type=submit]')
        if bt:bt.click()
        for _ in range(20):
            time.sleep(1)
            if 'nidlogin' not in pg.url:print('       로그인 성공!');break
        else:print('  [!] 브라우저에서 직접 로그인해주세요.');input('  로그인 후 Enter...')
    print('[3/5] 글쓰기 페이지 열기...')
    pg.goto(f'https://blog.naver.com/{NID}/postwrite',wait_until='domcontentloaded');time.sleep(4)
    try:pg.evaluate('''()=>{document.querySelectorAll('.se-popup-button-cancel,.se-popup-alert button').forEach(b=>{try{b.click()}catch(e){}});document.querySelectorAll('.se-popup,.se-popup-dim').forEach(el=>{try{el.remove()}catch(e){}})}''')
    except:pass
    time.sleep(1)
    print('[4/5] 글 작성 중...')
    te=pg.query_selector('.se-documentTitle .se-text-paragraph')
    if te:te.click();time.sleep(0.3);pg.keyboard.type(T,delay=20)
    pg.keyboard.press('Enter');time.sleep(0.5)
    for p in B.split('\\n\\n'):
        p=p.strip()
        if not p:continue
        pg.keyboard.type(p,delay=3);pg.keyboard.press('Enter');pg.keyboard.press('Enter');time.sleep(0.05)
    print('[5/5] 태그 입력 중...')
    try:
        ta=pg.query_selector('.se-tag-label,button[class*=tag],.se-section-tag')
        if ta:
            ta.click();time.sleep(0.5)
            for tg in TG.split(','):
                tg=tg.strip().replace('#','')
                if tg:
                    ti=pg.query_selector('.se-tag-input input,input[placeholder*=태그]')
                    if ti:ti.fill(tg);pg.keyboard.press('Enter');time.sleep(0.2)
    except:pass
    print()
    print('============================================')
    print('  글 작성 완료! 발행 버튼만 클릭하세요.')
    print('============================================')
    input('  브라우저를 닫으려면 Enter...')
    ctx.close()
"
pause`;
  const blob = new Blob([bat], { type: "application/x-bat" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `메이킷_자동발행.bat`;
  a.click();
  URL.revokeObjectURL(url);
}

import LoadingAnimation from "./LoadingAnimation";
import KeywordInsightPanel from "./KeywordInsightPanel";
import { cleanBlogText, mdToHtml, renderMarkdown, inlineFormat, PLATFORMS, PointsExhausted, FIELD_LABELS, SPEECH_STYLES } from "./BlogUtils.jsx";

export default function BlogGenerator({ initialType, embedded, menuLabel, theme, user, onLoginRequest, onUserUpdate, showPointConfirm, setAiMenu, initialVideoMode }) {
  // SNS 플랫폼 드롭다운 (폼 내에서 선택)
  const SNS_OPTIONS = [
    { id: "blog_naver", label: "네이버 블로그", icon: "/icon-naver-blog.png", color: "#03C75A" },
    { id: "blog_cafe", label: "네이버 카페", icon: "/icon-naver-cafe.webp", color: "#03C75A" },
    { id: "blog_tistory", label: "티스토리", icon: "/icon-tistory.png", color: "#FF6B35" },
    { id: "blog_insta", label: "인스타그램", icon: "/icon-instagram.webp", color: "#E1306C" },
    { id: "blog_thread", label: "스레드", icon: "/icon-threads.png", color: "#000000" },
    { id: "blog_youtube", label: "유튜브", icon: "/icon-youtube.png", color: "#FF0000" },
    { id: "blog_x", label: "X (Twitter)", color: "#000000", svg: <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg> },
    { id: "blog_facebook", label: "페이스북", color: "#1877F2", svg: <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg> },
    { id: "blog_linkedin", label: "LinkedIn", color: "#0A66C2", svg: <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg> },
    { id: "blog_medium", label: "Medium", color: "#000000", svg: <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M13.54 12a6.8 6.8 0 01-6.77 6.82A6.8 6.8 0 010 12a6.8 6.8 0 016.77-6.82A6.8 6.8 0 0113.54 12zM20.96 12c0 3.54-1.51 6.42-3.38 6.42-1.87 0-3.39-2.88-3.39-6.42s1.52-6.42 3.39-6.42 3.38 2.88 3.38 6.42M24 12c0 3.17-.53 5.75-1.19 5.75-.66 0-1.19-2.58-1.19-5.75s.53-5.75 1.19-5.75C23.47 6.25 24 8.83 24 12z"/></svg> },
    { id: "blog_reddit", label: "Reddit", color: "#FF4500", svg: <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 01-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 01.042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 014.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 01.14-.197.35.35 0 01.238-.042l2.906.617a1.214 1.214 0 011.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 00-.231.094.33.33 0 000 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 000-.462.342.342 0 00-.462 0c-.545.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 00-.205-.095z"/></svg> },
    { id: "blog_pinterest", label: "Pinterest", color: "#E60023", svg: <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 01.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12.017 24c6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641 0 12.017 0z"/></svg> },
    { id: "blog_tiktok", label: "TikTok", color: "#010101", svg: <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg> },
    { id: "blog_brunch", label: "브런치", color: "#333333", svg: <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M6.5 3C4.015 3 2 5.015 2 7.5c0 1.556.79 2.93 1.99 3.74L2 22l4.5-3 4.5 3-1.99-10.76A4.49 4.49 0 0011 7.5C11 5.015 8.985 3 6.5 3zm11 0C15.015 3 13 5.015 13 7.5c0 1.556.79 2.93 1.99 3.74L13 22l4.5-3 4.5 3-1.99-10.76A4.49 4.49 0 0022 7.5C22 5.015 19.985 3 17.5 3z"/></svg> },
    { id: "blog_wordpress", label: "WordPress", color: "#21759B", svg: <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M21.469 6.825c.84 1.537 1.318 3.3 1.318 5.175 0 3.979-2.156 7.456-5.363 9.325l3.295-9.527c.615-1.539.82-2.771.82-3.864 0-.397-.026-.766-.07-1.109m-7.981.105c.647-.034 1.233-.1 1.233-.1.58-.068.512-.921-.068-.889 0 0-1.744.137-2.87.137-1.057 0-2.834-.137-2.834-.137-.58-.032-.648.855-.068.889 0 0 .555.066 1.133.1l1.683 4.613-2.366 7.088L5.643 6.93c.649-.034 1.234-.1 1.234-.1.58-.068.511-.921-.069-.889 0 0-1.744.137-2.869.137-.202 0-.44-.005-.693-.014A10.864 10.864 0 0112 2.18c2.928 0 5.594 1.17 7.488 3.056M1.213 12c0-1.792.441-3.48 1.22-4.963l3.362 9.213A10.876 10.876 0 011.213 12m5.498 10.597l2.834-8.228 2.903 7.95c.019.046.04.09.063.132a10.855 10.855 0 01-5.8.146M12 22.055C6.465 22.055 1.946 17.535 1.946 12 1.946 6.465 6.465 1.946 12 1.946S22.055 6.465 22.055 12c0 5.535-4.52 10.055-10.055 10.055M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0"/></svg> },
    { id: "blog_substack", label: "Substack", color: "#FF6719", svg: <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M22.539 8.242H1.46V5.406h21.08v2.836zM1.46 10.812V24L12 18.11 22.54 24V10.812H1.46zM22.54 0H1.46v2.836h21.08V0z"/></svg> },
    { id: "blog_bluesky", label: "Bluesky", color: "#0085FF", svg: <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M12 10.8c-1.087-2.114-4.046-6.053-6.798-7.995C2.566.944 1.561 1.266.902 1.565.139 1.908 0 3.08 0 3.768c0 .69.378 5.65.624 6.479.785 2.627 3.6 3.476 6.172 3.158-3.753.555-6.696 2.118-3.941 6.816 3.27 4.482 5.862-1.133 6.87-3.785.147-.387.22-.58.275-.58.055 0 .128.193.276.58 1.006 2.652 3.599 8.268 6.869 3.785 2.755-4.698-.188-6.26-3.941-6.816 2.572.318 5.387-.531 6.172-3.158C19.622 9.418 20 4.458 20 3.768c0-.69-.139-1.861-.902-2.203-.659-.299-1.664-.621-4.3 1.24C12.046 4.747 9.087 8.686 8 10.8h4z"/></svg> },
    { id: "blog_quora", label: "Quora", color: "#B92B27", svg: <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M12.738 17.5c-.87-1.743-1.91-3.266-3.742-3.266-.476 0-.946.125-1.178.362l-.777-1.524c.709-.636 1.755-1.004 2.937-1.004 2.393 0 3.802 1.364 4.85 3.134.396-1.023.6-2.285.6-3.827 0-5.283-2.005-8.625-5.428-8.625-3.414 0-5.426 3.342-5.426 8.625 0 5.25 2.012 8.541 5.426 8.541.896 0 1.696-.209 2.388-.588l.35.172zM10 24c5.523 0 10-4.477 10-10S15.523 4 10 4 0 8.477 0 14s4.477 10 10 10zm0-2c-4.418 0-8-3.582-8-8s3.582-8 8-8 8 3.582 8 8-3.582 8-8 8z"/></svg> },
    { id: "blog_tumblr", label: "Tumblr", color: "#36465D", svg: <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M14.563 24c-5.093 0-7.031-3.756-7.031-6.411V9.747H5.116V6.648c3.63-1.313 4.512-4.596 4.71-6.469C9.84.109 9.849 0 9.974 0h3.887v6.15h4.005v3.597h-4.022v7.377c.011 1.143.427 2.716 2.591 2.716h.098c.74-.016 1.733-.258 2.251-.454L20 23.076s-1.665.775-4.599.921h-.838z"/></svg> },
  ];
  const [platformId, setPlatformId] = useState(initialType || "blog_naver");
  const [snsCat, setSnsCat] = useState("all");
  const cfg = PLATFORMS[platformId] || PLATFORMS.blog_naver;
  const isDark = isDarkTheme(theme) || (!theme && !!embedded);
  const { t } = useI18n();

  const [subtype,    setSubtype]    = useState(cfg.subtypes[0].id);
  // fields는 sessionStorage에서 lazy init — _ssFieldsKey는 아래에 정의되므로 직접 키 문자열 사용
  const [fields,     setFields]     = useState(() => {
    try { return JSON.parse(sessionStorage.getItem("_bg_fields_" + (initialType || "blog")) || "{}"); } catch { return {}; }
  });
  const [tone,       setTone]       = useState(cfg.tones[0].id);
  const [speechStyle, setSpeechStyle] = useState("polite_yo");
  const [wordCount,  setWordCount]  = useState(cfg.wordCounts[1]?.id || cfg.wordCounts[0].id);
  // 플랫폼 변경 시 설정 리셋
  useEffect(() => {
    const newCfg = PLATFORMS[platformId] || PLATFORMS.blog_naver;
    setSubtype(newCfg.subtypes[0].id);
    setTone(newCfg.tones[0].id);
    setWordCount(newCfg.wordCounts[1]?.id || newCfg.wordCounts[0].id);
    setFields({});
  }, [platformId]);
  // ── remount 복원: 부모 리렌더로 unmount/remount 시 전체 상태 유지 ──
  const _ssKey = useRef("_bg_res_" + (initialType || "blog")).current;
  const _ssLoadKey = useRef("_bg_loading_" + (initialType || "blog")).current;
  const [result, setResult_raw] = useState(() => {
    try { return sessionStorage.getItem(_ssKey) || ""; } catch(e) { return ""; }
  });
  const setResult = (v) => {
    setResult_raw(v);
    try { if (v && v.length > 10) sessionStorage.setItem(_ssKey, v); } catch(e) {}
  };
  // unmount 시: sessionStorage 유지 (다른 메뉴 갔다 돌아와도 결과 보존)
  const loadingForCleanup = useRef(false);
  useEffect(() => {
    return () => {
      // sessionStorage 삭제하지 않음 — 결과 보존
    };
  }, []);
  const [htmlResult, setHtmlResult] = useState("");
  const [viewMode,   setViewMode]   = useState("text");
  // loading은 항상 false로 시작 (sessionStorage 복원 안 함 — 메뉴 이동 시 깨짐 방지)
  const [loading, setLoading_raw] = useState(false);
  const setLoading = (v) => {
    setLoading_raw(v);
    try { if (v) sessionStorage.setItem(_ssLoadKey, "1"); else sessionStorage.removeItem(_ssLoadKey); } catch {}
  };
  useGeneratingGuard(loading, 10, initialType || "blog_write"); // 생성 중 이탈 방지
  const [copied,     setCopied]     = useState(false);
  const [copyLoading, setCopyLoading] = useState(false);
  const [snsConns,setSnsConns]=useState([]);const [publishing,setPublishing]=useState(null);const [publishResult,setPublishResult]=useState(null);const [showSchedule,setShowSchedule]=useState(false);const [scheduleTime,setScheduleTime]=useState("");
  const [showAutoPublish, setShowAutoPublish] = useState(false);
  const [error,      setError]      = useState("");
  const [titleSugg,  setTitleSugg]  = useState([]);
  const [seoKeys,    setSeoKeys]    = useState([]);
  const [titleLoading, setTitleLoading] = useState(false);
  const [seoLoading,   setSeoLoading]   = useState(false);
  const [urlInput,   setUrlInput]   = useState("");
  const [urlLoading, setUrlLoading] = useState(false);
  const [urlResult,  setUrlResult]  = useState(null);
  const [suggestedImages, setSuggestedImages] = useState([]);
  const [imgSearching,    setImgSearching]    = useState(false);
  const [imgCopied,       setImgCopied]       = useState(null);
  const [imgInput,        setImgInput]        = useState("");
  const [inlineImages,    setInlineImages]    = useState({}); // { "키워드": imageUrl }
  const [aiImgLoading,    setAiImgLoading]    = useState(false);
  const [aiImgUrl,        setAiImgUrl]        = useState(null);
  const [showPhotoSearch, setShowPhotoSearch] = useState(false);
  const [photoSearchQuery, setPhotoSearchQuery] = useState("");
  const [photoSearchResults, setPhotoSearchResults] = useState([]);
  const [photoSearching, setPhotoSearching] = useState(false);
  const [showSectionMenu, setShowSectionMenu] = useState(null); // 섹션 AI 재작업 메뉴
  const [sectionReplacing, setSectionReplacing] = useState(null); // {index, label} 섹션 AI 변환 중
  const [showPromptInput, setShowPromptInput] = useState(false); // 상단 전체 프롬프트 수정
  const [promptText, setPromptText] = useState("");
  const [promptLoading, setPromptLoading] = useState(false);
  const [sectionPrompt, setSectionPrompt] = useState(null); // {index} 섹션별 프롬프트 입력
  // AI 이미지 생성
  const handleAiImage = async () => {
    if (!result || aiImgLoading) return;
    setAiImgLoading(true); setAiImgUrl(null);
    try {
      const topic = fields?.keyword || fields?.topic || result.split("\n")[0]?.replace(/^#+\s*/, "").slice(0, 50) || "블로그 대표 이미지";
      const prompt = `${topic} - 블로그/SNS 대표 이미지, 깔끔하고 모던한 디자인, 고품질, 텍스트 없이 이미지만`;
      const r = await fetch("/api/image?action=generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, aspectRatio: "16:9" }),
      });
      const d = await r.json();
      if (d.imageUrl || d.url) {
        setAiImgUrl(d.imageUrl || d.url);
      } else if (d.base64) {
        setAiImgUrl(`data:image/png;base64,${d.base64}`);
      } else {
        alert(t("bg_imgGenFailAlert"));
      }
    } catch (e) { alert(t("bg_imgGenFailAlert") + ": " + e.message); }
    setAiImgLoading(false);
  };

  // ── 무료 사진 인라인 검색 ──
  const searchFreePhotos = async (q) => {
    if (!q?.trim()) return;
    setPhotoSearching(true);
    setPhotoSearchResults([]);
    try {
      // Pixabay 직접 호출 (CORS 허용, lang=ko로 한국어 검색 지원)
      const r = await fetch(`https://pixabay.com/api/?key=44421803-926acb8f55c34beaafae6de8a&q=${encodeURIComponent(q)}&image_type=photo&per_page=18&lang=ko&safesearch=true&orientation=horizontal`);
      const d = await r.json();
      if (d.hits?.length) {
        setPhotoSearchResults(d.hits.map(h => ({ url: h.largeImageURL || h.webformatURL, preview: h.webformatURL, alt: h.tags || q })));
      }
    } catch {}
    setPhotoSearching(false);
  };

  const abortRef = useRef(false);
  const handleCancelGenerate = () => {
    abortRef.current = true;
    setLoading(false);
    setGenStep(0);
  };

  // ── 세부 설정 상태 ──
  // ── 모드 상태 (write / image) ── 쇼츠는 유튜브 URL 감지 시 자동 제안
  const [mode, setMode] = useState("write");
  const [imageResult, setImageResult] = useState(null);
  const [imageStyle, setImageStyle] = useState("realistic");
  const [imageAspect, setImageAspect] = useState("1:1");
  const [shortsMode, setShortsMode] = useState(!!initialVideoMode || false); // 영상 모드 (선택 화면 표시)
  const [videoSubMode, setVideoSubMode] = useState(initialVideoMode || null); // null(선택) | "shortform" | "longform"
  const [shortsYtUrl, setShortsYtUrl] = useState("");

  // ── 디자인(카드뉴스) 모드 상태 ──
  const [designSlides, setDesignSlides] = useState(null); // AI 생성된 슬라이드 배열
  const [designLoading, setDesignLoading] = useState(false);
  const [showLibraryPicker, setShowLibraryPicker] = useState(false);
  const [designStep, setDesignStep] = useState("input"); // "input" | "preview" | "editor"
  const UnifiedCanvasEditorLazy = React.lazy(() => import("./UnifiedCanvasEditor"));

  const [showAdvanced, setShowAdvanced] = useState(true);
  const [advTone,      setAdvTone]      = useState(""); // 글 분위기
  const [advAudience,  setAdvAudience]  = useState(""); // 대상 독자
  const [advWordCount, setAdvWordCount] = useState(2000); // 원하는 분량
  const [advExtra,     setAdvExtra]     = useState(""); // 추가 지시사항

  // ── 진행 단계 상태 (Mirra-style) ──
  const _ssStepKey = useRef("_bg_step_" + (initialType || "blog")).current;
  const _ssStartTimeKey = useRef("_bg_startTime_" + (initialType || "blog")).current;
  const _ssSavedFullKey = useRef("_bg_savedFull_" + (initialType || "blog")).current;
  const [genStep, setGenStep_raw] = useState(() => {
    try {
      const v = parseInt(sessionStorage.getItem(_ssStepKey) || "0");
      // 5(완료)이고 result가 있으면 유지, 아니면 0으로 리셋
      if (v === 5) {
        const hasResult = sessionStorage.getItem("_bg_res_" + (initialType || "blog"));
        return (hasResult && hasResult.length > 50) ? 5 : 0;
      }
      return 0; // 1~4(생성중)는 복원하지 않음 — 스트리밍 끊어진 상태이므로
    } catch { return 0; }
  });
  const setGenStep = (v) => {
    setGenStep_raw(v);
    try { if (v > 0) sessionStorage.setItem(_ssStepKey, String(v)); else sessionStorage.removeItem(_ssStepKey); } catch {}
  };
  const genStartTimeRef = useRef((() => {
    try { return parseInt(sessionStorage.getItem(_ssStartTimeKey) || "0") || 0; } catch { return 0; }
  })());

  // ── 탭 전환 대응: elapsed-time 기반 step progression ──
  useEffect(() => {
    if (!loading) return;
    const stepThresholds = [
      { step: 2, ms: 2000 },
      { step: 3, ms: 5000 },
      { step: 4, ms: 9000 },
    ];
    const interval = setInterval(() => {
      const startTime = genStartTimeRef.current;
      if (!startTime) return;
      const elapsed = Date.now() - startTime;
      for (let i = stepThresholds.length - 1; i >= 0; i--) {
        if (elapsed >= stepThresholds[i].ms) {
          const targetStep = stepThresholds[i].step;
          setGenStep_raw(prev => {
            const next = Math.max(prev, targetStep);
            try { if (next > 0) sessionStorage.setItem(_ssStepKey, String(next)); } catch {}
            return next;
          });
          break;
        }
      }
    }, 500);
    return () => clearInterval(interval);
  }, [loading]);

  // ── loading ref (visibilitychange에서 최신 값 참조) ──
  const loadingRef = useRef(loading);
  loadingRef.current = loading;
  loadingForCleanup.current = loading;

  // ── 탭 복귀 시 visibilitychange 감지 → 상태 복원 ──
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState !== "visible") return;
      try {
        const wasLoading = sessionStorage.getItem(_ssLoadKey) === "1";
        const savedFull = sessionStorage.getItem(_ssSavedFullKey) || "";
        const savedResult = sessionStorage.getItem(_ssKey) || "";
        const curLoading = loadingRef.current;

        // 생성이 진행 중이었는데 loading state가 꺼져 있다면 (스트리밍 끊김)
        if (wasLoading && !curLoading) {
          if (savedResult && savedResult.length > 50) {
            setResult(savedResult);
            setGenStep(5);
            setLoading(false);
            return;
          }
          if (savedFull && savedFull.length > 50) {
            setResult(cleanBlogText(savedFull));
            setGenStep(5);
            setLoading(false);
            return;
          }
        }

        // loading 중이면 step을 elapsed time 기반으로 보정
        if (curLoading) {
          const startTime = genStartTimeRef.current;
          if (startTime) {
            const elapsed = Date.now() - startTime;
            let correctStep = 1;
            if (elapsed >= 9000) correctStep = 4;
            else if (elapsed >= 5000) correctStep = 3;
            else if (elapsed >= 2000) correctStep = 2;
            setGenStep_raw(prev => {
              const next = Math.max(prev, correctStep);
              try { if (next > 0) sessionStorage.setItem(_ssStepKey, String(next)); } catch {}
              return next;
            });
          }
        }
      } catch(e) {}
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  useEffect(()=>{if(user?.uid)fetch(`/api/sns-connections?uid=${user.uid}`).then(r=>r.json()).then(d=>setSnsConns(d.connections||[])).catch(()=>{});},[user?.uid]);
  const handlePublish=async(platform,scheduledTime)=>{if(!user?.uid||!result)return;setPublishing(platform);setPublishResult(null);try{const tags=result.match(/#[\wㄱ-ㅎ가-힣]+/g)?.join(",")||"";const body={uid:user.uid,platform,title:fields.keyword||"",content:result,tags};if(scheduledTime)body.scheduledTime=scheduledTime;const r=await fetch("/api/sns-publish",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});const data=await r.json();setPublishResult({platform,...data});if(scheduledTime&&data.success)setShowSchedule(false);}catch(e){setPublishResult({platform,success:false,error:e.message});}setPublishing(null);};
  // 숏폼 연계 데이터 자동 입력
  useEffect(() => {
    try {
      const raw = localStorage.getItem('shorts_linked_data');
      if (raw) {
        const linked = JSON.parse(raw);
        if (linked.title || linked.content) {
          setFields(prev => ({ ...prev, keyword: linked.title || prev.keyword || "" }));
          if (linked.content) {
            setUrlResult({ title: linked.title || "", content: linked.content, type: "shorts" });
          }
          localStorage.removeItem('shorts_linked_data');
        }
      }
    } catch(e) {}
  }, []);

  // 모드 전환 시 에러/결과 초기화
  useEffect(() => {
    setError("");
    if (mode !== "write") { setResult(""); setHtmlResult(""); }
    if (mode !== "image") { setImageResult(null); }
  }, [mode]);

  // 트렌드 키워드에서 진입 시 키워드 자동 입력
  useEffect(() => {
    try {
      const trendKw = sessionStorage.getItem('nper_trend_keyword');
      if (trendKw) {
        setFields(prev => ({ ...prev, keyword: trendKw }));
        sessionStorage.removeItem('nper_trend_keyword');
      }
    } catch(e) {}
  }, []);

  // 이탈 방지
  useEffect(() => {
    const handler = (e) => {
      if (loading) { e.preventDefault(); e.returnValue = ""; }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [loading]);

  // 다시 생성하기 확인
  // ── sessionStorage 키 ──
  const _ssFieldsKey = useRef("_bg_fields_" + (initialType || "blog")).current;
  const _ssPlatformKey = useRef("_bg_platform_" + (initialType || "blog")).current;
  const _ssSubtypeKey = useRef("_bg_subtype_" + (initialType || "blog")).current;
  const _ssUrlInputKey = useRef("_bg_urlInput_" + (initialType || "blog")).current;

  const [showRegenConfirm, setShowRegenConfirm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const dragCounter = useRef(0);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const textareaRef = useRef(null);
  // 크레딧/횟수 상태 (렌더 시 체크)
  const _getUsageState = () => {
    const _u = (() => { try { return JSON.parse(localStorage.getItem("nper_ai_usage") || "{}"); } catch(e) { return {}; } })();
    const _k = user ? ("member_" + (user.uid || "u")) : "guest";
    const _used = _u[_k] || 0;
    const _lim = user ? 0 : 5; // 회원: 무료 횟수 없음
    const _pts = user ? (user.points || 0) : 0;
    const isGuest = !user;
    // 비회원: 5회 초과 시 차단 / 회원: 포인트 부족 시 차단
    const exhausted = isGuest ? (_used >= _lim) : (_pts < 30);
    return { used: _used, limit: _lim, points: _pts, exhausted, isGuest };
  };
  // ── 카드뉴스 생성 함수 ──
  const generateCardNews = async () => {
    const content = (fields.keyword || "").trim();
    if (!content) return;
    // 포인트/횟수 체크
    const usage = _getUsageState();
    if (usage.exhausted) {
      setError(usage.isGuest ? "무료 횟수를 모두 사용했습니다. 로그인 후 이용해주세요." : "포인트가 부족합니다. 충전 후 이용해주세요.");
      return;
    }
    if (user && showPointConfirm) {
      const ok = await showPointConfirm(30);
      if (!ok) return;
    }
    setDesignLoading(true); setDesignSlides(null); setDesignStep("input"); setError("");
    try {
      const sysMsg = `인스타그램 카드뉴스 전문 카피라이터.
주어진 글 내용을 분석하여 핵심 메시지를 추출하고 카드뉴스 슬라이드로 재구성하세요.
내용 길이와 핵심 포인트 수에 따라 적절한 슬라이드 수(4~10장)를 자동으로 결정하세요.
첫 번째 슬라이드는 눈길을 끄는 표지(커버)로 만드세요.
마지막 슬라이드는 핵심 요약 또는 CTA(행동 유도)로 마무리하세요.
각 슬라이드의 title은 짧고 임팩트 있게 (15자 이내), body는 핵심만 2-3줄로 작성하세요.
반드시 JSON만 반환하세요.
형식:{"slides":[{"title":"제목","subtitle":"부제목","body":"본문 (2-3줄)","highlight":"핵심문구"}]}`;
      const userMsg = `다음 내용을 카드뉴스로 만들어줘 (슬라이드 수는 내용에 맞게 자동 결정):\n\n${content.slice(0, 6000)}`;
      const text = await callAI("claude-haiku-4-5", [{role:"user",content:userMsg}], 4000, sysMsg);
      if (!text) throw new Error("AI 응답 없음");
      const clean = text.replace(/```json\s*/g,"").replace(/```\s*/g,"").trim();
      const parsed = JSON.parse(clean);
      const slides = (parsed.slides || []).map(s => ({
        title: s.title || "",
        subtitle: s.subtitle || "",
        body: s.body || "",
        highlight: s.highlight || "",
        bgColor: "#1c1c1e",
        textColor: "#ffffff",
        fontSize: 42,
        fontFamily: "Pretendard",
      }));
      setDesignSlides(slides);
      setDesignStep("preview");
      // 포인트 차감
      if (user && user.uid) {
        const { changePoints: cp, setLocalUser } = await import("./storage.js");
        const newPts = await cp(user.uid, -30, "카드뉴스 생성");
        const newUser = { ...user, points: newPts };
        setLocalUser(newUser);
        if (onUserUpdate) onUserUpdate(newUser);
      } else {
        incrementGuestUsage();
      }
    } catch (e) {
      setError("카드뉴스 생성 오류: " + (e.message || e));
    } finally {
      setDesignLoading(false);
    }
  };

  const handleGenerateClick = () => {
    if (mode === "write") {
      if (result && !loading) {
        setShowRegenConfirm(true);
      } else {
        generate();
      }
    } else if (mode === "image") {
      generateImage();
    } else if (mode === "design") {
      generateCardNews();
    }
  };

  const handleSubtype = id => { setSubtype(id); setFields({}); setResult(""); setHtmlResult(""); setError(""); };
  const setField = (k,v) => setFields(p => {
    const next = {...p, [k]: v};
    try { sessionStorage.setItem(_ssFieldsKey, JSON.stringify(next)); } catch {}
    return next;
  });
  const currentFields = cfg.fields[subtype] || ["keyword","extra"];
  const examples = cfg.examples?.[subtype] || [];
  const isTistory = initialType === "blog_tistory";
  const accentRaw = cfg.accentColor || "#7c6aff";

  // ── 테마 변수 ──
  const text    = isDark ? "#fff"                      : "#1a1a2e";
  const muted   = isDark ? "rgba(255,255,255,0.45)"    : "#6c757d";
  const border  = isDark ? "rgba(255,255,255,0.10)"    : "#e9ecef";
  const accent  = isDark ? "#a5b4fc"                   : "#4f46e5";
  const accentBg= isDark ? "rgba(99,102,241,0.25)"     : "#f0f0ff";
  const inputBg = isDark ? "rgba(255,255,255,0.06)"    : "#fff";
  const inputBdr= isDark ? "rgba(255,255,255,0.15)"    : "#e9ecef";
  const cardBg  = isDark ? "rgba(255,255,255,0.04)"    : "#fff";
  const panelBg = isDark ? "rgba(0,0,0,0.30)"          : "#fff";
  const resultBg= isDark ? "rgba(0,0,0,0.15)"          : "#f8f9fa";
  const headerBg= isDark ? "rgba(0,0,0,0.20)"          : "#fff";

  const IS = {width:"100%", padding:"11px 14px", borderRadius:12, border:`1.5px solid ${inputBdr}`, background:inputBg, color:text, fontSize:13, fontFamily:"inherit", outline:"none", boxSizing:"border-box"};

  const fetchFromUrl = async () => {
    if (!urlInput.trim()) return;
    setUrlLoading(true); setUrlResult(null);
    try {
      const r = await fetch(`/api/fetch-url-content?url=${encodeURIComponent(urlInput.trim())}`);
      const data = await r.json();
      if (data.error) { alert(data.error); setUrlLoading(false); return; }
      setUrlResult(data);
      setShowLinkInput(false);
      // keyword = title, extra = description + content
      if (data.title) setField("keyword", data.title.slice(0, 80));
      const desc = [data.description, data.content].filter(Boolean).join(" ").slice(0, 200);
      if (desc) setField("extra", (fields.extra ? fields.extra + "\n" : "") + t("bg_referenceContent") + desc);
    } catch(e) { alert(t("bg_urlFetchFail") + e.message); }
    setUrlLoading(false);
  };

  const suggestTitle = async (kw) => {
    const keyword = kw || fields.keyword;
    if (!keyword || !keyword.trim()) { return; }
    setTitleLoading(true);
    try {
      const txt = await callAI("claude-haiku-4-5", [{role:"user",content:`키워드: ${keyword}\n이 키워드로 블로그/SNS에 올릴 매력적인 제목 5개만 번호 목록으로 답하세요. 클릭하고 싶은 제목으로.`}], 500);
      const ls = txt.split("\n").map(function(l){return l.replace(/^\d+\.?\s*/,"").trim();}).filter(function(l){return l.length>2;}).slice(0,5);
      setTitleSugg(ls);
    } catch(e) {}
    finally { setTitleLoading(false); }
  };

  // 키워드 입력 후 1.5초 뒤 자동으로 제목 추천
  const titleTimerRef = useRef(null);
  useEffect(() => {
    if (titleTimerRef.current) clearTimeout(titleTimerRef.current);
    if (fields.keyword && fields.keyword.trim().length >= 2 && mode === "write") {
      titleTimerRef.current = setTimeout(() => suggestTitle(fields.keyword), 1500);
    } else {
      setTitleSugg([]);
    }
    return () => { if (titleTimerRef.current) clearTimeout(titleTimerRef.current); };
  }, [fields.keyword]);

  const generate = async () => {
    // 주제 자동 폴백: URL 결과가 있으면 title, 파일이 있으면 첫 파일명
    if (!fields.keyword?.trim()) {
      if (urlResult?.title) {
        setField("keyword", urlResult.title.slice(0, 80));
        fields.keyword = urlResult.title.slice(0, 80);
      } else if (fields._files?.length) {
        const fallback = fields._files[0].name?.replace(/\.[^.]+$/, "").slice(0, 60) || "";
        setField("keyword", fallback);
        fields.keyword = fallback;
      } else {
        setError(t("bg_topicRequired")); return;
      }
    }
    if (!user && guestLimitExceeded()) return;
    if (!user) incrementGuestUsage(); // 비회원: 즉시 사용 횟수 차감
    // 비회원: 5회 무료 제한 / 회원: 항상 30P 차감 (무료 횟수 없음)
    const _aiUsage = (() => { try { return JSON.parse(localStorage.getItem("nper_ai_usage") || "{}"); } catch(e) { return {}; } })();
    const _aiKey = user ? ("member_" + (user.uid || "u")) : "guest";
    const _aiUsed = _aiUsage[_aiKey] || 0;
    const _aiPoints = user ? (user.points || 0) : 0;
    // 회원: 포인트 부족 시 차단
    if (user && _aiPoints < 30) {
      setError(t("bg_pointsLow"));
      return;
    }
    // 회원: 포인트 차감 확인
    if (showPointConfirm && user && !(await showPointConfirm(30))) return;
    setError(""); setLoading(true); setResult_raw(""); try{sessionStorage.removeItem(_ssKey);sessionStorage.removeItem(_ssSavedFullKey);}catch(e){} setHtmlResult(""); setCopied(false);
    abortRef.current = false;
    // elapsed-time 기반 step progression을 위해 시작 시각 기록
    const _startTime = Date.now();
    genStartTimeRef.current = _startTime;
    try { sessionStorage.setItem(_ssStartTimeKey, String(_startTime)); } catch {}
    setGenStep(1); // 자료 조사
    // 백그라운드 작업 표시기 등록 (메뉴 이동 시 진행 상태 표시)
    window.dispatchEvent(new CustomEvent("bgTaskUpdate", { detail: { action: "register", task: { id: "blog_gen_" + (initialType || "blog"), type: initialType || "blog_write", message: t("bg_taskWriting") } } }));

    // 회원: 항상 30P 즉시 차감
    if (user && user.uid) {
      changePoints(user.uid, -30, "블로그 글 생성").then(newPts => {
        if (onUserUpdate) onUserUpdate({...user, points: newPts});
      }).catch(()=>{});
    }

    // step progression은 useEffect의 interval이 elapsed time 기반으로 처리함 (setTimeout 미사용)

    // 세부 설정을 프롬프트에 반영
    let advPromptExtra = "";
    if (advTone) advPromptExtra += `\n[글 분위기] ${advTone}`;
    if (advAudience) advPromptExtra += `\n[대상 독자] ${advAudience}`;
    if (advWordCount !== 2000) advPromptExtra += `\n[원하는 분량] 약 ${advWordCount}자`;
    if (advExtra) advPromptExtra += `\n[추가 지시사항] ${advExtra}`;

    const basePrompt = cfg.buildPrompt(subtype, fields, tone, wordCount, speechStyle);
    const prompt = advPromptExtra ? basePrompt + advPromptExtra : basePrompt;
    // 분량에 따른 max_tokens 설정 (여유 있게)
    const tokenMap = { short: 3000, medium: 5500, long: 8000, xlong: 10000 };
    const maxTok = tokenMap[wordCount] || 5500;
    let _savedFull = "";
    // 문장 종결 확인 헬퍼 — 문장 부호·해시태그 없이 끊어진 경우 false
    const isFinished = (txt) => {
      if (!txt) return false;
      const trimmed = txt.trim();
      const tail = trimmed.slice(-250);
      // 해시태그(# 있음)가 있으면 완료
      if (/#[\wㄱ-ㅎ가-힣]+/.test(tail)) return true;
      // # 없이 해시태그 스타일 라인 (띄어쓰기 구분 키워드 여러 개)가 마지막에 있어도 완료로 인정
      const lastLine = trimmed.split("\n").pop() || "";
      if (lastLine.trim().length > 10 && /^[가-힣\s]+$/.test(lastLine.trim()) && lastLine.trim().split(/\s+/).length >= 5) {
        return true;
      }
      // 문장 부호로 끝나면서 이상한 중간 cut이 아니면 OK
      if (/[.!?。][\s"')\]]*$/.test(tail)) {
        const lastSentence = tail.split(/[.!?。]/).slice(-2, -1)[0] || "";
        if (lastSentence.trim().length > 8) return true;
      }
      return false;
    };
    // 최대 2회 시도 (실패 시 재시도)
    let lastErr = null;
    try {
    // 글 생성 (부족하면 이어쓰기)
    _savedFull = "";
    try {
      let fullText;
      try {
        const _timeoutMs = wordCount === "xlong" ? 180000 : wordCount === "long" ? 150000 : 120000;
        fullText = await callAIStream("claude-haiku-4-5", [{role:"user",content:prompt}], maxTok, (acc) => { _savedFull = acc; try { if (acc.length > 20) sessionStorage.setItem(_ssSavedFullKey, acc); } catch {} }, null, _timeoutMs);
      } catch (streamErr) {
        // 타임아웃 등 에러 시 이미 받은 텍스트로 진행
        if (_savedFull && _savedFull.length > 100) {
          fullText = _savedFull;
        } else {
          throw streamErr;
        }
      }

      // 이어쓰기 제거 — 1회 생성으로 완결 (이어쓰기가 시간을 2배로 늘리는 주범)
      // 프롬프트에서 충분한 분량을 요청하고, max_tokens도 넉넉하게 설정하여 1회로 완성

      if (fullText && fullText.length > 50) {
        setGenStep(5);
        const cleaned = cleanBlogText(fullText);
        // 첨부 이미지가 있으면 본문 중간에 균등 배치
        const userImages = (fields._files || []).filter(f => f.type === "image" && f.b64);
        let finalText = userImages.length > 0 ? await insertUserImages(cleaned, userImages) : cleaned;
        // 상단 대표 제목 + 이미지 자동 삽입
        try {
          let headerKw = fields.keyword || "";
          // 1) 대표 제목 생성
          let blogTitle = "";
          try {
            blogTitle = (await callAI("claude-haiku-4-5", [{ role: "user", content: `키워드: ${headerKw}\n이 키워드로 블로그 대표 제목 1개만 작성하세요. 클릭하고 싶고, SEO에 좋은 제목. 제목만 출력.` }], 100))?.trim()?.replace(/^["']|["']$/g, "") || "";
          } catch {}
          // 2) 제목만 상단 삽입 (이미지 없이)
          if (blogTitle) finalText = `# ${blogTitle}\n\n${finalText}`;
        } catch {}
        setResult(finalText);
        if (isTistory) setHtmlResult(mdToHtml(fullText));
      } else {
        setError(t("bg_genFailed"));
      }
    } catch(e) {
      if (_savedFull && _savedFull.length > 50) {
        setGenStep(5);
        const cleaned2 = cleanBlogText(_savedFull);
        const userImages2 = (fields._files || []).filter(f => f.type === "image" && f.b64);
        const finalText2 = userImages2.length > 0 ? await insertUserImages(cleaned2, userImages2) : cleaned2;
        setResult(finalText2);
        if (isTistory) setHtmlResult(mdToHtml(_savedFull));
      } else {
        setError((e.message || t("bg_genError")) + " " + t("bg_retryPlease"));
      }
    }
    } finally {
      genStartTimeRef.current = 0;
      try { sessionStorage.removeItem(_ssStartTimeKey); sessionStorage.removeItem(_ssSavedFullKey); } catch {}
      setGenStep(5); // all completed
      setLoading(false);
      // 백그라운드 작업 표시기 완료
      window.dispatchEvent(new CustomEvent("bgTaskUpdate", { detail: { action: "complete", task: { id: "blog_gen_" + (initialType || "blog"), type: initialType || "blog_write", message: t("bg_taskWriteDone") } } }));
      if (user) { // 회원만 finally에서 횟수 증가 (비회원은 generate 시작 시점에 이미 처리)
        const _u2 = getAiUsage();
        const _k2 = "member_" + (user.uid || "u");
        const _newU2 = { ..._u2 };
        _newU2[_k2] = (_u2[_k2] || 0) + 1;
        setAiUsage(_newU2);
      }
      // 포인트 차감은 생성 시작 시점에 처리됨
      // 본문 내 [이미지: ...] 태그에 실제 이미지 자동 삽입
      // 블로그/칼럼 등 긴 글 플랫폼에서만 이미지 삽입 (인스타·스레드·X 등 캡션형은 제외)
      const _noImagePlatforms = ["blog_insta","blog_thread","blog_x","blog_tiktok","blog_bluesky","blog_tumblr"];
      if (_savedFull && !_noImagePlatforms.includes(platformId)) fetchInlineImages(_savedFull);
      // 보관함 자동저장
      if (_savedFull && _savedFull.length > 50) {
        try {
          let _saves = JSON.parse(localStorage.getItem("sns_blog_saves_v1") || "[]");
          let _title = fields.keyword || t("bg_noTitle");
          let _newSave = { id: Date.now().toString(), type: subtype, title: _title,
            content: cleanText(_savedFull), date: new Date().toLocaleDateString("ko-KR") };
          _saves.unshift(_newSave);
          localStorage.setItem("sns_blog_saves_v1", JSON.stringify(_saves.slice(0, 100)));
        } catch(e) {}
      }
    }
  };

  // ── 이미지 생성 (mode === "image") ──
  const generateImage = async () => {
    if (!fields.keyword?.trim()) { setError(t("bg_promptRequired")); return; }
    if (!user) { if (onLoginRequest) onLoginRequest(); return; }
    if (showPointConfirm && !(await showPointConfirm(50))) return;

    const _aiPoints = user ? (user.points || 0) : 0;
    if (_aiPoints < 50) { setError(t("bg_pointsLowCharge")); return; }

    setError(""); setLoading(true); setImageResult(null);
    genStartTimeRef.current = Date.now();

    try {
      const body = {
        prompt: fields.keyword,
        aspectRatio: imageAspect,
      };
      if (fields._files?.[0]?.b64) {
        body.productImageB64 = fields._files[0].b64;
        body.productImageMime = fields._files[0].mime || "image/png";
      }

      const token = await getAuthToken();
      const headers = { "Content-Type": "application/json" };
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch("/api/generate-image", {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      const data = await res.json();
      const imgUrl = data.image || data.imageUrl || data.url || (data.base64 ? `data:image/png;base64,${data.base64}` : null);

      if (imgUrl) {
        setImageResult(imgUrl);
        changePoints(user.uid, -50, "AI 이미지 생성").then(newPts => {
          if (onUserUpdate) onUserUpdate({...user, points: newPts});
        });
      } else {
        setError(t("bg_imgGenFailed"));
      }
    } catch(e) {
      setError(t("bg_imgGenError") + (e.message || t("bg_retryPlease")));
    } finally {
      setLoading(false);
      genStartTimeRef.current = 0;
    }
  };

  // ── 쇼츠 시작 → 인라인 렌더링 ──
  const handleShortsStart = () => {
    const url = detectedYoutubeUrl || fields.keyword?.trim();
    if (!url) { setError(t("bg_ytLinkRequired")); return; }
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/);
    if (!ytMatch) { setError(t("bg_ytLinkInvalid")); return; }
    try { sessionStorage.setItem('shorts_yt_url', url); } catch {}
    setShortsYtUrl(url);
    setShortsMode(true);
  };

  /* ── [image: ...] / [이미지: ...] 태그를 실제 이미지로 자동 교체
     AI가 글마다 작성한 영어 키워드를 각각 개별 검색 → 섹션별 정확한 이미지 매칭 ── */
  const fetchInlineImages = async (fullText) => {
    if (!fullText) return;
    const results = [];
    try {
      const matches = Array.from(fullText.matchAll(/\[(?:image|이미지):\s*([^\]]+)\]/gi));
      const keywords = Array.from(new Set(matches.map(m => m[1].trim()).filter(Boolean))).slice(0, 8);

      // 1) AI가 [image: keyword] 태그를 만들었으면 각 키워드별 개별 검색
      for (const kw of keywords) {
        try {
          const r = await fetch(`/api/proxy-pixabay?q=${encodeURIComponent(kw)}&per_page=3&safesearch=true&image_type=photo&orientation=horizontal`);
          const d = await r.json();
          const h = d.hits?.[0];
          if (h) {
            results.push({ id: "px"+h.id, preview: h.webformatURL, url: h.largeImageURL||h.webformatURL, src: "Pixabay", keyword: kw });
            continue;
          }
          const rp = await fetch(`/api/proxy-pexels?path=v1/search&query=${encodeURIComponent(kw)}&per_page=3&orientation=landscape`);
          const dp = await rp.json();
          const pp = dp.photos?.[0];
          if (pp) results.push({ id: "pe"+pp.id, preview: pp.src.medium, url: pp.src.large2x||pp.src.large, src: "Pexels", keyword: kw });
        } catch {}
      }

      // 2) 이미지 부족 시 소제목별 다양한 키워드로 검색
      if (results.length < 3) {
        try {
          // 본문에서 소제목들 추출
          const allLines = fullText.split("\n");
          const headings = [];
          for (let li = 0; li < allLines.length; li++) {
            const t = allLines[li].trim();
            if (!t || t.length < 3 || t.length > 50 || t.startsWith("[") || t.startsWith("#") || t.startsWith("-") || /^\d+\./.test(t)) continue;
            const prevEmpty = li === 0 || !allLines[li-1]?.trim();
            if (prevEmpty) headings.push(t);
          }
          // AI 한 번 호출: 소제목들 → 각각 다른 이미지 검색 키워드 (영어 2단어)
          const subHeadings = headings.slice(1).slice(0, 8);
          const mainKw = fields.keyword || headings[0] || "";
          let searchKeywords = [];
          try {
            const aiResult = await callAI("claude-haiku-4-5", [{
              role: "user",
              content: `블로그 소제목별로 가장 적합한 이미지 검색 키워드를 영어 2~3단어로 만들어주세요.
각 소제목의 내용에 맞는 서로 다른 키워드를 생성하세요. 한 줄에 하나씩만 출력하세요.

메인 주제: ${mainKw}
소제목들:
${subHeadings.map((h,i) => `${i+1}. ${h}`).join("\n")}

예시 출력:
blood pressure monitor
medical certificate
hospital equipment`
            }], 300);
            if (aiResult) {
              searchKeywords = aiResult.split("\n").map(l => l.replace(/^\d+[\.\)]\s*/, "").trim()).filter(l => l.length >= 3 && l.length < 60 && /[a-zA-Z]/.test(l));
            }
          } catch {}

          // 폴백: 메인 키워드만으로
          if (searchKeywords.length === 0) searchKeywords = [mainKw];

          // 각 키워드별로 Pixabay 검색 (다양한 이미지 확보)
          const usedIds = new Set(results.map(x => x.id));
          for (let ki = 0; ki < searchKeywords.length && results.length < 8; ki++) {
            try {
              const q = searchKeywords[ki];
              const lang = /[가-힣]/.test(q) ? "ko" : "en";
              const r = await fetch(`https://pixabay.com/api/?key=44421803-926acb8f55c34beaafae6de8a&q=${encodeURIComponent(q)}&image_type=photo&per_page=5&lang=${lang}&safesearch=true&orientation=horizontal`);
              if (r.ok) {
                const d = await r.json();
                const hit = (d.hits || []).find(h => !usedIds.has("px"+h.id));
                if (hit) {
                  usedIds.add("px"+hit.id);
                  results.push({ id: "px"+hit.id, preview: hit.webformatURL, url: hit.largeImageURL||hit.webformatURL, src: "Pixabay", keyword: subHeadings[ki] || q });
                }
              }
            } catch {}
          }
        } catch {}
      }
    } catch (e) {
      console.warn("fetchInlineImages error:", e);
    }

    // 3) 최종 폴백: 최소 3개 이미지 보장 (Picsum)
    if (results.length < 3) {
      const need = Math.max(5 - results.length, 3);
      const seeds = Array.from({length: need}, (_, i) => Date.now() + i);
      seeds.forEach(s => results.push({ id: "ps"+s, preview: `https://picsum.photos/seed/${s}/640/400`, url: `https://picsum.photos/seed/${s}/1200/800`, src: "Picsum" }));
    }

    setSuggestedImages(results);
  };

  // suggestedImages를 renderMarkdown에 직접 전달 — 별도 매핑 불필요

  /* ── 픽사베이·픽셀스 이미지 자동 추천 ── */
  const fetchImages = async (keyword) => {
    if (!keyword) return;
    setImgSearching(true); setSuggestedImages([]);
    // 한국어 keyword → 영어 이미지 검색어 변환 (Pixabay/Pexels는 영어 매칭이 훨씬 정확)
    let enQuery = keyword;
    const hasKorean = /[가-힣]/.test(keyword);
    if (hasKorean) {
      try {
        const txt = await callAI("claude-haiku-4-5", [{
          role: "user",
          content: `다음 한국어 주제를 이미지 검색에 쓸 영어 키워드 2~3개로 바꿔주세요. 핵심 명사 위주로. 답변은 영어 단어만, 공백으로 구분, 따옴표나 콜론·다른 설명 없이 단어만:\n"${keyword}"`
        }], 60);
        let raw = (txt || "").trim().split("\n")[0];
        // 앞쪽 "keyword:", "english:" 등 제거
        raw = raw.replace(/^(english keywords?|keywords?|answer|결과|답변|english)\s*[:：]?\s*/i, "");
        raw = raw.replace(/["'.,;:()]/g, "").trim();
        // 영어 부분만 추출 (한글이 섞여 있어도)
        const englishOnly = raw.replace(/[^A-Za-z\s-]/g, " ").replace(/\s+/g, " ").trim();
        if (englishOnly && englishOnly.length >= 3 && englishOnly.length < 80) {
          enQuery = englishOnly;
        }
      } catch {}
      // AI 변환이 완전히 실패하면 간단 명사 추출 시도 (마지막 fallback)
      if (enQuery === keyword && /[가-힣]/.test(enQuery)) {
        // 한국어 그대로 써봄 — Pixabay는 일부 한국어도 지원
        enQuery = keyword;
      }
    }
    const imgs = [];
    try {
      {
        const r = await fetch(`/api/proxy-pixabay?q=${encodeURIComponent(enQuery)}&per_page=12&safesearch=true&image_type=photo&orientation=horizontal`);
        const d = await r.json();
        (d.hits||[]).forEach(h => imgs.push({ id:"px"+h.id, preview:h.webformatURL, url:h.largeImageURL||h.webformatURL, src:"Pixabay" }));
      }
      {
        const r = await fetch(`/api/proxy-pexels?path=v1/search&query=${encodeURIComponent(enQuery)}&per_page=12&orientation=landscape`);
        const d = await r.json();
        (d.photos||[]).forEach(p => imgs.push({ id:"pe"+p.id, preview:p.src.medium, url:p.src.large2x||p.src.large, src:"Pexels" }));
      }
    } catch(e) {}
    setSuggestedImages(imgs);
    setImgSearching(false);
  };

  // 사용자 첨부 이미지를 본문 단락 사이에 균등 배치
  const insertUserImages = async (text, images) => {
    if (!images || !images.length || !text) return text;
    // base64 이미지를 Supabase URL로 업로드
    let uploadedImages = images;
    try {
      const { uploadFileToStorage } = await import("./storage");
      uploadedImages = await Promise.all(images.map(async (img, idx) => {
        if (img.b64 && img.b64.startsWith("data:")) {
          try {
            const resp = await fetch(img.b64);
            const blob = await resp.blob();
            const ext = blob.type.split("/")[1] || "png";
            const path = `blog-images/gen-${Date.now()}-${idx}.${ext}`;
            const url = await uploadFileToStorage(blob, path);
            return { ...img, b64: url || img.b64 };
          } catch { return img; }
        }
        return img;
      }));
    } catch {}
    const paragraphs = text.split("\n\n");
    if (paragraphs.length <= 1) return text + "\n\n" + uploadedImages.map(img => `![${img.name}](${img.b64})`).join("\n\n");
    const interval = Math.max(2, Math.floor(paragraphs.length / (uploadedImages.length + 1)));
    const result = [];
    let imgIdx = 0;
    for (let i = 0; i < paragraphs.length; i++) {
      result.push(paragraphs[i]);
      if (imgIdx < uploadedImages.length && (i + 1) % interval === 0 && i < paragraphs.length - 1) {
        result.push(`![${uploadedImages[imgIdx].name}](${uploadedImages[imgIdx].b64})`);
        imgIdx++;
      }
    }
    while (imgIdx < uploadedImages.length) {
      result.push(`![${uploadedImages[imgIdx].name}](${uploadedImages[imgIdx].b64})`);
      imgIdx++;
    }
    return result.join("\n\n");
  };

  const cleanText = (text) => {
    if (!text) return "";
    return text
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/#{1,6}\s*/g, "")
      .replace(/^---+$/gm, "")
      .replace(/^___+$/gm, "")
      .replace(/^===+$/gm, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  };
  const cleanForCopy = (text) => {
    return text
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/#{1,6}\s*/g, "")
      .replace(/^---+$/gm, "")
      .replace(/^___+$/gm, "")
      .replace(/^===+$/gm, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  };
  // 모바일 호환 복사 (clipboard API fallback)
  const fallbackCopy = (text) => {
    const ta = document.createElement("textarea");
    ta.value = text; ta.style.cssText = "position:fixed;opacity:0;left:-9999px";
    document.body.appendChild(ta); ta.focus(); ta.select();
    try { document.execCommand("copy"); } catch {}
    document.body.removeChild(ta);
  };
  // 이미지 URL → base64 data URI 변환 (CORS 우회를 위해 프록시 경유)
  const imageUrlToBase64 = async (url) => {
    try {
      // 프록시를 통해 이미지를 가져와 CORS 문제 회피
      const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(url)}`;
      const resp = await fetch(proxyUrl);
      if (!resp.ok) throw new Error("proxy failed");
      const blob = await resp.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch {
      // 프록시 실패 시 직접 fetch 시도 (같은 origin이거나 CORS 허용된 경우)
      try {
        const resp = await fetch(url, { mode: "cors" });
        if (!resp.ok) throw new Error("direct fetch failed");
        const blob = await resp.blob();
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch {
        return null; // 변환 실패 시 null 반환
      }
    }
  };

  const blogContentRef = useRef(null);
  const isMobile = typeof navigator !== "undefined" && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  // 텍스트 선택 시 AI 교체 플로팅 툴바
  const [selectionPopup, setSelectionPopup] = useState(null); // {x, y, text}
  const [aiReplacing, setAiReplacing] = useState(false);
  const [editorTools, setEditorTools] = useState(false); // 왼쪽 도구바 토글
  const imageInputRef = useRef(null);

  const handleTextSelect = () => {
    try {
      const sel = window.getSelection();
      const selectedText = sel?.toString()?.trim();
      if (!selectedText || selectedText.length < 3) { setSelectionPopup(null); return; }
      if (!sel.rangeCount) { setSelectionPopup(null); return; }
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      if (!rect.width) { setSelectionPopup(null); return; }
      setSelectionPopup({ x: rect.left + rect.width / 2, y: rect.top - 10, text: selectedText });
      setContextMenu(null);
    } catch { setSelectionPopup(null); }
  };


  // 커서 위치에 이미지 삽입
  const insertImageAtCursor = async (file) => {
    if (!file) return;
    try {
      const { uploadFileToStorage } = await import("./storage");
      const ext = file.type.split("/")[1] || "png";
      const path = `blog-images/${Date.now()}.${ext}`;
      const publicUrl = await uploadFileToStorage(file, path);
      setResult(prev => prev + `\n\n![image](${publicUrl})\n\n`);
    } catch {
      // 업로드 실패 시 base64
      const reader = new FileReader();
      reader.onload = (ev) => setResult(prev => prev + `\n\n![image](${ev.target.result})\n\n`);
      reader.readAsDataURL(file);
    }
    setContextMenu(null);
  };

  const handleAiReplace = async (mode = "rewrite", customText = null) => {
    const targetText = customText || selectionPopup?.text;
    if (!targetText) return;
    setAiReplacing(true);
    const maxTokens = mode === "expand" ? 3000 : mode === "shorten" ? 1000 : 2000;
    const prompts = {
      rewrite: `다음 문장을 같은 의미를 유지하면서 더 자연스럽고 매력적으로 다시 작성해주세요. 원문과 같은 말투를 유지하세요. 다시 쓴 문장만 출력하세요.\n\n원문:\n${targetText}`,
      expand: `다음 문장의 내용을 2~3배로 늘려서 더 상세하고 풍부하게 작성해주세요. 원문과 같은 말투를 유지하세요. 늘린 문장만 출력하세요.\n\n원문:\n${targetText}`,
      shorten: `다음 문장을 핵심만 남기고 간결하게 줄여주세요. 원문과 같은 말투를 유지하세요. 줄인 문장만 출력하세요.\n\n원문:\n${targetText}`,
      formal: `다음 문장을 합니다체(~입니다, ~했습니다)로 바꿔주세요. 문장만 출력하세요.\n\n원문:\n${targetText}`,
      casual: `다음 문장을 해요체(~요, ~이에요)로 친근하게 바꿔주세요. 문장만 출력하세요.\n\n원문:\n${targetText}`,
      friendly: `다음 문장을 경험 공유체(~거든요, ~더라고요, ~해보세요)로 바꿔주세요. 문장만 출력하세요.\n\n원문:\n${targetText}`,
    };
    try {
      const replacement = await callAI("claude-haiku-4-5", [{role:"user",content:prompts[mode]||prompts.rewrite}], maxTokens);
      if (replacement) {
        const cleaned = replacement.trim().replace(/^["']|["']$/g, "");
        setResult(prev => {
          // 정확 매칭 먼저 시도
          if (prev.includes(targetText)) return prev.replace(targetText, cleaned);
          // trim 매칭
          const trimmed = targetText.trim();
          if (prev.includes(trimmed)) return prev.replace(trimmed, cleaned);
          // 첫 줄 기반 매칭 (섹션 분리 시 공백 차이 대비)
          const firstLine = trimmed.split("\n")[0]?.trim();
          if (firstLine && prev.includes(firstLine)) {
            const idx = prev.indexOf(firstLine);
            const endCandidate = trimmed.split("\n").pop()?.trim();
            if (endCandidate) {
              const endIdx = prev.indexOf(endCandidate, idx);
              if (endIdx > idx) return prev.slice(0, idx) + cleaned + prev.slice(endIdx + endCandidate.length);
            }
          }
          return prev; // 매칭 실패 시 원본 유지
        });
      }
    } catch (e) { console.warn("handleAiReplace error:", e); }
    setAiReplacing(false);
    setSelectionPopup(null);
    setContextMenu(null);
  };

  const handleCopy = async (content, withImages) => {
    const cleaned = cleanForCopy(content);
    if (withImages && blogContentRef.current && !isMobile) {
      // PC: base64 이미지를 Supabase 공개 URL로 변환 후 DOM 복사
      setCopyLoading(true);
      try {
        const el = blogContentRef.current;
        const imgs = el.querySelectorAll("img");
        const originals = [];
        const { uploadFileToStorage } = await import("./storage");
        await Promise.all([...imgs].map(async (img, idx) => {
          originals.push({ idx, src: img.src });
          try {
            if (img.src.startsWith("data:")) {
              // base64 → Blob → Supabase 업로드 → 공개 URL
              const resp = await fetch(img.src);
              const blob = await resp.blob();
              const ext = blob.type.split("/")[1] || "png";
              const path = `blog-images/copy-${Date.now()}-${idx}.${ext}`;
              const publicUrl = await uploadFileToStorage(blob, path);
              if (publicUrl) img.src = publicUrl;
            } else if (!img.src.startsWith("http")) {
              // 상대 경로 → 절대 경로
              img.src = new URL(img.src, window.location.origin).href;
            }
          } catch { /* 변환 실패 시 원본 유지 */ }
        }));
        const range = document.createRange();
        range.selectNodeContents(el);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        document.execCommand("copy");
        sel.removeAllRanges();
        // 원본 URL 복원
        originals.forEach(o => { if (imgs[o.idx]) imgs[o.idx].src = o.src; });
      } catch {
        try { if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(cleaned); } else { fallbackCopy(cleaned); } }
        catch { fallbackCopy(cleaned); }
      } finally {
        setCopyLoading(false);
      }
    } else {
      // 모바일 또는 텍스트 전용: 텍스트만 복사
      try { if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(cleaned); } else { fallbackCopy(cleaned); } }
      catch { fallbackCopy(cleaned); }
    }
    setCopied(true);
    setTimeout(()=>setCopied(false),2000);
  };

  // ── 이미지 결과 패널 ──
  const renderImageResult = () => {
    if (loading) {
      return <LoadingAnimation featureType="image_gen" title={t("bg_aiImgGenTitle")} subtitle={fields.keyword || t("bg_imgGen")} isDark={isDark} startTime={genStartTimeRef.current || 0} expectedMs={30000} />;
    }
    if (!imageResult) return null;
    const imgActionBtn = {padding:"10px 20px",borderRadius:12,border:`1.5px solid ${border}`,background:"transparent",color:text,fontSize:13,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:6,fontFamily:"inherit",transition:"all 0.15s"};
    return (
      <div style={{maxWidth:900,margin:"0 auto",width:"100%",padding:"20px"}}>
        <div style={{borderRadius:16,overflow:"hidden",border:`1px solid ${border}`,position:"relative"}}>
          <img src={imageResult} alt={t("bg_generatedImg")} style={{width:"100%",display:"block"}} />
          <div style={{position:"absolute",top:12,right:12,display:"flex",gap:8}}>
            <button onClick={()=>{const a=document.createElement("a");a.href=imageResult;a.download="ai-generated-image.png";a.click();}}
              style={{padding:"8px 14px",borderRadius:10,border:"none",background:"rgba(0,0,0,0.72)",color:"#fff",fontSize:13,cursor:"pointer",fontWeight:700,display:"flex",alignItems:"center",gap:6,minHeight:38,fontFamily:"inherit"}}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
              {t("bg_download")}
            </button>
          </div>
        </div>
        <div style={{display:"flex",gap:8,marginTop:16,justifyContent:"center",flexWrap:"wrap"}}>
          <button onClick={()=>{setImageResult(null);}} style={imgActionBtn}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0115-6.7L21 8M21 3v5h-5M21 12a9 9 0 01-15 6.7L3 16M3 21v-5h5"/></svg>
            {t("bg_createNew")}
          </button>
          <button onClick={()=>{const a=document.createElement("a");a.href=imageResult;a.download="ai-generated-image.png";a.click();}} style={imgActionBtn}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
            {t("bg_download")}
          </button>
          <button onClick={async()=>{
            try{
              const resp=await fetch(imageResult);const blob=await resp.blob();
              await navigator.clipboard.write([new ClipboardItem({"image/png":blob})]);
              setCopied(true);setTimeout(()=>setCopied(false),2000);
            }catch{
              try{await navigator.clipboard.writeText(imageResult);setCopied(true);setTimeout(()=>setCopied(false),2000);}catch{}
            }
          }} style={{...imgActionBtn,border:`1.5px solid ${copied?"rgba(74,222,128,0.5)":border}`,color:copied?"#22c55e":text}}>
            {copied
              ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>}
            {copied?t("copyDone"):t("copy")}
          </button>
        </div>
      </div>
    );
  };

  // ── 결과 패널 ──
  const renderResult = () => {
    // 크레딧/횟수 소진 체크
    const _us = _getUsageState();
    if (!loading && !result && _us.exhausted) {
      return <PointsExhausted isDark={isDark} isGuest={_us.isGuest} title={t("bg_blogPost")}
        onLogin={() => { if(onLoginRequest) onLoginRequest(); }} />;
    }
    // 풀스크린 로딩 오버레이
    if (loading) {
      return (
        <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",position:"relative"}}>
          <LoadingAnimation featureType={initialType || "blog_write"} title={t("bg_aiWritingTitle")} subtitle={`${fields.keyword || t("generate")} · ${cfg.title}`} isDark={isDark} startTime={genStartTimeRef.current || 0} expectedMs={wordCount==="xlong"?60000:wordCount==="long"?45000:30000} />
          <button onClick={handleCancelGenerate}
            style={{position:"fixed",bottom:40,left:"50%",transform:"translateX(-50%)",zIndex:10000,padding:"12px 32px",borderRadius:12,border:`1px solid ${isDark?"rgba(255,255,255,0.15)":"rgba(0,0,0,0.1)"}`,background:isDark?"rgba(255,255,255,0.08)":"rgba(255,255,255,0.9)",color:isDark?"#fff":"#333",fontSize:14,fontWeight:700,cursor:"pointer",backdropFilter:"blur(8px)",boxShadow:"0 4px 16px rgba(0,0,0,0.15)"}}>
            {t("bg_cancelBtn")}
          </button>
        </div>
      );
    }
    if (!result && !loading) {
      const sub = cfg.subtypes.find(s=>s.id===subtype);
      return (
        <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:12,padding:40,textAlign:"center",maxWidth:900,margin:"0 auto",width:"100%"}}>
          <div style={{fontSize:16,fontWeight:800,color:text}}>{sub?.label}</div>
          <div style={{fontSize:13,color:muted,lineHeight:1.8,whiteSpace:"pre-line"}}>{t("introGuide")}</div>
          {examples.length>0&&<div style={{fontSize:11,color:muted,opacity:0.6}}>{t("example")}: {examples[0]}</div>}
        </div>
      );
    }
    return (
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",maxWidth:900,margin:"0 auto",width:"100%"}}>
        <div style={{display:"flex",flexDirection:"column",gap:10,padding:"16px 20px",marginTop:16,borderBottom:`1px solid ${border}`,background:headerBg,borderRadius:"14px 14px 0 0"}}>
          {/* 상단 행: 결과 라벨 + 글자수 통계 */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              {isTistory && result && ["text","html","preview"].map(mode=>(
                <button key={mode} onClick={()=>setViewMode(mode)} style={{padding:"8px 14px",borderRadius:10,border:`1.5px solid ${viewMode===mode?accent:border}`,background:viewMode===mode?accentBg:"transparent",color:viewMode===mode?accent:text,fontSize:13,fontWeight:viewMode===mode?800:600,cursor:"pointer",minHeight:36}}>
                  {mode==="text"?t("bg_originalText"):mode==="html"?"HTML":t("bg_previewText")}
                </button>
              ))}
              {!isTistory&&result&&<span style={{fontSize:15,fontWeight:800,color:text,letterSpacing:-0.3}}>{t("genResult")}</span>}
            </div>
            {result&&(
              <div style={{display:"flex",alignItems:"center",gap:10,padding:"8px 14px",borderRadius:12,
                background:isDark?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.04)",
                border:`1px solid ${border}`}}>
                <span style={{fontSize:12,color:muted,fontWeight:600}}>{t("bg_totalChar")}</span>
                <span style={{fontSize:14,fontWeight:800,color:accent}}>{result.length.toLocaleString()}</span>
                <span style={{fontSize:12,color:muted}}>{t("bg_charUnit")}</span>
                <span style={{width:1,height:14,background:border,display:"inline-block"}}/>
                <span style={{fontSize:12,color:muted,fontWeight:600}}>{t("bg_noSpaceLabel")}</span>
                <span style={{fontSize:14,fontWeight:800,color:text}}>{result.replace(/\s/g,"").length.toLocaleString()}</span>
              </div>
            )}
          </div>
          {/* 하단 행: 액션 버튼들 */}
          {result && (
            <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
              <button onClick={()=>{
                if (!confirm(t("bg_confirmRewrite"))) return;
                setResult_raw("");setHtmlResult("");setGenStep(0);
                setError("");setSuggestedImages([]);setInlineImages({});setCopied(false);
                setTitleSugg([]);setSeoKeys([]);setFields({});setUrlInput("");setUrlResult(null);
                try{
                  sessionStorage.removeItem(_ssKey);sessionStorage.removeItem(_ssLoadKey);sessionStorage.removeItem(_ssStepKey);sessionStorage.removeItem(_ssSavedFullKey);
                  sessionStorage.removeItem(_ssFieldsKey);
                  sessionStorage.removeItem(_ssPlatformKey);sessionStorage.removeItem(_ssSubtypeKey);sessionStorage.removeItem(_ssUrlInputKey);
                }catch{}
              }}
                style={{padding:"10px 18px",borderRadius:11,border:`1.5px solid ${border}`,
                  background:"transparent",color:text,fontSize:13,fontWeight:700,cursor:"pointer",
                  display:"flex",alignItems:"center",gap:6,whiteSpace:"nowrap",minHeight:42,fontFamily:"inherit"}}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0115-6.7L21 8M21 3v5h-5M21 12a9 9 0 01-15 6.7L3 16M3 21v-5h5"/></svg>
                {t("bg_newWrite")}
              </button>
              <button onClick={()=>setShowPromptInput(!showPromptInput)}
                style={{padding:"10px 18px",borderRadius:11,border:`1.5px solid ${showPromptInput?accent:border}`,
                  background:showPromptInput?accentBg:"transparent",color:showPromptInput?accent:text,fontSize:13,fontWeight:700,cursor:"pointer",
                  display:"flex",alignItems:"center",gap:6,whiteSpace:"nowrap",minHeight:42,fontFamily:"inherit"}}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                {t("bg_editRequest")}
              </button>
              <button onClick={()=>handleCopy(isTistory&&viewMode==="html"?htmlResult:result, true)}
                disabled={copyLoading}
                style={{padding:"10px 18px",borderRadius:11,border:`1.5px solid ${copied?"rgba(74,222,128,0.5)":accent+"60"}`,
                  background:copied?(isDark?"rgba(74,222,128,0.12)":"#f0fdf4"):accentBg,
                  color:copied?"#22c55e":accent,fontSize:13,fontWeight:800,cursor:copyLoading?"wait":"pointer",
                  display:"flex",alignItems:"center",gap:6,whiteSpace:"nowrap",opacity:copyLoading?0.6:1,minHeight:42,fontFamily:"inherit"}}>
                {copied
                  ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>}
                {copyLoading?t("bg_copying"):copied?t("copyDone"):isMobile?t("copy"):t("bg_copyWithImg")}
              </button>
              {result&&<ShareButton title={fields?.topic||t("bg_blogPost")} text={result?.slice(0,300)} isDark={isDark} compact />}
            </div>
          )}
          {/* 전체 프롬프트 수정 패널 */}
          {showPromptInput && (
            <div style={{marginTop:12,padding:"14px 16px",borderRadius:14,background:isDark?"rgba(124,106,255,0.06)":"#f8f7ff",border:`1.5px solid ${isDark?"rgba(124,106,255,0.2)":"#e8e5ff"}`,display:"flex",gap:8,alignItems:"flex-start"}}>
              <textarea value={promptText} onChange={e=>setPromptText(e.target.value)}
                placeholder={t("bg_editPlaceholder")}
                rows={2}
                onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey&&promptText.trim()){e.preventDefault();
                  (async()=>{
                    setPromptLoading(true);
                    try{
                      const rep=await callAI("claude-haiku-4-5",[{role:"user",content:`다음 블로그 글을 아래 요청에 맞게 수정해주세요. 수정된 전체 글만 출력하세요. 원문의 말투와 스타일을 유지하세요.\n\n요청: ${promptText}\n\n원문:\n${result}`}],4000);
                      if(rep){setResult_raw(rep.trim());setSuggestedImages([]);fetchInlineImages(rep.trim());}
                    }catch{}
                    setPromptLoading(false);setPromptText("");setShowPromptInput(false);
                  })();
                }}}
                style={{flex:1,padding:"10px 14px",borderRadius:10,border:`1.5px solid ${isDark?"rgba(255,255,255,0.1)":"#e5e5f0"}`,background:isDark?"rgba(255,255,255,0.04)":"#fff",color:text,fontSize:13,fontFamily:"inherit",outline:"none",resize:"none",lineHeight:1.6}}/>
              <button disabled={promptLoading||!promptText.trim()} onClick={async()=>{
                if(!promptText.trim())return;
                setPromptLoading(true);
                try{
                  const rep=await callAI("claude-haiku-4-5",[{role:"user",content:`다음 블로그 글을 아래 요청에 맞게 수정해주세요. 수정된 전체 글만 출력하세요. 원문의 말투와 스타일을 유지하세요.\n\n요청: ${promptText}\n\n원문:\n${result}`}],4000);
                  if(rep){setResult_raw(rep.trim());setSuggestedImages([]);fetchInlineImages(rep.trim());}
                }catch{}
                setPromptLoading(false);setPromptText("");setShowPromptInput(false);
              }}
                style={{padding:"10px 18px",borderRadius:10,border:"none",background:promptLoading?"#999":"linear-gradient(135deg,#7c6aff,#8b5cf6)",color:"#fff",fontSize:13,fontWeight:700,cursor:promptLoading?"wait":"pointer",whiteSpace:"nowrap",minHeight:42,opacity:(!promptText.trim()||promptLoading)?0.5:1}}>
                {promptLoading?<><div style={{width:12,height:12,border:"2px solid rgba(255,255,255,0.3)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin 0.8s linear infinite",display:"inline-block",marginRight:6}}/>{t("bg_editing")}</>:t("bg_apply")}
              </button>
            </div>
          )}
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"18px 22px"}}>
          {/* AI 생성 이미지 */}
          {aiImgUrl && (
            <div style={{marginBottom:18,borderRadius:14,overflow:"hidden",border:`1px solid ${border}`,position:"relative"}}>
              <img src={aiImgUrl} alt="AI 생성 이미지" style={{width:"100%",maxHeight:340,objectFit:"cover",display:"block"}}/>
              <div style={{position:"absolute",top:10,right:10,display:"flex",gap:6}}>
                <button onClick={()=>{const a=document.createElement("a");a.href=aiImgUrl;a.download="ai-image.png";a.click();}}
                  style={{padding:"8px 14px",borderRadius:10,border:"none",background:"rgba(0,0,0,0.72)",color:"#fff",fontSize:13,cursor:"pointer",fontWeight:700,display:"flex",alignItems:"center",gap:6,minHeight:38,fontFamily:"inherit"}}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                  다운로드
                </button>
                <button onClick={()=>setAiImgUrl(null)}
                  style={{padding:"8px 10px",borderRadius:10,border:"none",background:"rgba(0,0,0,0.72)",color:"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",minHeight:38,minWidth:38}} aria-label="닫기">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            </div>
          )}
          {/* 숨겨진 이미지 파일 input */}
          <input ref={imageInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => { if (e.target.files?.[0]) insertImageAtCursor(e.target.files[0]); e.target.value = ""; }} />

          {(viewMode==="text"||!isTistory)&&<div style={{ display: "flex", gap: 0, position: "relative" }}>
          {/* ── 에디터 본문 ── */}
          <div
            contentEditable
            suppressContentEditableWarning
            onMouseUp={handleTextSelect}
            onDragOver={e => { e.preventDefault(); e.currentTarget.style.outline = "2px dashed #7c6aff"; }}
            onDragLeave={e => { e.currentTarget.style.outline = "none"; }}
            onDrop={e => {
              e.preventDefault();
              e.currentTarget.style.outline = "none";
              const file = e.dataTransfer?.files?.[0];
              if (file && file.type.startsWith("image/")) {
                const reader = new FileReader();
                reader.onload = async (ev) => {
                  const dataUri = ev.target.result;
                  const placeholder = `![uploading...](${dataUri})`;
                  setResult(prev => prev + `\n\n${placeholder}\n\n`);
                  try {
                    const { uploadFileToStorage } = await import("./storage");
                    const ext = file.name?.split(".").pop() || "png";
                    const path = `blog-images/${Date.now()}.${ext}`;
                    const publicUrl = await uploadFileToStorage(file, path);
                    setResult(prev => prev.replace(placeholder, `![image](${publicUrl})`));
                  } catch {
                    setResult(prev => prev.replace("![uploading...]", "![image]"));
                  }
                };
                reader.readAsDataURL(file);
              }
            }}
            onPaste={e => {
              // 모바일/PC 이미지 붙여넣기 → Supabase 업로드 후 URL 삽입
              const items = e.clipboardData?.items;
              if (items) {
                for (const item of items) {
                  if (item.type.startsWith("image/")) {
                    e.preventDefault();
                    const blob = item.getAsFile();
                    if (!blob) break;
                    // 즉시 base64로 미리보기 표시
                    const reader = new FileReader();
                    reader.onload = async (ev) => {
                      const dataUri = ev.target.result;
                      const placeholder = `![uploading...](${dataUri})`;
                      setResult(prev => prev + `\n\n${placeholder}\n\n`);
                      // Supabase 업로드 시도 → 공개 URL로 교체
                      try {
                        const { uploadFileToStorage } = await import("./storage");
                        const ext = blob.type.split("/")[1] || "png";
                        const path = `blog-images/${Date.now()}.${ext}`;
                        const publicUrl = await uploadFileToStorage(blob, path);
                        setResult(prev => prev.replace(placeholder, `![image](${publicUrl})`));
                      } catch {
                        // 업로드 실패 시 base64 유지
                        setResult(prev => prev.replace("![uploading...]", "![image]"));
                      }
                    };
                    reader.readAsDataURL(blob);
                    break;
                  }
                }
              }
            }}
            style={{flex:1,background:cardBg,border:`1px solid ${border}`,borderRadius:12,padding:"26px 28px",fontSize:16,color:text,minHeight:140,lineHeight:1.95,cursor:"text",outline:"none",transition:"outline 0.15s"}}>
            <div ref={blogContentRef}>
              {(() => {
                // 소제목(## 또는 짧은 줄) 기준으로 섹션 분리 → 각 섹션에 AI 재작업 버튼
                if (!result) return null;
                const lines = result.split("\n");
                const sections = [];
                let current = { heading: "", lines: [] };
                for (const line of lines) {
                  const t = line.trim();
                  const isH = t.length >= 3 && t.length <= 50 && !t.startsWith("-") && !t.startsWith("!") && !t.startsWith("|") && !t.startsWith("[") && !/^\d+\./.test(t) && current.lines.length > 0 && (!lines[lines.indexOf(line)-1]?.trim());
                  if (isH && current.lines.length > 0) {
                    sections.push({ ...current });
                    current = { heading: t, lines: [line] };
                  } else {
                    if (!current.heading && t && !current.lines.some(l => l.trim())) current.heading = t;
                    current.lines.push(line);
                  }
                }
                if (current.lines.length) sections.push(current);

                return sections.map((sec, si) => {
                  const secText = sec.lines.join("\n");
                  return (
                    <div key={si} style={{ position: "relative", marginBottom: 4 }}
                      className="blog-section-wrap">
                      {renderMarkdown(secText, isDark, text, muted, accentRaw, suggestedImages, si === 0, si === 0 ? 0 : si - 1)}
                      {/* 섹션 AI 재작업 버튼 (호버 시 표시) */}
                      {!loading && sections.length > 1 && sec.heading && (
                        <div className="section-ai-btn" style={{
                          position: "absolute", top: 0, right: -8, opacity: sectionReplacing?.index === si ? 1 : 0,
                          transition: "opacity 0.15s", display: "flex", gap: 4,
                        }}>
                          {sectionReplacing?.index === si ? (
                            <div style={{padding:"4px 12px",borderRadius:8,background:"linear-gradient(135deg,#7c6aff,#8b5cf6)",color:"#fff",fontSize:10,fontWeight:700,display:"flex",alignItems:"center",gap:5,whiteSpace:"nowrap"}}>
                              <div style={{width:10,height:10,border:"2px solid rgba(255,255,255,0.3)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
                              {sectionReplacing.label} 중...
                            </div>
                          ) : (
                            <>
                              <button onClick={() => setShowSectionMenu(showSectionMenu === si ? null : si)}
                                style={{
                                  padding: "3px 8px", borderRadius: 6, border: `1px solid ${border}`,
                                  background: cardBg, color: muted, fontSize: 10, fontWeight: 600,
                                  cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
                                }}>
                                AI 재작업
                              </button>
                              {showSectionMenu === si && (
                                <div style={{position:"absolute",top:"100%",right:0,marginTop:4,background:isDark?"#1e1940":"#fff",borderRadius:10,
                                  boxShadow:"0 4px 20px rgba(0,0,0,0.18)",border:`1px solid ${border}`,padding:6,zIndex:20,display:"flex",flexDirection:"column",gap:3,minWidth:120}}>
                                  {[
                                    {mode:"rewrite",label:t("bg_rewriteLabel")},
                                    {mode:"expand",label:t("bg_expandLabel")},
                                    {mode:"shorten",label:t("bg_shortenLabel")},
                                  ].map(o=>(
                                    <button key={o.mode} onClick={async()=>{
                                      setShowSectionMenu(null);
                                      setSectionReplacing({index:si,label:o.label.replace("기","는")});
                                      await handleAiReplace(o.mode,secText.trim());
                                      setSectionReplacing(null);
                                    }}
                                      style={{padding:"7px 14px",borderRadius:6,border:"none",background:"transparent",color:text,fontSize:11,fontWeight:600,
                                        cursor:"pointer",textAlign:"left",fontFamily:"inherit",whiteSpace:"nowrap"}}
                                      onMouseEnter={e=>e.currentTarget.style.background=isDark?"rgba(255,255,255,0.08)":"#f5f5f5"}
                                      onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                                      {o.label}
                                    </button>
                                  ))}
                                  <div style={{height:1,background:isDark?"rgba(255,255,255,0.08)":"#eee",margin:"2px 0"}}/>
                                  <button onClick={()=>{setShowSectionMenu(null);setSectionPrompt({index:si,text:""});}}
                                    style={{padding:"7px 14px",borderRadius:6,border:"none",background:"transparent",color:accent,fontSize:11,fontWeight:600,
                                      cursor:"pointer",textAlign:"left",fontFamily:"inherit",whiteSpace:"nowrap"}}
                                    onMouseEnter={e=>e.currentTarget.style.background=isDark?"rgba(124,106,255,0.1)":"#f0f0ff"}
                                    onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                                    직접 입력
                                  </button>
                                </div>
                              )}
                              {/* 섹션 프롬프트 입력 */}
                              {sectionPrompt?.index === si && (
                                <div style={{position:"absolute",top:"100%",right:0,marginTop:4,background:isDark?"#1e1940":"#fff",borderRadius:10,
                                  boxShadow:"0 4px 20px rgba(0,0,0,0.18)",border:`1px solid ${border}`,padding:10,zIndex:20,width:280}}
                                  onClick={e=>e.stopPropagation()}>
                                  <textarea value={sectionPrompt.text||""} onChange={e=>setSectionPrompt({...sectionPrompt,text:e.target.value})}
                                    placeholder={t("bg_sectionEditPlaceholder")}
                                    rows={2} autoFocus
                                    onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey&&sectionPrompt.text?.trim()){e.preventDefault();
                                      (async()=>{
                                        const p=sectionPrompt.text;setSectionPrompt(null);
                                        setSectionReplacing({index:si,label:"수정하"});
                                        setAiReplacing(true);
                                        try{
                                          const rep=await callAI("claude-haiku-4-5",[{role:"user",content:`${p}\n\n원문의 말투를 유지하면서 수정된 문장만 출력하세요.\n\n원문:\n${secText.trim()}`}],2000);
                                          if(rep)setResult(prev=>prev.replace(secText.trim(),rep.trim()));
                                        }catch{}
                                        setAiReplacing(false);setSectionReplacing(null);
                                      })();
                                    }}}
                                    style={{width:"100%",padding:"8px 10px",borderRadius:8,border:`1.5px solid ${border}`,background:isDark?"rgba(255,255,255,0.04)":"#fff",
                                      color:text,fontSize:12,fontFamily:"inherit",outline:"none",resize:"none",lineHeight:1.5,boxSizing:"border-box"}}/>
                                  <div style={{display:"flex",gap:6,marginTop:8,justifyContent:"flex-end"}}>
                                    <button onClick={()=>setSectionPrompt(null)}
                                      style={{padding:"5px 12px",borderRadius:6,border:`1px solid ${border}`,background:"transparent",color:muted,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
                                      취소
                                    </button>
                                    <button disabled={!sectionPrompt.text?.trim()} onClick={async()=>{
                                      const p=sectionPrompt.text;setSectionPrompt(null);
                                      setSectionReplacing({index:si,label:"수정하"});
                                      setAiReplacing(true);
                                      try{
                                        const rep=await callAI("claude-haiku-4-5",[{role:"user",content:`${p}\n\n원문의 말투를 유지하면서 수정된 문장만 출력하세요.\n\n원문:\n${secText.trim()}`}],2000);
                                        if(rep)setResult(prev=>prev.replace(secText.trim(),rep.trim()));
                                      }catch{}
                                      setAiReplacing(false);setSectionReplacing(null);
                                    }}
                                      style={{padding:"5px 14px",borderRadius:6,border:"none",background:"linear-gradient(135deg,#7c6aff,#8b5cf6)",color:"#fff",fontSize:11,fontWeight:700,
                                        cursor:"pointer",fontFamily:"inherit",opacity:sectionPrompt.text?.trim()?1:0.4}}>
                                      적용
                                    </button>
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
            {loading&&<span style={{display:"inline-block",width:2,height:14,background:accent,marginLeft:2,animation:"blink 1s infinite"}}/>}
          </div>
          </div>}
          {/* AI 교체 플로팅 툴바 */}
          {selectionPopup && (
            <div style={{position:"fixed",left:selectionPopup.x,top:selectionPopup.y,transform:"translate(-50%,-100%)",zIndex:9999,
              background:isDark?"#1e1940":"#fff",borderRadius:12,padding:"8px 10px",
              boxShadow:"0 8px 32px rgba(0,0,0,0.18)",border:`1px solid ${isDark?"rgba(255,255,255,0.1)":"#e5e5f0"}`,
              display:"flex",gap:4,flexWrap:"wrap",justifyContent:"center",maxWidth:400}}
              onMouseDown={e => e.stopPropagation()}>
              {aiReplacing ? (
                <div style={{padding:"8px 18px",borderRadius:8,background:"linear-gradient(135deg,#7c6aff,#8b5cf6)",color:"#fff",fontSize:12,fontWeight:700,display:"flex",alignItems:"center",gap:5}}>
                  <div style={{width:12,height:12,border:"2px solid rgba(255,255,255,0.3)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>AI 변환 중...
                </div>
              ) : <>
                {[
                  {mode:"rewrite",label:t("bg_rewriteLabel")},
                  {mode:"expand",label:t("bg_expandLabel")},
                  {mode:"shorten",label:t("bg_shortenLabel")},
                  {mode:"formal",label:t("bg_formalLabel")},
                  {mode:"casual",label:t("bg_casualLabel")},
                  {mode:"friendly",label:t("bg_friendlyLabel")},
                ].map(o => (
                  <button key={o.mode} onMouseDown={e => { e.preventDefault(); e.stopPropagation(); handleAiReplace(o.mode); }}
                    style={{padding:"5px 10px",borderRadius:6,border:`1px solid ${isDark?"rgba(255,255,255,0.1)":"#e5e5f0"}`,
                      background:"transparent",color:isDark?"#fff":text,fontSize:11,fontWeight:600,cursor:"pointer",whiteSpace:"nowrap",
                      fontFamily:"inherit"}}>
                    {o.label}
                  </button>
                ))}
                <button onMouseDown={e => { e.preventDefault(); setSelectionPopup(null); }}
                  style={{padding:"5px 8px",borderRadius:6,border:"none",background:"transparent",color:isDark?"rgba(255,255,255,0.4)":"#999",fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>x</button>
              </>}
            </div>
          )}

          {isTistory&&viewMode==="html"&&htmlResult&&<div style={{background:cardBg,border:`1px solid ${border}`,borderRadius:12,padding:"18px 20px"}}><pre style={{fontSize:12,color:isDark?"#a5b4fc":"#4f46e5",lineHeight:1.7,whiteSpace:"pre-wrap",fontFamily:"'Consolas','Monaco',monospace",margin:0}}>{htmlResult}</pre></div>}
          {isTistory&&viewMode==="preview"&&htmlResult&&<div style={{background:"#fff",border:"1px solid #e9ecef",borderRadius:12,padding:"24px 28px"}} dangerouslySetInnerHTML={{__html:DOMPurify.sanitize(htmlResult,{ALLOWED_TAGS:["b","i","u","strong","em","br","p","div","span","a","img","ul","ol","li","h1","h2","h3","h4","blockquote","pre","code","hr","table","thead","tbody","tr","td","th"],ALLOWED_ATTR:["href","src","alt","style","class","target","rel","width","height"]})}}/>}

          {publishResult&&<div style={{marginTop:14,padding:"16px 18px",borderRadius:14,display:"flex",alignItems:"center",gap:14,background:publishResult.success?(isDark?"rgba(74,222,128,0.08)":"#f0fdf4"):(isDark?"rgba(245,158,11,0.08)":"#fffbeb"),border:`1px solid ${publishResult.success?"rgba(74,222,128,0.25)":"rgba(245,158,11,0.25)"}`}}>
            <div style={{width:36,height:36,borderRadius:10,background:publishResult.success?"rgba(34,197,94,0.15)":publishResult.clipboard?"rgba(245,158,11,0.15)":"rgba(239,68,68,0.15)",color:publishResult.success?"#22c55e":publishResult.clipboard?"#f59e0b":"#ef4444",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              {publishResult.success
                ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                : publishResult.clipboard
                  ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                  : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>}
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:14,fontWeight:800,color:publishResult.success?"#22c55e":publishResult.clipboard?"#f59e0b":"#ef4444"}}>{publishResult.success?t("bg_publishSuccessMsg"):publishResult.clipboard?t("bg_clipboardCopied"):t("bg_publishFailMsg")}</div>
              {publishResult.postUrl&&<a href={publishResult.postUrl} target="_blank" rel="noopener" style={{fontSize:13,color:accent,fontWeight:600}}>게시글 확인 →</a>}
              {publishResult.message&&<div style={{fontSize:13,color:muted,marginTop:2}}>{publishResult.message}</div>}
              {publishResult.error&&<div style={{fontSize:13,color:"#ef4444",marginTop:2}}>{publishResult.error}</div>}
            </div>
            <button onClick={()=>setPublishResult(null)} style={{background:"none",border:"none",color:muted,cursor:"pointer",padding:8,display:"flex",alignItems:"center",justifyContent:"center",minHeight:36,minWidth:36,borderRadius:8}} aria-label="닫기">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>}
          {/* 예약 발행 UI */}
          {showSchedule && result && (
            <div style={{marginTop:12,padding:"16px",borderRadius:12,background:isDark?"rgba(124,106,255,0.08)":"rgba(124,106,255,0.04)",border:`1px solid ${isDark?"rgba(124,106,255,0.2)":"rgba(124,106,255,0.1)"}`}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
                <span style={{fontSize:15,fontWeight:800,color:text}}>스레드 예약 발행</span>
                <button onClick={()=>setShowSchedule(false)} style={{background:"none",border:"none",color:muted,cursor:"pointer",padding:8,display:"flex",alignItems:"center",justifyContent:"center",minHeight:36,minWidth:36,borderRadius:8}} aria-label="닫기">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
              {!snsConns.some(c=>c.platform==="threads") ? (
                <div style={{textAlign:"center",padding:"12px 0"}}>
                  <div style={{fontSize:13,color:muted,marginBottom:10}}>스레드 계정을 먼저 연동해주세요</div>
                  <button onClick={()=>{if(!user){if(onLoginRequest)onLoginRequest()}else{try{window.location.href="/mypage"}catch{}}}}
                    style={{padding:"10px 20px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#7c6aff,#8b5cf6)",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"}}>
                    {user?t("bg_goLinkAccount"):t("bg_loginThenLink")}
                  </button>
                </div>
              ) : (
                <>
                  <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                    <input type="datetime-local" value={scheduleTime} onChange={e=>setScheduleTime(e.target.value)}
                      min={new Date(Date.now()+600000).toISOString().slice(0,16)}
                      style={{flex:1,padding:"10px 12px",borderRadius:10,border:`1px solid ${isDark?"rgba(255,255,255,0.1)":"#ddd"}`,background:isDark?"rgba(255,255,255,0.06)":"#fff",color:text,fontSize:13,minWidth:180}} />
                    <button onClick={()=>handlePublish("threads",scheduleTime)} disabled={!scheduleTime||publishing}
                      style={{padding:"10px 20px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#7c6aff,#8b5cf6)",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",opacity:!scheduleTime||publishing?0.5:1,display:"flex",alignItems:"center",gap:5,whiteSpace:"nowrap"}}>
                      <img src="/icon-threads.png" alt="" style={{width:14,height:14,objectFit:"contain",borderRadius:2,filter:"brightness(10)"}} />
                      {publishing?t("bg_scheduling"):t("bg_schedulePublish")}
                    </button>
                  </div>
                  <div style={{fontSize:10,color:muted,marginTop:6}}>최소 10분 후 ~ 최대 75일 후 예약 가능</div>
                </>
              )}
            </div>
          )}
          {/* 연관 이미지 추천 — 제거됨 (통합 UI 간소화) */}
        </div>
      </div>
    );
  };

  // eslint-disable-next-line no-unused-vars
  const [mobileTab, setMobileTab] = useState("input");
  // 표시 모드: 입력(검색창) vs 생성중/결과
  const showResult = (mode === "write" && ((loading || (genStep > 0 && genStep < 5)) || (!loading && genStep === 5 && result)));

  // 파일 입력 핸들러 (드래그앤드롭/버튼 공용)
  const [fileLoading, setFileLoading] = useState(false);
  const [fileLoadMsg, setFileLoadMsg] = useState("");

  const handleFileInput = async (fileList) => {
    if (!fileList.length) return;
    const maxSize = 10 * 1024 * 1024;
    const valid = fileList.filter(f => f.size <= maxSize);
    if (valid.length < fileList.length) alert(`${fileList.length - valid.length}개 파일이 10MB 초과로 제외되었습니다.`);
    if (!valid.length) return;
    setFileLoading(true);
    setFileLoadMsg(`${valid.length}개 파일을 불러오는 중입니다. 잠시만 기다려주세요...`);
    const prevFiles = fields._files || [];
    const newFiles = [...prevFiles];
    let allResults = "";
    for (let fi = 0; fi < valid.length; fi++) {
      const file = valid[fi];
      setFileLoadMsg(`파일 분석 중... (${fi + 1}/${valid.length}) ${file.name}`);
      try {
        if (file.type.startsWith("image/")) {
          const base64 = await new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(file); });
          const txt = await callAI("claude-haiku-4-5", [{role:"user",content:[{type:"image",source:{type:"base64",media_type:file.type,data:base64.split(",")[1]}},{type:"text",text:"이 이미지의 내용을 한국어로 상세히 설명해주세요. 블로그 글 주제로 사용할 수 있게 핵심 키워드와 설명을 제공해주세요."}]}], 500);
          allResults += `\n[${file.name}] 이미지: ${txt.slice(0, 200)}`;
          newFiles.push({ name: file.name, type: "image", summary: txt.slice(0, 200), b64: base64, mime: file.type });
        } else {
          const text2 = await file.text().catch(() => "");
          const summary = text2.slice(0, 2000);
          allResults += `\n[${file.name}] ${summary.slice(0, 300)}`;
          newFiles.push({ name: file.name, type: "text", summary: summary.slice(0, 300) });
        }
      } catch(err) {
        allResults += `\n[${file.name}] 분석 실패: ${err.message}`;
      }
    }
    if (!fields.keyword && allResults) {
      const firstLine = allResults.split("\n").find(l => l.trim().length > 10)?.trim()?.slice(0,80);
      if (firstLine) setField("keyword", firstLine);
    }
    setField("extra", (fields.extra?.replace(/\d+개 파일 분석 중\.\.\./, "").replace("파일 분석 중...", "") || "") + "참고 파일:" + allResults);
    setField("_files", newFiles);
    setFileLoading(false);
    setFileLoadMsg("");
  };

  // URL 자동 감지
  // 유튜브 URL 감지 헬퍼
  const isYoutubeUrl = (url) => /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/.test(url);
  const detectedYoutubeUrl = fields.keyword ? fields.keyword.match(/https?:\/\/[^\s]*(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)[^\s]*/)?.[0] : null;

  const handleMainInput = (val) => {
    setField("keyword", val);
    const urlMatch = val.match(/https?:\/\/[^\s]+/);
    if (urlMatch && !urlResult && !urlLoading) {
      setUrlInput(urlMatch[0]);
    }
  };

  // textarea 자동 높이
  const autoResize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  };

  // 현재 선택된 플랫폼 정보
  const currentPlatform = SNS_OPTIONS.find(p => p.id === platformId) || SNS_OPTIONS[0];

  const content = (
    <div style={{display:"flex",flex:1,height:"100%",overflow:"hidden",flexDirection:"column"}}
      onDragEnter={e=>{e.preventDefault();e.stopPropagation();dragCounter.current++;setDragOver(true);}}
      onDragOver={e=>{e.preventDefault();e.stopPropagation();}}
      onDragLeave={e=>{e.preventDefault();e.stopPropagation();dragCounter.current--;if(dragCounter.current<=0){dragCounter.current=0;setDragOver(false);}}}
      onDrop={e=>{e.preventDefault();e.stopPropagation();dragCounter.current=0;setDragOver(false);const files=Array.from(e.dataTransfer.files||[]);if(files.length)handleFileInput(files);}}>
      {/* 다시 생성 확인 모달 */}
      {showRegenConfirm && (
        <div style={{position:"fixed",inset:0,zIndex:9999,background:"rgba(0,0,0,0.6)",display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(4px)"}}>
          <div style={{background:isDark?"rgba(18,16,58,0.98)":"#fff",border:"1px solid rgba(124,106,255,0.25)",borderRadius:20,padding:"36px 32px",maxWidth:"min(380px,90vw)",width:"90%",textAlign:"center",boxShadow:"0 24px 64px rgba(0,0,0,0.3)"}}>
            <div style={{width:44,height:44,borderRadius:12,background:"rgba(99,102,241,0.1)",display:"inline-flex",alignItems:"center",justifyContent:"center",marginBottom:14}}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#7c6aff" strokeWidth="2"><path d="M1 4v6h6M23 20v-6h-6"/><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4-4.64 4.36A9 9 0 0 1 3.51 15"/></svg>
            </div>
            <div style={{fontSize:18,fontWeight:900,color:text,marginBottom:8}}>{t("regenTitle")}</div>
            <div style={{fontSize:13,color:muted,lineHeight:1.8,marginBottom:24,whiteSpace:"pre-line"}}>{t("regenDesc")}</div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>setShowRegenConfirm(false)}
                style={{flex:1,padding:"11px",borderRadius:12,border:`1px solid ${border}`,background:"transparent",color:muted,fontSize:14,fontWeight:700,cursor:"pointer"}}>
                취소
              </button>
              <button onClick={()=>{ setShowRegenConfirm(false); setResult(""); setHtmlResult(""); generate(); }}
                style={{flex:1,padding:"11px",borderRadius:12,border:"none",background:"linear-gradient(135deg,#7c6aff,#8b5cf6)",color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer"}}>
                {t("regenBtn")}
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{`
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes bl-step-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
        .blog-section-wrap:hover .section-ai-btn{opacity:1!important}
        .blog-section-wrap{border-left:2px solid transparent;padding-left:4px;transition:border-color 0.15s}
        .blog-section-wrap:hover{border-left-color:rgba(124,106,255,0.2)}
        @keyframes bl-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
        @keyframes bl-progress{from{width:0%}to{width:100%}}
        @keyframes bl-fadein{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes bl-popin{from{opacity:0;transform:scale(0.85)}to{opacity:1;transform:scale(1)}}
        .tistory-content h1,.tistory-content h2{font-size:20px;font-weight:700;margin:20px 0 10px}
        .tistory-content h3{font-size:16px;font-weight:700;margin:14px 0 8px}
        .tistory-content p{margin:8px 0;line-height:1.8}
        .tistory-content ul{padding-left:20px;margin:8px 0}
        .tistory-content li{margin:4px 0}
        .bl-search-textarea{scrollbar-width:thin;scrollbar-color:${isDark?"rgba(255,255,255,0.15)":"#ddd"} transparent;}
        .bl-search-textarea::-webkit-scrollbar{width:4px}
        .bl-search-textarea::-webkit-scrollbar-thumb{background:${isDark?"rgba(255,255,255,0.15)":"#ddd"};border-radius:4px}
        .bl-platform-chip:hover{transform:translateY(-1px);box-shadow:0 2px 8px rgba(0,0,0,0.1)}
        .bl-settings-panel{animation:bl-fadein 0.2s ease}
        @media(max-width:768px){
          .bl-search-wrap{padding:0 16px!important}
          .bl-search-box{padding:16px 16px 12px!important}
          .bl-search-textarea{font-size:16px!important}
          .bl-platform-chips{gap:8px!important;padding:0 16px!important}
          .bl-platform-chip{padding:8px 14px!important;font-size:12px!important}
          .bl-result-header{padding:6px 12px!important;gap:4px!important}
          .bl-result-header>div{flex-wrap:wrap!important}
        }
        @media(max-width:480px){
          .bl-search-wrap{padding:0 12px!important}
          .bl-search-box{padding:14px 14px 10px!important}
          .bl-platform-chips{gap:6px!important;padding:0 12px!important}
          .bl-platform-chip{padding:7px 12px!important;font-size:11px!important}
          .bl-settings-grid{grid-template-columns:1fr!important}
        }
      `}</style>

      {/* 드래그 오버레이 */}
      {dragOver && (
        <div style={{position:"absolute",inset:0,zIndex:100,background:isDark?"rgba(99,102,241,0.15)":"rgba(99,102,241,0.08)",border:`3px dashed ${accent}`,borderRadius:16,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(2px)"}}>
          <div style={{textAlign:"center"}}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
            <div style={{marginTop:12,fontSize:16,fontWeight:800,color:accent}}>파일을 여기에 놓으세요</div>
            <div style={{fontSize:13,color:muted,marginTop:4}}>이미지, PDF, 문서 파일 (10MB 이하)</div>
          </div>
        </div>
      )}

      <div style={{flex:1,overflowY: (shortsMode && videoSubMode) || (mode==="design" && designStep==="editor") ? "hidden" : "auto",position:"relative",display: (shortsMode && videoSubMode) || (mode==="design" && designStep==="editor") ? "flex" : "block",flexDirection:"column"}}>
        {/* ══════ 입력 화면 (검색창 스타일) ══════ */}
        {!showResult && !(mode==="design" && designStep==="editor" && designSlides) && (
          <div className="bl-search-wrap" style={{maxWidth:720,margin:"0 auto",padding:"0 24px",display:"flex",flexDirection:"column",justifyContent: (shortsMode && videoSubMode) ? "flex-start" : "center",minHeight: (shortsMode && videoSubMode) ? "auto" : "100%",flexShrink:0}}>
            {/* 타이틀 */}
            <div style={{textAlign:"center",marginBottom:32}}>
              <div style={{fontSize:28,fontWeight:900,color:text,letterSpacing:-0.5,lineHeight:1.3}}>
                무엇을 만들어볼까요?
              </div>
              <div style={{fontSize:14,color:muted,marginTop:8,lineHeight:1.6}}>
                주제, 링크, 파일을 자유롭게 입력하세요. 유튜브 링크로 쇼츠도 만들 수 있어요
              </div>
            </div>

            {/* 모드 선택 칩 */}
            <div style={{display:"flex",justifyContent:"center",gap:8,marginBottom:16,flexWrap:"wrap"}}>
              {[
                {id:"write", label:t("bg_tabWrite"), color:"#7c6aff", icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>},
                {id:"design", label:t("bg_tabDesign"), color:"#7c6aff", icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>},
                {id:"shorts", label:t("bg_tabVideo"), color:"#7c6aff", icon:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>},
              ].map(m => {
                const isActive = m.id==="shorts" ? shortsMode : mode===m.id && !shortsMode;
                return (
                <button key={m.id} onClick={()=>{if(m.id==="shorts"){setShortsMode(true);setVideoSubMode(null);setShortsYtUrl("");}else{setShortsMode(false);setVideoSubMode(null);setMode(m.id);if(m.id==="design"){setDesignSlides(null);setDesignStep("input");}}}} style={{
                  padding:"10px 20px", borderRadius:20,
                  border: isActive ? `2px solid ${m.color}` : `1.5px solid ${border}`,
                  background: isActive ? (isDark?`${m.color}15`:`${m.color}08`) : "transparent",
                  color: isActive ? m.color : muted,
                  fontSize:14, fontWeight: isActive?800:600,
                  cursor:"pointer", display:"flex", alignItems:"center", gap:6,
                  fontFamily:"inherit", transition:"all 0.15s",
                }}>
                  {m.icon} {m.label}
                </button>
              );})}
            </div>

            {/* 영상 모드: 모드 칩 아래에 인라인으로 에디터 표시 */}
            {shortsMode ? (
              null /* 아래 별도 블록에서 렌더링 — 검색창/설정을 숨기기 위해 여기서 차단 */
            ) : mode==="design" ? (
              /* ═══ 디자인(카드뉴스) 모드 ═══ */
              <div style={{maxWidth:720,margin:"0 auto",width:"100%"}}>

                {/* ── 1단계: 입력 ── */}
                {designStep==="input" && (<>
                <div style={{textAlign:"center",marginBottom:16}}>
                  <div style={{fontSize:13,color:muted,lineHeight:1.6}}>{t("bg_designDesc")}</div>
                </div>

                <div className="bl-search-box" style={{
                  background:inputBg,
                  border:`1.5px solid ${error&&!fields.keyword?.trim()?"#ef4444":inputBdr}`,
                  borderRadius:24,
                  padding:"18px 20px 14px",
                  boxShadow:isDark?"0 4px 24px rgba(0,0,0,0.3)":"0 4px 24px rgba(0,0,0,0.06)",
                }}>
                  <textarea
                    ref={textareaRef}
                    className="bl-search-textarea"
                    value={fields.keyword||""}
                    onChange={e=>{handleMainInput(e.target.value);setTimeout(autoResize,0);}}
                    onKeyDown={e=>{
                      if(e.key==="Enter"&&!e.shiftKey){
                        e.preventDefault();
                        if(fields.keyword?.trim())handleGenerateClick();
                      }
                    }}
                    placeholder={t("bg_designPlaceholder")}
                    rows={3}
                    style={{
                      width:"100%",border:"none",background:"transparent",color:text,
                      fontSize:15,fontFamily:"inherit",outline:"none",resize:"none",
                      lineHeight:1.6,minHeight:72,maxHeight:300,
                      boxSizing:"border-box",padding:0,
                    }}
                  />

                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:12,paddingTop:10,borderTop:`1px solid ${border}`}}>
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      <button onClick={()=>setShowLibraryPicker(!showLibraryPicker)}
                        style={{padding:"7px 14px",borderRadius:12,border:`1px solid ${showLibraryPicker?accent:border}`,background:showLibraryPicker?(isDark?"rgba(99,102,241,0.12)":"rgba(99,102,241,0.06)"):"transparent",color:showLibraryPicker?accent:muted,fontSize:13,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:5,fontFamily:"inherit",transition:"all 0.15s"}}
                        onMouseEnter={e=>{if(!showLibraryPicker){e.currentTarget.style.borderColor=accent;e.currentTarget.style.color=accent;}}}
                        onMouseLeave={e=>{if(!showLibraryPicker){e.currentTarget.style.borderColor=border;e.currentTarget.style.color=muted;}}}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>
                        {t("bg_designFromLibrary")}
                      </button>
                    </div>
                    <button onClick={handleGenerateClick} disabled={designLoading||!fields.keyword?.trim()}
                      style={{
                        padding:"8px 22px",borderRadius:14,border:"none",
                        cursor:designLoading||!fields.keyword?.trim()?"not-allowed":"pointer",
                        background:fields.keyword?.trim()?"linear-gradient(135deg,#7c6aff,#8b5cf6)":(isDark?"rgba(99,102,241,0.2)":"#e9ecef"),
                        color:fields.keyword?.trim()?"#fff":muted,fontSize:14,fontWeight:800,
                        display:"flex",alignItems:"center",gap:6,
                        opacity:designLoading||!fields.keyword?.trim()?0.5:1,
                        transition:"all 0.15s",minHeight:38,fontFamily:"inherit",
                        boxShadow:fields.keyword?.trim()?"0 4px 14px rgba(124,106,255,0.3)":"none",
                      }}>
                      {designLoading ? (
                        <><div style={{width:14,height:14,border:"2px solid rgba(255,255,255,0.3)",borderTop:"2px solid #fff",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>생성 중</>
                      ) : (
                        <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/></svg>생성{user && <span style={{fontSize:11,opacity:0.85,fontWeight:600,marginLeft:2,background:"rgba(255,255,255,0.18)",padding:"2px 8px",borderRadius:8}}>30P</span>}{!user && <span style={{fontSize:11,opacity:0.85,fontWeight:600,marginLeft:2,background:"rgba(255,255,255,0.18)",padding:"2px 8px",borderRadius:8}}>무료</span>}</>
                      )}
                    </button>
                  </div>
                </div>

                {/* 보관함 글 목록 */}
                {showLibraryPicker && (()=>{
                  let saves = [];
                  try { saves = JSON.parse(localStorage.getItem("sns_blog_saves_v1") || "[]"); } catch {}
                  return (
                    <div style={{marginTop:12,background:cardBg,border:`1px solid ${border}`,borderRadius:16,padding:"16px",maxHeight:280,overflowY:"auto",boxShadow:isDark?"0 4px 20px rgba(0,0,0,0.3)":"0 4px 20px rgba(0,0,0,0.08)"}}>
                      {saves.length === 0 ? (
                        <div style={{textAlign:"center",padding:"20px 0",color:muted,fontSize:13}}>저장된 글이 없습니다</div>
                      ) : saves.slice(0,20).map((s,i) => (
                        <div key={s.id||i} onClick={()=>{
                          handleMainInput(s.content || s.title || "");
                          setShowLibraryPicker(false);
                          setTimeout(autoResize,0);
                        }}
                          style={{padding:"10px 14px",borderRadius:12,cursor:"pointer",marginBottom:4,transition:"background 0.1s",display:"flex",alignItems:"center",gap:10}}
                          onMouseEnter={e=>e.currentTarget.style.background=isDark?"rgba(255,255,255,0.06)":"#f5f5ff"}
                          onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:13,fontWeight:700,color:text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.title}</div>
                            <div style={{fontSize:11,color:muted,marginTop:2}}>{s.date} {s.type && <span style={{opacity:0.7}}>({s.type})</span>}</div>
                          </div>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {error&&<div style={{marginTop:12,fontSize:13,color:"#ef4444",display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",padding:"10px 14px",borderRadius:12,background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.2)"}}>{error}
                  {(error.includes("포인트") || error.includes("충전") || error.includes("무료 횟수")) && (
                    <button onClick={()=>window.location.hash="#pricing"} style={{padding:"6px 14px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#7c6aff,#8b5cf6)",color:"#fff",fontSize:12,fontWeight:800,cursor:"pointer",whiteSpace:"nowrap"}}>충전하기</button>
                  )}
                </div>}

                {designLoading && (
                  <div style={{marginTop:24,textAlign:"center",padding:"40px 0"}}>
                    <div style={{width:48,height:48,borderRadius:"50%",border:`3px solid ${accent}22`,borderTopColor:accent,animation:"spin 0.8s linear infinite",margin:"0 auto"}}/>
                    <div style={{marginTop:16,fontSize:15,fontWeight:700,color:text}}>{t("bg_designGenerating")}</div>
                    <div style={{marginTop:6,fontSize:12,color:muted}}>AI가 내용을 분석하여 카드뉴스를 구성하고 있습니다...</div>
                  </div>
                )}
                </>)}

                {/* ── 2단계: 미리보기/문구 편집 ── */}
                {designStep==="preview" && designSlides && (<>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
                  <button onClick={()=>{setDesignStep("input");setDesignSlides(null);}}
                    style={{padding:"6px 14px",borderRadius:10,border:`1px solid ${border}`,background:"transparent",color:text,fontSize:13,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:4,fontFamily:"inherit"}}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
                    다시 입력
                  </button>
                  <div style={{fontSize:14,fontWeight:800,color:text}}>카드뉴스 미리보기 ({designSlides.length}장)</div>
                  <button onClick={()=>setDesignStep("editor")}
                    style={{padding:"8px 20px",borderRadius:12,border:"none",background:"linear-gradient(135deg,#7c6aff,#8b5cf6)",color:"#fff",fontSize:13,fontWeight:800,cursor:"pointer",display:"flex",alignItems:"center",gap:5,fontFamily:"inherit",boxShadow:"0 4px 14px rgba(124,106,255,0.3)"}}>
                    디자인 편집
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  </button>
                </div>

                <div style={{display:"flex",flexDirection:"column",gap:12}}>
                  {designSlides.map((slide,idx) => (
                    <div key={idx} style={{background:cardBg,border:`1px solid ${border}`,borderRadius:16,padding:"18px 20px",transition:"box-shadow 0.15s",boxShadow:isDark?"0 2px 12px rgba(0,0,0,0.2)":"0 2px 12px rgba(0,0,0,0.04)"}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
                        <span style={{width:28,height:28,borderRadius:"50%",background:`${accent}15`,color:accent,fontSize:13,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{idx+1}</span>
                        <span style={{fontSize:12,color:muted,fontWeight:600}}>{idx===0?"표지":"슬라이드"} {idx===designSlides.length-1&&idx>0?"(마지막)":""}</span>
                      </div>

                      {/* 제목 */}
                      <div style={{marginBottom:8}}>
                        <div style={{fontSize:11,color:muted,fontWeight:600,marginBottom:4}}>제목</div>
                        <input value={slide.title} onChange={e=>{
                          const next=[...designSlides]; next[idx]={...next[idx],title:e.target.value}; setDesignSlides(next);
                        }} style={{width:"100%",padding:"8px 12px",borderRadius:10,border:`1px solid ${inputBdr}`,background:inputBg,color:text,fontSize:15,fontWeight:800,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}}/>
                      </div>

                      {/* 부제목 */}
                      <div style={{marginBottom:8}}>
                        <div style={{fontSize:11,color:muted,fontWeight:600,marginBottom:4}}>부제목</div>
                        <input value={slide.subtitle||""} onChange={e=>{
                          const next=[...designSlides]; next[idx]={...next[idx],subtitle:e.target.value}; setDesignSlides(next);
                        }} style={{width:"100%",padding:"7px 12px",borderRadius:10,border:`1px solid ${inputBdr}`,background:inputBg,color:text,fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}}/>
                      </div>

                      {/* 본문 */}
                      <div style={{marginBottom:8}}>
                        <div style={{fontSize:11,color:muted,fontWeight:600,marginBottom:4}}>본문</div>
                        <textarea value={slide.body||""} onChange={e=>{
                          const next=[...designSlides]; next[idx]={...next[idx],body:e.target.value}; setDesignSlides(next);
                        }} rows={2} style={{width:"100%",padding:"7px 12px",borderRadius:10,border:`1px solid ${inputBdr}`,background:inputBg,color:text,fontSize:13,fontFamily:"inherit",outline:"none",resize:"vertical",lineHeight:1.6,boxSizing:"border-box"}}/>
                      </div>

                      {/* 핵심문구 */}
                      <div>
                        <div style={{fontSize:11,color:muted,fontWeight:600,marginBottom:4}}>핵심문구</div>
                        <input value={slide.highlight||""} onChange={e=>{
                          const next=[...designSlides]; next[idx]={...next[idx],highlight:e.target.value}; setDesignSlides(next);
                        }} style={{width:"100%",padding:"7px 12px",borderRadius:10,border:`1px solid ${inputBdr}`,background:inputBg,color:text,fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box"}}/>
                      </div>

                      {/* 삭제 버튼 */}
                      {designSlides.length > 2 && (
                        <div style={{marginTop:10,textAlign:"right"}}>
                          <button onClick={()=>{const next=[...designSlides]; next.splice(idx,1); setDesignSlides(next);}}
                            style={{padding:"4px 12px",borderRadius:8,border:`1px solid rgba(239,68,68,0.3)`,background:"transparent",color:"#ef4444",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>
                            삭제
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* 하단 고정 버튼 */}
                <div style={{marginTop:20,display:"flex",justifyContent:"center",gap:10,paddingBottom:20}}>
                  <button onClick={()=>{
                    setDesignSlides([...designSlides, {title:"",subtitle:"",body:"",highlight:"",bgColor:"#1c1c1e",textColor:"#ffffff",fontSize:42,fontFamily:"Pretendard"}]);
                  }} style={{padding:"10px 20px",borderRadius:12,border:`1.5px solid ${border}`,background:"transparent",color:text,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:5}}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    슬라이드 추가
                  </button>
                  <button onClick={()=>setDesignStep("editor")}
                    style={{padding:"10px 28px",borderRadius:12,border:"none",background:"linear-gradient(135deg,#7c6aff,#8b5cf6)",color:"#fff",fontSize:14,fontWeight:800,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:6,boxShadow:"0 4px 14px rgba(124,106,255,0.3)"}}>
                    디자인 편집으로 이동
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  </button>
                </div>
                </>)}
              </div>
            ) : (
            <>
            {/* 현재 선택된 플랫폼 표시 (글쓰기 모드에서만) */}
            {mode==="write" && (
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginBottom:14}}>
              <div style={{display:"flex",alignItems:"center",gap:6,padding:"6px 14px",borderRadius:20,background:isDark?"rgba(255,255,255,0.06)":"#f5f5f5",fontSize:13,color:text,fontWeight:700}}>
                <div style={{width:20,height:20,display:"flex",alignItems:"center",justifyContent:"center",color:currentPlatform.color||muted}}>
                  {currentPlatform.svg ? <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">{currentPlatform.svg.props.children}</svg> : <img src={currentPlatform.icon} alt="" style={{width:16,height:16,borderRadius:3,objectFit:"contain"}} onError={e=>{e.target.style.display="none"}}/>}
                </div>
                {currentPlatform.label}
                <span style={{fontSize:11,color:muted,fontWeight:500}}>/ {cfg.subtypes.find(s=>s.id===subtype)?.label||cfg.subtypes[0].label}</span>
              </div>
            </div>
            )}

            {/* 메인 검색창 */}
            <div className="bl-search-box" style={{
              background:inputBg,
              border:`1.5px solid ${dragOver?accent:(error&&!fields.keyword?.trim()?"#ef4444":inputBdr)}`,
              borderRadius:24,
              padding:"18px 20px 14px",
              boxShadow:isDark?"0 4px 24px rgba(0,0,0,0.3)":"0 4px 24px rgba(0,0,0,0.06)",
              transition:"border-color 0.2s, box-shadow 0.2s",
            }}>
              <textarea
                ref={textareaRef}
                className="bl-search-textarea"
                value={fields.keyword||""}
                onChange={e=>{handleMainInput(e.target.value);setTimeout(autoResize,0);}}
                onKeyDown={e=>{
                  if(e.key==="Enter"&&!e.shiftKey){
                    e.preventDefault();
                    if(fields.keyword?.trim())handleGenerateClick();
                  }
                }}
                placeholder={FIELD_LABELS.keyword?.placeholder || "주제, 링크, 또는 유튜브 URL을 입력하세요"}
                rows={1}
                style={{
                  width:"100%",border:"none",background:"transparent",color:text,
                  fontSize:15,fontFamily:"inherit",outline:"none",resize:"none",
                  lineHeight:1.6,minHeight:24,maxHeight:200,
                  boxSizing:"border-box",padding:0,
                }}
              />

              {/* 링크 입력 필드 */}
              {showLinkInput && !urlResult && (
                <div style={{marginTop:10,display:"flex",gap:8,alignItems:"center"}}>
                  <input value={urlInput} onChange={e=>setUrlInput(e.target.value)}
                    onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();fetchFromUrl();}}}
                    placeholder="https:// 로 시작하는 주소를 붙여넣기"
                    style={{flex:1,padding:"10px 14px",borderRadius:12,border:`1px solid ${inputBdr}`,background:isDark?"rgba(255,255,255,0.04)":"#f9f9fb",color:text,fontSize:13,fontFamily:"inherit",outline:"none"}}/>
                  <button onClick={fetchFromUrl} disabled={urlLoading||!urlInput.trim()}
                    style={{padding:"10px 18px",borderRadius:12,border:"none",background:accent,color:"#fff",fontSize:13,fontWeight:700,cursor:urlLoading||!urlInput.trim()?"not-allowed":"pointer",opacity:urlLoading||!urlInput.trim()?0.5:1,whiteSpace:"nowrap",flexShrink:0}}>
                    {urlLoading?t("bg_fetchingUrl"):t("bg_fetchBtn")}
                  </button>
                </div>
              )}

              {/* URL 감지 알림 + 유튜브면 쇼츠 버튼도 표시 */}
              {!showLinkInput && urlInput && !urlResult && !urlLoading && (
                <div style={{marginTop:10,display:"flex",alignItems:"center",gap:8,padding:"8px 12px",borderRadius:12,background:isDark?"rgba(99,102,241,0.08)":"rgba(99,102,241,0.05)",border:`1px solid ${accent}22`,flexWrap:"wrap"}}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
                  <span style={{fontSize:12,color:accent,fontWeight:600,flex:1}}>{detectedYoutubeUrl?t("bg_ytLinkDetected"):t("bg_linkDetected")}</span>
                  <button onClick={fetchFromUrl} style={{padding:"4px 12px",borderRadius:8,border:"none",background:accent,color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"}}>글로 작성하기</button>
                  {detectedYoutubeUrl && (
                    <button onClick={handleShortsStart} style={{padding:"4px 12px",borderRadius:8,border:"none",background:"linear-gradient(135deg,#ef4444,#f97316)",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:4}}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                      쇼츠 만들기
                    </button>
                  )}
                </div>
              )}
              {urlLoading && (
                <div style={{marginTop:10,display:"flex",alignItems:"center",gap:8,fontSize:12,color:muted}}>
                  <div style={{width:12,height:12,borderRadius:"50%",border:"2px solid "+accent,borderTopColor:"transparent",animation:"spin 0.8s linear infinite"}}/>
                  링크 불러오는 중...
                </div>
              )}
              {urlResult && (
                <div style={{marginTop:10,padding:"10px 12px",borderRadius:12,background:isDark?"rgba(255,255,255,0.04)":"#f9f9fb",border:`1px solid ${border}`,display:"flex",gap:10,alignItems:"center"}}>
                  {urlResult.thumbnail && <img src={urlResult.thumbnail} alt="" style={{width:48,height:36,objectFit:"cover",borderRadius:6,flexShrink:0}} onError={e=>e.target.style.display="none"}/>}
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,fontWeight:800,color:text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{urlResult.title}</div>
                    <div style={{fontSize:11,color:"#22c55e",marginTop:2,fontWeight:700,display:"flex",alignItems:"center",gap:4}}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      {urlResult.type==="youtube"?t("bg_ytAnalyzed"):urlResult.type==="news"?t("bg_newsAnalyzed"):t("bg_webAnalyzed")} {t("bg_analyzeComplete")}
                    </div>
                  </div>
                  <button onClick={()=>{setUrlResult(null);setUrlInput("");}} style={{background:"none",border:"none",cursor:"pointer",color:muted,padding:4}}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              )}

              {/* 파일 로딩 메시지 */}
              {fileLoading && (
                <div style={{marginTop:10,display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderRadius:12,background:isDark?"rgba(236,72,153,0.08)":"rgba(236,72,153,0.05)",border:`1px solid rgba(236,72,153,0.2)`}}>
                  <div style={{width:16,height:16,borderRadius:"50%",border:"2.5px solid #ec4899",borderTopColor:"transparent",animation:"spin 0.8s linear infinite",flexShrink:0}}/>
                  <span style={{fontSize:13,color:"#ec4899",fontWeight:600}}>{fileLoadMsg}</span>
                </div>
              )}

              {/* 첨부 파일 표시 */}
              {fields._files && fields._files.length > 0 && (
                <div style={{marginTop:10,display:"flex",flexWrap:"wrap",gap:6}}>
                  {fields._files.map((f,i) => (
                    <span key={i} style={{fontSize:12,padding:"5px 10px",borderRadius:8,background:isDark?"rgba(236,72,153,0.12)":"rgba(236,72,153,0.08)",color:"#ec4899",display:"inline-flex",alignItems:"center",gap:6,fontWeight:700}}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                      {f.name}
                      <button onClick={()=>{const nf=[...fields._files];nf.splice(i,1);setField("_files",nf);}} style={{background:"none",border:"none",cursor:"pointer",color:"inherit",padding:0,display:"flex",alignItems:"center",opacity:0.7}} aria-label="제거">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* 하단 툴바 */}
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:12,paddingTop:10,borderTop:`1px solid ${border}`}}>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  {/* 파일 추가 버튼 (글쓰기/이미지 모드) */}
                  {true && (<>
                  <input type="file" accept="image/*,.pdf,.txt,.doc,.docx,.csv,.xlsx,.pptx,.hwp" multiple style={{display:"none"}} id="blog-file-input"
                    onChange={e=>{const files=Array.from(e.target.files||[]);e.target.value="";if(files.length)handleFileInput(files);}}/>
                  <button onClick={()=>document.getElementById("blog-file-input")?.click()}
                    title={t("bg_fileAttach")}
                    style={{padding:"7px 14px",borderRadius:12,border:`1px solid ${border}`,background:"transparent",color:muted,fontSize:13,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:5,fontFamily:"inherit",transition:"all 0.15s"}}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor=accent;e.currentTarget.style.color=accent;}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor=border;e.currentTarget.style.color=muted;}}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>
                    파일
                  </button>
                  </>)}
                  {/* 링크 버튼 (글쓰기 모드만) */}
                  {mode==="write" && (
                  <button onClick={()=>setShowLinkInput(!showLinkInput)}
                    title={t("bg_linkPaste")}
                    style={{padding:"7px 14px",borderRadius:12,border:`1px solid ${showLinkInput?accent:border}`,background:showLinkInput?(isDark?"rgba(99,102,241,0.12)":"rgba(99,102,241,0.06)"):"transparent",color:showLinkInput?accent:muted,fontSize:13,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:5,fontFamily:"inherit",transition:"all 0.15s"}}
                    onMouseEnter={e=>{if(!showLinkInput){e.currentTarget.style.borderColor=accent;e.currentTarget.style.color=accent;}}}
                    onMouseLeave={e=>{if(!showLinkInput){e.currentTarget.style.borderColor=border;e.currentTarget.style.color=muted;}}}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
                    링크
                  </button>
                  )}
                  {/* 설정 버튼 (쇼츠 모드에서 숨김) */}
                  {true && (
                  <button onClick={()=>setShowSettings(!showSettings)}
                    title={t("bg_postSettingsBtn")}
                    style={{padding:"7px 14px",borderRadius:12,border:`1px solid ${showSettings?accent:border}`,background:showSettings?(isDark?"rgba(99,102,241,0.12)":"rgba(99,102,241,0.06)"):"transparent",color:showSettings?accent:muted,fontSize:13,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:5,fontFamily:"inherit",transition:"all 0.15s"}}
                    onMouseEnter={e=>{if(!showSettings){e.currentTarget.style.borderColor=accent;e.currentTarget.style.color=accent;}}}
                    onMouseLeave={e=>{if(!showSettings){e.currentTarget.style.borderColor=border;e.currentTarget.style.color=muted;}}}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
                    설정
                  </button>
                  )}
                </div>
                {/* 생성 버튼 */}
                <button className="bl-gen-btn" onClick={handleGenerateClick} disabled={loading||fileLoading||!fields.keyword?.trim()}
                  style={{
                    padding:"8px 22px",borderRadius:14,border:"none",
                    cursor:loading||!fields.keyword?.trim()?"not-allowed":"pointer",
                    background:fields.keyword?.trim()?"linear-gradient(135deg,#7c6aff,#8b5cf6)":(isDark?"rgba(99,102,241,0.2)":"#e9ecef"),
                    color:fields.keyword?.trim()?"#fff":muted,fontSize:14,fontWeight:800,
                    display:"flex",alignItems:"center",gap:6,
                    opacity:loading||!fields.keyword?.trim()?0.5:1,
                    transition:"all 0.15s",minHeight:38,fontFamily:"inherit",
                    boxShadow:fields.keyword?.trim()?"0 4px 14px rgba(124,106,255,0.3)":"none",
                  }}>
                  {loading ? (
                    <><div style={{width:14,height:14,border:"2px solid rgba(255,255,255,0.3)",borderTop:"2px solid #fff",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>생성 중</>
                  ) : (
                    <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>생성{user && <span style={{fontSize:11,opacity:0.85,fontWeight:600,marginLeft:2,background:"rgba(255,255,255,0.18)",padding:"2px 8px",borderRadius:8}}>30P</span>}{!user && <span style={{fontSize:11,opacity:0.85,fontWeight:600,marginLeft:2,background:"rgba(255,255,255,0.18)",padding:"2px 8px",borderRadius:8}}>무료</span>}</>
                  )}
                </button>
              </div>
            </div>

            {/* 제목 추천 (키워드 입력 시 자동 표시) */}
            {mode==="write" && titleLoading && (
              <div style={{maxWidth:720,margin:"10px auto 0",textAlign:"center",padding:"12px",fontSize:12,color:accent,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                <div style={{width:12,height:12,borderRadius:"50%",border:"2px solid "+accent,borderTopColor:"transparent",animation:"spin 0.8s linear infinite"}}/>
                제목 추천 중...
              </div>
            )}
            {mode==="write" && !titleLoading && titleSugg.length>0 && (
              <div style={{maxWidth:720,margin:"10px auto 0",background:isDark?"rgba(99,102,241,0.08)":"#f0f0ff",borderRadius:14,padding:"14px 18px",border:"1px solid rgba(99,102,241,0.15)"}}>
                <div style={{fontSize:12,color:accent,fontWeight:700,marginBottom:10}}>추천 제목 (클릭 시 적용)</div>
                {titleSugg.map(function(t2,i){return(
                  <div key={i} onClick={function(){setField("keyword",t2);setTitleSugg([]);}}
                    style={{fontSize:13,color:text,padding:"8px 12px",cursor:"pointer",borderRadius:8,lineHeight:1.6,transition:"background 0.1s",marginBottom:i<titleSugg.length-1?4:0}}
                    onMouseEnter={function(e){e.currentTarget.style.background=isDark?"rgba(99,102,241,0.12)":"rgba(99,102,241,0.06)";}}
                    onMouseLeave={function(e){e.currentTarget.style.background="transparent";}}>
                    <span style={{color:accent,fontWeight:700,marginRight:8}}>{i+1}.</span>{t2}
                  </div>
                );})}
              </div>
            )}

            {/* 에러 메시지 */}
            {error&&<div style={{maxWidth:720,margin:"12px auto 0",fontSize:13,color:"#ef4444",display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",padding:"10px 14px",borderRadius:12,background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.2)"}}>{error}
              {(error.includes("포인트") || error.includes("충전") || error.includes("무료 횟수")) && (
                <button onClick={()=>window.location.hash="#pricing"} style={{padding:"6px 14px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#7c6aff,#8b5cf6)",color:"#fff",fontSize:12,fontWeight:800,cursor:"pointer",whiteSpace:"nowrap"}}>충전하기</button>
              )}
            </div>}

            {/* ══════ 설정 패널 (토글) ══════ */}
            {showSettings && (
              <div className="bl-settings-panel" style={{maxWidth:720,margin:"16px auto 0",background:cardBg,border:`1px solid ${border}`,borderRadius:20,padding:"20px 22px",boxShadow:isDark?"0 4px 20px rgba(0,0,0,0.3)":"0 4px 20px rgba(0,0,0,0.06)"}}>
                {/* 글쓰기 모드 설정 */}
                {mode==="write" && (<>
                {/* 글 타입 */}
                <div style={{marginBottom:20}}>
                  <div style={{fontSize:13,fontWeight:800,color:text,marginBottom:10,display:"flex",alignItems:"center",gap:6}}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                    {t("selectType")}
                  </div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                    {cfg.subtypes.map(s=>{
                      const isA=subtype===s.id;
                      return <button key={s.id} onClick={()=>handleSubtype(s.id)} style={{padding:"8px 16px",borderRadius:12,border:`1.5px solid ${isA?accent:border}`,background:isA?accentBg:"transparent",color:isA?accent:text,fontSize:12,fontWeight:isA?800:600,cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s"}}>{s.label}</button>;
                    })}
                  </div>
                </div>

                {/* 톤 */}
                <div style={{marginBottom:20}}>
                  <div style={{fontSize:13,fontWeight:800,color:text,marginBottom:10,display:"flex",alignItems:"center",gap:6}}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                    {t("selectTone")}
                  </div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                    {cfg.tones.map(t2=>{const isA=tone===t2.id;return<button key={t2.id} onClick={()=>setTone(t2.id)} style={{padding:"8px 16px",borderRadius:20,border:`1.5px solid ${isA?accent:border}`,background:isA?accentBg:"transparent",color:isA?accent:text,fontSize:12,fontWeight:isA?800:600,cursor:"pointer",fontFamily:"inherit"}}>{t2.label}</button>;})}
                  </div>
                </div>

                {/* 말투 */}
                <div style={{marginBottom:20}}>
                  <div style={{fontSize:13,fontWeight:800,color:text,marginBottom:10,display:"flex",alignItems:"center",gap:6}}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                    말투
                  </div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                    {SPEECH_STYLES.map(s=>{const isA=speechStyle===s.id;return<button key={s.id} onClick={()=>setSpeechStyle(s.id)} title={s.desc} style={{padding:"8px 16px",borderRadius:20,border:`1.5px solid ${isA?accent:border}`,background:isA?accentBg:"transparent",color:isA?accent:text,fontSize:12,fontWeight:isA?800:600,cursor:"pointer",fontFamily:"inherit"}}>{s.label}</button>;})}
                  </div>
                </div>

                {/* 분량 */}
                <div style={{marginBottom:12}}>
                  <div style={{fontSize:13,fontWeight:800,color:text,marginBottom:10,display:"flex",alignItems:"center",gap:6}}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round"><line x1="21" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="21" y1="18" x2="3" y2="18"/></svg>
                    {t("selectLength")}
                  </div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                    {cfg.wordCounts.map(w=>{
                      const isA=wordCount===w.id;
                      return <button key={w.id} onClick={()=>setWordCount(w.id)} style={{padding:"8px 16px",borderRadius:12,border:`1.5px solid ${isA?accent:border}`,background:isA?accentBg:"transparent",color:isA?accent:text,fontSize:12,fontWeight:isA?800:600,cursor:"pointer",fontFamily:"inherit",display:"flex",flexDirection:"column",alignItems:"flex-start",gap:2}}>
                        <span>{w.label}</span>
                        {w.desc && <span style={{fontSize:10,color:muted,fontWeight:500}}>{w.desc}</span>}
                      </button>;
                    })}
                  </div>
                </div>

                {/* 추가 지시사항 */}
                <div>
                  <div style={{fontSize:13,fontWeight:800,color:text,marginBottom:8,display:"flex",alignItems:"center",gap:6}}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    추가 지시사항 <span style={{fontSize:11,fontWeight:500,color:muted}}>(선택)</span>
                  </div>
                  <textarea value={fields.extra||""} onChange={e=>setField("extra",e.target.value)} rows={2}
                    placeholder="AI에게 전달할 내용을 자유롭게 적어주세요. 예) 초보자도 이해할 수 있게, 사례 중심으로"
                    style={{width:"100%",padding:"10px 14px",borderRadius:12,border:`1.5px solid ${inputBdr}`,background:inputBg,color:text,fontSize:13,fontFamily:"inherit",outline:"none",boxSizing:"border-box",resize:"none",lineHeight:1.6}}/>
                </div>
                </>)}
              </div>
            )}

            {/* 플랫폼 칩 (검색창 아래, 글쓰기 모드만) */}
            {mode==="write" && <div className="bl-platform-chips" style={{display:"flex",gap:8,justifyContent:"center",flexWrap:"wrap",marginTop:20,padding:"0 24px"}}>
              {SNS_OPTIONS.slice(0,8).map(p=>{
                const isA=platformId===p.id;
                return <button key={p.id} className="bl-platform-chip" onClick={()=>setPlatformId(p.id)}
                  style={{padding:"8px 16px",borderRadius:20,border:`1.5px solid ${isA?(p.color||accent):border}`,background:isA?(`${p.color||"#7c6aff"}0d`):"transparent",cursor:"pointer",display:"flex",alignItems:"center",gap:6,fontSize:13,fontWeight:isA?800:600,color:isA?(p.color||accent):muted,transition:"all 0.15s",fontFamily:"inherit"}}>
                  <div style={{width:18,height:18,display:"flex",alignItems:"center",justifyContent:"center",color:p.color||muted,flexShrink:0}}>
                    {p.svg ? <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">{p.svg.props.children}</svg> : <img src={p.icon} alt="" style={{width:14,height:14,borderRadius:2,objectFit:"contain"}} onError={e=>{e.target.style.display="none"}}/>}
                  </div>
                  {p.label}
                </button>;
              })}
              <button onClick={()=>setShowSettings(true)}
                style={{padding:"8px 16px",borderRadius:20,border:`1px dashed ${border}`,background:"transparent",cursor:"pointer",fontSize:13,fontWeight:600,color:muted,fontFamily:"inherit",transition:"all 0.15s"}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor=accent;e.currentTarget.style.color=accent;}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor=border;e.currentTarget.style.color=muted;}}>
                + 더보기
              </button>
            </div>}
            {/* 이미지 모드 도구 칩 — 제거됨 */}
            </>
            )}

            {/* 영상 모드: 숏폼/롱폼 선택 및 에디터 인라인 표시 */}
            {shortsMode && (
              _getUsageState().exhausted ? (
                <div style={{textAlign:"center",padding:"40px 0"}}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="1.5" strokeLinecap="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                  <div style={{fontSize:20,fontWeight:900,color:text,marginTop:16,marginBottom:8}}>프로 버전에서 사용 가능합니다</div>
                  <div style={{fontSize:14,color:muted,lineHeight:1.7,marginBottom:24}}>무료 체험 횟수를 모두 사용했습니다.<br/>프로 버전으로 업그레이드하면 무제한으로 영상을 생성할 수 있어요.</div>
                  <div style={{display:"flex",gap:10,justifyContent:"center"}}>
                    <button onClick={()=>{setShortsMode(false);}} style={{padding:"12px 24px",borderRadius:12,border:`1.5px solid ${border}`,background:"transparent",color:text,fontSize:14,fontWeight:700,cursor:"pointer"}}>돌아가기</button>
                    <button onClick={()=>{try{window.location.hash="#pricing";}catch{}}} style={{padding:"12px 24px",borderRadius:12,border:"none",background:"linear-gradient(135deg,#7c6aff,#8b5cf6)",color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer"}}>프로 버전 보기</button>
                  </div>
                </div>
              ) : !videoSubMode ? (
                <div style={{maxWidth:520,margin:"0 auto",padding:"20px 0 40px"}}>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
                    <div onClick={()=>setVideoSubMode("shortform")} style={{padding:"32px 16px",borderRadius:20,border:`1.5px solid ${border}`,background:isDark?"rgba(255,255,255,0.04)":"#fff",cursor:"pointer",textAlign:"center",transition:"all 0.15s"}}
                      onMouseEnter={e=>e.currentTarget.style.borderColor=accent} onMouseLeave={e=>e.currentTarget.style.borderColor=border}>
                      <div style={{width:110,height:110,borderRadius:26,background:`${accent}08`,margin:"0 auto 18px",display:"flex",alignItems:"center",justifyContent:"center"}}>
                        <svg width="56" height="56" viewBox="0 0 24 24" fill="none"><rect x="6" y="2" width="12" height="20" rx="3" stroke={accent} strokeWidth="1.5"/><path d="M10 14V10l4 2-4 2z" fill={accent}/></svg>
                      </div>
                      <div style={{fontSize:17,fontWeight:900,color:text,marginBottom:6}}>숏폼 편집</div>
                      <div style={{fontSize:12,color:muted,lineHeight:1.6}}>긴 영상에서 AI가<br/>핵심 쇼츠를 자동 추출</div>
                      <div style={{display:"flex",flexWrap:"wrap",gap:4,justifyContent:"center",marginTop:12}}>
                        {["AI 추출","9:16","자막"].map(t=><span key={t} style={{padding:"3px 9px",borderRadius:12,background:`${accent}08`,fontSize:10,color:accent,fontWeight:600}}>{t}</span>)}
                      </div>
                    </div>
                    <div onClick={()=>setVideoSubMode("longform")} style={{padding:"32px 16px",borderRadius:20,border:`1.5px solid ${border}`,background:isDark?"rgba(255,255,255,0.04)":"#fff",cursor:"pointer",textAlign:"center",transition:"all 0.15s"}}
                      onMouseEnter={e=>e.currentTarget.style.borderColor=accent} onMouseLeave={e=>e.currentTarget.style.borderColor=border}>
                      <div style={{width:110,height:110,borderRadius:26,background:`${accent}08`,margin:"0 auto 18px",display:"flex",alignItems:"center",justifyContent:"center"}}>
                        <svg width="56" height="56" viewBox="0 0 24 24" fill="none"><rect x="2" y="4" width="20" height="16" rx="3" stroke={accent} strokeWidth="1.5"/><path d="M8 4v16M16 4v16" stroke={accent} strokeWidth="0.8" opacity="0.4"/><path d="M2 12h20" stroke={accent} strokeWidth="0.8" opacity="0.4"/></svg>
                      </div>
                      <div style={{fontSize:17,fontWeight:900,color:text,marginBottom:6}}>롱폼 편집</div>
                      <div style={{fontSize:12,color:muted,lineHeight:1.6}}>무음 제거 + 반복 삭제<br/>자막 애니메이션</div>
                      <div style={{display:"flex",flexWrap:"wrap",gap:4,justifyContent:"center",marginTop:12}}>
                        {["무음제거","반복삭제","애니메이션"].map(t=><span key={t} style={{padding:"3px 9px",borderRadius:12,background:`${accent}08`,fontSize:10,color:accent,fontWeight:600}}>{t}</span>)}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null
            )}
          </div>
        )}

        {/* 디자인 모드: 카드뉴스 에디터 (편집 단계에서 표시) */}
        {!showResult && mode==="design" && designStep==="editor" && designSlides && (
          <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",borderTop:`1px solid ${border}`}}>
            <div style={{padding:"6px 16px",display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
              <button onClick={()=>setDesignStep("preview")}
                style={{padding:"5px 12px",borderRadius:10,border:`1px solid ${border}`,background:"transparent",color:text,fontSize:12,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:4,fontFamily:"inherit"}}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
                문구 수정
              </button>
              <span style={{fontSize:11,fontWeight:700,color:accent,padding:"3px 10px",borderRadius:20,background:`${accent}12`}}>카드뉴스 {designSlides.length}장</span>
            </div>
            <div style={{flex:1,overflow:"hidden"}}>
              <Suspense fallback={<div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",color:muted}}>에디터 로딩 중...</div>}>
                <UnifiedCanvasEditorLazy
                  slides={designSlides}
                  width={1080} height={1080} mode="cardnews"
                  onSave={()=>{}} onClose={()=>setDesignStep("preview")}
                  inline
                />
              </Suspense>
            </div>
          </div>
        )}

        {/* 영상 에디터 (숏폼/롱폼 선택 후 — 입력 화면 아래 flex로 표시) */}
        {!showResult && shortsMode && videoSubMode && (
          <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",borderTop:`1px solid ${border}`}}>
            <div style={{padding:"6px 16px",display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
              <button onClick={()=>setVideoSubMode(null)}
                style={{padding:"5px 12px",borderRadius:10,border:`1px solid ${border}`,background:"transparent",color:text,fontSize:12,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",gap:4,fontFamily:"inherit"}}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
                유형 선택
              </button>
              <span style={{fontSize:11,fontWeight:700,color:accent,padding:"3px 10px",borderRadius:20,background:`${accent}12`}}>{videoSubMode==="shortform"?t("bg_shortformEdit"):t("bg_longformEdit")}</span>
            </div>
            {videoSubMode === "shortform" ? (
              <Suspense fallback={<div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",color:muted}}>로딩 중...</div>}>
                <ShortsCreator isDark={isDark} user={user} onUserUpdate={onUserUpdate} onLoginRequest={onLoginRequest} setAiMenu={setAiMenu} showPointConfirm={showPointConfirm} onStatusChange={()=>{}} />
              </Suspense>
            ) : (
              <Suspense fallback={<div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",color:muted}}>로딩 중...</div>}>
                <LongFormEditor isDark={isDark} user={user} onUserUpdate={onUserUpdate} onLoginRequest={onLoginRequest} setAiMenu={setAiMenu} showPointConfirm={showPointConfirm} onStatusChange={()=>{}} />
              </Suspense>
            )}
          </div>
        )}

        {/* 결과 화면 */}
        {showResult && renderResult()}
      </div>
    </div>
  );

  if (embedded) return <div style={{flex:1,display:"flex",overflow:"hidden",fontFamily:"'Apple SD Gothic Neo','Noto Sans KR',sans-serif",background:isDark?"transparent":"#f4f4f8",color:text}}>{content}</div>;
  return (
    <div style={{minHeight:"100vh",background:isDark?"#0f0c29":"#f8f9fa",fontFamily:"'Pretendard','Noto Sans KR',sans-serif"}}>
      <div style={{height:"100vh",display:"flex"}}>{content}</div>
    </div>
  );
}
