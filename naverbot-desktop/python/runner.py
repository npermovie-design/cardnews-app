"""봇 실행 진입점 (Electron이 subprocess로 호출)

CLI:
    python runner.py run-once          # 즉시 1개 발행
    python runner.py verify            # 메이킷 계정 검증만

config: %APPDATA%\\NaverBotSaaS\\config.json (Electron이 저장)
비밀번호: Windows Credential Manager (keyring)
- 네이버 계정 PW: service="NaverBotSaaS", username=naver_id
- 메이킷 계정 PW: service="NaverBotSaaS_Makeit", username=email

stdout JSON 한 줄 → Electron 파싱
"""

import json
import os
import re
import sys
from pathlib import Path

# Python embeddable 배포판 호환: 스크립트 디렉터리를 sys.path에 강제 추가
_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if _SCRIPT_DIR not in sys.path:
    sys.path.insert(0, _SCRIPT_DIR)

from account import verify_account
from content_fetcher import fetch_post
from drive_source import build_drive_prompt, load_drive_images, load_drive_items
from naver_blog import publish_to_naver_blog
from naver_cafe import publish_to_cafe

try:
    import keyring
except ImportError:
    keyring = None

NAVER_KEYRING = "NaverBotSaaS"
MAKEIT_KEYRING = "NaverBotSaaS_Makeit"
ADMIN_EMAILS = {"npermovie@naver.com"}

EXE_PLAN_RULES = {
    "trial": {
        "label": "무료 체험",
        "max_posts": 1,
        "max_duration_days": 1,
        "can_schedule": True,
        "can_cafe": False,
    },
    "starter": {
        "label": "Basic",
        "max_posts": 1,
        "max_duration_days": 3,
        "can_schedule": True,
        "can_cafe": False,
    },
    "pro": {
        "label": "Pro",
        "max_posts": 3,
        "max_duration_days": 30,
        "can_schedule": True,
        "can_cafe": True,
    },
    "premium": {
        "label": "Premium",
        "max_posts": 10,
        "max_duration_days": 30,
        "can_schedule": True,
        "can_cafe": True,
    },
    "admin": {
        "label": "Admin",
        "max_posts": 0,
        "max_duration_days": 0,
        "can_schedule": True,
        "can_cafe": True,
    },
}


def _exe_plan_key(acc) -> str:
    plan = (getattr(acc, "plan", "") or "").lower()
    role = (getattr(acc, "role", "") or "").lower()
    email = (getattr(acc, "email", "") or "").lower()
    if role == "admin" or plan == "admin" or email in ADMIN_EMAILS:
        return "admin"
    if getattr(acc, "trial", False) or plan in ("", "trial"):
        return "trial"
    if plan in ("premium", "business", "agency"):
        return "premium"
    if plan == "pro":
        return "pro"
    return "starter"


def _exe_plan_rules(acc) -> dict:
    return EXE_PLAN_RULES.get(_exe_plan_key(acc), EXE_PLAN_RULES["trial"])


def get_config_path() -> Path:
    config_dir = os.environ.get("NAVERBOT_CONFIG_DIR", "")
    if config_dir:
        return Path(config_dir) / "config.json"
    appdata = os.environ.get("APPDATA", str(Path.home()))
    return Path(appdata) / "NaverBotSaaS" / "config.json"


def load_config() -> dict:
    path = get_config_path()
    if not path.exists():
        return {}
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


def emit(payload: dict) -> None:
    print(json.dumps(payload, ensure_ascii=False), flush=True)


def load_password(service: str, username: str) -> str | None:
    if keyring is None or not username:
        return None
    try:
        return keyring.get_password(service, username)
    except Exception:
        return None


def analyze_keyword(keyword: str) -> dict:
    """네이버 상위 노출 블로그 글을 클라이언트에서 크롤링 + 서버 Claude 분석"""
    import requests
    import re
    from urllib.parse import quote

    cfg = load_config()
    access_token = cfg.get("makeit_access_token", "")
    email = cfg.get("makeit_email", "")

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Accept-Language": "ko-KR,ko;q=0.9",
    }
    clean_tag = re.compile(r'<[^>]+>')

    # 1. 네이버 블로그 검색 (클라이언트에서 직접)
    print(f"[분석] 네이버 검색: {keyword}", file=__import__('sys').stderr, flush=True)
    search_url = f"https://search.naver.com/search.naver?ssc=tab.blog.all&sm=tab_jum&query={quote(keyword)}"
    try:
        resp = requests.get(search_url, headers=headers, timeout=15)
        html = resp.text
    except Exception as e:
        return {"status": "error", "message": f"네이버 검색 실패: {e}"}

    # 2. 제목 추출 (여러 패턴 시도)
    patterns = [
        re.compile(r'class="title_link[^"]*"[^>]*>(.*?)</a>', re.DOTALL),
        re.compile(r'class="api_txt_lines[^"]*"[^>]*>(.*?)</a>', re.DOTALL),
        re.compile(r'<a[^>]+class="[^"]*title[^"]*"[^>]*>(.*?)</a>', re.DOTALL),
        re.compile(r'class="[^"]*tit[^"]*"[^>]*>(.*?)</(?:a|div|span)>', re.DOTALL),
        re.compile(r'"title":"([^"]{10,80})"'),  # JSON 응답 내 제목
    ]
    titles = []
    for pat in patterns:
        raw = pat.findall(html)
        for t in raw[:10]:
            cleaned = clean_tag.sub('', t).strip()
            if cleaned and len(cleaned) > 5 and cleaned not in titles:
                titles.append(cleaned)
        if len(titles) >= 5:
            break
    titles = titles[:10]

    # URL 추출
    url_pattern = re.compile(r'href="(https?://blog\.naver\.com/[^"]+)"')
    urls = list(dict.fromkeys(url_pattern.findall(html)))[:5]

    # 3. 상위 3개 본문 가져오기
    print(f"[분석] 상위글 {len(urls)}개 크롤링 중...", file=__import__('sys').stderr, flush=True)
    top_contents = []
    for url in urls[:3]:
        try:
            mobile_url = url.replace("blog.naver.com", "m.blog.naver.com")
            r = requests.get(mobile_url, headers=headers, timeout=10)
            body_match = re.search(r'class="se-main-container">(.*?)</div>\s*</div>\s*</div>', r.text, re.DOTALL)
            if not body_match:
                body_match = re.search(r'id="postViewArea"[^>]*>(.*?)</div>', r.text, re.DOTALL)
            if not body_match:
                body_match = re.search(r'class="post_ct"[^>]*>(.*?)</div>', r.text, re.DOTALL)
            if body_match:
                body_text = clean_tag.sub('\n', body_match.group(1))
                body_text = re.sub(r'\n{3,}', '\n\n', body_text).strip()
                idx = len(top_contents)
                top_contents.append({
                    "title": titles[idx] if idx < len(titles) else "",
                    "body": body_text[:2000]
                })
        except Exception:
            continue

    if not titles and not top_contents:
        return {"status": "error", "message": "검색 결과를 찾을 수 없습니다"}

    # 4. 서버 Claude API로 분석 (크롤링 데이터를 보냄)
    print(f"[분석] Claude 분석 요청 중 (제목 {len(titles)}개, 본문 {len(top_contents)}개)...", file=__import__('sys').stderr, flush=True)
    try:
        resp = requests.post(
            "https://snsmakeit.com/api/naverbot/analyze-keyword",
            json={
                "access_token": access_token,
                "email": email,
                "password": load_password(MAKEIT_KEYRING, email) or "",
                "keyword": keyword,
                "crawled_titles": titles,
                "crawled_contents": top_contents,
            },
            timeout=60,
        )
        data = resp.json() if resp.content else {}
        if data.get("ok"):
            analysis = data.get("analysis", {})
            return {
                "status": "ok",
                "suggested_titles": analysis.get("suggested_titles", titles[:5]),
                "structure_summary": analysis.get("structure_summary", ""),
                "extra_prompt": analysis.get("extra_prompt", ""),
                "top_titles": titles,
            }
    except Exception:
        pass

    # 서버 실패 시 폴백: 로컬 SEO 분석 강화
    # 상위 글 분석 — 글 길이, 소제목 수, 키워드 밀도
    avg_len = 0
    avg_subtitles = 0
    keyword_density_info = ""
    if top_contents:
        avg_len = sum(len(c["body"]) for c in top_contents) // max(len(top_contents), 1)
        # 소제목 수 추정 (줄바꿈 + 짧은 라인)
        for c in top_contents:
            lines = [l.strip() for l in c["body"].split("\n") if l.strip()]
            short_lines = sum(1 for l in lines if 3 < len(l) < 30)
            avg_subtitles += short_lines
        avg_subtitles = avg_subtitles // max(len(top_contents), 1)
        # 키워드 등장 횟수
        kw_counts = []
        for c in top_contents:
            count = c["body"].lower().count(keyword.lower())
            kw_counts.append(count)
        if kw_counts:
            avg_kw = sum(kw_counts) // len(kw_counts)
            keyword_density_info = f"상위 글 평균 키워드 등장 {avg_kw}회. "

    structure = f"상위 {len(titles)}개 글 분석 완료. "
    if avg_len:
        structure += f"평균 본문 약 {avg_len}자, 소제목 약 {avg_subtitles}개. "
    structure += keyword_density_info
    if avg_len < 2000:
        structure += "상위 글 대비 2500자 이상 작성 권장. "

    extra = (
        f'[네이버 상위노출 최적화 지시]\n'
        f'메인 키워드: "{keyword}"\n'
        f'- 제목 앞부분에 "{keyword}" 포함.\n'
    )
    if titles:
        extra += f'- 상위 노출 제목 참고: {", ".join(titles[:3])}\n'
    if avg_len:
        target_len = max(avg_len + 500, 2500)
        extra += f'- 상위 글 평균 {avg_len}자 → 본문 {target_len}자 이상 작성할 것.\n'
    extra += (
        f'- "{keyword}"를 본문에 5~8회 자연스럽게 분산 배치 (도입부/소제목/본문/마무리)\n'
        '- 1인칭 경험담 + 실무 예시 포함. 검증되지 않은 숫자/데이터는 만들지 말 것.\n'
        '- 소제목 4~6개, 각 섹션 300~500자로 구조화 (체류시간 극대화)\n'
        '- 마무리에 댓글/공감 유도 문구 포함 (D.I.A 참여 지표)\n'
    )

    # 제목 — SEO 최적화 제목 자동 생성
    suggested = titles[:5] if titles else [
        f"{keyword}, 이것만 알면 초보 탈출! 핵심 정리 7가지",
        f"{keyword} 완벽 가이드 — 전문가가 알려주는 비법",
        f"{keyword} 시작하는 분들이 꼭 알아야 할 5가지",
        f"요즘 난리난 {keyword}, 진짜 현실은 이렇습니다",
        f"{keyword} 제대로 하는 법 — 실전 경험에서 배운 팁",
    ]
    # 제목에 키워드가 없으면 앞에 추가
    seo_titles = []
    for t in suggested:
        if keyword.lower() not in t.lower() and len(t) < 40:
            seo_titles.append(f"{keyword} — {t}")
        else:
            seo_titles.append(t)

    return {
        "status": "ok",
        "suggested_titles": seo_titles[:5],
        "structure_summary": structure,
        "extra_prompt": extra,
        "top_titles": titles,
        "seo_analysis": {
            "avg_content_length": avg_len,
            "avg_subtitles": avg_subtitles,
            "keyword_density_info": keyword_density_info,
            "recommended_length": max(avg_len + 500, 2500) if avg_len else 2500,
        },
    }


