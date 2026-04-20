"""
SNS메이킷 소개 영상 — TTS 음성 생성 스크립트
edge-tts 사용 (무료, 고품질 Microsoft Edge TTS)

사용법:
  pip install edge-tts
  python scripts/generate-tts.py              # 한국어만
  python scripts/generate-tts.py --lang all   # 전체 언어
  python scripts/generate-tts.py --lang en    # 영어만
  python scripts/generate-tts.py --merge      # 세그먼트 병합 (ffmpeg 필요)
"""

import asyncio
import os
import sys
import json
import argparse

try:
    import edge_tts
except ImportError:
    print("edge-tts가 설치되어 있지 않습니다.")
    print("설치: pip install edge-tts")
    sys.exit(1)

# 프로젝트 루트
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT_DIR = os.path.join(PROJECT_ROOT, "public", "tts")

# TTS 음성 설정 — "이게경제냐" 스타일: 차분한 여성 설명체
VOICES = {
    "ko": "ko-KR-SunHiNeural",                # 여성, 한국어 네이티브 (피치/속도 조정으로 차분한 톤)
    "en": "en-US-EmmaMultilingualNeural",      # 여성, Cheerful/Clear/Conversational
    "ja": "ja-JP-NanamiNeural",                # 여성, Friendly
    "zh": "zh-CN-XiaoxiaoNeural",              # 여성, Warm
    "es": "es-ES-ElviraNeural",                # 여성, Friendly
}

