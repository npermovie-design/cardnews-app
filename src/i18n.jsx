import { useState, useEffect, createContext, useContext } from "react";

const LANG_KEY = "nper_lang";

export const LANGUAGES = [
  { code: "ko", label: "한국어", flag: "🇰🇷" },
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "ja", label: "日本語", flag: "🇯🇵" },
  { code: "zh", label: "中文", flag: "🇨🇳" },
];

const T = {
  ko: {
    // 네비게이션
    home: "홈", about: "소개", howto: "이용방법", aiGen: "AI 생성기", community: "커뮤니티",
    pricing: "가격정책", support: "고객센터", contact: "문의하기", translate: "번역",
    darkMode: "다크", lightMode: "라이트", online: "명 접속중", login: "로그인 / 회원가입",
    logout: "로그아웃", myPage: "내 보관함", userInfo: "회원정보", admin: "관리자 페이지",
    attendance: "출석체크", pointCharge: "포인트 충전",
    // AI 생성기
    snsWrite: "SNS 글쓰기", snsImage: "SNS 이미지", imageGen: "이미지 생성",
    snsWriteDesc: "블로그·인스타·유튜브", snsImageDesc: "카드뉴스·상세페이지", imageGenDesc: "제품컷·로고·모델·목업",
    // SNS 글쓰기 메뉴
    naverBlog: "네이버 블로그", tistory: "티스토리", instaCap: "인스타그램 캡션",
    youtubeScript: "유튜브 대본", thread: "스레드", ytBlog: "유튜브로 글쓰기",
    newsBlog: "뉴스로 글쓰기", naverCafe: "네이버 카페",
    // SNS 이미지 메뉴
    simpleCard: "심플 카드뉴스", imageCard: "이미지 카드뉴스",
    simpleDetail: "심플 상세페이지", imageDetail: "이미지 상세페이지",
    shortsGen: "쇼츠영상 생성기", videoCreate: "영상 제작", shortsMake: "쇼츠 영상 만들기",
    // 이미지 생성 메뉴
    productShot: "제품컷 생성", logoGen: "로고 생성", mockupGen: "목업 생성",
    modelGen: "모델 생성", faceSwap: "얼굴 교체", outfitSwap: "의상 교체", outpaint: "여백 늘리기",
    // 커뮤니티
    info: "정보공유", qna: "질문답변", free: "자유게시판", review: "사용후기", archive: "자료실",
    // 푸터
    companyName: "엔퍼그로스", ceo: "대표자: 김선봉",
    bizNo: "사업자등록번호: 598-09-02769", commsNo: "통신판매업 신고번호: 2024-서울금천-1997호",
    address: "주소: 서울특별시 금천구 디지털로9길 68, 대륭포스트타워 5차 1층 111(-377)호 (가산동)",
    email: "고객센터: npermovie@naver.com",
    terms: "이용약관", privacy: "개인정보처리방침", refund: "환불정책",
    footerDesc: "비즈니스를 위한 SNS 성장 파트너.\nAI를 활용해 더 빠르게, 더 스마트하게",
    disclaimer: "엔퍼그로스는 통신판매의 당사자가 아니므로, 개별 서비스 제공자가 등록한 정보 및 거래 등에 대해 책임을 지지 않습니다.",
    copyright: "© 2025-2026 SNS메이킷 · All rights reserved.",
    service: "서비스", blogWrite: "블로그 글쓰기", cardNews: "카드뉴스",
    // 비회원
    guestFree: "비회원 AI 무료 사용", remaining: "회 남음", exhausted: "소진",
    // 공통
    search: "검색...", generate: "생성하기", copy: "복사", delete: "삭제", save: "저장",
    cancel: "취소", confirm: "확인", close: "닫기", back: "뒤로", next: "다음",
    loading: "로딩 중...", noResult: "결과가 없어요",
    // 블로그 생성기 스텝
    step1: "내용 입력", step2: "AI 생성중", step3: "결과 확인",
    urlImport: "URL로 내용 불러오기", urlImportDesc: "뉴스 기사, 유튜브 링크를 붙여넣으면 주제를 자동으로 채워줘요",
    importBtn: "불러오기", keyword: "키워드 / 주제", targetReader: "대상 독자 (선택)",
    extraReq: "추가 요청 (선택)", tone: "글 톤", volume: "분량",
    generateBtn: "글 생성하기", relatedImg: "연관 이미지 추천",
    searchOtherKw: "다른 키워드 검색...", result: "생성 결과",
    total: "전체", noSpace: "공백제외", withSpace: "공백포함", copied: "복사됨",
    // 자료실
    gifTab: "GIF / 짤", freePhoto: "무료 사진", freeVideo: "무료 영상",
    searchPlaceholder: "키워드로 검색 (예: 풍경, 음식, 사람...)", searching: "검색중...",
    guideTitle: "이용 가이드",
    guideSave: "이미지/GIF를 PC에 바로 다운로드",
    guideClick: "원본 사이트에서 고해상도로 보기",
    guideSearch: "키워드를 입력하면 모든 소스에서 동시 검색",
    guideHover: "이미지 확대 프리뷰 + 상세 정보 확인",
    // 보관함
    library: "내 보관함", totalSaved: "개 저장됨", autoSaved: "자동 저장됩니다",
    blogSns: "블로그·SNS 글", detailPage: "상세페이지",
    // 게시판
    writePost: "글쓰기 (+2P)", sortLatest: "최신순", sortViews: "조회순", sortLikes: "추천순",
    viewList: "리스트", viewGallery: "갤러리", viewCompact: "작은목록",
    totalN: "총", itemsUnit: "개", withAttach: "(첨부파일 있는 글)",
    filterAll: "전체", noSearchResult: "검색 결과가 없어요", noPosts: "아직 게시글이 없어요",
    firstPostBonus: "첫 번째 글을 작성하면 2P가 적립됩니다!",
    archivePosts: "자료실", freeMediaSearch: "무료 이미지·GIF",
    pointsNotice: "게시글 작성 시 +2P 적립됩니다. 적립된 포인트로 AI 생성기를 이용해보세요!",
    colNo: "번호", colImage: "이미지", colTitle: "제목", colAuthor: "작성자",
    colDate: "날짜", colViews: "조회", colLikes: "추천", colDownload: "다운",
    loadingPosts: "게시글 불러오는 중...", manageCategories: "카테고리 관리",
    // BlogGenerator
    inputStep: "내용 입력", genStep: "AI 생성중", resultStep: "결과 확인",
    urlImportLabel: "URL로 내용 불러오기", importBtnLabel: "불러오기",
    keywordLabel: "키워드 / 주제", targetLabel: "대상 독자 (선택)", extraLabel: "추가 요청 (선택)",
    toneLabel: "글 톤", volumeLabel: "분량", genBtnLabel: "글 생성하기",
    relatedImages: "연관 이미지 추천", searchKw: "다른 키워드 검색...",
    genResult: "생성 결과",
    charTotal: "전체", charNoSpace: "공백제외", charWithSpace: "공백포함",
    copyDone: "복사됨", copyBtn: "복사",
    regenTitle: "다시 생성하시겠습니까?", regenDesc: "현재 생성된 글이 사라지고\n처음부터 다시 시작합니다.",
    regenBtn: "다시 생성",
    aiWelcome: "AI 생성기에 오신 걸 환영해요! 👋",
    aiWelcomeSub: "왼쪽 메뉴에서 원하는 콘텐츠 타입을 선택해주세요",
    introSteps: "📋 이런 순서로 제작돼요",
    introFeatures: "✨ 주요 특징",
    introGuide: "아래에서 정보를 입력하고\n글 생성하기 버튼을 눌러주세요",
    example: "예시",
    fileImport: "파일로 내용 불러오기",
    fileImportDesc: "이미지·PDF 파일을 올리면 AI가 분석해서 주제를 자동으로 채워줘요",
    fileSelect: "파일 선택",
    fileLimit: "이미지, PDF, TXT (최대 10MB)",
    analyzing: "파일 분석 중...",
    selectType: "글 타입 선택", exampleTopics: "예시 글감",
    selectTone: "글 톤", selectLength: "분량",
  },

  en: {
    home: "Home", about: "About", howto: "How to Use", aiGen: "AI Generator", community: "Community",
    pricing: "Pricing", support: "Support", contact: "Contact", translate: "Lang",
    darkMode: "Dark", lightMode: "Light", online: " online", login: "Login / Sign up",
    logout: "Logout", myPage: "My Library", userInfo: "Profile", admin: "Admin",
    attendance: "Check-in", pointCharge: "Buy Points",
    snsWrite: "SNS Writing", snsImage: "SNS Images", imageGen: "Image Gen",
    snsWriteDesc: "Blog · Insta · YouTube", snsImageDesc: "Card News · Detail Page", imageGenDesc: "Product · Logo · Model",
    naverBlog: "Naver Blog", tistory: "Tistory", instaCap: "Instagram Caption",
    youtubeScript: "YouTube Script", thread: "Threads", ytBlog: "YouTube to Blog",
    newsBlog: "News to Blog", naverCafe: "Naver Cafe",
    simpleCard: "Simple Card News", imageCard: "Image Card News",
    simpleDetail: "Simple Detail Page", imageDetail: "Image Detail Page",
    shortsGen: "Shorts Generator",
    productShot: "Product Shot", logoGen: "Logo Gen", mockupGen: "Mockup Gen",
    modelGen: "Model Gen", faceSwap: "Face Swap", outfitSwap: "Outfit Swap", outpaint: "Outpaint",
    info: "Info", qna: "Q&A", free: "General", review: "Reviews", archive: "Resources",
    companyName: "NPERGROS", ceo: "CEO: Kim Sunbong",
    bizNo: "Biz No: 598-09-02769", commsNo: "Telecom Sales: 2024-Seoul-1997",
    address: "Addr: 111(-377), Daeryung Post Tower 5, 68 Digitro-9 Gil, Geumcheon-gu, Seoul",
    email: "Support: npermovie@naver.com",
    terms: "Terms", privacy: "Privacy Policy", refund: "Refund Policy",
    footerDesc: "SNS growth partner for your business.\nFaster & smarter with AI",
    disclaimer: "NPERGROS is not a party to telecommunications sales and is not responsible for information or transactions registered by individual service providers.",
    copyright: "© 2025-2026 SNS Makeit · All rights reserved.",
    service: "Services", blogWrite: "Blog Writing", cardNews: "Card News",
    guestFree: "Guest AI Free Usage", remaining: " left", exhausted: "Used up",
    search: "Search...", generate: "Generate", copy: "Copy", delete: "Delete", save: "Save",
    cancel: "Cancel", confirm: "OK", close: "Close", back: "Back", next: "Next",
    loading: "Loading...", noResult: "No results found",
    step1: "Input", step2: "AI Generating", step3: "Result",
    urlImport: "Import from URL", urlImportDesc: "Paste news or YouTube links to auto-fill the topic",
    importBtn: "Import", keyword: "Keyword / Topic", targetReader: "Target Reader (optional)",
    extraReq: "Extra Request (optional)", tone: "Tone", volume: "Length",
    generateBtn: "Generate", relatedImg: "Related Images",
    searchOtherKw: "Search other keywords...", result: "Result",
    total: "Total", noSpace: "No space", withSpace: "With space", copied: "Copied",
    gifTab: "GIF", freePhoto: "Free Photos", freeVideo: "Free Videos",
    searchPlaceholder: "Search (e.g. landscape, food, people...)", searching: "Searching...",
    guideTitle: "Usage Guide",
    guideSave: "Download images/GIFs directly to your PC",
    guideClick: "View high-res on original site",
    guideSearch: "Search all sources simultaneously",
    guideHover: "Preview enlarged + detailed info on hover",
    library: "My Library", totalSaved: " saved", autoSaved: "Auto-saved",
    blogSns: "Blog & SNS", detailPage: "Detail Pages",
    writePost: "Write (+2P)", sortLatest: "Latest", sortViews: "Views", sortLikes: "Likes",
    viewList: "List", viewGallery: "Gallery", viewCompact: "Compact",
    totalN: "Total", itemsUnit: "", withAttach: "(with attachments)",
    filterAll: "All", noSearchResult: "No search results", noPosts: "No posts yet",
    firstPostBonus: "Write your first post and earn 2P!",
    archivePosts: "Resources", freeMediaSearch: "Free Images & GIF",
    pointsNotice: "+2P per post. Use earned points for AI generator!",
    colNo: "#", colImage: "Image", colTitle: "Title", colAuthor: "Author",
    colDate: "Date", colViews: "Views", colLikes: "Likes", colDownload: "DL",
    loadingPosts: "Loading posts...", manageCategories: "Manage Categories",
    inputStep: "Input", genStep: "AI Generating", resultStep: "Result",
    urlImportLabel: "Import from URL", importBtnLabel: "Import",
    keywordLabel: "Keyword / Topic", targetLabel: "Target Reader (optional)", extraLabel: "Extra Request (optional)",
    toneLabel: "Tone", volumeLabel: "Length", genBtnLabel: "Generate",
    relatedImages: "Related Images", searchKw: "Search other keywords...",
    genResult: "Result",
    charTotal: "Total", charNoSpace: "No space", charWithSpace: "With space",
    copyDone: "Copied", copyBtn: "Copy",
    regenTitle: "Regenerate?", regenDesc: "Current result will be lost\nand start from scratch.",
    regenBtn: "Regenerate",
    aiWelcome: "Welcome to AI Generator! 👋",
    aiWelcomeSub: "Select a content type from the menu",
    introSteps: "📋 How it works",
    introFeatures: "✨ Key Features",
    introGuide: "Enter information below and\npress the Generate button",
    example: "Example",
    fileImport: "Import from File",
    fileImportDesc: "Upload image or PDF and AI will analyze it to auto-fill the topic",
    fileSelect: "Select File",
    fileLimit: "Image, PDF, TXT (max 10MB)",
    analyzing: "Analyzing file...",
    selectType: "Post Type", exampleTopics: "Example Topics",
    selectTone: "Tone", selectLength: "Length",
  },

  ja: {
    home: "ホーム", about: "紹介", howto: "使い方", aiGen: "AI生成", community: "コミュニティ",
    pricing: "料金", support: "サポート", contact: "お問い合わせ", translate: "言語",
    darkMode: "ダーク", lightMode: "ライト", online: "人 接続中", login: "ログイン / 新規登録",
    logout: "ログアウト", myPage: "マイライブラリ", userInfo: "会員情報", admin: "管理者",
    attendance: "出席", pointCharge: "ポイント充電",
    snsWrite: "SNSライティング", snsImage: "SNS画像", imageGen: "画像生成",
    snsWriteDesc: "ブログ·インスタ·YouTube", snsImageDesc: "カードニュース·詳細ページ", imageGenDesc: "商品·ロゴ·モデル",
    naverBlog: "Naverブログ", tistory: "Tistory", instaCap: "Instagramキャプション",
    youtubeScript: "YouTube台本", thread: "Threads", ytBlog: "YouTubeからブログ",
    newsBlog: "ニュースからブログ", naverCafe: "Naverカフェ",
    simpleCard: "シンプルカードニュース", imageCard: "画像カードニュース",
    simpleDetail: "シンプル詳細ページ", imageDetail: "画像詳細ページ",
    shortsGen: "ショート動画生成",
    productShot: "商品写真", logoGen: "ロゴ生成", mockupGen: "モックアップ", modelGen: "モデル生成",
    faceSwap: "顔·衣装交換", outpaint: "余白拡張",
    info: "情報共有", qna: "Q&A", free: "自由掲示板", review: "レビュー", archive: "資料室",
    companyName: "NPERGROS", ceo: "代表: キム·ソンボン",
    bizNo: "事業者番号: 598-09-02769", commsNo: "通信販売: 2024-Seoul-1997",
    address: "所在地: ソウル特別市 衿川区", email: "サポート: npermovie@naver.com",
    terms: "利用規約", privacy: "個人情報方針", refund: "返金ポリシー",
    footerDesc: "ビジネスのためのSNS成長パートナー\nAIでより速く、よりスマートに",
    disclaimer: "NPERGROSは通信販売の当事者ではないため、個別サービス提供者が登録した情報および取引等について責任を負いません。",
    copyright: "© 2025-2026 SNS Makeit · All rights reserved.",
    service: "サービス", blogWrite: "ブログ作成", cardNews: "カードニュース",
    guestFree: "ゲストAI無料使用", remaining: "回 残り", exhausted: "使い切り",
    search: "検索...", generate: "生成", copy: "コピー", delete: "削除", save: "保存",
    cancel: "キャンセル", confirm: "確認", close: "閉じる", back: "戻る", next: "次へ",
    loading: "読み込み中...", noResult: "結果がありません",
    step1: "入力", step2: "AI生成中", step3: "結果確認",
    urlImport: "URLから取り込み", urlImportDesc: "ニュースやYouTubeリンクを貼り付けると自動入力",
    importBtn: "取り込み", keyword: "キーワード / テーマ", targetReader: "対象読者 (任意)",
    extraReq: "追加要望 (任意)", tone: "トーン", volume: "文量",
    generateBtn: "生成する", relatedImg: "関連画像おすすめ",
    searchOtherKw: "他のキーワード検索...", result: "生成結果",
    total: "全体", noSpace: "空白除外", withSpace: "空白含む", copied: "コピー済み",
    gifTab: "GIF", freePhoto: "無料写真", freeVideo: "無料動画",
    searchPlaceholder: "キーワードで検索 (例: 風景, 料理, 人物...)", searching: "検索中...",
    guideTitle: "利用ガイド",
    guideSave: "画像/GIFをPCに直接ダウンロード",
    guideClick: "元サイトで高解像度表示",
    guideSearch: "全ソースを同時検索",
    guideHover: "拡大プレビュー+詳細情報",
    library: "マイライブラリ", totalSaved: "件保存", autoSaved: "自動保存",
    blogSns: "ブログ・SNS", detailPage: "詳細ページ",
  },

  zh: {
    home: "首页", about: "介绍", howto: "使用方法", aiGen: "AI生成器", community: "社区",
    pricing: "价格", support: "客服", contact: "联系我们", translate: "语言",
    darkMode: "暗色", lightMode: "亮色", online: "人在线", login: "登录 / 注册",
    logout: "退出", myPage: "我的收藏", userInfo: "个人信息", admin: "管理员",
    attendance: "签到", pointCharge: "充值积分",
    snsWrite: "SNS写作", snsImage: "SNS图片", imageGen: "图片生成",
    snsWriteDesc: "博客·Instagram·YouTube", snsImageDesc: "卡片新闻·详情页", imageGenDesc: "产品·Logo·模型",
    naverBlog: "Naver博客", tistory: "Tistory", instaCap: "Instagram标题",
    youtubeScript: "YouTube脚本", thread: "Threads", ytBlog: "YouTube转博客",
    newsBlog: "新闻转博客", naverCafe: "Naver咖啡",
    simpleCard: "简约卡片", imageCard: "图片卡片",
    simpleDetail: "简约详情页", imageDetail: "图片详情页",
    shortsGen: "短视频生成",
    productShot: "产品图", logoGen: "Logo生成", mockupGen: "模型生成", modelGen: "模特生成",
    faceSwap: "换脸·换装", outpaint: "扩展边距",
    info: "信息分享", qna: "问答", free: "自由讨论", review: "使用评价", archive: "资料室",
    companyName: "NPERGROS", ceo: "代表: 金善奉",
    bizNo: "营业号: 598-09-02769", commsNo: "通信销售: 2024-Seoul-1997",
    address: "地址: 首尔特别市 衿川区", email: "客服: npermovie@naver.com",
    terms: "使用条款", privacy: "隐私政策", refund: "退款政策",
    footerDesc: "商业SNS增长伙伴\n用AI更快、更智能",
    disclaimer: "NPERGROS不是通信销售的当事方，不对个别服务提供商注册的信息和交易承担责任。",
    copyright: "© 2025-2026 SNS Makeit · All rights reserved.",
    service: "服务", blogWrite: "博客写作", cardNews: "卡片新闻",
    guestFree: "游客AI免费使用", remaining: "次剩余", exhausted: "已用完",
    search: "搜索...", generate: "生成", copy: "复制", delete: "删除", save: "保存",
    cancel: "取消", confirm: "确认", close: "关闭", back: "返回", next: "下一步",
    loading: "加载中...", noResult: "没有结果",
    step1: "输入内容", step2: "AI生成中", step3: "查看结果",
    urlImport: "从URL导入", urlImportDesc: "粘贴新闻或YouTube链接自动填入主题",
    importBtn: "导入", keyword: "关键词 / 主题", targetReader: "目标读者 (可选)",
    extraReq: "附加要求 (可选)", tone: "语气", volume: "篇幅",
    generateBtn: "生成", relatedImg: "相关图片推荐",
    searchOtherKw: "搜索其他关键词...", result: "生成结果",
    total: "总计", noSpace: "不含空格", withSpace: "含空格", copied: "已复制",
    gifTab: "GIF", freePhoto: "免费照片", freeVideo: "免费视频",
    searchPlaceholder: "搜索关键词 (如: 风景, 美食, 人物...)", searching: "搜索中...",
    guideTitle: "使用指南",
    guideSave: "直接下载图片/GIF到电脑",
    guideClick: "在原始网站查看高清",
    guideSearch: "同时搜索所有来源",
    guideHover: "悬停查看放大预览+详细信息",
    library: "我的收藏", totalSaved: "个已保存", autoSaved: "自动保存",
    blogSns: "博客·SNS", detailPage: "详情页",
  },
};