def analyze_reference_format(url: str) -> dict:
    """참고 글에서 상세 서식 정보를 분석."""
    result = {
        "quote_style": "underline",
        "font_family": "",
        "font_sizes": [],
        "text_colors": [],
        "alignment": "left",
        "image_pattern": "",
        "components": [],
        "subtitle_numbered": False,
        "subtitle_pattern": "",
        "quote_as_subtitle": False,
        "images_per_section": 1,
        "bold_colors": [],
        "quote_details": [],  # 각 인용구별 상세 정보
        "quote_count": 0,
    }
    if not url:
        return result
    import requests, re
    from collections import Counter
    try:
        mobile_url = url.replace("blog.naver.com", "m.blog.naver.com")
        resp = requests.get(mobile_url, headers={"User-Agent": "Mozilla/5.0"}, timeout=10)
        html = resp.text

        # 인용구 스타일 — 모든 인용구 컴포넌트를 개별 분석
        # 방법 1: se-l-quotation_{style} 클래스에서 추출
        quote_styles = re.findall(r'se-l-quotation_(\w+)', html)
        # 방법 2: se-quotation 섹션의 class 전체에서 추출
        quote_section_styles = re.findall(r'se-section-quotation\s+se-l-quotation_(\w+)', html)
        # 방법 3: se-component se-quotation 블록에서 추출
        quote_component_styles = re.findall(r'se-component\s+se-quotation\s+se-l-quotation_(\w+)', html)

        # 모든 소스 합산 (가장 정확한 것 우선)
        all_styles = quote_component_styles or quote_section_styles or quote_styles
        if all_styles:
            common = Counter(all_styles).most_common()
            result["quote_style"] = common[0][0]
            result["quote_count"] = len(all_styles)
            result["quote_details"] = [{"style": s, "count": c} for s, c in common]

        # 인용구 내 텍스트 추출 (인용구 위치와 내용 파악)
        quote_blocks = re.findall(
            r'se-section-quotation\s+se-l-quotation_(\w+).*?<blockquote[^>]*>(.*?)</blockquote>',
            html, re.DOTALL
        )
        clean_tag = re.compile(r'<[^>]+>')
        if quote_blocks:
            details = []
            for style, content in quote_blocks:
                text = clean_tag.sub('', content).strip()[:100]
                details.append({"style": style, "text": text})
            result["quote_details"] = details
            result["quote_count"] = len(quote_blocks)

        # 폰트 패밀리 (se-ff-XXX)
        fonts = re.findall(r'se-ff-([a-zA-Z0-9_-]+)', html)
        if fonts:
            common = Counter(fonts).most_common(1)
            if common and common[0][0]:
                result["font_family"] = common[0][0]

        # 폰트 크기 (se-fs-fsXX)
        sizes = re.findall(r'se-fs-fs(\d+)', html)
        if sizes:
            result["font_sizes"] = [s for s, _ in Counter(sizes).most_common(3)]

        # 텍스트 색상 (color: #XXX) — 본문 내 인라인 색상
        colors = re.findall(r'color:\s*#([0-9a-fA-F]{3,6})', html)
        colors = [c for c in colors if c.lower() not in ('000', '000000', 'fff', 'ffffff', '333', '333333', '666', '666666')]
        if colors:
            result["text_colors"] = [f"#{c}" for c, _ in Counter(colors).most_common(3)]

        # 볼드+색상 조합 (강조 스타일)
        bold_colors = re.findall(r'<(?:b|strong)[^>]*style="[^"]*color:\s*#([0-9a-fA-F]{3,6})', html)
        if bold_colors:
            result["bold_colors"] = [f"#{c}" for c, _ in Counter(bold_colors).most_common(3)]

        # 정렬 (se-text-paragraph-align-)
        aligns = re.findall(r'se-text-paragraph-align-(\w+)', html)
        if aligns:
            common = Counter(aligns).most_common(1)
            if common and common[0][0]:
                result["alignment"] = common[0][0]

        # 소제목 패턴 분석 — 번호 사용 여부 (01, 02... 또는 1., 2.)
        # sectionTitle 컴포넌트 내용 추출
        section_titles = re.findall(r'se-section-sectionTitle.*?<p[^>]*>(.*?)</p>', html, re.DOTALL)
        clean_tag = re.compile(r'<[^>]+>')
        title_texts = [clean_tag.sub('', t).strip() for t in section_titles if clean_tag.sub('', t).strip()]
        if title_texts:
            numbered = sum(1 for t in title_texts if re.match(r'^\d{1,2}[\.\s]', t))
            if numbered >= len(title_texts) * 0.5:
                result["subtitle_numbered"] = True
                result["subtitle_pattern"] = "번호형 (01, 02...)" if title_texts[0][:2].startswith("0") else "번호형 (1., 2.)"

        # 인용구를 소제목처럼 사용하는지 (인용구 뒤에 바로 텍스트가 오는 패턴)
        comp_order = []
        for m_comp in re.finditer(r'class="se-component\s+se-(\w+)', html):
            comp = m_comp.group(1)
            if comp in ('image', 'text', 'quotation', 'oglink', 'sectionTitle'):
                comp_order.append(comp)
        result["components"] = comp_order[:20]

        if comp_order:
            # 인용구→텍스트 연속 패턴 확인
            quote_text_pairs = sum(1 for i in range(len(comp_order)-1)
                                  if comp_order[i] == 'quotation' and comp_order[i+1] == 'text')
            if quote_text_pairs >= 2:
                result["quote_as_subtitle"] = True

            # 섹션당 평균 이미지 수 계산
            text_count = comp_order.count('text')
            img_count = comp_order.count('image')
            if text_count > 0:
                result["images_per_section"] = max(1, round(img_count / max(1, text_count - 1)))

            # 이미지 배치 패턴
            img_positions = [i for i, c in enumerate(comp_order) if c == 'image']
            text_positions = [i for i, c in enumerate(comp_order) if c == 'text']
            if img_positions and text_positions:
                before = sum(1 for ip in img_positions for tp in text_positions if ip < tp)
                after = sum(1 for ip in img_positions for tp in text_positions if ip > tp)
                result["image_pattern"] = "이미지 먼저" if before > after else "텍스트 먼저"

    except Exception:
        pass
    return result


def fetch_reference_style(url: str) -> str:
    """참고 블로그 글을 크롤링하여 문체/구조 분석용 텍스트 반환."""
    if not url:
        return ""
    import requests
    import re

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36",
        "Accept-Language": "ko-KR,ko;q=0.9",
    }
    clean_tag = re.compile(r'<[^>]+>')

    try:
        # 모바일 버전이 파싱하기 쉬움
        mobile_url = url.replace("blog.naver.com", "m.blog.naver.com")
        if "m.blog" not in mobile_url:
            mobile_url = url  # 이미 모바일이거나 다른 형식
        resp = requests.get(mobile_url, headers=headers, timeout=15)
        html = resp.text

        # 본문 추출 — se-text-paragraph 내용 전체 수집
        text_parts = []

        # 1) se-text-paragraph 태그 내용 (SmartEditor ONE)
        for m in re.finditer(r'<p class="se-text-paragraph[^"]*"[^>]*>(.*?)</p>', html, re.DOTALL):
            t = clean_tag.sub('', m.group(1)).strip()
            if t and len(t) > 2:
                text_parts.append(t)

        # 2) 인용구 텍스트는 문체와 구성의 핵심 신호이므로 별도 표시
        for m in re.finditer(r'se-section-quotation[^>]*>.*?<p class="se-text-paragraph[^"]*"[^>]*>(.*?)</p>', html, re.DOTALL):
            t = clean_tag.sub('', m.group(1)).strip()
            if t and len(t) > 2:
                text_parts.append(f"[인용구] {t}")

        # 3) 소제목 (se-module-text 내 strong/b 태그)
        for m in re.finditer(r'class="se-section-text"[^>]*>.*?<(?:strong|b)[^>]*>(.*?)</(?:strong|b)>', html, re.DOTALL):
            t = clean_tag.sub('', m.group(1)).strip()
            if t and len(t) > 2:
                text_parts.append(f"[소제목] {t}")

        # 4) 폴백: post_ct 영역
        if not text_parts:
            m = re.search(r'class="post_ct"[^>]*>(.*?)</div>', html, re.DOTALL)
            if m:
                t = clean_tag.sub('\n', m.group(1)).strip()
                text_parts.append(t)

        body_text = '\n'.join(text_parts)
        body_text = re.sub(r'\n{3,}', '\n\n', body_text).strip()
        return body_text[:3000]
    except Exception as e:
        print(f"[참고 글 크롤링 실패] {e}", flush=True)
    return ""


