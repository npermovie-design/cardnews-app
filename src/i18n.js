/* ══════════════════════════════════════════════════════════
   다국어 번역 - 한국어 / English / 日本語 / 中文
══════════════════════════════════════════════════════════ */
export const LANGS = [
  { code: "ko", label: "한국어", flag: "🇰🇷" },
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "ja", label: "日本語", flag: "🇯🇵" },
  { code: "zh", label: "中文",   flag: "🇨🇳" },
];

export const TRANSLATIONS = {
  ko: {
    // 네비게이션
    nav: {
      home: "홈", about: "소개", aiGen: "AI 생성기",
      community: "커뮤니티", pricing: "가격정책", contact: "문의하기",
      login: "로그인 / 회원가입", logout: "로그아웃", admin: "관리자",
      dark: "다크", light: "라이트",
    },
    // 사이드바
    sidebar: {
      menu: "MENU", community: "COMMUNITY",
      home: "홈", snsWrite: "SNS 글쓰기", cardnews: "카드뉴스",
      shorts: "쇼츠영상 생성기", board: "게시판",
      naverBlog: "네이버 블로그", tistory: "티스토리",
      insta: "인스타그램 캡션", youtube: "유튜브 대본", thread: "스레드",
      plan: "글 기획하기", make: "카드뉴스 생성하기",
      boardAi: "AI & 프로그램 정보", news: "뉴스소식",
      archive: "자료실", qna: "질문답변",
      usage: "회 사용", member: "회원", guest: "비회원",
      online: "명",
    },
    // 게시판
    board: {
      write: "✏️ 글쓰기", list: "목록", post: "등록",
      noPost: "아직 게시글이 없어요. 첫 번째 글을 남겨보세요 ✍️",
      num: "번호", title: "제목", author: "글쓴이", date: "날짜", views: "조회",
      comments: "댓글", commentPh: "댓글을 입력해주세요 (Ctrl+Enter: 등록)",
      loginForComment: "댓글은 로그인 후 이용 가능합니다",
      loginLink: "→ 로그인하기",
      edit: "수정", del: "삭제", total: "총", posts: "개",
      editPost: "✏️ 수정", cancel: "취소", submit: "등록하기", editSubmit: "수정 완료",
      titlePh: "제목을 입력해주세요", bodyPh: "내용을 입력해주세요\n\n• 유튜브/이미지 URL을 줄 단위로 입력하면 자동 표시됩니다\n• **텍스트** 로 굵게 표시",
      preview: "👁 미리보기", editMode: "✏️ 편집",
      ytInsert: "▶ 유튜브", imgInsert: "🖼 이미지 URL", bold: "B 굵게",
      ytPh: "https://www.youtube.com/watch?v=...", imgPh: "https://example.com/image.jpg",
      insert: "삽입", close: "닫기",
      confirmDelete: "정말 삭제하시겠습니까?", confirmDeleteCmt: "댓글을 삭제하시겠습니까?",
      pointAlert: "글이 등록됐어요! 포인트 10P 적립 🎉",
      backToList: "← 목록으로",
      edited: "(수정됨)", page: "페이지",
    },
    // AI 상단바
    aiBar: {
      aiGen: "🤖 AI 생성기", member: "회원", guest: "비회원",
      free: "무료", times: "회",
    },
    // 공통
    common: {
      save: "저장", close: "닫기", confirm: "확인", cancel: "취소",
      loading: "로딩 중...", error: "오류가 발생했습니다.",
      loginRequired: "로그인이 필요합니다.",
    },
    // 가격
    pricing: {
      title: "포인트 충전으로 무제한 사용",
      sub: "게시글 작성만으로도 포인트를 무료로 적립할 수 있어요",
      charge: "충전하기", free: "무료 시작",
      loginToCharge: "로그인 후 충전",
      freePoints: "무료 포인트 적립 방법",
    },
  },

  en: {
    nav: {
      home: "Home", about: "About", aiGen: "AI Generator",
      community: "Community", pricing: "Pricing", contact: "Contact",
      login: "Login / Sign up", logout: "Logout", admin: "Admin",
      dark: "Dark", light: "Light",
    },
    sidebar: {
      menu: "MENU", community: "COMMUNITY",
      home: "Home", snsWrite: "SNS Writing", cardnews: "Card News",
      shorts: "Shorts Generator", board: "Board",
      naverBlog: "Naver Blog", tistory: "Tistory",
      insta: "Instagram Caption", youtube: "YouTube Script", thread: "Threads",
      plan: "Plan Content", make: "Create Card News",
      boardAi: "AI & Programs", news: "News",
      archive: "Archive", qna: "Q&A",
      usage: " used", member: "Member", guest: "Guest",
      online: " online",
    },
    board: {
      write: "✏️ Write", list: "List", post: "Post",
      noPost: "No posts yet. Be the first! ✍️",
      num: "No.", title: "Title", author: "Author", date: "Date", views: "Views",
      comments: "Comments", commentPh: "Write a comment (Ctrl+Enter to post)",
      loginForComment: "Login to write comments",
      loginLink: "→ Login",
      edit: "Edit", del: "Delete", total: "Total", posts: "posts",
      editPost: "✏️ Edit", cancel: "Cancel", submit: "Submit", editSubmit: "Save Changes",
      titlePh: "Enter title", bodyPh: "Enter content\n\n• YouTube/Image URLs on separate lines will be embedded\n• **text** for bold",
      preview: "👁 Preview", editMode: "✏️ Edit",
      ytInsert: "▶ YouTube", imgInsert: "🖼 Image URL", bold: "B Bold",
      ytPh: "https://www.youtube.com/watch?v=...", imgPh: "https://example.com/image.jpg",
      insert: "Insert", close: "Close",
      confirmDelete: "Are you sure you want to delete?", confirmDeleteCmt: "Delete this comment?",
      pointAlert: "Posted! +10P earned 🎉",
      backToList: "← Back to list",
      edited: "(edited)", page: "Page",
    },
    aiBar: {
      aiGen: "🤖 AI Generator", member: "Member", guest: "Guest",
      free: "Free", times: " uses",
    },
    common: {
      save: "Save", close: "Close", confirm: "OK", cancel: "Cancel",
      loading: "Loading...", error: "An error occurred.",
      loginRequired: "Login required.",
    },
    pricing: {
      title: "Unlimited with Points",
      sub: "Earn free points just by posting",
      charge: "Charge Now", free: "Start Free",
      loginToCharge: "Login to charge",
      freePoints: "Ways to earn free points",
    },
  },

  ja: {
    nav: {
      home: "ホーム", about: "紹介", aiGen: "AI生成",
      community: "コミュニティ", pricing: "料金", contact: "お問い合わせ",
      login: "ログイン / 新規登録", logout: "ログアウト", admin: "管理者",
      dark: "ダーク", light: "ライト",
    },
    sidebar: {
      menu: "メニュー", community: "コミュニティ",
      home: "ホーム", snsWrite: "SNS文章作成", cardnews: "カードニュース",
      shorts: "ショート動画生成", board: "掲示板",
      naverBlog: "Naverブログ", tistory: "Tistory",
      insta: "Instagramキャプション", youtube: "YouTubeスクリプト", thread: "スレッド",
      plan: "コンテンツ企画", make: "カードニュース作成",
      boardAi: "AI＆プログラム情報", news: "ニュース",
      archive: "資料室", qna: "Q&A",
      usage: "回使用", member: "会員", guest: "非会員",
      online: "人",
    },
    board: {
      write: "✏️ 投稿する", list: "一覧", post: "投稿",
      noPost: "まだ投稿がありません。最初の投稿をしてみましょう ✍️",
      num: "番号", title: "タイトル", author: "投稿者", date: "日付", views: "閲覧",
      comments: "コメント", commentPh: "コメントを入力 (Ctrl+Enter: 投稿)",
      loginForComment: "コメントはログイン後にご利用いただけます",
      loginLink: "→ ログインする",
      edit: "編集", del: "削除", total: "合計", posts: "件",
      editPost: "✏️ 編集", cancel: "キャンセル", submit: "投稿する", editSubmit: "更新する",
      titlePh: "タイトルを入力", bodyPh: "内容を入力してください",
      preview: "👁 プレビュー", editMode: "✏️ 編集",
      ytInsert: "▶ YouTube", imgInsert: "🖼 画像URL", bold: "B 太字",
      ytPh: "https://www.youtube.com/watch?v=...", imgPh: "https://example.com/image.jpg",
      insert: "挿入", close: "閉じる",
      confirmDelete: "本当に削除しますか？", confirmDeleteCmt: "コメントを削除しますか？",
      pointAlert: "投稿しました！10P獲得 🎉",
      backToList: "← 一覧に戻る",
      edited: "(編集済み)", page: "ページ",
    },
    aiBar: {
      aiGen: "🤖 AI生成器", member: "会員", guest: "非会員",
      free: "無料", times: "回",
    },
    common: {
      save: "保存", close: "閉じる", confirm: "確認", cancel: "キャンセル",
      loading: "読み込み中...", error: "エラーが発生しました。",
      loginRequired: "ログインが必要です。",
    },
    pricing: {
      title: "ポイントで無制限利用",
      sub: "投稿するだけで無料ポイントを獲得できます",
      charge: "充電する", free: "無料で始める",
      loginToCharge: "ログインして充電",
      freePoints: "無料ポイントの獲得方法",
    },
  },

  zh: {
    nav: {
      home: "首页", about: "关于", aiGen: "AI生成器",
      community: "社区", pricing: "定价", contact: "联系我们",
      login: "登录 / 注册", logout: "退出登录", admin: "管理员",
      dark: "深色", light: "浅色",
    },
    sidebar: {
      menu: "菜单", community: "社区",
      home: "首页", snsWrite: "SNS写作", cardnews: "卡片新闻",
      shorts: "短视频生成", board: "论坛",
      naverBlog: "Naver博客", tistory: "Tistory",
      insta: "Instagram说明", youtube: "YouTube脚本", thread: "Threads",
      plan: "内容规划", make: "制作卡片新闻",
      boardAi: "AI与程序信息", news: "新闻资讯",
      archive: "资料室", qna: "问答",
      usage: "次使用", member: "会员", guest: "访客",
      online: "人在线",
    },
    board: {
      write: "✏️ 发帖", list: "列表", post: "发布",
      noPost: "暂无帖子，来写第一篇吧 ✍️",
      num: "编号", title: "标题", author: "作者", date: "日期", views: "浏览",
      comments: "评论", commentPh: "写评论 (Ctrl+Enter: 发布)",
      loginForComment: "请登录后发表评论",
      loginLink: "→ 去登录",
      edit: "编辑", del: "删除", total: "共", posts: "篇",
      editPost: "✏️ 编辑", cancel: "取消", submit: "发布", editSubmit: "保存修改",
      titlePh: "请输入标题", bodyPh: "请输入内容",
      preview: "👁 预览", editMode: "✏️ 编辑",
      ytInsert: "▶ YouTube", imgInsert: "🖼 图片URL", bold: "B 加粗",
      ytPh: "https://www.youtube.com/watch?v=...", imgPh: "https://example.com/image.jpg",
      insert: "插入", close: "关闭",
      confirmDelete: "确定要删除吗？", confirmDeleteCmt: "确定删除此评论？",
      pointAlert: "发帖成功！获得10P 🎉",
      backToList: "← 返回列表",
      edited: "(已编辑)", page: "页",
    },
    aiBar: {
      aiGen: "🤖 AI生成器", member: "会员", guest: "访客",
      free: "免费", times: "次",
    },
    common: {
      save: "保存", close: "关闭", confirm: "确认", cancel: "取消",
      loading: "加载中...", error: "发生错误。",
      loginRequired: "请先登录。",
    },
    pricing: {
      title: "用积分无限使用",
      sub: "仅需发帖即可免费获得积分",
      charge: "充值", free: "免费开始",
      loginToCharge: "登录后充值",
      freePoints: "免费获取积分的方式",
    },
  },
};

export function getT(lang) {
  return TRANSLATIONS[lang] || TRANSLATIONS.ko;
}
