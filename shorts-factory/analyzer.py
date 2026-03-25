import os
import json
import httpx

OR_KEY = os.getenv("OPENROUTER_API_KEY", "")
OR_URL = "https://openrouter.ai/api/v1/chat/completions"
OR_MODEL = "anthropic/claude-sonnet-4-5"

SYSTEM_PROMPT = """너는 유튜브 숏폼/릴스/틱톡 전문 편집 전략가야.
자막을 분석해서 조회수가 터지는 숏폼 구간을 찾는 게 임무야.

## 반드시 지켜야 할 숏폼 공식

### 15초 쇼츠 (초고속 바이럴용)
- 0~2초: 강력한 훅 ("이거 모르면 손해", "99%가 모르는 방법")
- 2~10초: 핵심 내용 딱 1개만
- 10~15초: 반복 유도 (일부러 빠르게 → 다시 보게 만드는 구조)

### 30초 쇼츠 (저장+공유형)
- 0~3초: 훅
- 3~20초: 정보 2~3개 (리스트X, 자연스럽게)
- 20~27초: 결론/요약
- 27~30초: CTA (저장, 댓글)

### 60초 쇼츠 (팔로우 유도형)
- 0~3초: 강력한 훅
- 3~10초: 공감/문제 제기 ("안 되는 이유 대부분 이겁니다")
- 10~45초: 해결 방법 + 사례 + 스토리
- 45~55초: 핵심 정리
- 55~60초: 팔로우 CTA

## 핵심 원칙
1. 첫 3초가 80% 결정
2. 정보 과다 = 망함. 하나만 줘야 잘됨
3. 살짝 부족해야 "다시 보기" 유도
4. 자막이 콘텐츠의 50%
5. 끝나자마자 다시 보게 만드는 구조

## 잘 터지는 포맷
- "모르면 손해형" (정보+저장유도)
- "충격 사실형" (반박 구조)
- "비교형" (클릭 유도)"""


def analyze_subtitles(subtitle_text: str, durations: list[int] | None = None) -> list[dict]:
    """OpenRouter API로 자막을 분석하여 숏폼 추천 구간 반환"""
    if not durations:
        durations = [15, 30, 60]

    duration_str = ", ".join(f"{d}초" for d in durations)

    user_prompt = f"""{subtitle_text}

위 자막에서 숏폼으로 만들기 좋은 구간을 찾아줘.

요구사항:
- {duration_str} 버전 각각 최소 1개씩, 총 최대 5개
- 각 구간은 위 숏폼 공식(훅→전개→CTA)에 맞는 구간이어야 함
- 강력한 훅이 될 수 있는 문장이 시작점에 있어야 함
- 자기완결적 스토리 (해당 구간만으로 내용 완성)
- 감정적 임팩트 또는 실용적 팁 포함

구간 다양성 (매우 중요):
- 각 구간은 반드시 서로 다른 주제/장면/내용을 다뤄야 함
- 구간끼리 시간이 겹치면 안 됨 (overlap 금지)
- 영상 전체를 골고루 활용해야 함 (앞부분만 쏠리면 안 됨)
- 가장 논란이 될 만한 발언, 감정적 반응이 큰 순간, 놀라운 사실 공개 부분을 우선 선택
- "이걸 왜?" "진짜?" "대박" 같은 반응이 나올 클릭율 높은 구간 위주

구간 시작/끝 정확성 (매우 중요):
- start_seconds: 반드시 자막 타임스탬프의 시작점을 사용. 문장 중간에서 시작 금지
- end_seconds: 반드시 자막 타임스탬프의 끝점을 사용. 문장이 완전히 끝난 뒤로 설정
- 말이 중간에 끊기면 절대 안 됨

각 구간에 대해:
- hook_text: 첫 3초에 화면에 크게 띄울 훅 문장 (15자 이내, 임팩트 있게)
- structure_type: "15s_viral", "30s_save", "60s_follow" 중 하나
- seo_title: 검색 최적화 제목
- viral_factors: 이 구간이 왜 바이럴될 수 있는지 3가지 요인
- audience_hook: 어떤 시청자 심리를 자극하는지
- estimated_retention: 예상 시청 유지율 (%)

반드시 아래 JSON 형식으로만 응답해. 다른 텍스트 없이 JSON만:
[
  {{
    "rank": 1,
    "start_seconds": 0.0,
    "end_seconds": 55.0,
    "hook_text": "임팩트 있는 훅 문장",
    "reason": "이 구간을 선정한 이유 (상세하게)",
    "script_body": "구간의 핵심 내용 요약",
    "structure_type": "60s_follow",
    "viral_factors": ["강력한 호기심 유발", "감정적 반전", "실용적 정보"],
    "audience_hook": "시청자의 어떤 심리를 자극하는지",
    "estimated_retention": 85,
    "b_roll_cues": ["보조 영상 제안1"],
    "seo_title": "SEO 최적화된 숏폼 제목",
    "score": 95
  }}
]"""

    response = httpx.post(
        OR_URL,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {OR_KEY}",
            "HTTP-Referer": "https://snsmakeit.com",
            "X-Title": "SNS Makeit",
        },
        json={
            "model": OR_MODEL,
            "max_tokens": 4096,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
        },
        timeout=120,
    )

    if response.status_code != 200:
        raise RuntimeError(f"AI API 오류 {response.status_code}: {response.text}")

    data = response.json()
    text = data["choices"][0]["message"]["content"].strip()

    if text.startswith("```"):
        text = text.split("\n", 1)[1]
        text = text.rsplit("```", 1)[0]

    segments = json.loads(text)
    return sorted(segments, key=lambda x: x.get("score", 0), reverse=True)
