// ═══════════════════════════════════════════════
// 인포그래픽 영상 — 화면 텍스트 다국어 사전
// 각 씬에서 T(key) 로 호출
// ═══════════════════════════════════════════════

const DICT = {
  // ── 씬 1: 공감 ──
  s01_title:        { ko: "뭐 올려야 할지,\n막막하셨죠?", en: "Ever felt lost\nabout what to post?", ja: "何を投稿すべきか\n迷ったことは？", zh: "不知道该发什么，\n是不是很迷茫？", es: "¿Sin saber\nqué publicar?" },
  s01_sub:          { ko: "릴스 하나 만드는 데도 이 모든 과정을 거쳐야 합니다", en: "Even one reel requires all these steps", ja: "リール1つ作るのにもこれだけの工程が必要です", zh: "哪怕做一个短视频也需要这么多步骤", es: "Incluso un reel requiere todos estos pasos" },
  s01_task1:        { ko: "제목 고민", en: "Title", ja: "タイトル", zh: "想标题", es: "Titulo" },
  s01_task2:        { ko: "문구 작성", en: "Copy", ja: "文章", zh: "写文案", es: "Texto" },
  s01_task3:        { ko: "자막 넣기", en: "Subtitles", ja: "字幕", zh: "加字幕", es: "Subtitulos" },
  s01_task4:        { ko: "썸네일 제작", en: "Thumbnail", ja: "サムネイル", zh: "做封面", es: "Miniatura" },
  s01_time:         { ko: "1~2시간", en: "1-2 hrs", ja: "1〜2時間", zh: "1-2小时", es: "1-2 hrs" },
  s01_time_label:   { ko: "소요", en: "spent", ja: "消費", zh: "耗时", es: "gastado" },

  // ── 씬 2: 등장 ──
  s02_pre:          { ko: "이제는 다른 방법이 있습니다", en: "Now there's a better way", ja: "今は別の方法があります", zh: "现在有更好的方法了", es: "Ahora hay una mejor forma" },
  s02_post:         { ko: "콘텐츠 제작에 필요한 모든 과정을 한곳에", en: "Everything you need for content creation, in one place", ja: "コンテンツ制作に必要な全てを一つに", zh: "内容创作所需的一切集于一处", es: "Todo lo que necesitas para crear contenido, en un solo lugar" },

  // ── 씬 3: 고민 ──
  s03_title:        { ko: "많은 분들이 겪는\n바로 그 고민", en: "The real struggles\nyou face", ja: "多くの方が抱える\nまさにその悩み", zh: "很多人都面临的\n真实困扰", es: "Los problemas reales\nque enfrentas" },
  s03_p1_title:     { ko: "뭘 만들지?", en: "What to create?", ja: "何を作る？", zh: "做什么？", es: "¿Que crear?" },
  s03_p1_desc:      { ko: "무슨 콘텐츠를 만들어야 할지 감이 안 잡힌다", en: "No idea what content to create", ja: "何を作ればいいかわからない", zh: "不知道该做什么内容", es: "Sin idea de que contenido crear" },
  s03_p2_title:     { ko: "시간이 없다", en: "No time", ja: "時間がない", zh: "没时间", es: "Sin tiempo" },
  s03_p2_desc:      { ko: "하나 만드는 데 너무 오래 걸린다", en: "Takes too long to make one", ja: "一つ作るのに時間がかかりすぎる", zh: "做一个太费时间", es: "Toma demasiado tiempo hacer uno" },
  s03_p3_title:     { ko: "성과가 안 나온다", en: "No results", ja: "成果が出ない", zh: "没效果", es: "Sin resultados" },
  s03_p3_desc:      { ko: "올려도 반응이 없고 기대만큼 안 된다", en: "No engagement, below expectations", ja: "投稿しても反応がなく期待通りにならない", zh: "发了也没反应达不到预期", es: "Sin interaccion, por debajo de expectativas" },

  // ── 씬 4: 해결 ──
  s04_title1:       { ko: "처음부터 성장까지,", en: "From start to growth,", ja: "最初から成長まで、", zh: "从入门到成长，", es: "Del inicio al crecimiento," },
  s04_title2:       { ko: "하나의 흐름으로", en: "in one seamless flow", ja: "一つの流れで", zh: "一气呵成", es: "en un solo flujo" },
  s04_sub:          { ko: "초보자도 쉽게 따라갈 수 있도록 설계되어 있습니다", en: "Designed so even beginners can easily follow", ja: "初心者でも簡単に進められるよう設計", zh: "即使是新手也能轻松跟上", es: "Disenado para que incluso principiantes puedan seguir" },
  s04_step1:        { ko: "아이디어 발굴", en: "Find Ideas", ja: "アイデア発掘", zh: "发掘创意", es: "Buscar Ideas" },
  s04_step1d:       { ko: "AI + 트렌드 키워드", en: "AI + Trending keywords", ja: "AI + トレンドキーワード", zh: "AI + 热门关键词", es: "IA + Palabras clave" },
  s04_step2:        { ko: "콘텐츠 생성", en: "Create Content", ja: "コンテンツ生成", zh: "生成内容", es: "Crear Contenido" },
  s04_step2d:       { ko: "블로그·이미지·영상", en: "Blog · Image · Video", ja: "ブログ·画像·動画", zh: "博客·图片·视频", es: "Blog · Imagen · Video" },
  s04_step3:        { ko: "자동 발행", en: "Auto Publish", ja: "自動発行", zh: "自动发布", es: "Publicacion Auto" },
  s04_step3d:       { ko: "20+ 플랫폼 원클릭", en: "20+ platforms, 1-click", ja: "20+プラットフォーム", zh: "20+平台一键发", es: "20+ plataformas, 1-clic" },
  s04_step4:        { ko: "성과 분석", en: "Analyze", ja: "成果分析", zh: "分析效果", es: "Analizar" },
  s04_step4d:       { ko: "데이터 기반 최적화", en: "Data-driven optimization", ja: "データ基盤最適化", zh: "数据驱动优化", es: "Optimizacion basada en datos" },

  // ── 씬 5: AI 도구 ──
  s05_title1:       { ko: "아이디어가\n막힐 때,", en: "When you're\nout of ideas,", ja: "アイデアに\n行き詰まったら、", zh: "当你想不出\n点子时，", es: "Cuando no tienes\nideas," },
  s05_title2:       { ko: "AI가 해결합니다", en: "AI solves it", ja: "AIが解決します", zh: "AI来帮你解决", es: "La IA lo resuelve" },
  s05_sub:          { ko: "바로 활용할 수 있는 예시들이 정리되어 있어\n처음 시작하는 분들도 쉽게 접근할 수 있습니다", en: "Ready-to-use examples are organized so\neven beginners can easily get started", ja: "すぐ使える例が整理されていて\n初心者でも簡単に始められます", zh: "现成的例子已整理好\n新手也能轻松上手", es: "Ejemplos listos para usar organizados\npara que principiantes puedan empezar" },
  s05_ai_label:     { ko: "AI 아이디어 생성", en: "AI Idea Generator", ja: "AIアイデア生成", zh: "AI创意生成", es: "Generador de Ideas IA" },
  s05_type:         { ko: "오늘 인스타그램에 올릴 릴스 주제 추천해줘", en: "Suggest reel topics for Instagram today", ja: "今日インスタに上げるリールのテーマを提案して", zh: "推荐今天Instagram上发的短视频主题", es: "Sugiere temas de reels para Instagram hoy" },
  s05_r1:           { ko: "오늘의 OOTD 브이로그 스타일 릴스", en: "Today's OOTD vlog-style reel", ja: "今日のOOTDブイログスタイルリール", zh: "今日OOTD博客风格短视频", es: "Reel estilo vlog OOTD de hoy" },
  s05_r2:           { ko: "before/after 변화 과정 타임랩스", en: "Before/after transformation timelapse", ja: "ビフォーアフター変化タイムラプス", zh: "前后对比变化延时摄影", es: "Timelapse de transformacion antes/despues" },
  s05_r3:           { ko: "팔로워 Q&A 인터랙티브 릴스", en: "Follower Q&A interactive reel", ja: "フォロワーQ&Aインタラクティブリール", zh: "粉丝问答互动短视频", es: "Reel interactivo de Q&A con seguidores" },
  s05_ex1:          { ko: "릴스 문구", en: "Reel Copy", ja: "リール文", zh: "短视频文案", es: "Texto Reel" },
  s05_ex2:          { ko: "광고 카피", en: "Ad Copy", ja: "広告コピー", zh: "广告文案", es: "Copy Publicitario" },
  s05_ex3:          { ko: "블로그 제목", en: "Blog Title", ja: "ブログタイトル", zh: "博客标题", es: "Titulo Blog" },
  s05_ex4:          { ko: "유튜브 아이디어", en: "YouTube Ideas", ja: "YouTubeアイデア", zh: "YouTube创意", es: "Ideas YouTube" },
  s05_ex5:          { ko: "카드뉴스", en: "Card News", ja: "カードニュース", zh: "图文卡片", es: "Card News" },
  s05_ex6:          { ko: "상세페이지", en: "Detail Page", ja: "詳細ページ", zh: "详情页", es: "Pagina Detalle" },

  // ── 씬 6: 시간 절감 ──
  s06_title1:       { ko: "제작 시간,", en: "Production time,", ja: "制作時間、", zh: "制作时间，", es: "Tiempo de produccion," },
  s06_title2:       { ko: "이만큼 줄어듭니다", en: "reduced this much", ja: "これだけ短縮されます", zh: "大幅缩短", es: "reducido en esta cantidad" },
  s06_before:       { ko: "기존 방식", en: "Traditional", ja: "従来の方法", zh: "传统方式", es: "Tradicional" },
  s06_time_save:    { ko: "92% 시간 절감", en: "92% Time Saved", ja: "92% 時間短縮", zh: "节省92%时间", es: "92% Tiempo Ahorrado" },

  // ── 씬 7: 커뮤니티 ──
  s07_title1:       { ko: "혼자 찾지 마세요,", en: "Stop searching alone,", ja: "一人で探さないで、", zh: "别一个人找了，", es: "Deja de buscar solo," },
  s07_title2:       { ko: "여기 다 있습니다", en: "it's all here", ja: "ここに全てあります", zh: "这里全都有", es: "todo esta aqui" },
  s07_sub:          { ko: "검색으로 찾기 어려운 실전 자료를\n커뮤니티에서 바로 확인할 수 있습니다", en: "Find practical resources in the community\nthat are hard to search for on your own", ja: "検索で見つけにくい実践資料を\nコミュニティですぐ確認できます", zh: "在社区里直接获取\n那些难以搜索的实战资料", es: "Encuentra recursos practicos en la comunidad\nque son dificiles de buscar por tu cuenta" },
  s07_t1:           { ko: "최신 AI 툴 정보", en: "Latest AI Tools", ja: "最新AIツール情報", zh: "最新AI工具", es: "Ultimas Herramientas IA" },
  s07_t2:           { ko: "유튜브 성장 팁", en: "YouTube Growth Tips", ja: "YouTube成長のコツ", zh: "YouTube增长技巧", es: "Tips Crecimiento YouTube" },
  s07_t3:           { ko: "SNS 마케팅 자료", en: "SNS Marketing", ja: "SNSマーケティング資料", zh: "社交媒体营销", es: "Marketing Redes Sociales" },
  s07_t4:           { ko: "실전 프롬프트", en: "Real Prompts", ja: "実践プロンプト", zh: "实战提示词", es: "Prompts Reales" },
  s07_board:        { ko: "정보공유 게시판", en: "Info Board", ja: "情報共有掲示板", zh: "信息共享板块", es: "Tablero de Info" },
  s07_live:         { ko: "실시간", en: "Live", ja: "リアルタイム", zh: "实时", es: "En vivo" },
  s07_views:        { ko: "조회", en: "views", ja: "閲覧", zh: "浏览", es: "vistas" },

  // ── 씬 8: 자료실 ──
  s08_title1:       { ko: "바로 다운로드해서 쓰는", en: "Download and use", ja: "すぐダウンロードして使う", zh: "下载即用的", es: "Descarga y usa" },
  s08_title2:       { ko: "실전 자료실", en: "Resource Library", ja: "実践資料室", zh: "实战资料库", es: "Biblioteca de Recursos" },
  s08_sub:          { ko: "정보를 보는 데서 끝나지 않습니다 — 바로 실행하세요", en: "Don't just read — take action now", ja: "情報を見るだけで終わりません — すぐ実行しましょう", zh: "不只是看信息 — 立即执行吧", es: "No solo leas — actua ahora" },
  s08_r1:           { ko: "자동 자막", en: "Auto Subtitles", ja: "自動字幕", zh: "自动字幕", es: "Subtitulos Auto" },
  s08_r1d:          { ko: "프리미어 프로 자막 자동화", en: "Premiere Pro subtitle automation", ja: "Premiere Pro字幕自動化", zh: "Premiere Pro字幕自动化", es: "Automatizacion Premiere Pro" },
  s08_r2:           { ko: "디자인 템플릿", en: "Design Templates", ja: "デザインテンプレート", zh: "设计模板", es: "Plantillas Diseno" },
  s08_r2d:          { ko: "바로 사용 가능한 템플릿", en: "Ready-to-use templates", ja: "すぐ使えるテンプレート", zh: "即用模板", es: "Plantillas listas para usar" },
  s08_r3:           { ko: "영상 효과", en: "Video Effects", ja: "映像エフェクト", zh: "视频特效", es: "Efectos Video" },
  s08_r3d:          { ko: "트랜지션 · 오버레이", en: "Transitions · Overlays", ja: "トランジション · オーバーレイ", zh: "转场 · 叠加", es: "Transiciones · Overlays" },
  s08_r4:           { ko: "프롬프트팩", en: "Prompt Pack", ja: "プロンプトパック", zh: "提示词包", es: "Pack Prompts" },
  s08_r4d:          { ko: "검증된 AI 프롬프트", en: "Verified AI prompts", ja: "検証済みAIプロンプト", zh: "经过验证的AI提示词", es: "Prompts de IA verificados" },
  s08_dl:           { ko: "다운로드", en: "Download", ja: "ダウンロード", zh: "下载", es: "Descargar" },

  // ── 씬 9: 타겟 ──
  s09_title1:       { ko: "시간을 줄이고,", en: "Save time,", ja: "時間を節約し、", zh: "节省时间，", es: "Ahorra tiempo," },
  s09_title2:       { ko: "성과를 높이고 싶은 모든 분", en: "boost results — for everyone", ja: "成果を高めたい全ての方へ", zh: "提升效果 — 适合每个人", es: "mejora resultados — para todos" },
  s09_sub:          { ko: "초보자부터 현직 마케터까지, 누구나 활용할 수 있습니다", en: "From beginners to pro marketers, anyone can use it", ja: "初心者から現役マーケターまで、誰でも活用できます", zh: "从新手到专业营销人员，人人都能用", es: "Desde principiantes hasta marketers profesionales" },
  s09_t1:           { ko: "콘텐츠 입문자", en: "Beginners", ja: "コンテンツ入門者", zh: "内容新手", es: "Principiantes" },
  s09_t1d:          { ko: "처음 시작하는데 뭐부터 해야 할지 모르는 분", en: "Just starting out, not sure where to begin", ja: "始めたいけど何からすればいいかわからない方", zh: "刚开始不知从何做起的人", es: "Recien empezando, sin saber por donde comenzar" },
  s09_t2:           { ko: "1인 사업자", en: "Solo Business", ja: "個人事業者", zh: "个体创业者", es: "Negocio Individual" },
  s09_t2d:          { ko: "SNS 마케팅에 시간을 쏟기 어려운 분", en: "Too busy for SNS marketing", ja: "SNSマーケティングに時間を割けない方", zh: "没时间做社交媒体营销的人", es: "Sin tiempo para marketing en redes" },
  s09_t3:           { ko: "마케터 · 운영자", en: "Marketers", ja: "マーケター · 運営者", zh: "营销人 · 运营者", es: "Marketers" },
  s09_t3d:          { ko: "이미 운영 중이지만 효율을 높이고 싶은 분", en: "Already running but want more efficiency", ja: "すでに運営中だが効率を高めたい方", zh: "已经在运营但想提升效率的人", es: "Ya operando pero buscando mas eficiencia" },
  s09_t4:           { ko: "크리에이터", en: "Creators", ja: "クリエイター", zh: "创作者", es: "Creadores" },
  s09_t4d:          { ko: "더 많은 콘텐츠를 꾸준히 만들고 싶은 분", en: "Want to create more content consistently", ja: "もっと多くのコンテンツを継続的に作りたい方", zh: "想要持续创作更多内容的人", es: "Quieren crear mas contenido consistentemente" },

  // ── 씬 10: CTA ──
  s10_pre:          { ko: "결국 중요한 건", en: "What truly matters is", ja: "結局大事なのは", zh: "最终重要的是", es: "Lo que realmente importa es" },
  s10_line1:        { ko: "더 빠르게 만들고", en: "Create faster", ja: "より速く作り", zh: "更快地创作", es: "Crear mas rapido" },
  s10_line2:        { ko: "더 꾸준히 올리는 것", en: "Post more consistently", ja: "より継続的にアップすること", zh: "更持续地发布", es: "Publicar con mas constancia" },
  s10_sub:          { ko: "콘텐츠 제작이 어렵게 느껴졌다면,\n이제는 더 빠르고 쉽게 시작해보세요", en: "If content creation felt difficult,\nnow start faster and easier", ja: "コンテンツ制作が難しく感じたなら、\n今こそ速く簡単に始めましょう", zh: "如果觉得内容创作很难，\n现在更快更轻松地开始吧", es: "Si crear contenido parecia dificil,\nahora empieza mas rapido y facil" },
  s10_cta:          { ko: "지금 시작하기", en: "Get Started Now", ja: "今すぐ始める", zh: "立即开始", es: "Empieza Ahora" },
};

export function T(key, lang = "ko") {
  return DICT[key]?.[lang] || DICT[key]?.ko || key;
}