// 폴백: 해당 언어에 키가 없으면 ko → en 순서로 폴백
function getTranslation(lang, key) {
  return T[lang]?.[key] || T.ko[key] || T.en?.[key] || key;
}

// Context
const I18nContext = createContext({ lang: "ko", t: (k) => T.ko[k] || k, setLang: () => {} });

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try {
      // URL ?lang= 파라미터 우선
      const urlLang = new URLSearchParams(window.location.search).get("lang");
      if (urlLang && T[urlLang]) { localStorage.setItem(LANG_KEY, urlLang); return urlLang; }
      return localStorage.getItem(LANG_KEY) || "ko";
    } catch { return "ko"; }
  });

  const SEO_META = {
    ko: { title:"SNS메이킷 - AI 카드뉴스·블로그·이미지 자동 생성", desc:"주제만 입력하면 AI가 카드뉴스, 상세페이지, 블로그 글을 자동으로 만들어드려요. 비회원 5회 무료!", locale:"ko_KR" },
    en: { title:"SNS Makeit - AI Card News · Blog · Image Auto Generator", desc:"Just enter a topic and AI creates card news, detail pages, and blog posts automatically. 5 free trials!", locale:"en_US" },
    ja: { title:"SNS Makeit - AI カードニュース·ブログ·画像自動生成", desc:"テーマを入力するだけでAIがカードニュース、詳細ページ、ブログ記事を自動生成。非会員10回無料！", locale:"ja_JP" },
    zh: { title:"SNS Makeit - AI 卡片新闻·博客·图片自动生成", desc:"只需输入主题，AI自动生成卡片新闻、详情页、博客文章。游客10次免费！", locale:"zh_CN" },
  };

  const updateSeoMeta = (code) => {
    const htmlLang = code === "zh" ? "zh-CN" : code;
    document.documentElement.lang = htmlLang;
    const seo = SEO_META[code] || SEO_META.ko;
    // meta description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.content = seo.desc;
    // og tags
    let ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.content = seo.title;
    let ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.content = seo.desc;
    let ogLocale = document.querySelector('meta[property="og:locale"]');
    if (ogLocale) ogLocale.content = seo.locale;
    // twitter
    let twTitle = document.querySelector('meta[name="twitter:title"]');
    if (twTitle) twTitle.content = seo.title;
    let twDesc = document.querySelector('meta[name="twitter:description"]');
    if (twDesc) twDesc.content = seo.desc;
    // hreflang links (remove old, add new)
    document.querySelectorAll('link[hreflang]').forEach(el => el.remove());
    const base = "https://snsmakeit.com";
    Object.keys(SEO_META).forEach(lc => {
      const link = document.createElement("link");
      link.rel = "alternate"; link.hreflang = lc === "zh" ? "zh-CN" : lc;
      link.href = base + (lc === "ko" ? "/" : "/?lang=" + lc);
      document.head.appendChild(link);
    });
    // x-default
    const xd = document.createElement("link");
    xd.rel = "alternate"; xd.hreflang = "x-default"; xd.href = base + "/";
    document.head.appendChild(xd);
  };

  const setLang = (code) => {
    setLangState(code);
    try { localStorage.setItem(LANG_KEY, code); } catch {}
    updateSeoMeta(code);
    window.__i18nLang = { lang: code };
  };

  useEffect(() => {
    updateSeoMeta(lang);
    window.__i18nLang = { lang };
  }, []);

  const t = (key) => getTranslation(lang, key);

  return (
    <I18nContext.Provider value={{ lang, t, setLang }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}

export function getLangLabel(code) {
  return LANGUAGES.find(l => l.code === code)?.label || code;
}