def fetch_news_topics(theme: str, count: int = 3) -> list[str]:
    """테마 관련 최신 뉴스/트렌드에서 블로그 글감 추출 — 다양한 소스"""
    import requests
    import re
    import random
    from urllib.parse import quote

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36",
        "Accept-Language": "ko-KR,ko;q=0.9",
    }
    clean_tag = re.compile(r'<[^>]+>')
    topics = []

    # 1. 네이버 뉴스 (최신순)
    try:
        url = f"https://search.naver.com/search.naver?where=news&query={quote(theme)}&sort=1"
        resp = requests.get(url, headers=headers, timeout=10)
        title_pat = re.compile(r'class="news_tit"[^>]*title="([^"]+)"', re.DOTALL)
        news_titles = title_pat.findall(resp.text)[:10]
        if not news_titles:
            alt_pat = re.compile(r'<a[^>]+class="[^"]*news_tit[^"]*"[^>]*>(.*?)</a>', re.DOTALL)
            news_titles = [clean_tag.sub('', t).strip() for t in alt_pat.findall(resp.text)[:10]]
        topics.extend(news_titles)
    except Exception:
        pass

    # 2. 네이버 블로그 (최신순)
    try:
        url = f"https://search.naver.com/search.naver?ssc=tab.blog.all&query={quote(theme)}&sort=1"
        resp = requests.get(url, headers=headers, timeout=10)
        blog_pat = re.compile(r'class="title_link[^"]*"[^>]*>(.*?)</a>', re.DOTALL)
        blog_titles = [clean_tag.sub('', t).strip() for t in blog_pat.findall(resp.text)[:10]]
        if not blog_titles:
            alt_pat = re.compile(r'class="api_txt_lines[^"]*"[^>]*>(.*?)</a>', re.DOTALL)
            blog_titles = [clean_tag.sub('', t).strip() for t in alt_pat.findall(resp.text)[:10]]
        topics.extend(blog_titles)
    except Exception:
        pass

    # 3. 네이버 지식iN (질문 기반 글감)
    try:
        url = f"https://search.naver.com/search.naver?where=kin&query={quote(theme)}&sort=1"
        resp = requests.get(url, headers=headers, timeout=10)
        kin_pat = re.compile(r'class="title_link[^"]*"[^>]*>(.*?)</a>', re.DOTALL)
        kin_titles = [clean_tag.sub('', t).strip() for t in kin_pat.findall(resp.text)[:8]]
        topics.extend(kin_titles)
    except Exception:
        pass

    # 4. 네이버 카페 (커뮤니티 관심사)
    try:
        url = f"https://search.naver.com/search.naver?where=article&query={quote(theme)}&sort=1"
        resp = requests.get(url, headers=headers, timeout=10)
        cafe_pat = re.compile(r'class="title_link[^"]*"[^>]*>(.*?)</a>', re.DOTALL)
        cafe_titles = [clean_tag.sub('', t).strip() for t in cafe_pat.findall(resp.text)[:8]]
        if not cafe_titles:
            alt_pat = re.compile(r'class="api_txt_lines[^"]*"[^>]*>(.*?)</a>', re.DOTALL)
            cafe_titles = [clean_tag.sub('', t).strip() for t in alt_pat.findall(resp.text)[:8]]
        topics.extend(cafe_titles)
    except Exception:
        pass

    # 5. Google News RSS
    try:
        url = f"https://news.google.com/rss/search?q={quote(theme)}&hl=ko&gl=KR&ceid=KR:ko"
        resp = requests.get(url, headers=headers, timeout=10)
        g_pat = re.compile(r'<title><!\[CDATA\[(.*?)\]\]></title>')
        g_titles = g_pat.findall(resp.text)
        if not g_titles:
            g_pat2 = re.compile(r'<title>(.*?)</title>')
            g_titles = g_pat2.findall(resp.text)
        topics.extend(g_titles[1:11])
    except Exception:
        pass

    # 6. 네이버 자동완성 (실제 검색량 반영 키워드)
    try:
        ac_url = f"https://ac.search.naver.com/nx/ac?q={quote(theme)}&con=1&frm=nv&ans=2&r_format=json&r_enc=UTF-8&r_unicode=0&t_koreng=1&run=2&rev=4&q_enc=UTF-8"
        resp = requests.get(ac_url, headers=headers, timeout=5)
        ac_data = resp.json()
        ac_items = ac_data.get("items", [[]])[0] if ac_data.get("items") else []
        for item in ac_items[:8]:
            if isinstance(item, list) and item:
                kw = item[0] if isinstance(item[0], str) else str(item[0])
                if kw and len(kw) > 3 and kw != theme:
                    topics.append(kw)
    except Exception:
        pass

    # 7. 네이버 연관검색어
    try:
        rel_url = f"https://search.naver.com/search.naver?query={quote(theme)}"
        resp = requests.get(rel_url, headers=headers, timeout=10)
        rel_pat = re.compile(r'class="[^"]*related_keyword[^"]*"[^>]*>.*?<a[^>]*>(.*?)</a>', re.DOTALL)
        rel_kws = [clean_tag.sub('', k).strip() for k in rel_pat.findall(resp.text)]
        if not rel_kws:
            # 대체 패턴
            rel_pat2 = re.compile(r'class="[^"]*keyword[^"]*"[^>]*>(.*?)</(?:a|span|div)>', re.DOTALL)
            rel_kws = [clean_tag.sub('', k).strip() for k in rel_pat2.findall(resp.text)]
        topics.extend([k for k in rel_kws if k and len(k) > 2][:8])
    except Exception:
        pass

    # 8. Reddit (해외 커뮤니티 인기 글)
    try:
        reddit_url = f"https://www.reddit.com/search.json?q={quote(theme)}&sort=hot&limit=10"
        resp = requests.get(reddit_url, headers={**headers, "User-Agent": "NaverBot/1.0"}, timeout=10)
        reddit_data = resp.json()
        reddit_posts = reddit_data.get("data", {}).get("children", [])
        for post in reddit_posts:
            title = post.get("data", {}).get("title", "").strip()
            if title and len(title) > 5:
                topics.append(f"{theme} — {title[:60]}")
    except Exception:
        pass

    # 9. Google 영문 검색 (해외 자료 기반 글감)
    try:
        g_url = f"https://www.google.com/search?q={quote(theme)}&hl=en&num=8"
        resp = requests.get(g_url, headers={**headers, "Accept-Language": "en-US,en;q=0.9"}, timeout=10)
        g_title_pat = re.compile(r'<h3[^>]*>(.*?)</h3>', re.DOTALL)
        g_titles = [clean_tag.sub('', t).strip() for t in g_title_pat.findall(resp.text)]
        for t in g_titles[:8]:
            if t and len(t) > 5:
                topics.append(f"{theme} — {t[:60]}")
    except Exception:
        pass

    # 10. YouTube 인기 영상 제목 (트렌드 반영)
    try:
        yt_url = f"https://www.youtube.com/results?search_query={quote(theme)}&sp=CAI%253D"
        resp = requests.get(yt_url, headers=headers, timeout=10)
        yt_pat = re.compile(r'"title":\{"runs":\[\{"text":"(.*?)"\}', re.DOTALL)
        yt_titles = yt_pat.findall(resp.text)[:8]
        for t in yt_titles:
            if t and len(t) > 5 and t != theme:
                topics.append(t)
    except Exception:
        pass

    # 11. SEO 롱테일 변형 (상위노출 가능한 구체적 키워드)
    variations = [
        f"{theme} 초보자 가이드",
        f"{theme} 하는 법 총정리",
        f"{theme} 비교 분석",
        f"{theme} 추천 베스트",
        f"{theme} 후기 솔직 리뷰",
        f"{theme} 장단점 비교",
        f"{theme} 최신 트렌드",
        f"{theme} 실전 꿀팁",
        f"{theme} 주의사항 꼭 알아야 할 것",
        f"{theme} 가격 비용 정리",
        f"{theme} vs 대안 비교",
        f"{theme} 자주 묻는 질문",
    ]
    random.shuffle(variations)
    topics.extend(variations[:5])

    # 중복 제거 + 셔플
    seen = set()
    unique = []
    for t in topics:
        t = t.strip()
        if t and len(t) > 5 and t not in seen:
            seen.add(t)
            unique.append(t)
    random.shuffle(unique)

    if not unique:
        return [f"{theme} 최신 트렌드", f"{theme} 초보자 가이드", f"{theme} 실전 팁"][:count]

    return unique[:count * 3]


def _build_seo_prompt(theme: str, keyword: str) -> str:
    """네이버 상위노출(C-Rank/D.I.A) 최적화 프롬프트 생성. 1800자 이내."""
    return (
        f"'{theme}' 최신 트렌드 반영. 독자적 관점 포함.\n"
        f"제목: '{keyword}' 자연 포함, 30~40자 기준. 과장/물음표/느낌표 금지. 시의성이 필요하면 현재 연월만 반영.\n"
        "본문 1800~2300자 기준. 키워드는 전체 5회 이내로 자연 분산. 경험/확인/비교 표현을 구체적으로 포함.\n"
        "검증되지 않은 통계/비율/기관명/인용문은 절대 만들지 말 것. 출처 없는 수치는 목록 개수나 일반 예시에만 사용.\n\n"
        "[AEO 질문-답변 규칙]\n"
        "- 도입부 직후 Q/A 3개를 반드시 작성. 'FAQ', '자주 묻는 질문' 라벨 금지.\n"
        "- Q1 정의형, Q2 방법형, Q3 가격·비교·이유형.\n"
        "- 답변은 60~120자, 첫 문장은 결론, 둘째 문장은 근거/기준.\n\n"
        "[핵심 정보 박스]\n"
        "- AEO 질문 다음에 [TABLE] 마커를 한 줄에 단독으로 넣고, 바로 아래 줄부터 '항목: 값' 형식으로 5~7개 항목을 한 줄씩 작성.\n"
        "- 여행/방문은 위치·가격·추천대상, 제품은 가격·스펙·장단점, 경제/사회는 대상·핵심수치·주의점을 우선.\n\n"
        "[글 구조 필수 규칙]\n"
        "1. 도입부: 독자 공감을 끌어내는 경험담이나 질문으로 시작 (2~3문장)\n"
        "2. [QUOTE]: 글의 핵심 메시지를 한 문장으로 강렬하게. 15~30자 이내.\n"
        "3. 본문: [SUBTITLE] → 설명 텍스트 (4~6문장) → [image:] 패턴을 5~7섹션으로 구성\n"
        "4. 솔직 평가: 반드시 '장점: (3가지 쉼표 구분)' '단점: (2가지 쉼표 구분)' 형식. 경제/사회는 '긍정:' / '우려:' 가능.\n"
        "5. 결론: 반드시 '추천 대상: (구체적 대상)' '비추천 대상: (구체적 대상)' 형식으로 작성\n\n"
        "[인용구 규칙 — 매우 중요]\n"
        "- [QUOTE]는 짧고 임팩트 있는 한 문장만! (예: '변화는 준비된 자에게 기회다')\n"
        "- 절대 2문장 이상 넣지 말 것. 본문 전체를 인용구에 넣지 말 것.\n"
        "- 글 전체에서 [QUOTE] 2~3개만. 도입부 뒤 1개, 중간 1개, 마무리 전 1개.\n\n"
        "[강조 표현 규칙]\n"
        "- 핵심 키워드나 숫자, 중요 문구는 **볼드**로 감싸세요.\n"
        "- 예: '저는 **10년간** 이 분야에서 **3가지 핵심 원칙**을 발견했어요.'\n"
        "- 한 문단에 1~2개. 짧은 구(2~6단어)에만 적용.\n\n"
        "[태그 규칙]\n"
        f"- 태그 10개. '{keyword}'+롱테일 변형+연관 키워드.\n"
        "- 일반어(정보/글/블로그/추천/공유) 금지. 실제 검색어 사용.\n\n"
        "[이미지 규칙]\n"
        "- [image:구체적 영어 키워드]. 추상어(success/future) 금지.\n"
        "- 좋은 예: [image:business team celebrating in office]\n"
        "- 각 마커마다 서로 다른 검색어. 기본 4~8장 균등 배치.\n"
    )


def _build_source_guard_prompt(topic: str) -> str:
    """뉴스/타인 글 제목을 글감으로 쓸 때 사실 왜곡과 무단 복제를 줄이는 안전 규칙."""
    source_hint = ""
    m = re.search(r"\s[-–—]\s*([A-Za-z0-9_.-]+\.[A-Za-z]{2,})\s*$", topic or "")
    if m:
        source_hint = f"\n- 글감 끝의 '{m.group(1)}'는 출처 표시이므로 제목/본문 문장에 그대로 넣지 말 것."

    return (
        "[글감 사용 안전 규칙]\n"
        "- 글감이 뉴스/다른 사람 글 제목이면 원문을 복사하거나 기사 요약문처럼 쓰지 말고, 주제에 대한 독자적 해설 글로 작성.\n"
        "- 원문 본문을 확인하지 못한 상태에서 '실제로', '조사 결과', '80% 이상', '업계에 따르면' 같은 확정 표현 금지.\n"
        "- 제목에서 확인되는 사실만 배경으로 쓰고, 나머지는 일반적인 체크포인트/주의사항/해결법으로 풀어쓸 것.\n"
        "- 출처 URL이나 원문 링크를 모르면 본문에 가짜 출처를 만들지 말 것.\n"
        "- 선정적 제목을 그대로 재사용하지 말고 과장 표현을 완화할 것."
        f"{source_hint}\n"
    )


def _build_visual_blog_prompt() -> str:
    """녹화본 스타일: 짧은 문단, 이미지, 본문 강조, 실제 인용구가 살아나는 글감."""
    return (
        "[글감 스타일 최우선 규칙]\n"
        "- 제목 아래에는 이미지부터 넣지 말고, 먼저 독자에게 말을 거는 짧은 도입 문단 3~4개를 작성.\n"
        "- 도입 이후 첫 이미지를 넣고, 이후에는 '이미지 → 짧은 설명 3~4문단 → 인용구' 리듬을 반복.\n"
        "- 문단은 1~2문장으로 짧게 끊고, 한 문단이 90자를 넘지 않게 작성.\n"
        "- 설명은 어렵게 분석하지 말고, 영상처럼 독자에게 차분히 안내하는 말투로 작성.\n"
        "- 핵심 단어, 숫자, 결론 문구는 **굵게 강조**. 한 문단에 1개 정도만 사용.\n"
        "- [QUOTE]는 반드시 3~5개 사용. 한 줄에 하나만 쓰고, 18~35자 내외의 짧은 핵심 문장으로 작성.\n"
        "- [QUOTE] 줄 앞뒤에는 다른 문장을 붙이지 말 것. 그래야 네이버 인용구/포인트 박스로 변환됩니다.\n"
        "- [SUBTITLE]은 5~7개를 기준으로 짧고 명확하게 작성.\n"
        "- 이미지 4~8장, 본문 중간중간 균등 배치. 이미지는 각 섹션의 내용과 직접 관련 있어야 함.\n"
        "- 절대 [underline], [font-size], [color], [[bold]], [[font-size:fs19]], HTML 태그, CSS, 마크다운 제목 기호(#)를 출력하지 말 것.\n"
        "- 사용할 수 있는 마커는 [SUBTITLE], [QUOTE], [image:english keyword], **강조**만 허용.\n"
    )


