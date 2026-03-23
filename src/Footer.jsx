import { useI18n, LANGUAGES } from "./i18n.jsx";

export default function Footer({ C, navigateBoard, navigateAi, navigate }) {
  const { t } = useI18n();

  return (
    <footer style={{ borderTop: "1px solid " + C.border, padding: "48px 24px 32px", background: C.footerBg }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        {/* Company info */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 36, marginBottom: 24 }}>
          <div style={{ maxWidth: 280 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: "linear-gradient(135deg,#7c6aff,#ec4899)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6L12 2z" fill="#fff"/></svg>
              </div>
              <div style={{ fontSize: 14, fontWeight: 900, color: C.text }}>SNS메이킷</div>
            </div>
            <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.85, margin: 0, whiteSpace: "pre-line" }}>{t("footerDesc") || "비즈니스를 위한 SNS 성장 파트너.\nAI를 활용해 더 빠르게, 더 스마트하게"}</p>
          </div>
          <div style={{ display: "flex", gap: 48, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.text, marginBottom: 12, letterSpacing: 1.5 }}>{t("community") || "커뮤니티"}</div>
              {[{id:"info",label:t("info")||"정보공유"},{id:"qna",label:t("qna")||"질문답변"},{id:"free",label:t("free")||"자유게시판"},{id:"review",label:t("review")||"사용후기"},{id:"archive",label:t("archive")||"자료실"}].map(cc => (
                <div key={cc.id} onClick={() => navigateBoard?.(cc.id)} style={{ fontSize: 13, color: C.muted, padding: "5px 0", cursor: "pointer" }}
                  onMouseEnter={e => e.currentTarget.style.color = C.purpleL}
                  onMouseLeave={e => e.currentTarget.style.color = C.muted}>
                  {cc.label}
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.text, marginBottom: 12, letterSpacing: 1.5 }}>{t("service") || "서비스"}</div>
              {[{ai:"blog_naver_intro",label:t("blogWrite")||"블로그 글쓰기"},{ai:"cardnews_simple",label:t("cardNews")||"카드뉴스"},{ai:"product_shot",label:t("imageGen")||"이미지 생성"}].map(cc => (
                <div key={cc.ai} onClick={() => navigateAi?.(cc.ai)} style={{ fontSize: 13, color: C.muted, padding: "5px 0", cursor: "pointer" }}
                  onMouseEnter={e => e.currentTarget.style.color = C.purpleL}
                  onMouseLeave={e => e.currentTarget.style.color = C.muted}>
                  {cc.label}
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* Legal + company details */}
        <div style={{ paddingTop: 24, borderTop: "1px solid " + C.border }}>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
            {[{label:t("terms")||"이용약관",tab:"terms"},{label:t("privacy")||"개인정보처리방침",tab:"privacy"},{label:t("refund")||"환불정책",tab:"refund"}].map(item => (
              <button key={item.tab} onClick={() => navigate?.("legal", item.tab)}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: C.muted, padding: 0, fontWeight: item.tab==="privacy"?700:400, textDecoration: "underline" }}
                onMouseEnter={e => e.currentTarget.style.color = C.purpleL}
                onMouseLeave={e => e.currentTarget.style.color = C.muted}>
                {item.label}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 11, color: C.muted, lineHeight: 2.2 }}>
            {t("companyName")||"엔퍼그로스"} | {t("ceo")||"대표자: 김선봉"}<br/>
            {t("bizNo")||"사업자등록번호: 598-09-02769"}<br/>
            {t("commsNo")||"통신판매업 신고번호: 2024-서울금천-1997호"}<br/>
            {t("address")||"주소: 서울특별시 금천구 디지털로9길 68"}<br/>
            {t("email")||"고객센터: npermovie@naver.com"}
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16, flexWrap: "wrap", gap: 12 }}>
            <div style={{ fontSize: 11, color: C.muted, opacity: 0.5 }}>{t("copyright")||"© 2025 SNS메이킷 · All rights reserved."}</div>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <a href="https://blog.naver.com/npermovie" target="_blank" rel="noopener noreferrer" title="네이버 블로그"
                style={{ width: 28, height: 28, borderRadius: "50%", background: C.muted + "15", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none", fontSize: 14, transition: "opacity 0.15s" }}
                onMouseEnter={e=>e.currentTarget.style.opacity="0.7"} onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
                📝
              </a>
              <a href="https://www.instagram.com" target="_blank" rel="noopener noreferrer" title="인스타그램"
                style={{ width: 28, height: 28, borderRadius: "50%", background: C.muted + "15", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none", fontSize: 14, transition: "opacity 0.15s" }}
                onMouseEnter={e=>e.currentTarget.style.opacity="0.7"} onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
                📷
              </a>
              <a href="https://www.youtube.com" target="_blank" rel="noopener noreferrer" title="유튜브"
                style={{ width: 28, height: 28, borderRadius: "50%", background: C.muted + "15", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none", fontSize: 14, transition: "opacity 0.15s" }}
                onMouseEnter={e=>e.currentTarget.style.opacity="0.7"} onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
                ▶️
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
