// ═══════════════════════════════════════════════
// 나레이션 데이터 — TTS 실측 기반 타임스탬프 + 다국어 자막
// ═══════════════════════════════════════════════

export const LANGUAGES = {
  ko: { label: "한국어", flag: "KR" },
  en: { label: "English", flag: "EN" },
  ja: { label: "日本語", flag: "JP" },
  zh: { label: "中文", flag: "CN" },
  es: { label: "Español", flag: "ES" },
};

export const DEFAULT_LANG = "ko";

// ── 씬 타이밍 (글자수 비례 — 단일 TTS 동기화) ──
export const SCENE_TIMINGS = [
  { id: "s01", from: 0,      dur: 14.1 },
  { id: "s02", from: 14.11,  dur: 6.3 },
  { id: "s03", from: 20.38,  dur: 19.2 },
  { id: "s04", from: 39.58,  dur: 11.0 },
  { id: "s05", from: 50.55,  dur: 25.9 },
  { id: "s06", from: 76.41,  dur: 14.8 },
  { id: "s07", from: 91.17,  dur: 24.6 },
  { id: "s08", from: 115.73, dur: 21.2 },
  { id: "s09", from: 136.89, dur: 12.7 },
  { id: "s10", from: 149.56, dur: 18.4 },  // +2.5s 엔딩 여유
];

export const TOTAL_DURATION = 168; // 165.5s 오디오 + 엔딩 여유

// ── 세그먼트별 오디오 길이 (초) — 글자수 비례 계산 ──
export const SEGMENT_AUDIO_DURATIONS = {
  "s01-01": 4.70, "s01-02": 9.40,
  "s02-01": 4.57, "s02-02": 1.70,
  "s03-01": 5.49, "s03-02": 6.01, "s03-03": 7.71,
  "s04-01": 4.57, "s04-02": 6.40,
  "s05-01": 4.57, "s05-02": 9.67, "s05-03": 11.62,
  "s06-01": 4.31, "s06-02": 10.45,
  "s07-01": 6.40, "s07-02": 10.06, "s07-03": 8.10,
  "s08-01": 3.53, "s08-02": 10.19, "s08-03": 7.45,
  "s09-01": 12.67,
  "s10-01": 4.57, "s10-02": 5.49, "s10-03": 5.88,
};

// ── 세그먼트 절대 타임스탬프 (전체 WAV 내 위치, 글자수 비례) ──
export const SEGMENT_TIMESTAMPS = {
  "s01-01": { start: 0,      end: 4.70 },
  "s01-02": { start: 4.70,   end: 14.11 },
  "s02-01": { start: 14.11,  end: 18.68 },
  "s02-02": { start: 18.68,  end: 20.38 },
  "s03-01": { start: 20.38,  end: 25.86 },
  "s03-02": { start: 25.86,  end: 31.87 },
  "s03-03": { start: 31.87,  end: 39.58 },
  "s04-01": { start: 39.58,  end: 44.15 },
  "s04-02": { start: 44.15,  end: 50.55 },
  "s05-01": { start: 50.55,  end: 55.12 },
  "s05-02": { start: 55.12,  end: 64.79 },
  "s05-03": { start: 64.79,  end: 76.41 },
  "s06-01": { start: 76.41,  end: 80.72 },
  "s06-02": { start: 80.72,  end: 91.17 },
  "s07-01": { start: 91.17,  end: 97.57 },
  "s07-02": { start: 97.57,  end: 107.63 },
  "s07-03": { start: 107.63, end: 115.73 },
  "s08-01": { start: 115.73, end: 119.25 },
  "s08-02": { start: 119.25, end: 129.44 },
  "s08-03": { start: 129.44, end: 136.89 },
  "s09-01": { start: 136.89, end: 149.56 },
  "s10-01": { start: 149.56, end: 154.13 },
  "s10-02": { start: 154.13, end: 159.61 },
  "s10-03": { start: 159.61, end: 165.49 },
};