# 나레이션 세그먼트 (narration-data.js와 동일)
NARRATION = [
    {
        "id": "s01-01", "start": 0.5, "end": 5.5,
        "ko": "SNS 콘텐츠 만들 때마다 뭐 올려야 할지 막막했던 적 있으시죠.",
        "en": "Have you ever felt lost about what to post on social media?",
        "ja": "SNSに何を投稿すればいいか、迷ったことはありませんか。",
        "zh": "每次发社交媒体内容时，是不是经常不知道该发什么？",
        "es": "¿Alguna vez te has sentido perdido sobre qué publicar en redes sociales?",
    },
    {
        "id": "s01-02", "start": 6, "end": 11.5,
        "ko": "릴스 하나 만들려고 제목 고민하고, 문구 고민하고, 자막 넣고, 썸네일까지 만들다 보면 어느새 한두 시간이 훌쩍 지나가곤 합니다.",
        "en": "Thinking of a title, writing copy, adding subtitles, making thumbnails — before you know it, one or two hours have slipped by.",
        "ja": "タイトルを考え、文章を書き、字幕を付け、サムネイルまで作ると、あっという間に1〜2時間が過ぎてしまいます。",
        "zh": "想标题、写文案、加字幕、做封面，不知不觉一两个小时就过去了。",
        "es": "Pensar en un título, escribir textos, agregar subtítulos, crear miniaturas... sin darte cuenta, una o dos horas se han ido.",
    },
    {
        "id": "s02-01", "start": 12.5, "end": 16,
        "ko": "그런데 이제는 그런 시간을 훨씬 줄일 수 있는 방법이 있습니다.",
        "en": "But now, there's a way to drastically cut down that time.",
        "ja": "でも今は、その時間を大幅に短縮できる方法があります。",
        "zh": "但现在，有一种方法可以大幅缩短这些时间。",
        "es": "Pero ahora, hay una forma de reducir drásticamente ese tiempo.",
    },
    {
        "id": "s02-02", "start": 16.5, "end": 19,
        "ko": "바로 SNS메이킷입니다.",
        "en": "It's SNS MakeIt.",
        "ja": "それがSNSメイキットです。",
        "zh": "那就是SNS MakeIt。",
        "es": "Es SNS MakeIt.",
    },
    {
        "id": "s03-01", "start": 19.5, "end": 24,
        "ko": "SNS메이킷은 콘텐츠 제작에 필요한 모든 과정을 한곳에 모아둔 플랫폼입니다.",
        "en": "SNS MakeIt is a platform that brings together everything you need for content creation in one place.",
        "ja": "SNSメイキットは、コンテンツ制作に必要な全てを一つにまとめたプラットフォームです。",
        "zh": "SNS MakeIt是一个将内容创作所需的所有流程集于一处的平台。",
        "es": "SNS MakeIt es una plataforma que reúne todo lo necesario para la creación de contenido en un solo lugar.",
    },
    {
        "id": "s03-02", "start": 24, "end": 27,
        "ko": "처음 사이트에 들어오면 가장 먼저 보이는 건, 많은 분들이 실제로 겪는 고민입니다.",
        "en": "When you first visit the site, you'll see the real struggles that many people face.",
        "ja": "サイトに入ると最初に見えるのは、多くの方が実際に抱えている悩みです。",
        "zh": "进入网站后首先看到的，是许多人真实面临的困扰。",
        "es": "Al entrar al sitio, lo primero que verás son los problemas reales que enfrentan muchas personas.",
    },
    {
        "id": "s03-03", "start": 27, "end": 30,
        "ko": "무슨 콘텐츠를 만들어야 할지 모르겠고, 시간이 너무 오래 걸리고, 결과는 기대만큼 나오지 않는 문제들이죠.",
        "en": "Not knowing what content to create, spending too much time, and results that don't match expectations.",
        "ja": "何を作ればいいかわからない、時間がかかりすぎる、期待通りの結果が出ない、そんな問題です。",
        "zh": "不知道该做什么内容，花太多时间，结果也达不到预期。",
        "es": "No saber qué contenido crear, invertir demasiado tiempo y obtener resultados por debajo de las expectativas.",
    },
    {
        "id": "s04-01", "start": 30.5, "end": 34.5,
        "ko": "이 사이트는 바로 그 고민을 해결하는 구조로 만들어져 있습니다.",
        "en": "This site is designed to solve exactly those problems.",
        "ja": "このサイトは、まさにその悩みを解決する構造で作られています。",
        "zh": "这个网站的设计就是为了解决这些问题。",
        "es": "Este sitio está diseñado para resolver exactamente esos problemas.",
    },
    {
        "id": "s04-02", "start": 35, "end": 40,
        "ko": "처음부터 성장까지 이어지는 흐름으로, 초보자도 쉽게 따라갈 수 있도록 설계되어 있습니다.",
        "en": "With a flow that guides you from the very beginning to growth, it's designed so even beginners can easily follow along.",
        "ja": "最初から成長まで続く流れで、初心者でも簡単に進められるよう設計されています。",
        "zh": "从入门到成长的完整流程，即使是新手也能轻松跟上。",
        "es": "Con un flujo que te guía desde el inicio hasta el crecimiento, diseñado para que incluso los principiantes puedan seguirlo fácilmente.",
    },
    {
        "id": "s05-01", "start": 40.5, "end": 44.5,
        "ko": "예를 들어 콘텐츠를 만들 때 가장 어려운 부분은 아이디어입니다.",
        "en": "For example, the hardest part of creating content is coming up with ideas.",
        "ja": "例えば、コンテンツを作る時に最も難しいのがアイデアです。",
        "zh": "比如，创作内容时最难的部分就是想点子。",
        "es": "Por ejemplo, la parte más difícil de crear contenido es generar ideas.",
    },
    {
        "id": "s05-02", "start": 45, "end": 50,
        "ko": "무슨 주제로 올려야 사람들이 반응할지 고민하게 되는데, 여기서는 AI 도구와 실전 자료를 통해 그 부분을 빠르게 해결할 수 있습니다.",
        "en": "You worry about what topic will get people's attention, but here, AI tools and practical resources help you solve that quickly.",
        "ja": "どんなテーマなら反応が得られるか悩みますが、ここではAIツールと実践資料でその部分を素早く解決できます。",
        "zh": "你总在纠结什么话题能引起关注，而这里通过AI工具和实战资料帮你快速解决。",
        "es": "Te preguntas qué tema captará la atención de la gente, pero aquí las herramientas de IA y los recursos prácticos te ayudan a resolverlo rápidamente.",
    },
    {
        "id": "s05-03", "start": 50, "end": 55,
        "ko": "릴스 문구, 광고 카피, 블로그 제목, 유튜브 아이디어처럼 바로 활용할 수 있는 예시들이 정리되어 있어서, 처음 시작하는 분들도 훨씬 쉽게 접근할 수 있습니다.",
        "en": "Ready-to-use examples like reel captions, ad copy, blog titles, and YouTube ideas are organized so even beginners can get started easily.",
        "ja": "リール文句、広告コピー、ブログタイトル、YouTubeアイデアなど、すぐ使える例が整理されていて、初心者でも簡単に始められます。",
        "zh": "短视频文案、广告文案、博客标题、YouTube创意等现成的例子都已整理好，新手也能轻松上手。",
        "es": "Ejemplos listos para usar como textos para reels, copys publicitarios, títulos de blog e ideas para YouTube están organizados para que incluso los principiantes puedan empezar fácilmente.",
    },
    {
        "id": "s06-01", "start": 55.5, "end": 60,
        "ko": "특히 제작 시간을 크게 줄여준다는 점이 가장 큰 장점입니다.",
        "en": "The biggest advantage is that it dramatically reduces production time.",
        "ja": "特に制作時間を大幅に短縮してくれる点が最大の強みです。",
        "zh": "最大的优势在于大幅缩短了制作时间。",
        "es": "La mayor ventaja es que reduce drásticamente el tiempo de producción.",
    },
    {
        "id": "s06-02", "start": 60.5, "end": 68,
        "ko": "기존에는 하나의 콘텐츠를 만드는 데 두 시간 이상 걸렸다면, 이제는 필요한 자료와 구조가 이미 정리되어 있어서 훨씬 빠르게 작업할 수 있습니다.",
        "en": "If it used to take over two hours to create one piece of content, now with resources and structure already prepared, you can work much faster.",
        "ja": "以前はコンテンツ一つに2時間以上かかっていたとしても、今は必要な資料と構造が整理されているので、はるかに速く作業できます。",
        "zh": "如果以前制作一个内容需要两个多小时，现在所需的资料和结构已经整理好了，工作效率大幅提升。",
        "es": "Si antes tardabas más de dos horas en crear un contenido, ahora con los recursos y la estructura ya preparados, puedes trabajar mucho más rápido.",
    },
    {
        "id": "s07-01", "start": 68.5, "end": 73.5,
        "ko": "그리고 단순히 메인 기능만 있는 것이 아니라, 커뮤니티 구조도 굉장히 잘 되어 있습니다.",
        "en": "And it's not just about the main features — the community structure is also incredibly well-built.",
        "ja": "そしてメイン機能だけでなく、コミュニティの構造も非常によくできています。",
        "zh": "而且不仅仅是主要功能，社区架构也做得非常出色。",
        "es": "Y no se trata solo de las funciones principales — la estructura de la comunidad también está increíblemente bien construida.",
    },
    {
        "id": "s07-02", "start": 74, "end": 79.5,
        "ko": "정보공유 게시판에서는 최신 AI 툴 정보, 유튜브 성장 팁, SNS 마케팅 자료, 실전 프롬프트 같은 정보들을 빠르게 확인할 수 있습니다.",
        "en": "In the info-sharing board, you can quickly find the latest AI tool info, YouTube growth tips, SNS marketing resources, and real-world prompts.",
        "ja": "情報共有掲示板では、最新AIツール情報、YouTube成長のコツ、SNSマーケティング資料、実践プロンプトなどを素早く確認できます。",
        "zh": "在信息共享板块，你可以快速查看最新AI工具信息、YouTube增长技巧、社交媒体营销资料和实战提示词。",
        "es": "En el tablero de información compartida, puedes encontrar rápidamente las últimas herramientas de IA, consejos de crecimiento en YouTube, recursos de marketing en redes sociales y prompts prácticos.",
    },
    {
        "id": "s07-03", "start": 80, "end": 85,
        "ko": "혼자서 하나하나 검색해서 찾기 어려운 자료들을 커뮤니티 안에서 바로 확인할 수 있다는 점이 정말 큰 장점입니다.",
        "en": "The huge advantage is that you can instantly access resources within the community that would be hard to find by searching on your own.",
        "ja": "一人で一つ一つ検索して見つけにくい資料を、コミュニティ内ですぐ確認できるのが本当に大きな利点です。",
        "zh": "最大的优点是，那些自己一个个搜索很难找到的资料，在社区里可以立即获取。",
        "es": "La gran ventaja es que puedes acceder instantáneamente a recursos dentro de la comunidad que serían difíciles de encontrar buscando por tu cuenta.",
    },
    {
        "id": "s08-01", "start": 85.5, "end": 90,
        "ko": "또 자료실도 굉장히 실용적으로 구성되어 있습니다.",
        "en": "The resource library is also organized in a very practical way.",
        "ja": "また資料室も非常に実用的に構成されています。",
        "zh": "资料库的组织方式也非常实用。",
        "es": "La biblioteca de recursos también está organizada de manera muy práctica.",
    },
    {
        "id": "s08-02", "start": 90.5, "end": 96,
        "ko": "프리미어 프로 자동 자막 프로그램, 디자인 템플릿, 영상 효과 자료처럼 실제로 바로 다운로드해서 사용할 수 있는 자료들이 정리되어 있습니다.",
        "en": "Resources like Premiere Pro auto-subtitle tools, design templates, and video effect assets are organized and ready to download and use immediately.",
        "ja": "Premiere Proの自動字幕プログラム、デザインテンプレート、映像エフェクト素材など、すぐダウンロードして使える資料が整理されています。",
        "zh": "Premiere Pro自动字幕工具、设计模板、视频特效素材等可以立即下载使用的资料都已整理好。",
        "es": "Recursos como herramientas de subtítulos automáticos para Premiere Pro, plantillas de diseño y efectos de video están organizados y listos para descargar y usar de inmediato.",
    },
    {
        "id": "s08-03", "start": 96.5, "end": 100,
        "ko": "그래서 단순히 정보를 보는 사이트가 아니라, 바로 실행할 수 있는 실전형 플랫폼이라는 느낌이 강합니다.",
        "en": "So it feels less like an information site and more like a hands-on, action-oriented platform.",
        "ja": "だから単に情報を見るサイトではなく、すぐ実行できる実践型プラットフォームという印象が強いです。",
        "zh": "所以它给人的感觉不仅仅是一个信息网站，更像是一个可以立即执行的实战型平台。",
        "es": "Así que se siente menos como un sitio de información y más como una plataforma práctica y orientada a la acción.",
    },
    {
        "id": "s09-01", "start": 100.5, "end": 108,
        "ko": "콘텐츠를 처음 시작하는 분들부터 이미 운영 중인 분들까지 모두 활용하기 좋은 구조로 만들어져 있어서, 시간을 줄이고 성과를 높이고 싶은 분들에게 특히 도움이 될 수 있습니다.",
        "en": "It's built for everyone from beginners to experienced operators, and is especially helpful for those who want to save time and boost results.",
        "ja": "初めてコンテンツを作る方からすでに運営中の方まで、全ての方に活用しやすい構造で、時間を節約し成果を高めたい方に特に役立ちます。",
        "zh": "从内容创作新手到已经在运营的人，都可以很好地利用，尤其适合想要节省时间、提升效果的人。",
        "es": "Está diseñado para todos, desde principiantes hasta operadores experimentados, y es especialmente útil para quienes quieren ahorrar tiempo y mejorar resultados.",
    },
    {
        "id": "s10-01", "start": 115.5, "end": 120,
        "ko": "결국 중요한 건 더 빠르게 만들고, 더 꾸준히 올리는 것입니다.",
        "en": "In the end, what matters is creating faster and posting more consistently.",
        "ja": "結局大事なのは、より速く作り、より継続的にアップすることです。",
        "zh": "最终重要的是更快地创作，更持续地发布。",
        "es": "Al final, lo que importa es crear más rápido y publicar con más constancia.",
    },
    {
        "id": "s10-02", "start": 120.5, "end": 125.5,
        "ko": "SNS메이킷은 그 과정을 훨씬 쉽게 만들어주는 플랫폼이라고 볼 수 있습니다.",
        "en": "SNS MakeIt is a platform that makes that entire process much easier.",
        "ja": "SNSメイキットは、その過程をはるかに簡単にしてくれるプラットフォームです。",
        "zh": "SNS MakeIt就是一个让这一过程变得更简单的平台。",
        "es": "SNS MakeIt es una plataforma que hace todo ese proceso mucho más fácil.",
    },
    {
        "id": "s10-03", "start": 126, "end": 130,
        "ko": "콘텐츠 제작이 어렵게 느껴졌다면, 이제는 더 빠르고 쉽게 시작해보시면 좋겠습니다.",
        "en": "If content creation ever felt difficult, now is the time to start faster and easier.",
        "ja": "コンテンツ制作が難しく感じていたなら、今こそより速く、より簡単に始めてみてください。",
        "zh": "如果你觉得内容创作很难，现在是时候更快、更轻松地开始了。",
        "es": "Si la creación de contenido te parecía difícil, ahora es el momento de empezar de forma más rápida y fácil.",
    },
]


