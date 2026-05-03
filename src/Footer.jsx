import { useI18n, LANGUAGES } from "./i18n.jsx";

export default function Footer({ C, navigateBoard, navigateAi, navigate }) {
  const { t } = useI18n();

  return (
    <footer style={{ borderTop: "1px solid " + C.border, padding: "clamp(40px,6vw,56px) clamp(20px,5vw,40px) 32px", background: C.footerBg }}>
      <style>{`
        @media(max-width:768px){
          .footer-top-row{flex-direction:column!important;gap:28px!important}
          .footer-links-row{gap:32px!important}
          .footer-bottom-row{flex-direction:column!important;align-items:flex-start!important;gap:12px!important}
        }
      `}</style>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <div className="footer-top-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 40, marginBottom: 32 }}>
          <div style={{ maxWidth: 260 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <img src="/logo.png" alt="SNS메이킷" style={{ width: 28, height: 28, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
              <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>SNS메이킷</div>
            </div>
            <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.8, margin: 0, whiteSpace: "pre-line" }}>{t("footerDesc") || "비즈니스를 위한 SNS 성장 파트너.\nAI를 활용해 더 빠르게, 더 스마트하게"}</p>
          </div>
          <div className="footer-links-row" style={{ display: "flex", gap: 56, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 14, letterSpacing: 0.5 }}>{t("community") || "커뮤니티"}</div>
              {[{id:"info",label:t("info")||"정보공유"},{id:"qna",label:t("qna")||"질문답변"},{id:"free",label:t("free")||"자유게시판"},{id:"review",label:t("review")||"사용후기"}].map(cc => (
                <div key={cc.id} onClick={() => navigateBoard?.(cc.id)} style={{ fontSize: 13, color: C.muted, padding: "6px 0", cursor: "pointer", transition: "color 0.15s" }}
                  onMouseEnter={e => e.currentTarget.style.color = C.text}
                  onMouseLeave={e => e.currentTarget.style.color = C.muted}>
                  {cc.label}
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 14, letterSpacing: 0.5 }}>{t("service") || "서비스"}</div>
              {[{ai:"blog_naver_intro",label:t("blogWrite")||"블로그 글쓰기"},{ai:"ai",label:t("recommendKeyword")||"추천 키워드"},{ai:"programs",label:t("archive")||"자료실"},{ai:"shorts_make",label:t("videoCreate")||"영상 제작"}].map(cc => (
                <div key={cc.ai} onClick={() => navigateAi?.(cc.ai)} style={{ fontSize: 13, color: C.muted, padding: "6px 0", cursor: "pointer", transition: "color 0.15s" }}
                  onMouseEnter={e => e.currentTarget.style.color = C.text}
                  onMouseLeave={e => e.currentTarget.style.color = C.muted}>
                  {cc.label}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={{ paddingTop: 24, borderTop: "1px solid " + C.border }}>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
            {[{label:t("terms")||"이용약관",tab:"terms"},{label:t("privacy")||"개인정보처리방침",tab:"privacy"},{label:t("refund")||"환불정책",tab:"refund"}].map(item => (
              <button key={item.tab} onClick={() => navigate?.("legal", item.tab)}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: C.muted, padding: "8px 4px", fontWeight: item.tab==="privacy"?700:400, textDecoration: "underline", minHeight: 44, transition: "color 0.15s", fontFamily: "inherit" }}
                onMouseEnter={e => e.currentTarget.style.color = C.text}
                onMouseLeave={e => e.currentTarget.style.color = C.muted}>
                {item.label}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 11, color: C.muted, lineHeight: 2.2, opacity: 0.8 }}>
            {t("companyName")||"엔퍼그로스"} | {t("ceo")||"대표자: 김선봉"}<br/>
            {t("bizNo")||"사업자등록번호: 598-09-02769"}<br/>
            {t("commsNo")||"통신판매업 신고번호: 2024-서울금천-1997호"}<br/>
            {t("address")||"주소: 서울특별시 서초구 서초대로77길 39, 1112호 (서초동, MK빌딩)"}<br/>
            {t("email")||"고객센터: npermovie@naver.com"}
          </div>
          <div className="footer-bottom-row" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 20, flexWrap: "wrap", gap: 12 }}>
            <div style={{ fontSize: 11, color: C.muted, opacity: 0.5 }}>{`\u00A9 2025-${new Date().getFullYear()} SNS메이킷 \u00B7 All rights reserved.`}</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {[
                { href: "https://blog.naver.com/npermovie", title: "네이버 블로그", icon: <svg width="15" height="15" viewBox="0 0 24 24" fill={C.muted}><path d="M16.27 8.24c-.46-.56-1.25-.84-2.37-.84H9.9c-.1 0-.18.08-.18.18v8.84c0 .1.08.18.18.18h1.63c.1 0 .18-.08.18-.18v-3.26h1.92c1.12 0 1.91-.28 2.37-.84.46-.56.69-1.2.69-1.94s-.23-1.38-.42-1.94v-.2zm-1.81 3.06c-.21.24-.57.36-1.08.36h-1.67V9.47h1.67c.51 0 .87.12 1.08.36.21.24.32.56.32.96 0 .4-.11.74-.32.96v.55z"/></svg> },
                { href: "https://www.instagram.com/snsmakeit", title: "인스타그램", icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="5"/><circle cx="17.5" cy="6.5" r="1.5" fill={C.muted} stroke="none"/></svg> },
                { href: "https://www.youtube.com/@snsmakeit", title: "유튜브", icon: <svg width="15" height="15" viewBox="0 0 24 24" fill={C.muted}><path d="M23.5 6.19a3.02 3.02 0 00-2.12-2.14C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.38.55A3.02 3.02 0 00.5 6.19 31.6 31.6 0 000 12a31.6 31.6 0 00.5 5.81 3.02 3.02 0 002.12 2.14c1.88.55 9.38.55 9.38.55s7.5 0 9.38-.55a3.02 3.02 0 002.12-2.14A31.6 31.6 0 0024 12a31.6 31.6 0 00-.5-5.81zM9.75 15.02V8.98L15.5 12l-5.75 3.02z"/></svg> },
              ].map(s => (
                <a key={s.href} href={s.href} target="_blank" rel="noopener noreferrer" title={s.title}
                  style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(0,0,0,0.04)", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none", transition: "opacity 0.15s" }}
                  onMouseEnter={e=>e.currentTarget.style.opacity="0.6"} onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
                  {s.icon}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