def _normalize_blog_blocks(blocks: list[dict]) -> list[dict]:
    """서버가 따옴표/마커를 일반 텍스트로 반환해도 실제 블록으로 보정한다."""
    normalized: list[dict] = []

    def clean_style_markers(text: str) -> str:
        text = str(text or "")
        text = re.sub(r"\[\[(?:/|bold|underline|italic|strike|font-size:[^\]]+|font:[^\]]+|color:[^\]]+|bg:[^\]]+|background:[^\]]+|highlight:[^\]]+)\]\]", "", text, flags=re.I)
        text = re.sub(r"\[(?:/|underline|font-size|color|bg|background|highlight)(?::[^\]]*)?\]", "", text, flags=re.I)
        return text

    def flush_text(lines: list[str]) -> None:
        text = clean_style_markers("\n".join(lines)).strip()
        if text:
            normalized.append({"type": "text", "content": text})
        lines.clear()

    quote_re = re.compile(r"^\s*(?:\[QUOTE\]\s*[:：-]?\s*)?(.+?)\s*$", re.I)
    subtitle_re = re.compile(r"^\s*\[SUBTITLE\]\s*[:：-]?\s*(.+?)\s*$", re.I)

    for block in blocks or []:
        if block.get("type") != "text":
            if "content" in block:
                block = dict(block)
                block["content"] = clean_style_markers(block.get("content", "")).strip()
            normalized.append(block)
            continue

        buffer: list[str] = []
        for raw_line in str(block.get("content", "")).splitlines():
            line = clean_style_markers(raw_line).strip()
            if not line:
                flush_text(buffer)
                continue

            sub = subtitle_re.match(line)
            if sub:
                flush_text(buffer)
                normalized.append({"type": "subtitle", "content": sub.group(1).strip()})
                continue

            is_quote_marker = line.upper().startswith("[QUOTE]")
            text = quote_re.match(line).group(1).strip() if quote_re.match(line) else line
            text = text.strip("\"'“”‘’")
            is_standalone_quote = (
                (line.startswith(("\"", "“", "'")) and line.endswith(("\"", "”", "'")))
                or (line.startswith("&quot;") and line.endswith("&quot;"))
            )
            if (is_quote_marker or is_standalone_quote) and 8 <= len(text) <= 90:
                flush_text(buffer)
                normalized.append({"type": "quote", "content": text.replace("&quot;", "").strip()})
                continue

            buffer.append(line)

        flush_text(buffer)

    return normalized


def _insert_drive_images(blocks: list[dict], images: list, max_images: int = 6) -> list[dict]:
    if not images:
        return blocks or []
    result: list[dict] = []
    image_idx = 0
    text_seen = 0
    max_images = max(1, max_images)

    source_blocks = [b for b in (blocks or []) if b.get("type") != "image"]

    for block in source_blocks:
        result.append(block)
        if block.get("type") not in ("text", "subtitle", "quote"):
            continue
        text_seen += 1
        if image_idx >= len(images) or image_idx >= max_images:
            continue
        if text_seen == 1 or text_seen % 3 == 0:
            img = images[image_idx]
            result.append({
                "type": "image",
                "url": img.image_url,
                "alt": img.name,
                "source": "google_drive",
            })
            image_idx += 1

    if result and image_idx < len(images) and image_idx < max_images:
        img = images[image_idx]
        result.append({
            "type": "image",
            "url": img.image_url,
            "alt": img.name,
            "source": "google_drive",
        })

    return result


def _is_generation_server_error(error: str) -> bool:
    error = str(error or "")
    return "글 생성 실패" in error or "AI 서버" in error or "응답 지연" in error or "서버 응답 502" in error


def _compact_generation_prompt(prompt: str) -> str:
    prompt = str(prompt or "")
    keep = []
    for part in prompt.split("\n"):
        if "참고 글 ---" in part:
            break
        keep.append(part)
    compact = "\n".join(keep).strip()
    return (compact or prompt)[:3500]


def _split_setting_list(value: str) -> list[str]:
    return [x.strip() for x in re.split(r"[,\n\r]+", str(value or "")) if x.strip()]


def _drive_history_keys(cfg: dict) -> tuple[set[str], set[str], list[str]]:
    ids: set[str] = set()
    names: set[str] = set()
    published_texts: list[str] = []
    for item in cfg.get("publish_history", []) or []:
        if not isinstance(item, dict) or item.get("error"):
            continue
        folder_id = str(item.get("drive_folder_id") or "").strip()
        folder_name = str(item.get("drive_folder_name") or "").strip()
        if folder_id:
            ids.add(folder_id)
        if folder_name:
            names.add(_normalize_drive_topic(folder_name))
        published_text = _normalize_drive_topic(" ".join([
            str(item.get("title") or ""),
            str(item.get("topic") or ""),
        ]))
        if published_text:
            published_texts.append(published_text)
    return ids, names, published_texts


def _normalize_drive_topic(value: str) -> str:
    value = re.sub(r"\s+", " ", str(value or "")).strip().lower()
    return re.sub(r"[^0-9a-z가-힣 ]+", "", value)


def _filter_unpublished_drive_items(items: list, cfg: dict) -> list:
    used_ids, used_names, published_texts = _drive_history_keys(cfg)
    filtered = []
    for item in items:
        folder_id = str(getattr(item, "folder_id", "") or getattr(item, "id", "") or "").strip()
        folder_name = str(getattr(item, "folder_name", "") or getattr(item, "name", "") or "").strip()
        folder_key = _normalize_drive_topic(folder_name)
        if folder_id and folder_id in used_ids:
            continue
        if folder_key and folder_key in used_names:
            continue
        if len(folder_key) >= 4 and any(folder_key in text for text in published_texts):
            continue
        filtered.append(item)
    return filtered


