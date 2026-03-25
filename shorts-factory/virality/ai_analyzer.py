"""AI-powered video analysis and concept generation using OpenRouter."""
import os
import json
import httpx

# OpenRouter API (카드뉴스 앱과 동일한 키 사용)
OR_KEY = os.getenv("OPENROUTER_API_KEY", "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")
OR_URL = "https://openrouter.ai/api/v1/chat/completions"
OR_MODEL = "anthropic/claude-sonnet-4-5"


def _call_ai(system: str, user: str, max_tokens: int = 4096) -> str:
    """OpenRouter API 호출."""
    resp = httpx.post(
        OR_URL,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {OR_KEY}",
            "HTTP-Referer": "https://snsmakeit.com",
            "X-Title": "Virality System",
        },
        json={
            "model": OR_MODEL,
            "max_tokens": max_tokens,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
        },
        timeout=120,
    )
    if resp.status_code != 200:
        raise RuntimeError(f"AI API error {resp.status_code}: {resp.text}")
    data = resp.json()
    return data["choices"][0]["message"]["content"].strip()


ANALYSIS_SYSTEM = """당신은 인스타그램 릴스 & 피드 바이럴 전문가입니다.
경쟁사의 인기 영상을 분석하여 성공 요인을 추출하는 것이 임무입니다.

분석 시 반드시 아래 구조를 따르세요:

## HOOK (훅 분석)
- 첫 1~3초의 시각적/언어적 훅
- 어떤 감정을 건드리는지 (호기심, 공포, 탐욕, 공감 등)
- 왜 스크롤을 멈추게 하는지

## RETENTION (유지 메커니즘)
- 시청자를 끝까지 붙잡는 전략
- 정보 공개 타이밍, 서스펜스 구조
- 시각적 변화, 페이스 전환

## SCRIPT (스크립트 구조)
- 대본의 전체 흐름 (도입→전개→결말)
- 핵심 메시지와 전달 방식
- CTA (Call to Action) 분석

## INSIGHT (핵심 인사이트)
- 이 영상이 바이럴된 핵심 이유 1~3가지
- 재현 가능한 패턴
- 주의할 점

반드시 한국어로 응답하세요."""


def analyze_video(caption: str, views: int, likes: int, comments: int,
                  creator_username: str, custom_instructions: str = "") -> dict:
    """영상의 캡션과 메타데이터를 분석."""
    engagement_rate = (likes / views * 100) if views > 0 else 0

    user_msg = f"""다음 인스타그램 릴스를 분석해주세요:

**크리에이터:** @{creator_username}
**조회수:** {views:,}
**좋아요:** {likes:,}
**댓글:** {comments:,}
**참여율:** {engagement_rate:.2f}%

**캡션:**
{caption}

{f'**추가 분석 지침:**' + chr(10) + custom_instructions if custom_instructions else ''}

위 정보를 바탕으로 이 영상의 바이럴 성공 요인을 HOOK, RETENTION, SCRIPT, INSIGHT 구조로 상세히 분석해주세요."""

    full_text = _call_ai(ANALYSIS_SYSTEM, user_msg)

    # 섹션별 파싱
    sections = {"hook": "", "retention": "", "script": "", "insight": ""}
    current = None
    lines = full_text.split("\n")
    for line in lines:
        lower = line.lower().strip()
        if "hook" in lower and line.strip().startswith("#"):
            current = "hook"
            continue
        elif "retention" in lower and line.strip().startswith("#"):
            current = "retention"
            continue
        elif "script" in lower and line.strip().startswith("#"):
            current = "script"
            continue
        elif "insight" in lower and line.strip().startswith("#"):
            current = "insight"
            continue
        if current:
            sections[current] += line + "\n"

    return {
        "hook_analysis": sections["hook"].strip(),
        "retention_analysis": sections["retention"].strip(),
        "script_analysis": sections["script"].strip(),
        "full_analysis": full_text,
    }


CONCEPT_SYSTEM = """당신은 인스타그램 릴스 바이럴 콘텐츠 전략가입니다.
경쟁사의 인기 영상을 분석한 결과를 바탕으로, 클라이언트에게 맞춤화된 새로운 영상 콘셉트를 제안하는 것이 임무입니다.

각 콘셉트는 반드시 아래 형식의 JSON 배열로 응답하세요. 다른 텍스트 없이 JSON만:

[
  {
    "title": "영상 제목 (한 줄)",
    "description": "영상 전체 컨셉 설명 (2~3문장)",
    "hook": "HOOK 설명 - VISUAL(시각적 요소)과 SPOKEN(도입 대사) 포함",
    "why_it_works": "이 훅이 왜 효과적인지 설명",
    "script": "Scene 1 (0-3s): 훅 설명\\nScene 2 (3-10s): ...\\nScene 3 (10-20s): ...\\n... 전체 대본"
  }
]

3개의 콘셉트를 생성하세요. 반드시 한국어로 응답하세요."""


def generate_concepts(
    video_caption: str, analysis_text: str, views: int,
    creator_username: str, concept_instructions: str = ""
) -> list[dict]:
    """분석 결과를 바탕으로 맞춤 콘셉트 생성."""
    user_msg = f"""다음은 @{creator_username}의 인기 릴스 분석 결과입니다:

**조회수:** {views:,}
**원본 캡션:**
{video_caption[:500]}

**분석 결과:**
{analysis_text[:2000]}

{f'**콘셉트 생성 지침:**' + chr(10) + concept_instructions if concept_instructions else ''}

위 분석을 바탕으로, 비슷한 바이럴 패턴을 활용하되 새로운 관점의 릴스 콘셉트 3개를 만들어주세요.
각 콘셉트에는 완전한 촬영 대본을 포함해야 합니다."""

    text = _call_ai(CONCEPT_SYSTEM, user_msg)

    # JSON 파싱
    if text.startswith("```"):
        text = text.split("\n", 1)[1]
        text = text.rsplit("```", 1)[0]
    text = text.strip()

    try:
        concepts = json.loads(text)
    except json.JSONDecodeError:
        concepts = [{
            "title": "콘셉트 생성 결과",
            "description": text[:500],
            "hook": "",
            "script": text,
            "why_it_works": "",
        }]

    return concepts