// ── 나레이션 세그먼트 (WAV 절대 타임스탬프 직접 사용) ──
function buildNarration() {
  const segOrder = Object.keys(SEGMENT_TIMESTAMPS);
  return segOrder.map(segId => {
    const ts = SEGMENT_TIMESTAMPS[segId];
    return {
      ...TEXTS[segId],
      id: segId,
      start: ts.start,
      end: ts.end,
      audioDur: SEGMENT_AUDIO_DURATIONS[segId] || (ts.end - ts.start),
    };
  });
}

// ── 다국어 텍스트 ──
const TEXTS = {
  "s01-01": {
    ko: "SNS 콘텐츠 만들 때마다 뭐 올려야 할지 막막했던 적 있으시죠.",
    en: "Have you ever felt lost about what to post on social media?",
    ja: "SNSに何を投稿すればいいか、迷ったことはありませんか。",
    zh: "每次发社交媒体内容时，是不是经常不知道该发什么？",
    es: "¿Alguna vez te has sentido perdido sobre qué publicar en redes sociales?",
  },
  "s01-02": {
    ko: "릴스 하나 만들려고 제목 고민하고, 문구 고민하고, 자막 넣고, 썸네일까지 만들다 보면 어느새 한두 시간이 훌쩍 지나가곤 합니다.",
    en: "Thinking of a title, writing copy, adding subtitles, making thumbnails — before you know it, one or two hours have slipped by.",
    ja: "タイトルを考え、文章を書き、字幕を付け、サムネイルまで作ると、あっという間に1〜2時間が過ぎてしまいます。",
    zh: "想标题、写文案、加字幕、做封面，不知不觉一两个小时就过去了。",
    es: "Pensar en un título, escribir textos, agregar subtítulos, crear miniaturas... sin darte cuenta, una o dos horas se han ido.",
  },
  "s02-01": {
    ko: "그런데 이제는 그런 시간을 훨씬 줄일 수 있는 방법이 있습니다.",
    en: "But now, there's a way to drastically cut down that time.",
    ja: "でも今は、その時間を大幅に短縮できる方法があります。",
    zh: "但现在，有一种方法可以大幅缩短这些时间。",
    es: "Pero ahora, hay una forma de reducir drásticamente ese tiempo.",
  },
  "s02-02": {
    ko: "바로 SNS메이킷입니다.",
    en: "It's SNS MakeIt.",
    ja: "それがSNSメイキットです。",
    zh: "那就是SNS MakeIt。",
    es: "Es SNS MakeIt.",
  },
  "s03-01": {
    ko: "SNS메이킷은 콘텐츠 제작에 필요한 모든 과정을 한곳에 모아둔 플랫폼입니다.",
    en: "SNS MakeIt is a platform that brings together everything you need for content creation in one place.",
    ja: "SNSメイキットは、コンテンツ制作に必要な全てを一つにまとめたプラットフォームです。",
    zh: "SNS MakeIt是一个将内容创作所需的所有流程集于一处的平台。",
    es: "SNS MakeIt es una plataforma que reúne todo lo necesario para la creación de contenido en un solo lugar.",
  },
  "s03-02": {
    ko: "처음 사이트에 들어오면 가장 먼저 보이는 건, 많은 분들이 실제로 겪는 고민입니다.",
    en: "When you first visit the site, you'll see the real struggles that many people face.",
    ja: "サイトに入ると最初に見えるのは、多くの方が実際に抱えている悩みです。",
    zh: "进入网站后首先看到的，是许多人真实面临的困扰。",
    es: "Al entrar al sitio, lo primero que verás son los problemas reales que enfrentan muchas personas.",
  },
  "s03-03": {
    ko: "무슨 콘텐츠를 만들어야 할지 모르겠고, 시간이 너무 오래 걸리고, 결과는 기대만큼 나오지 않는 문제들이죠.",
    en: "Not knowing what content to create, spending too much time, and results that don't match expectations.",
    ja: "何を作ればいいかわからない、時間がかかりすぎる、期待通りの結果が出ない、そんな問題です。",
    zh: "不知道该做什么内容，花太多时间，结果也达不到预期。",
    es: "No saber qué contenido crear, invertir demasiado tiempo y obtener resultados por debajo de las expectativas.",
  },
  "s04-01": {
    ko: "이 사이트는 바로 그 고민을 해결하는 구조로 만들어져 있습니다.",
    en: "This site is designed to solve exactly those problems.",
    ja: "このサイトは、まさにその悩みを解決する構造で作られています。",
    zh: "这个网站的设计就是为了解决这些问题。",
    es: "Este sitio está diseñado para resolver exactamente esos problemas.",
  },
  "s04-02": {
    ko: "처음부터 성장까지 이어지는 흐름으로, 초보자도 쉽게 따라갈 수 있도록 설계되어 있습니다.",
    en: "With a flow that guides you from the very beginning to growth, it's designed so even beginners can easily follow along.",
    ja: "最初から成長まで続く流れで、初心者でも簡単に進められるよう設計されています。",
    zh: "从入门到成长的完整流程，即使是新手也能轻松跟上。",
    es: "Con un flujo que te guía desde el inicio hasta el crecimiento, diseñado para que incluso los principiantes puedan seguirlo fácilmente.",
  },
  "s05-01": {
    ko: "예를 들어 콘텐츠를 만들 때 가장 어려운 부분은 아이디어입니다.",
    en: "For example, the hardest part of creating content is coming up with ideas.",
    ja: "例えば、コンテンツを作る時に最も難しいのがアイデアです。",
    zh: "比如，创作内容时最难的部分就是想点子。",
    es: "Por ejemplo, la parte más difícil de crear contenido es generar ideas.",
  },
  "s05-02": {
    ko: "무슨 주제로 올려야 사람들이 반응할지 고민하게 되는데, 여기서는 AI 도구와 실전 자료를 통해 그 부분을 빠르게 해결할 수 있습니다.",
    en: "You worry about what topic will get people's attention, but here, AI tools and practical resources help you solve that quickly.",
    ja: "どんなテーマなら反応が得られるか悩みますが、ここではAIツールと実践資料でその部分を素早く解決できます。",
    zh: "你总在纠结什么话题能引起关注，而这里通过AI工具和实战资料帮你快速解决。",
    es: "Te preguntas qué tema captará la atención de la gente, pero aquí las herramientas de IA y los recursos prácticos te ayudan a resolverlo rápidamente.",
  },
  "s05-03": {
    ko: "릴스 문구, 광고 카피, 블로그 제목, 유튜브 아이디어처럼 바로 활용할 수 있는 예시들이 정리되어 있어서, 처음 시작하는 분들도 훨씬 쉽게 접근할 수 있습니다.",
    en: "Ready-to-use examples like reel captions, ad copy, blog titles, and YouTube ideas are organized so even beginners can get started easily.",
    ja: "リール文句、広告コピー、ブログタイトル、YouTubeアイデアなど、すぐ使える例が整理されていて、初心者でも簡単に始められます。",
    zh: "短视频文案、广告文案、博客标题、YouTube创意等现成的例子都已整理好，新手也能轻松上手。",
    es: "Ejemplos listos para usar como textos para reels, copys publicitarios, títulos de blog e ideas para YouTube están organizados para que incluso los principiantes puedan empezar fácilmente.",
  },
  "s06-01": {
    ko: "특히 제작 시간을 크게 줄여준다는 점이 가장 큰 장점입니다.",
    en: "The biggest advantage is that it dramatically reduces production time.",
    ja: "特に制作時間を大幅に短縮してくれる点が最大の強みです。",
    zh: "最大的优势在于大幅缩短了制作时间。",
    es: "La mayor ventaja es que reduce drásticamente el tiempo de producción.",
  },
  "s06-02": {
    ko: "기존에는 하나의 콘텐츠를 만드는 데 두 시간 이상 걸렸다면, 이제는 필요한 자료와 구조가 이미 정리되어 있어서 훨씬 빠르게 작업할 수 있습니다.",
    en: "If it used to take over two hours to create one piece of content, now with resources and structure already prepared, you can work much faster.",
    ja: "以前はコンテンツ一つに2時間以上かかっていたとしても、今は必要な資料と構造が整理されているので、はるかに速く作業できます。",
    zh: "如果以前制作一个内容需要两个多小时，现在所需的资料和结构已经整理好了，工作效率大幅提升。",
    es: "Si antes tardabas más de dos horas en crear un contenido, ahora con los recursos y la estructura ya preparados, puedes trabajar mucho más rápido.",
  },
  "s07-01": {
    ko: "그리고 단순히 메인 기능만 있는 것이 아니라, 커뮤니티 구조도 굉장히 잘 되어 있습니다.",
    en: "And it's not just about the main features — the community structure is also incredibly well-built.",
    ja: "そしてメイン機能だけでなく、コミュニティの構造も非常によくできています。",
    zh: "而且不仅仅是主要功能，社区架构也做得非常出色。",
    es: "Y no se trata solo de las funciones principales — la estructura de la comunidad también está increíblemente bien construida.",
  },
  "s07-02": {
    ko: "정보공유 게시판에서는 최신 AI 툴 정보, 유튜브 성장 팁, SNS 마케팅 자료, 실전 프롬프트 같은 정보들을 빠르게 확인할 수 있습니다.",
    en: "In the info-sharing board, you can quickly find the latest AI tool info, YouTube growth tips, SNS marketing resources, and real-world prompts.",
    ja: "情報共有掲示板では、最新AIツール情報、YouTube成長のコツ、SNSマーケティング資料、実践プロンプトなどを素早く確認できます。",
    zh: "在信息共享板块，你可以快速查看最新AI工具信息、YouTube增长技巧、社交媒体营销资料和实战提示词。",
    es: "En el tablero de información compartida, puedes encontrar rápidamente las últimas herramientas de IA, consejos de crecimiento en YouTube, recursos de marketing en redes sociales y prompts prácticos.",
  },
  "s07-03": {
    ko: "혼자서 하나하나 검색해서 찾기 어려운 자료들을 커뮤니티 안에서 바로 확인할 수 있다는 점이 정말 큰 장점입니다.",
    en: "The huge advantage is that you can instantly access resources within the community that would be hard to find by searching on your own.",
    ja: "一人で一つ一つ検索して見つけにくい資料を、コミュニティ内ですぐ確認できるのが本当に大きな利点です。",
    zh: "最大的优点是，那些自己一个个搜索很难找到的资料，在社区里可以立即获取。",
    es: "La gran ventaja es que puedes acceder instantáneamente a recursos dentro de la comunidad que serían difíciles de encontrar buscando por tu cuenta.",
  },
  "s08-01": {
    ko: "또 자료실도 굉장히 실용적으로 구성되어 있습니다.",
    en: "The resource library is also organized in a very practical way.",
    ja: "また資料室も非常に実用的に構成されています。",
    zh: "资料库的组织方式也非常实用。",
    es: "La biblioteca de recursos también está organizada de manera muy práctica.",
  },
  "s08-02": {
    ko: "프리미어 프로 자동 자막 프로그램, 디자인 템플릿, 영상 효과 자료처럼 실제로 바로 다운로드해서 사용할 수 있는 자료들이 정리되어 있습니다.",
    en: "Resources like Premiere Pro auto-subtitle tools, design templates, and video effect assets are organized and ready to download and use immediately.",
    ja: "Premiere Proの自動字幕プログラム、デザインテンプレート、映像エフェクト素材など、すぐダウンロードして使える資料が整理されています。",
    zh: "Premiere Pro自动字幕工具、设计模板、视频特效素材等可以立即下载使用的资料都已整理好。",
    es: "Recursos como herramientas de subtítulos automáticos para Premiere Pro, plantillas de diseño y efectos de video están organizados y listos para descargar y usar de inmediato.",
  },
  "s08-03": {
    ko: "그래서 단순히 정보를 보는 사이트가 아니라, 바로 실행할 수 있는 실전형 플랫폼이라는 느낌이 강합니다.",
    en: "So it feels less like an information site and more like a hands-on, action-oriented platform.",
    ja: "だから単に情報を見るサイトではなく、すぐ実行できる実践型プラットフォームという印象が強いです。",
    zh: "所以它给人的感觉不仅仅是一个信息网站，更像是一个可以立即执行的实战型平台。",
    es: "Así que se siente menos como un sitio de información y más como una plataforma práctica y orientada a la acción.",
  },
  "s09-01": {
    ko: "콘텐츠를 처음 시작하는 분들부터 이미 운영 중인 분들까지 모두 활용하기 좋은 구조로 만들어져 있어서, 시간을 줄이고 성과를 높이고 싶은 분들에게 특히 도움이 될 수 있습니다.",
    en: "It's built for everyone from beginners to experienced operators, and is especially helpful for those who want to save time and boost results.",
    ja: "初めてコンテンツを作る方からすでに運営中の方まで、全ての方に活用しやすい構造で、時間を節約し成果を高めたい方に特に役立ちます。",
    zh: "从内容创作新手到已经在运营的人，都可以很好地利用，尤其适合想要节省时间、提升效果的人。",
    es: "Está diseñado para todos, desde principiantes hasta operadores experimentados, y es especialmente útil para quienes quieren ahorrar tiempo y mejorar resultados.",
  },
  "s10-01": {
    ko: "결국 중요한 건 더 빠르게 만들고, 더 꾸준히 올리는 것입니다.",
    en: "In the end, what matters is creating faster and posting more consistently.",
    ja: "結局大事なのは、より速く作り、より継続的にアップすることです。",
    zh: "最终重要的是更快地创作，更持续地发布。",
    es: "Al final, lo que importa es crear más rápido y publicar con más constancia.",
  },
  "s10-02": {
    ko: "SNS메이킷은 그 과정을 훨씬 쉽게 만들어주는 플랫폼이라고 볼 수 있습니다.",
    en: "SNS MakeIt is a platform that makes that entire process much easier.",
    ja: "SNSメイキットは、その過程をはるかに簡単にしてくれるプラットフォームです。",
    zh: "SNS MakeIt就是一个让这一过程变得更简单的平台。",
    es: "SNS MakeIt es una plataforma que hace todo ese proceso mucho más fácil.",
  },
  "s10-03": {
    ko: "콘텐츠 제작이 어렵게 느껴졌다면, 이제는 더 빠르고 쉽게 시작해보시면 좋겠습니다.",
    en: "If content creation ever felt difficult, now is the time to start faster and easier.",
    ja: "コンテンツ制作が難しく感じていたなら、今こそより速く、より簡単に始めてみてください。",
    zh: "如果你觉得内容创作很难，现在是时候更快、更轻松地开始了。",
    es: "Si la creación de contenido te parecía difícil, ahora es el momento de empezar de forma más rápida y fácil.",
  },
};

export const NARRATION = buildNarration();

// 특정 시간의 자막 찾기
export function getSubtitleAt(timeSec, lang = "ko") {
  return NARRATION.find(n => timeSec >= n.start && timeSec < n.end)?.[lang] || "";
}

// 전체 나레이션 텍스트 (TTS 생성용)
export function getFullScript(lang = "ko") {
  return NARRATION.map(n => n[lang]).filter(Boolean).join("\n\n");
}