# 언어별 속도/피치 — "이게경제냐" 스타일: 차분하고 따뜻한 설명체
VOICE_STYLE = {
    "ko": {"rate": "-13%", "pitch": "-5Hz"},   # 느리고 낮게 → 차분한 경제 유튜브 내레이션 톤
    "en": {"rate": "-10%", "pitch": "-3Hz"},   # 차분한 내레이션
    "ja": {"rate": "-8%",  "pitch": "-2Hz"},
    "zh": {"rate": "-8%",  "pitch": "-2Hz"},
    "es": {"rate": "-8%",  "pitch": "-2Hz"},
}


def build_narration_text(segments, lang):
    """문장 사이에 자연스러운 쉼(pause)을 넣은 전체 텍스트 생성"""
    parts = []
    prev_end = 0
    for seg in segments:
        text = seg.get(lang, "")
        if not text:
            continue
        # 세그먼트 간 간격이 0.8초 이상이면 긴 쉼 추가
        gap = seg["start"] - prev_end
        if gap >= 0.8 and parts:
            parts.append("...")   # edge-tts는 ...을 자연스러운 pause로 처리
        elif parts:
            parts.append("")      # 짧은 쉼
        parts.append(text)
        prev_end = seg["end"]
    return "\n".join(parts)


async def generate_segment(segment, lang, voice, output_dir):
    """단일 세그먼트 TTS 생성"""
    text = segment.get(lang, "")
    if not text:
        return None

    filename = f"{segment['id']}_{lang}.mp3"
    filepath = os.path.join(output_dir, filename)

    if os.path.exists(filepath):
        print(f"  [건너뜀] {filename} (이미 존재)")
        return filepath

    style = VOICE_STYLE.get(lang, {"rate": "-5%", "pitch": "+0Hz"})
    communicate = edge_tts.Communicate(text, voice, rate=style["rate"], pitch=style["pitch"])
    await communicate.save(filepath)
    print(f"  [생성] {filename}")
    return filepath