def run_autopilot() -> dict:
    """자동 운영 모드: 테마 기반 뉴스 분석 → 다중 글 발행"""
    import time
    import random

    cfg = load_config()
    ap = cfg.get("autopilot", {})
    if not ap.get("active"):
        return {"status": "error", "message": "자동 운영이 비활성화 상태"}

    theme = ap.get("theme", "")
    posts_per_day = ap.get("posts_per_day", 3)
    duration_days = ap.get("duration_days", 0)
    started_at = ap.get("started_at", "")

    if not theme:
        return {"status": "error", "message": "테마 미설정"}

    # 기간 체크
    if duration_days > 0 and started_at:
        from datetime import datetime, timedelta
        try:
            start = datetime.fromisoformat(started_at.replace("Z", "+00:00"))
            if datetime.now(start.tzinfo) > start + timedelta(days=duration_days):
                # 기간 만료 → 자동 중지
                cfg["autopilot"]["active"] = False
                save_config_to_file(cfg)
                return {"status": "ok", "message": "자동 운영 기간 만료 — 자동 중지됨", "posts": []}
        except Exception:
            pass

    email = cfg.get("makeit_email", "")
    access_token = cfg.get("makeit_access_token", "")
    naver_id = cfg.get("naver_id", "")
    write = cfg.get("write", {})
    is_cafe = cfg.get("_cafe_mode", False)

    total_steps = 5  # 계정확인, 네이버비번, 참고글분석, 트렌드분석, 글발행
    # 1. 메이킷 계정 확인 (token → refresh → email/pw)
    emit({"status": "progress", "step": "account", "message": f"[1/{total_steps}] 메이킷 계정 확인 중..."})
    acc = None
    if access_token:
        acc = verify_account(access_token=access_token)
    if acc and not acc.valid:
        refresh_token = cfg.get("makeit_refresh_token", "")
        if refresh_token:
            try:
                import requests
                resp = requests.post(
                    "https://snsmakeit.com/api/naverbot?action=token-refresh",
                    json={"refresh_token": refresh_token}, timeout=15
                )
                data = resp.json() if resp.content else {}
                if data.get("ok") and data.get("access_token"):
                    access_token = data["access_token"]
                    cfg["makeit_access_token"] = access_token
                    if data.get("refresh_token"):
                        cfg["makeit_refresh_token"] = data["refresh_token"]
                    save_config_to_file(cfg)
                    acc = verify_account(access_token=access_token)
            except Exception:
                pass
    if not acc or not acc.valid:
        makeit_pw = load_password(MAKEIT_KEYRING, email)
        if email and makeit_pw:
            acc = verify_account(email=email, password=makeit_pw)
    if not acc or not acc.valid:
        return {"status": "error", "step": "account", "message": acc.error if acc else "로그인 필요"}

    rules = _exe_plan_rules(acc)
    if rules["max_posts"] > 0 and posts_per_day > rules["max_posts"]:
        return {
            "status": "error",
            "step": "account",
            "message": f"{rules['label']} 플랜은 1회 최대 {rules['max_posts']}개까지 발행할 수 있습니다.",
        }
    if ap.get("schedule_mode") == "daily" and not rules["can_schedule"]:
        return {
            "status": "error",
            "step": "account",
            "message": "매일 자동 예약 발행은 Pro 이상에서 사용할 수 있습니다.",
        }
    max_duration_days = int(rules.get("max_duration_days", 0) or 0)
    if ap.get("schedule_mode") == "daily" and max_duration_days > 0:
        if duration_days <= 0 or duration_days > max_duration_days:
            duration_days = max_duration_days
            cfg.setdefault("autopilot", {})["duration_days"] = duration_days
            save_config_to_file(cfg)
        if started_at:
            from datetime import datetime, timedelta
            try:
                start = datetime.fromisoformat(started_at.replace("Z", "+00:00"))
                if datetime.now(start.tzinfo) > start + timedelta(days=duration_days):
                    cfg["autopilot"]["active"] = False
                    save_config_to_file(cfg)
                    return {
                        "status": "ok",
                        "message": f"{rules['label']} 자동 운영 가능 기간({duration_days}일)이 만료되어 자동 중지됨",
                        "posts": [],
                    }
            except Exception:
                pass

    # 2. 네이버 비번 + 세션 체크
    emit({"status": "progress", "step": "account", "message": f"[2/{total_steps}] 네이버 계정 확인 중..."})
    if not naver_id:
        return {"status": "error", "message": "네이버 ID 미설정"}
    naver_pw = load_password(NAVER_KEYRING, naver_id)
    if not naver_pw:
        return {"status": "error", "message": "네이버 비밀번호 미저장"}

    # 세션 사전 체크 (쿠키 만료 확인)
    try:
        from naver_blog import check_naver_session
        session = check_naver_session(naver_id)
        if not session["valid"]:
            emit({"status": "progress", "step": "account", "message": f"네이버 세션: {session['message']}"})
            return {"status": "error", "message": session["message"]}
        emit({"status": "progress", "step": "account", "message": "네이버 세션 유효 확인"})
    except Exception:
        pass  # 체크 실패해도 발행 시도는 진행

    # 3. 뉴스/트렌드에서 글감 추출
    # 참고 글 URL 기능은 UI에서 제거되어 실행 중에는 항상 사용하지 않음.
    ref_url = ""
    ref_style = ""
    ref_format = {}

    drive_items = []
    drive_images = []
    drive_folder_url = ap.get("drive_folder_url", "")
    if drive_folder_url:
        drive_api_key = ap.get("drive_api_key", "") or cfg.get("google_drive_api_key", "")
        drive_limit = max(posts_per_day, 10)
        emit({"status": "progress", "step": "analyze", "message": f"[4/{total_steps}] 구글 드라이브 폴더 자료를 불러오는 중..."})
        try:
            drive_items = load_drive_items(
                drive_folder_url,
                drive_api_key,
                recursive=bool(ap.get("drive_recursive", False)),
                limit=drive_limit,
            )
            drive_images = load_drive_images(
                drive_folder_url,
                drive_api_key,
                recursive=bool(ap.get("drive_recursive", False)),
                limit=int(ap.get("drive_image_limit", 12) or 12),
            )
            original_drive_count = len(drive_items)
            drive_items = _filter_unpublished_drive_items(drive_items, cfg)
            if original_drive_count and not drive_items:
                return {
                    "status": "ok",
                    "message": "구글 드라이브의 모든 글감 폴더가 이미 발행되어 건너뜀",
                    "posts": [],
                }
            emit({
                "status": "progress",
                "step": "analyze",
                "message": f"구글 드라이브 자료 {len(drive_items)}개, 이미지 {len(drive_images)}개 불러오기 완료",
            })
        except Exception as e:
            return {"status": "error", "step": "analyze", "message": f"구글 드라이브 자료 불러오기 실패: {e}"}

    # 다중 테마/카테고리 지원: 쉼표 또는 줄바꿈으로 구분된 값을 순환
    themes = _split_setting_list(theme)
    if not themes:
        themes = [theme]
    categories = _split_setting_list(ap.get("category", "") or write.get("category", ""))
    category_count = int(ap.get("category_count", 0) or 0)
    if category_count > 0:
        categories = categories[:category_count]
    if not categories:
        categories = [""]
    topic_contexts = [(th, cat) for th in themes for cat in categories] or [(themes[0], "")]

    first_theme = topic_contexts[0][0]
    emit({"status": "progress", "step": "analyze", "message": f"[4/{total_steps}] '{first_theme}' 관련 최신 뉴스/트렌드 분석 중... (약 15초 소요)"})
    # 각 테마별로 글감 수집 (메뉴명은 글감 검색에 사용하지 않음 — 발행 위치 전용)
    raw_topics_by_context = {}
    for th, cat in topic_contexts:
        if (th, cat) not in raw_topics_by_context:
            raw_topics_by_context[(th, cat)] = fetch_news_topics(th, max(posts_per_day // len(topic_contexts) + 1, 3))
    raw_topics = []
    for th, cat in topic_contexts:
        raw_topics.extend([(t, th, cat) for t in raw_topics_by_context[(th, cat)]])

    # 4. 다중 발행
    results = []
    run_count = min(posts_per_day, len(drive_items)) if drive_items else posts_per_day
    if drive_items and run_count < posts_per_day:
        emit({
            "status": "progress",
            "step": "analyze",
            "message": f"미발행 드라이브 폴더가 {run_count}개라 이번 실행은 {run_count}개만 발행합니다.",
        })
    makeit_pw = load_password(MAKEIT_KEYRING, email)
    consecutive_failures = 0
    MAX_CONSECUTIVE_FAILURES = 5  # 연속 실패 시 중단

    for i in range(run_count):
        # 연속 실패 체크 → 브라우저/서버 문제로 판단, 중단
        if consecutive_failures >= MAX_CONSECUTIVE_FAILURES:
            emit({"status": "progress", "step": "error", "message": f"연속 {MAX_CONSECUTIVE_FAILURES}회 실패 — 자동 중단. 브라우저/서버 상태를 확인하세요."})
            break

        # 매 글 생성 전 토큰 재갱신 (만료 방지)
        if i > 0:
            refresh_token = cfg.get("makeit_refresh_token", "")
            if refresh_token:
                try:
                    import requests as _req
                    resp = _req.post(
                        "https://snsmakeit.com/api/naverbot?action=token-refresh",
                        json={"refresh_token": refresh_token}, timeout=15
                    )
                    data = resp.json() if resp.content else {}
                    if data.get("ok") and data.get("access_token"):
                        access_token = data["access_token"]
                        cfg["makeit_access_token"] = access_token
                        if data.get("refresh_token"):
                            cfg["makeit_refresh_token"] = data["refresh_token"]
                        save_config_to_file(cfg)
                except Exception:
                    pass

        # 현재 테마/카테고리 (순환)
        current_theme, current_category = topic_contexts[i % len(topic_contexts)]

        # 글감 부족 시 자동 보충 (키워드만으로 검색, 메뉴명 미포함)
        if len(raw_topics) < 3:
            emit({"status": "progress", "step": "analyze", "message": f"글감 보충 중... ({i+1}/{posts_per_day})"})
            extra_topics = fetch_news_topics(current_theme, run_count - i)
            used = {r.get("topic", "") for r in results}
            extra_topics = [t for t in extra_topics if t not in used]
            raw_topics.extend([(t, current_theme, current_category) for t in extra_topics])

        # 글감 선택 (현재 테마/카테고리 우선, 없으면 아무거나)
        topic = None
        topic_theme = current_theme
        topic_category = current_category
        for idx, (t, th, cat) in enumerate(raw_topics):
            if th == current_theme and cat == current_category:
                topic, topic_theme, topic_category = raw_topics.pop(idx)
                break
        if topic is None and raw_topics:
            topic, topic_theme, topic_category = raw_topics.pop(random.randint(0, min(len(raw_topics) - 1, 2)))
        if topic is None:
            topic = f"{current_theme} 관련 정보"

        # 글감을 키워드와 결합 (메뉴명은 포함하지 않음 — 발행 위치 전용)
        keyword_base = f"{topic_theme} — {topic}" if topic_theme and topic_theme not in topic else topic
        keyword = keyword_base
        drive_item = drive_items[i % len(drive_items)] if drive_items else None
        if drive_item:
            drive_topic = drive_item.folder_name or drive_item.name
            keyword = f"{topic_theme} — {drive_topic}" if topic_theme not in drive_topic else drive_topic

        emit({"status": "progress", "step": "generate", "message": f"[5/{total_steps}] 글 생성 중 ({i+1}/{run_count}번째): {keyword[:50]}... (약 30~60초 소요)"})

        # 커스텀 프롬프트 + SEO 프롬프트 → user_prompt로 전달 (8000자 제한)
        # fields.extra는 2000자 제한이므로 SEO 프롬프트는 user_prompt에 포함
        custom_prompt = ap.get("custom_prompt", "")
        seo_prompt = _build_seo_prompt(current_theme, keyword)
        visual_prompt = "" if drive_images else _build_visual_blog_prompt()
        source_guard_prompt = _build_source_guard_prompt(topic)
        base_extra = custom_prompt if custom_prompt else ""
        # 메뉴명은 발행 위치 지정에만 사용, 글 내용 생성에 영향 없음
        # 콘텐츠 분야(브리프 카테고리)에 따른 우선 정보 힌트
        brief_cat = ap.get("briefCategory", write.get("briefCategory", ""))
        if brief_cat:
            _brief_hints = {
                "여행": "위치, 방문 시기, 교통, 비용, 추천 대상, 비추천 대상을 우선 반영.",
                "쇼핑": "제품명, 가격, 구매처, 사용 기간, 비교 대상, 장단점을 우선 반영.",
                "경제": "제도·상품·이슈, 적용 대상, 한도, 금리·수익률, 신청 기한, 주의점. 출처 없는 수치 금지.",
                "사회": "발생 시점, 관련 주체, 핵심 쟁점, 공식 발표와 일반 해석 구분.",
                "IT": "핵심 수치, 적용 조건, 비교 대상, 주의사항, 확인된 정보와 일반 설명 구분.",
                "건강": "핵심 수치, 적용 조건, 대상·자격, 주의사항. 출처 없는 수치 금지.",
            }
            hint = _brief_hints.get(brief_cat, "")
            if hint:
                base_extra += f"\n[콘텐츠 분야: {brief_cat}] {hint}\n"

        drive_prompt = build_drive_prompt(drive_item) if drive_item else ""
        if drive_images:
            drive_prompt = (
                f"{drive_prompt}\n\n" if drive_prompt else ""
            ) + (
                "[이미지 사용 지시]\n"
                "- 무료 이미지, 외부 스톡 이미지, GIF 이미지를 새로 추가하지 말 것.\n"
                "- 본문 이미지는 구글 드라이브 폴더에서 제공된 사진만 사용됩니다.\n"
                "- [image:] 마커를 만들지 말고 텍스트/소제목/인용구 중심으로 작성하세요."
            )
        # 참고 글 스타일은 user_prompt로 강하게 전달
        ref_prompt = ""
        if ref_style:
            fmt_desc = ""
            if ref_format.get("font_sizes"):
                fmt_desc += f"\n- 글씨 크기: 본문 {ref_format['font_sizes'][0]}pt"
            if ref_format.get("text_colors"):
                fmt_desc += f"\n- 강조 색상: {', '.join(ref_format['text_colors'])}"
            if ref_format.get("bold_colors"):
                fmt_desc += f"\n- 볼드 강조 색상: {', '.join(ref_format['bold_colors'])}"
            if ref_format.get("image_pattern"):
                fmt_desc += f"\n- 사진 배치: {ref_format['image_pattern']}"
            imgs_per = ref_format.get("images_per_section", 1)
            if imgs_per > 1:
                fmt_desc += f"\n- 섹션당 이미지: {imgs_per}장 (연속 배치)"

            comp_pattern = ref_format.get("components", [])
            pattern_desc = ""
            if comp_pattern:
                simplified = []
                for c in comp_pattern[:20]:
                    if c == "quotation":
                        simplified.append("[QUOTE]")
                    elif c == "image":
                        simplified.append("[image:]")
                    elif c == "text":
                        simplified.append("본문")
                    elif c == "sectionTitle":
                        simplified.append("[SUBTITLE]")
                if simplified:
                    pattern_desc = f"\n\n[참고 글의 구성 패턴 — 이 순서를 반드시 따르세요]\n{' → '.join(simplified)}\n이 패턴을 반복하세요."

            subtitle_rule = ""
            if ref_format.get("quote_as_subtitle"):
                subtitle_rule = "\n- [SUBTITLE] 대신 [QUOTE]를 소제목으로 사용할 것 (참고 글이 인용구를 소제목처럼 사용합니다)"
            if ref_format.get("subtitle_numbered"):
                subtitle_rule += f"\n- 소제목에 번호 붙이기: {ref_format.get('subtitle_pattern', '01, 02...')} 형태로"

            img_rule = ""
            if imgs_per >= 2:
                img_rule = f"\n- [image:] 마커를 연속 {imgs_per}장씩 배치 (참고 글처럼). 1장씩 흩뿌리지 말 것."

            ref_prompt = (
                "[최우선 지시 — 참고 글의 방식만 반영해 새 글 작성]\n"
                "아래 참고 글을 원문 복사하지 말고, 새 주제에 맞는 완전히 새로운 문장으로 작성하세요.\n"
                "반영할 것은 구성 방식과 리듬입니다:\n"
                "- 도입부 시작 방식, 단락 길이, 줄바꿈 간격을 유사하게 유지\n"
                "- 인용구가 쓰인 위치와 개수를 참고해 새 인용구를 직접 생성\n"
                "- 참고 글 인용구 문장을 그대로 재사용 금지\n"
                "- 소제목/본문/이미지/인용구의 배치 순서를 최대한 유지\n"
                "- 말투와 분위기는 비슷하게 하되 표현은 새로 작성\n"
                f"{subtitle_rule}"
                f"{img_rule}"
                f"{fmt_desc}"
                f"{pattern_desc}\n\n"
                f"--- 참고 글 ---\n{ref_style[:1500]}\n---"
            )
        # 매번 다른 방향으로 작성하도록 랜덤 지시 추가
        angles = [
            "초보자도 쉽게 이해할 수 있게 설명.",
            "전문가 관점에서 심층 분석.",
            "실전 경험담 위주로 생동감 있게.",
            "비교 분석 형태로 장단점 명확히.",
            "Q&A 형태로 독자 궁금증 해소.",
            "트렌드 변화를 시간 순서대로.",
            "흔히 하는 실수와 해결법 중심으로.",
            "숫자와 데이터를 활용한 객관적 분석.",
            "최근 사례와 뉴스를 인용하며 작성.",
            "독자에게 질문을 던지며 대화체로.",
            "체크리스트 형태로 실용적으로 정리.",
            "개인적 경험과 감정을 녹여서 에세이풍으로.",
            "프로/아마추어 비교를 통해 인사이트 전달.",
            "단계별 가이드(Step-by-Step)로 따라하기 쉽게.",
            "흔한 오해와 진실을 밝히는 팩트체크 형태로.",
            "미래 전망과 예측을 포함한 분석.",
            "실패 사례에서 배우는 교훈 중심으로.",
            "비용 대비 효과를 분석하는 리뷰 형태로.",
            "업계 관계자 인터뷰 형식으로 생생하게.",
            "before/after를 비교하며 변화를 강조.",
        ]
        # 이미 사용한 angle 제외하여 다양성 보장
        used_angles = [r.get("_angle", "") for r in results if r.get("_angle")]
        available_angles = [a for a in angles if a not in used_angles] or angles
        chosen_angle = random.choice(available_angles)
        base_extra += f" {chosen_angle}"

        fields = {
            "keyword": keyword,
            "target": write.get("target", ""),
            "extra": base_extra,
        }
        # AEO 위치 + 장단점 토글
        aeo_position = ap.get("aeoPosition", write.get("aeoPosition", "top"))
        include_pros_cons = ap.get("includeProsCons", write.get("includeProsCons", True))
        generation_prompt = "\n".join(filter(None, [source_guard_prompt, visual_prompt, seo_prompt, drive_prompt, ref_prompt]))

        post = fetch_post(
            access_token=access_token,
            email=email,
            password=makeit_pw or "",
            subtype=ap.get("subtype") or write.get("subtype", "info"),
            tone=ap.get("tone") or write.get("tone", "friendly"),
            speech=ap.get("speech") or write.get("speech", "polite_yo"),
            word_count=ap.get("wordCount") or write.get("wordCount", "medium"),
            fields=fields,
            user_prompt=generation_prompt,
            use_gif=(False if drive_images else ap.get("use_gif", True)),
            aeo_position=aeo_position,
            include_pros_cons=include_pros_cons,
        )
        if post.error:
            emit({"status": "progress", "step": "generate", "message": f"생성 실패 ({i+1}/{posts_per_day}): {post.error}"})
            # 1회 재시도
            time.sleep(5)
            post = fetch_post(
                access_token=access_token, email=email, password=makeit_pw or "",
                subtype=ap.get("subtype") or write.get("subtype", "info"),
                tone=ap.get("tone") or write.get("tone", "friendly"),
                speech=ap.get("speech") or write.get("speech", "polite_yo"),
                word_count=ap.get("wordCount") or write.get("wordCount", "medium"),
                fields=fields,
                user_prompt=generation_prompt,
                use_gif=(False if drive_images else ap.get("use_gif", True)),
                aeo_position=aeo_position,
                include_pros_cons=include_pros_cons,
            )
            if post.error:
                emit({"status": "progress", "step": "generate", "message": f"재시도 실패 ({i+1}/{posts_per_day}): {post.error}"})
                if _is_generation_server_error(post.error):
                    emit({"status": "progress", "step": "generate", "message": f"간소화 프롬프트로 마지막 재시도 중 ({i+1}/{posts_per_day})..."})
                    time.sleep(12)
                    post = fetch_post(
                        access_token=access_token, email=email, password=makeit_pw or "",
                        subtype=ap.get("subtype") or write.get("subtype", "info"),
                        tone=ap.get("tone") or write.get("tone", "friendly"),
                        speech=ap.get("speech") or write.get("speech", "polite_yo"),
                        word_count="short",
                        fields=fields,
                        user_prompt=_compact_generation_prompt(generation_prompt),
                        use_gif=False,
                        aeo_position=aeo_position,
                        include_pros_cons=include_pros_cons,
                    )
                if post.error:
                    results.append({"topic": keyword, "category": topic_category, "error": post.error})
                    consecutive_failures += 1
                    continue

        post.blocks = _normalize_blog_blocks(post.blocks)
        if drive_images:
            if drive_item and getattr(drive_item, "folder_id", ""):
                post_images = [img for img in drive_images if getattr(img, "folder_id", "") == drive_item.folder_id]
            else:
                post_images = []
            post_images = post_images or drive_images[i::run_count] or drive_images
            post.blocks = _insert_drive_images(
                post.blocks,
                post_images,
                max_images=int(ap.get("drive_images_per_post", 4) or 4),
            )

        emit({"status": "progress", "step": "publish", "message": f"[5/{total_steps}] 블로그 발행 중 ({i+1}/{run_count}번째): \"{post.title[:40]}\" (약 30~90초 소요)"})

        # 밑줄 설정
        use_underline = ap.get("use_underline", write.get("use_underline", False))

        # 사용자 설정 강조 색상 적용
        accent_color = ap.get("accent_color", "")
        pub_ref_format = ref_format if ref_url else None
        if accent_color and not ref_url:
            pub_ref_format = {"text_colors": [accent_color], "bold_colors": [accent_color]}
        elif accent_color and pub_ref_format:
            pub_ref_format = dict(pub_ref_format)
            if not pub_ref_format.get("text_colors"):
                pub_ref_format["text_colors"] = [accent_color]
            if not pub_ref_format.get("bold_colors"):
                pub_ref_format["bold_colors"] = [accent_color]

        color_mode = ap.get("color_mode", "text")
        result = publish_to_naver_blog(
            user_id=naver_id,
            naver_id=naver_id,
            naver_pw=naver_pw,
            title=post.title,
            blocks=post.blocks,
            tags=post.tags,
            template_name=ap.get("template", "") or write.get("naver_template", ""),
            font_size=write.get("font_size", "15"),
            quote_style=ap.get("quote_style") or write.get("quote_style", "postit"),
            use_sticker=ap.get("use_sticker", write.get("use_sticker", "off")),
            category=topic_category or ap.get("category", "") or write.get("category", ""),
            headless=not cfg.get("show_browser", False),
            ref_format=pub_ref_format,
            keyword=keyword,
            bg_color=accent_color,
            color_mode=color_mode,
            use_underline=use_underline,
        )

        if result["success"]:
            results.append({
                "topic": keyword,
                "category": topic_category,
                "title": post.title,
                "url": result["post_url"],
                "_angle": chosen_angle,
                "drive_folder_id": getattr(drive_item, "folder_id", "") if drive_item else "",
                "drive_folder_name": getattr(drive_item, "folder_name", "") if drive_item else "",
            })
            emit({"status": "progress", "step": "publish", "message": f"발행 성공 ({i+1}/{run_count}): \"{post.title}\" → {result['post_url']}"})
            consecutive_failures = 0  # 성공 시 리셋
        else:
            results.append({
                "topic": keyword,
                "category": topic_category,
                "error": result["error"],
                "_angle": chosen_angle,
                "drive_folder_id": getattr(drive_item, "folder_id", "") if drive_item else "",
                "drive_folder_name": getattr(drive_item, "folder_name", "") if drive_item else "",
            })
            emit({"status": "progress", "step": "publish", "message": f"발행 실패 ({i+1}/{run_count}): {result['error']}"})
            consecutive_failures += 1

        # 다음 글 발행 전 대기 (사용자 설정 간격)
        if i < run_count - 1:
            interval = ap.get("interval", "random")
            if interval == "random":
                wait = random.randint(60, 300)
            elif interval == "random-wide":
                wait = random.randint(300, 7200)
            elif interval.startswith("spread-"):
                # 시간 분산: 하루를 N등분하여 분산 대기
                spread_n = int(interval.split("-")[1])  # spread-3 → 3, spread-2 → 2
                # 남은 글 수에 따라 다음 시간대까지 대기
                slots = [9, 13, 19] if spread_n == 3 else [10, 15]
                now_hour = time.localtime().tm_hour
                remaining = run_count - i - 1
                # 다음 시간 슬롯 찾기
                next_slot = None
                for s in slots:
                    if s > now_hour:
                        next_slot = s
                        break
                if next_slot:
                    import datetime
                    now_dt = datetime.datetime.now()
                    target_dt = now_dt.replace(hour=next_slot, minute=random.randint(0, 30), second=0)
                    wait = max(60, int((target_dt - now_dt).total_seconds()))
                    h, m = wait // 3600, (wait % 3600) // 60
                    emit({"status": "progress", "step": "wait", "message": f"시간 분산: 다음 발행 {next_slot}시경 (약 {h}시간 {m}분 후) ({i+1}/{run_count} 완료)"})
                else:
                    wait = random.randint(300, 1800)  # 슬롯 없으면 5~30분
                    emit({"status": "progress", "step": "wait", "message": f"다음 글 발행까지 {wait // 60}분 대기 중... ({i+1}/{run_count} 완료)"})
                time.sleep(wait)
                continue
            else:
                base = int(interval) * 60
                wait = base + random.randint(-30, 30)  # ±30초 랜덤
                wait = max(60, wait)
            emit({"status": "progress", "step": "wait", "message": f"다음 글 발행까지 {wait // 60}분 {wait % 60}초 대기 중... ({i+1}/{run_count} 완료)"})
            time.sleep(wait)

    # ── 실패한 글 자동 재시도 (1회) ──
    failed = [r for r in results if r.get("error") and not r.get("_retried")]
    if failed:
        emit({"status": "progress", "step": "retry", "message": f"실패한 {len(failed)}개 글 재시도 중..."})
        for fi, fail_item in enumerate(failed):
            if False:  # 재시도 중단 플래그 (향후 구현)
                break
            retry_keyword = fail_item.get("topic", "")
            retry_category = fail_item.get("category", "")
            if not retry_keyword:
                continue
            emit({"status": "progress", "step": "retry", "message": f"재시도 ({fi+1}/{len(failed)}): {retry_keyword}"})
            time.sleep(random.randint(30, 90))

            try:
                retry_post = fetch_post(
                    access_token=access_token, email=email, password=makeit_pw or "",
                    subtype=ap.get("subtype") or write.get("subtype", "info"),
                    tone=ap.get("tone") or write.get("tone", "friendly"),
                    speech=ap.get("speech") or write.get("speech", "polite_yo"),
                    word_count="short",  # 재시도는 짧게
                    fields={"keyword": retry_keyword, "target": write.get("target", ""), "extra": ""},
                    user_prompt="",
                    use_gif=False,
                    aeo_position=aeo_position,
                    include_pros_cons=include_pros_cons,
                )
                if retry_post.error:
                    continue
                retry_post.blocks = _normalize_blog_blocks(retry_post.blocks)
                retry_result = publish_to_naver_blog(
                    user_id=naver_id, naver_id=naver_id, naver_pw=naver_pw,
                    title=retry_post.title, blocks=retry_post.blocks, tags=retry_post.tags,
                    category=retry_category or categories[0] or write.get("category", ""),
                    headless=not cfg.get("show_browser", False),
                    keyword=retry_keyword,
                    bg_color=accent_color, color_mode=color_mode,
                    use_underline=use_underline,
                )
                if retry_result["success"]:
                    # 실패 결과를 성공으로 교체
                    idx = results.index(fail_item)
                    results[idx] = {
                        "topic": retry_keyword,
                        "category": retry_category,
                        "title": retry_post.title,
                        "url": retry_result["post_url"],
                        "_retried": True,
                        "drive_folder_id": fail_item.get("drive_folder_id", ""),
                        "drive_folder_name": fail_item.get("drive_folder_name", ""),
                    }
                    emit({"status": "progress", "step": "retry", "message": f"재시도 성공: \"{retry_post.title}\""})
            except Exception as e:
                emit({"status": "progress", "step": "retry", "message": f"재시도 실패: {e}"})

    success_count = sum(1 for r in results if "url" in r)
    fail_count = sum(1 for r in results if r.get("error"))
    msg = f"자동 운영 완료: {success_count}/{run_count}개 발행 성공"
    if fail_count > 0:
        msg += f" ({fail_count}개 실패)"
    return {
        "status": "ok",
        "message": msg,
        "theme": theme,
        "posts": results,
    }


def save_config_to_file(cfg: dict):
    """config.json 직접 저장"""
    path = get_config_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(cfg, f, ensure_ascii=False, indent=2)


def run_once() -> dict:
    cfg = load_config()

    email = cfg.get("makeit_email", "")
    access_token = cfg.get("makeit_access_token", "")
    naver_id = cfg.get("naver_id", "")
    write = cfg.get("write", {})
    is_cafe = cfg.get("_cafe_mode", False)

    # 1. 메이킷 계정 + 구독 확인 (token → refresh → email/pw 순서)
    emit({"status": "progress", "step": "account", "message": "메이킷 계정 확인 중..."})
    acc = None
    if access_token:
        acc = verify_account(access_token=access_token)

    # 토큰 실패 시 refresh_token으로 갱신 시도
    if acc and not acc.valid:
        refresh_token = cfg.get("makeit_refresh_token", "")
        if refresh_token:
            emit({"status": "progress", "step": "account", "message": "토큰 갱신 중..."})
            try:
                import requests
                resp = requests.post(
                    "https://snsmakeit.com/api/naverbot?action=token-refresh",
                    json={"refresh_token": refresh_token}, timeout=15
                )
                data = resp.json() if resp.content else {}
                if data.get("ok") and data.get("access_token"):
                    access_token = data["access_token"]
                    # config에 새 토큰 저장
                    cfg["makeit_access_token"] = access_token
                    if data.get("refresh_token"):
                        cfg["makeit_refresh_token"] = data["refresh_token"]
                    save_config_to_file(cfg)
                    acc = verify_account(access_token=access_token)
            except Exception:
                pass

    # refresh도 실패 시 email/pw 폴백
    if not acc or not acc.valid:
        makeit_pw = load_password(MAKEIT_KEYRING, email)
        if email and makeit_pw:
            acc = verify_account(email=email, password=makeit_pw)
        elif not acc:
            return {"status": "error", "step": "account", "message": "메이킷 계정 로그인 필요"}

    if not acc.valid:
        return {"status": "error", "step": "account", "message": acc.error}

    rules = _exe_plan_rules(acc)
    if is_cafe and not rules["can_cafe"]:
        return {
            "status": "error",
            "step": "account",
            "message": "카페 발행은 Pro 이상에서 사용할 수 있습니다.",
        }

    # 3. 네이버 비번 로드
    if not naver_id:
        return {"status": "error", "step": "naver", "message": "네이버 ID 미설정"}
    naver_pw = load_password(NAVER_KEYRING, naver_id)
    if not naver_pw:
        return {"status": "error", "step": "naver", "message": "네이버 비밀번호 미저장"}

    # 세션 사전 체크
    try:
        from naver_blog import check_naver_session
        session = check_naver_session(naver_id)
        if not session["valid"]:
            return {"status": "error", "step": "naver", "message": session["message"]}
    except Exception:
        pass

    # 4. 키워드
    keyword = write.get("keyword", "").strip()
    if not keyword:
        return {"status": "error", "step": "config", "message": "키워드/주제 미입력"}

    # 5. 서버에서 글 생성
    emit({"status": "progress", "step": "generate", "message": f"글 생성 중 (주제: {keyword})..."})
    fields = {
        "keyword": keyword,
        "target": write.get("target", ""),
        "extra": write.get("extra", ""),
        "location": write.get("location", ""),
        "visitDate": write.get("visitDate", ""),
        "rating": write.get("rating", ""),
        "duration": write.get("duration", ""),
        "budget": write.get("budget", ""),
        "productName": write.get("productName", ""),
        "price": write.get("price", ""),
        "pros": write.get("pros", ""),
        "cons": write.get("cons", ""),
        "mainPoint": write.get("mainPoint", ""),
    }

    # 카페 모드면 글 스타일 다르게
    cafe = cfg.get("cafe", {})
    cafe_extra = ""
    cafe_word_count = write.get("wordCount", "medium")
    if is_cafe:
        cafe_extra = (
            "네이버 카페 게시글 형식으로 작성. "
            "블로그와 달리 짧고 핵심 위주로 작성 (1000~1500자). "
            "소제목 없이 자연스러운 대화체로, 카페 회원들끼리 정보 공유하는 톤. "
            "[image: english keyword] 마커를 본문에 정확히 2개만 삽입 (첫 문단 뒤 1개, 글 중간 1개). 3개 이상 넣지 말 것. "
            "마무리에 '댓글로 의견 남겨주세요' 같은 참여 유도 포함. "
        )
        cafe_word_count = "short"

    user_extra = write.get("extra", "")
    # SEO 프롬프트는 user_prompt로 전달 (extra는 2000자 제한)
    seo_prompt_once = "" if is_cafe else _build_seo_prompt(keyword, keyword)
    visual_prompt_once = "" if is_cafe else _build_visual_blog_prompt()
    if cafe_extra:
        fields["extra"] = cafe_extra + (fields.get("extra", "") or "")
    user_extra = ""

    # 참고 글 URL 기능은 UI에서 제거되어 실행 중에는 항상 사용하지 않음.
    ref_url = ""
    ref_style = ""
    ref_fmt = None
    ref_prompt = ""
    if ref_url and not is_cafe:
        emit({"status": "progress", "step": "analyze", "message": "참고 글 스타일 분석 중..."})
        try:
            ref_style = fetch_reference_style(ref_url)
            ref_fmt = analyze_reference_format(ref_url)
        except Exception:
            pass

        if ref_style and ref_fmt:
            fmt_desc = ""
            if ref_fmt.get("font_sizes"):
                fmt_desc += f"\n- 글씨 크기: 본문 {ref_fmt['font_sizes'][0]}pt"
            if ref_fmt.get("text_colors"):
                fmt_desc += f"\n- 강조 색상: {', '.join(ref_fmt['text_colors'])}"
            if ref_fmt.get("bold_colors"):
                fmt_desc += f"\n- 볼드 강조 색상: {', '.join(ref_fmt['bold_colors'])}"
            if ref_fmt.get("image_pattern"):
                fmt_desc += f"\n- 사진 배치: {ref_fmt['image_pattern']}"
            imgs_per = ref_fmt.get("images_per_section", 1)
            if imgs_per > 1:
                fmt_desc += f"\n- 섹션당 이미지: {imgs_per}장 (연속 배치)"
            comp_pattern = ref_fmt.get("components", [])
            pattern_desc = ""
            if comp_pattern:
                simplified = []
                for c in comp_pattern[:20]:
                    if c == "quotation":
                        simplified.append("[QUOTE]")
                    elif c == "image":
                        simplified.append("[image:]")
                    elif c == "text":
                        simplified.append("본문")
                    elif c == "sectionTitle":
                        simplified.append("[SUBTITLE]")
                if simplified:
                    pattern_desc = f"\n\n[참고 글의 구성 패턴 — 이 순서를 반드시 따르세요]\n{' → '.join(simplified)}\n이 패턴을 반복하세요."

            # 소제목/인용구 사용 패턴
            subtitle_rule = ""
            if ref_fmt.get("quote_as_subtitle"):
                subtitle_rule = "\n- [SUBTITLE] 대신 [QUOTE]를 소제목으로 사용할 것 (참고 글이 인용구를 소제목처럼 사용합니다)"
            if ref_fmt.get("subtitle_numbered"):
                subtitle_rule += f"\n- 소제목에 번호 붙이기: {ref_fmt.get('subtitle_pattern', '01, 02...')} 형태로"

            # 이미지 연속 배치 규칙
            img_rule = ""
            if imgs_per >= 2:
                img_rule = f"\n- [image:] 마커를 연속 {imgs_per}장씩 배치 (참고 글처럼). 1장씩 흩뿌리지 말 것."

            ref_prompt = (
                "[최우선 지시 — 참고 글의 방식만 반영해 새 글 작성]\n"
                "아래 참고 글을 원문 복사하지 말고, 새 주제에 맞는 완전히 새로운 문장으로 작성하세요.\n"
                "반영할 것은 구성 방식과 리듬입니다:\n"
                "- 도입부 시작 방식, 단락 길이, 줄바꿈 간격을 유사하게 유지\n"
                "- 인용구가 쓰인 위치와 개수를 참고해 새 인용구를 직접 생성\n"
                "- 참고 글 인용구 문장을 그대로 재사용 금지\n"
                "- 소제목/본문/이미지/인용구의 배치 순서를 최대한 유지\n"
                "- 말투와 분위기는 비슷하게 하되 표현은 새로 작성\n"
                f"{subtitle_rule}"
                f"{img_rule}"
                f"{fmt_desc}"
                f"{pattern_desc}\n\n"
                f"--- 참고 글 ---\n{ref_style[:1500]}\n---"
            )
            emit({"status": "progress", "step": "analyze", "message": f"참고 글 분석 완료 (인용구: {ref_fmt.get('quote_style', '')}, 색상: {ref_fmt.get('text_colors', [])})"})

    source_guard_prompt_once = "" if is_cafe else _build_source_guard_prompt(keyword)
    # AEO 위치 + 장단점 토글 (빠른 시작 모드)
    quick_aeo_position = write.get("aeoPosition", "top")
    quick_include_pros_cons = write.get("includeProsCons", True)
    final_prompt = "\n".join(filter(None, [source_guard_prompt_once, visual_prompt_once, seo_prompt_once, ref_prompt, user_extra]))

    post = fetch_post(
        access_token=access_token,
        email=email,
        password=load_password(MAKEIT_KEYRING, email) or "",
        subtype=write.get("subtype", "info"),
        tone=write.get("tone", "friendly"),
        speech=write.get("speech", "polite_yo"),
        word_count=cafe_word_count if is_cafe else write.get("wordCount", "medium"),
        fields=fields,
        user_prompt=final_prompt,
        use_gif=cfg.get("use_gif", False),
        aeo_position=quick_aeo_position,
        include_pros_cons=quick_include_pros_cons,
    )
    if post.error:
        if _is_generation_server_error(post.error):
            emit({"status": "progress", "step": "generate", "message": "서버 응답 지연 — 간소화 프롬프트로 재시도 중..."})
            import time
            time.sleep(12)
            post = fetch_post(
                access_token=access_token,
                email=email,
                password=load_password(MAKEIT_KEYRING, email) or "",
                subtype=write.get("subtype", "info"),
                tone=write.get("tone", "friendly"),
                speech=write.get("speech", "polite_yo"),
                word_count="short",
                fields=fields,
                user_prompt=_compact_generation_prompt(final_prompt),
                use_gif=False,
                aeo_position=quick_aeo_position,
                include_pros_cons=quick_include_pros_cons,
            )
        if post.error:
            return {"status": "error", "step": "generate", "message": post.error}
    post.blocks = _normalize_blog_blocks(post.blocks)

    # 선택된 제목이 있으면 AI 제목 대신 사용
    selected_title = cfg.get("_selected_title", "") or cfg.get("custom_title", "")
    if selected_title:
        post.title = selected_title

    # 6. 발행 (블로그 or 카페)
    if is_cafe and cafe.get("cafe_number"):
        emit({"status": "progress", "step": "publish", "message": f"카페 발행 중 ({len(post.blocks)} blocks)..."})
        result = publish_to_cafe(
            user_id=naver_id,
            naver_id=naver_id,
            naver_pw=naver_pw,
            cafe_id=cafe.get("cafe_id", ""),
            cafe_number=cafe["cafe_number"],
            menu_id=cafe.get("menu_id", ""),
            board_name=cafe.get("board_name", ""),
            title=post.title,
            blocks=post.blocks,
            headless=not cfg.get("show_browser", True),
        )
    else:
        emit({"status": "progress", "step": "publish", "message": f"블로그 발행 중 ({len(post.blocks)} blocks)..."})
        # ref_fmt는 위에서 이미 분석됨
        result = publish_to_naver_blog(
            user_id=naver_id,
            naver_id=naver_id,
            naver_pw=naver_pw,
            title=post.title,
            blocks=post.blocks,
            tags=post.tags,
            template_name=write.get("naver_template", ""),
            font_size=write.get("font_size", "15"),
            quote_style=ref_fmt.get("quote_style", "postit") if ref_fmt else write.get("quote_style", "postit"),
            use_sticker=write.get("use_sticker", "off"),
            category=write.get("category", ""),
            headless=not cfg.get("show_browser", True),
            ref_url=ref_url,
            ref_format=ref_fmt,
            keyword=keyword,
            bg_color=write.get("accent_color", "") or write.get("bg_color", ""),
            color_mode=write.get("color_mode", cfg.get("color_mode", "text")),
            use_underline=write.get("use_underline", False),
        )

    # _cafe_mode 플래그 정리
    if is_cafe:
        cfg["_cafe_mode"] = False
        save_config_to_file(cfg)

    if not result["success"]:
        return {"status": "error", "step": "publish", "message": result["error"]}

    return {
        "status": "ok",
        "topic": keyword,
        "title": post.title,
        "post_url": result["post_url"],
        "quota": post.quota,
        "images_inserted": sum(1 for b in post.blocks if b.get("type") == "image"),
    }


def main() -> int:
    if len(sys.argv) < 2:
        emit({"status": "error", "message": "command required"})
        return 1

    cmd = sys.argv[1]

    if cmd == "verify":
        cfg = load_config()
        email = cfg.get("makeit_email", "")
        token = cfg.get("makeit_access_token", "")
        if token:
            acc = verify_account(access_token=token)
        else:
            pw = load_password(MAKEIT_KEYRING, email)
            acc = verify_account(email=email, password=pw or "")
        emit({
            "status": "ok" if acc.valid else "error",
            "plan": acc.plan,
            "expires_at": acc.expires_at,
            "nick": acc.nick,
            "email": acc.email or email,
            "role": acc.role,
            "trial": acc.trial,
            "trial_used": acc.trial_used,
            "trial_limit": acc.trial_limit,
            "error": acc.error,
        })
        return 0 if acc.valid else 1

    if cmd == "run-once":
        # autopilot 모드가 활성화되어 있으면 자동 운영으로 전환
        cfg = load_config()
        if cfg.get("autopilot", {}).get("active"):
            emit(run_autopilot())
        else:
            emit(run_once())
        return 0

    if cmd == "autopilot":
        emit(run_autopilot())
        return 0

    if cmd == "analyze":
        keyword = sys.argv[2] if len(sys.argv) > 2 else ""
        if not keyword:
            emit({"status": "error", "message": "키워드 필요"})
            return 1
        result = analyze_keyword(keyword)
        emit(result)
        return 0

    if cmd == "analyze-ref":
        url = sys.argv[2] if len(sys.argv) > 2 else ""
        if not url:
            emit({"status": "error", "message": "URL 필요"})
            return 1
        emit({"status": "progress", "message": "참고 글 브라우저로 열고 분석 중..."})
        try:
            from playwright.sync_api import sync_playwright
            from naver_blog import launch_browser, get_profile_dir
            import time

            profile = get_profile_dir("_ref_analyze")
            with sync_playwright() as p:
                ctx = launch_browser(p, profile, headless=False)
                page = ctx.pages[0] if ctx.pages else ctx.new_page()
                page.goto(url, wait_until="domcontentloaded")
                page.wait_for_timeout(3000)

                emit({"status": "progress", "message": "페이지 로딩 완료, 천천히 스크롤하며 구성 분석 중..."})

                # 사람처럼 천천히 스크롤하며 모든 요소 로딩 (lazy-load 이미지/컴포넌트 대응)
                page.evaluate("() => window.scrollTo(0, 0)")
                page.wait_for_timeout(1500)
                total_height = page.evaluate("() => document.body.scrollHeight")
                scroll_step = 300  # 작은 단위로 스크롤
                current = 0
                max_scroll_iterations = 200  # 최대 200회 (약 2분) 안전 상한
                scroll_count = 0
                while current < total_height and scroll_count < max_scroll_iterations:
                    current += scroll_step
                    scroll_count += 1
                    page.evaluate(f"() => window.scrollBy(0, {scroll_step})")
                    page.wait_for_timeout(600)  # 0.6초씩 대기 (lazy-load 충분히 대기)
                    # 스크롤 중 높이 변경 감지 (동적 로딩)
                    new_height = page.evaluate("() => document.body.scrollHeight")
                    if new_height > total_height:
                        total_height = new_height
                # 맨 위로 다시 돌아가서 전체 분석
                page.evaluate("() => window.scrollTo(0, 0)")
                page.wait_for_timeout(1000)

                emit({"status": "progress", "message": "스타일 분석 중..."})

                # 블로그 본문이 iframe 안에 있을 수 있음 — 모든 frame에서 탐색
                analyze_target = page
                for frame in page.frames:
                    try:
                        has_content = frame.evaluate("() => document.querySelectorAll('.se-text-paragraph, .se-component').length")
                        if has_content > 0:
                            analyze_target = frame
                            emit({"status": "progress", "message": f"본문 프레임 발견 ({has_content}개 요소)"})
                            break
                    except Exception:
                        continue

                # 상세 분석
                analysis = analyze_target.evaluate("""() => {
                    const result = {
                        fontFamily: '', fontSize: '', lineHeight: '', color: '',
                        quoteCount: 0, quoteStyle: '', imageCount: 0,
                        paragraphCount: 0, avgParagraphLength: 0,
                        subtitleStyle: '', components: [], textSample: '',
                        textColors: [], bgColors: [], fontSizes: [],
                        quoteText: '', alignment: '',
                    };
                    const paragraphs = document.querySelectorAll('.se-text-paragraph, .post_ct p');
                    if (paragraphs.length > 0) {
                        const style = getComputedStyle(paragraphs[0]);
                        result.fontFamily = style.fontFamily.split(',')[0].trim().replace(/['"]/g, '');
                        result.fontSize = style.fontSize;
                        result.lineHeight = style.lineHeight;
                        result.color = style.color;
                        result.paragraphCount = paragraphs.length;
                        let totalLen = 0;
                        let sample = [];
                        paragraphs.forEach((p, i) => {
                            const t = (p.textContent || '').trim();
                            totalLen += t.length;
                            if (i < 3 && t.length > 10) sample.push(t.slice(0, 100));
                        });
                        result.avgParagraphLength = Math.round(totalLen / paragraphs.length);
                        result.textSample = sample.join(' / ');
                    }
                    // 인용구 상세 분석 — 모든 인용구의 스타일을 개별 수집
                    const quoteEls = document.querySelectorAll('[class*="se-quotation"], [class*="quotation_"], .se-component.se-quotation, blockquote');
                    const quoteStyleMap = {};
                    const quoteDetails = [];
                    quoteEls.forEach(el => {
                        const cls = (el.className || '') + ' ' + (el.closest('[class*="quotation_"]')?.className || '');
                        const matches = cls.match(/quotation_(\\w+)/g) || [];
                        matches.forEach(m => {
                            const style = m.replace('quotation_', '');
                            if (style && style !== 'container') {
                                quoteStyleMap[style] = (quoteStyleMap[style] || 0) + 1;
                                const text = (el.textContent || '').trim().slice(0, 80);
                                if (text && !quoteDetails.some(d => d.text === text)) {
                                    quoteDetails.push({ style, text });
                                }
                            }
                        });
                    });
                    // se-section 레벨에서도 검색 (더 정확)
                    document.querySelectorAll('[class*="se-section-quotation"]').forEach(el => {
                        const cls = el.className || '';
                        const m = cls.match(/se-l-quotation_(\\w+)/);
                        if (m && m[1]) {
                            quoteStyleMap[m[1]] = (quoteStyleMap[m[1]] || 0) + 1;
                            const text = (el.textContent || '').trim().slice(0, 80);
                            if (text && !quoteDetails.some(d => d.text === text)) {
                                quoteDetails.push({ style: m[1], text });
                            }
                        }
                    });
                    // se-component 레벨에서도 검색
                    document.querySelectorAll('.se-component.se-quotation').forEach(el => {
                        const cls = el.className || '';
                        const m = cls.match(/se-l-quotation_(\\w+)/);
                        if (m && m[1]) {
                            quoteStyleMap[m[1]] = (quoteStyleMap[m[1]] || 0) + 1;
                        }
                    });
                    const sortedStyles = Object.entries(quoteStyleMap).sort((a,b) => b[1]-a[1]);
                    result.quoteCount = Object.values(quoteStyleMap).reduce((a,b) => a+b, 0) || quoteEls.length;
                    if (sortedStyles.length > 0) {
                        result.quoteStyle = sortedStyles[0][0];
                        result.quoteStyleAll = sortedStyles.map(([s, c]) => s + '(' + c + '개)').join(', ');
                    }
                    result.quoteDetails = quoteDetails.slice(0, 5);
                    result.imageCount = document.querySelectorAll('.se-image, .se-component.se-image, img[src*="postfiles"]').length;
                    const bolds = document.querySelectorAll('.se-text-paragraph b, .se-text-paragraph strong');
                    if (bolds.length > 0) {
                        const style = getComputedStyle(bolds[0]);
                        result.subtitleStyle = 'bold ' + style.fontSize;
                    }
                    // 컴포넌트 순서
                    document.querySelectorAll('.se-component').forEach(el => {
                        const cls = el.className || '';
                        if (cls.includes('se-image')) result.components.push('image');
                        else if (cls.includes('se-quotation')) result.components.push('quotation');
                        else if (cls.includes('se-text')) result.components.push('text');
                        else if (cls.includes('se-oglink')) result.components.push('oglink');
                    });
                    result.components = result.components.slice(0, 15);

                    // 색상 분석 — 모든 텍스트 span의 색상 수집
                    const colorMap = {};
                    const bgMap = {};
                    const sizeMap = {};
                    document.querySelectorAll('.se-text-paragraph span, .se-text-paragraph b').forEach(el => {
                        const s = getComputedStyle(el);
                        const c = s.color;
                        const bg = s.backgroundColor;
                        const fs = s.fontSize;
                        if (c && c !== 'rgb(0, 0, 0)') colorMap[c] = (colorMap[c] || 0) + 1;
                        if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') bgMap[bg] = (bgMap[bg] || 0) + 1;
                        if (fs) sizeMap[fs] = (sizeMap[fs] || 0) + 1;
                    });
                    result.textColors = Object.entries(colorMap).sort((a,b) => b[1]-a[1]).slice(0,5).map(e => e[0]);
                    result.bgColors = Object.entries(bgMap).sort((a,b) => b[1]-a[1]).slice(0,3).map(e => e[0]);
                    result.fontSizes = Object.entries(sizeMap).sort((a,b) => b[1]-a[1]).slice(0,5).map(e => e[0] + '(' + e[1] + '회)');

                    // 인용구 텍스트 샘플 (첫 번째 + 전체 상세)
                    const firstQuote = document.querySelector('.se-quotation .se-text-paragraph, [class*="se-section-quotation"] .se-text-paragraph');
                    if (firstQuote) result.quoteText = (firstQuote.textContent || '').trim().slice(0, 100);
                    if (quoteDetails.length > 0 && !result.quoteText) {
                        result.quoteText = quoteDetails[0].text;
                    }

                    // 정렬
                    const aligns = {};
                    document.querySelectorAll('.se-text-paragraph').forEach(el => {
                        const cls = el.className || '';
                        const m = cls.match(/align-(\\w+)/);
                        if (m && m[1]) aligns[m[1]] = (aligns[m[1]] || 0) + 1;
                    });
                    const topAlign = Object.entries(aligns).sort((a,b) => b[1]-a[1]);
                    result.alignment = topAlign.length ? topAlign[0][0] : 'left';

                    return result;
                }""")

                # 스크린샷 저장
                from pathlib import Path
                debug_dir = Path(__file__).parent / "debug"
                debug_dir.mkdir(exist_ok=True)
                page.screenshot(path=str(debug_dir / "ref_analyzed.png"), full_page=True)

                ctx.close()

            emit({
                "status": "ok",
                "message": "분석 완료",
                "analysis": analysis,
            })
        except Exception as e:
            emit({"status": "error", "message": f"분석 실패: {e}"})
        return 0

    emit({"status": "error", "message": f"unknown command: {cmd}"})
    return 1


if __name__ == "__main__":
    sys.exit(main())