async def generate_full(lang, voice, output_dir):
    """전체 나레이션을 하나의 파일로 생성 (자연스러운 쉼 포함)"""
    full_text = build_narration_text(NARRATION, lang)
    filename = f"narration_full_{lang}.mp3"
    filepath = os.path.join(output_dir, filename)

    if os.path.exists(filepath):
        print(f"  [건너뜀] {filename} (이미 존재)")
        return filepath

    style = VOICE_STYLE.get(lang, {"rate": "-5%", "pitch": "+0Hz"})
    communicate = edge_tts.Communicate(full_text, voice, rate=style["rate"], pitch=style["pitch"])
    await communicate.save(filepath)
    print(f"  [생성] {filename} (전체 나레이션)")
    return filepath


async def main():
    parser = argparse.ArgumentParser(description="SNS메이킷 소개 영상 TTS 생성")
    parser.add_argument("--lang", default="ko", help="언어 코드 (ko/en/ja/zh/es/all)")
    parser.add_argument("--segments", action="store_true", help="세그먼트별 개별 파일 생성")
    parser.add_argument("--force", action="store_true", help="기존 파일 덮어쓰기")
    args = parser.parse_args()

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    languages = list(VOICES.keys()) if args.lang == "all" else [args.lang]

    for lang in languages:
        voice = VOICES.get(lang)
        if not voice:
            print(f"[오류] 지원하지 않는 언어: {lang}")
            continue

        print(f"\n{'='*50}")
        print(f"  {lang.upper()} — {voice}")
        print(f"{'='*50}")

        lang_dir = os.path.join(OUTPUT_DIR, lang)
        os.makedirs(lang_dir, exist_ok=True)

        if args.force:
            import glob
            for f in glob.glob(os.path.join(lang_dir, "*.mp3")):
                os.remove(f)

        # 전체 나레이션 생성
        await generate_full(lang, voice, lang_dir)

        # 세그먼트별 생성 (옵션)
        if args.segments:
            print(f"\n  세그먼트별 생성 ({len(NARRATION)}개):")
            for seg in NARRATION:
                await generate_segment(seg, lang, voice, lang_dir)

    # 메타 정보 저장
    meta = {
        "generated": True,
        "languages": languages,
        "segments": len(NARRATION),
        "voices": {lang: VOICES[lang] for lang in languages},
    }
    meta_path = os.path.join(OUTPUT_DIR, "meta.json")
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)
    print(f"\n메타 정보 저장: {meta_path}")
    print(f"TTS 파일 경로: {OUTPUT_DIR}")
    print("\n완료!")


if __name__ == "__main__":
    asyncio.run(main())
