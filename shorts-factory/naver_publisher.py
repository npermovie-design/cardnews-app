"""네이버 블로그 자동 발행 모듈 (Playwright 기반)"""
import asyncio
import logging
import re
from playwright.async_api import async_playwright

logger = logging.getLogger("naver-publisher")


async def publish_to_naver_blog(
    naver_id: str,
    naver_pw: str,
    title: str,
    html_content: str,
    tags: list[str] = None,
    category: str = "",
) -> dict:
    """네이버 블로그에 글 발행. 성공 시 {'success': True, 'postUrl': ...} 반환."""

    browser = None
    try:
        pw = await async_playwright().start()
        browser = await pw.chromium.launch(headless=True, args=[
            "--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage",
            "--disable-blink-features=AutomationControlled",
        ])
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            viewport={"width": 1280, "height": 900},
            locale="ko-KR",
        )
        page = await context.new_page()

        # ── 1. 네이버 로그인 ──
        logger.info(f"[Naver] 로그인 시도: {naver_id}")
        await page.goto("https://nid.naver.com/nidlogin.login?mode=form&url=https://blog.naver.com")
        await page.wait_for_load_state("domcontentloaded")

        # ID/PW 입력 (clipboard 방식으로 봇 탐지 우회)
        await page.click("#id")
        await page.evaluate(f'document.querySelector("#id").value = "{naver_id}"')
        await page.click("#pw")
        await page.evaluate(f'document.querySelector("#pw").value = "{naver_pw}"')
        await page.click(".btn_login, #log\\.login")
        await page.wait_for_timeout(3000)

        # 로그인 확인
        if "nidlogin" in page.url or "captcha" in page.url.lower():
            return {"success": False, "error": "로그인 실패 — 캡차 또는 인증 필요. 네이버에서 직접 로그인 후 다시 시도해주세요."}

        logger.info("[Naver] 로그인 성공")

        # ── 2. 블로그 글쓰기 페이지 ──
        await page.goto("https://blog.naver.com/GoBlogWrite.naver")
        await page.wait_for_load_state("domcontentloaded")
        await page.wait_for_timeout(2000)

        # SmartEditor iframe 진입
        editor_frame = None
        for frame in page.frames:
            if "SmartEditor" in frame.url or "editor" in frame.url.lower():
                editor_frame = frame
                break

        if not editor_frame:
            # 새 에디터 (SmartEditor ONE) — iframe 없이 직접 편집
            editor_frame = page

        # ── 3. 제목 입력 ──
        try:
            title_sel = '.se-title-text, [placeholder*="제목"], .title__input'
            await editor_frame.wait_for_selector(title_sel, timeout=10000)
            await editor_frame.click(title_sel)
            await editor_frame.fill(title_sel, title)
        except:
            # 폴백: 직접 타이핑
            await editor_frame.keyboard.type(title, delay=30)

        logger.info(f"[Naver] 제목 입력 완료: {title[:30]}...")

        # ── 4. 본문 입력 ──
        try:
            body_sel = '.se-component-content .se-text-paragraph, .se-main-container .se-section-text, [contenteditable="true"]'
            await editor_frame.wait_for_selector(body_sel, timeout=10000)
            await editor_frame.click(body_sel)

            # HTML을 줄바꿈 기준으로 텍스트 입력
            plain_text = re.sub(r'<br\s*/?>', '\n', html_content)
            plain_text = re.sub(r'<[^>]+>', '', plain_text)
            plain_text = plain_text.strip()

            # 섹션별로 입력
            for line in plain_text.split('\n'):
                line = line.strip()
                if line:
                    await editor_frame.keyboard.type(line, delay=5)
                await editor_frame.keyboard.press("Enter")

        except Exception as e:
            logger.error(f"[Naver] 본문 입력 실패: {e}")
            return {"success": False, "error": f"본문 입력 실패: {str(e)[:100]}"}

        logger.info("[Naver] 본문 입력 완료")

        # ── 5. 태그 입력 ──
        if tags:
            try:
                tag_sel = '.tag__input, [placeholder*="태그"], input[class*="tag"]'
                tag_input = await editor_frame.wait_for_selector(tag_sel, timeout=5000)
                if tag_input:
                    for tag in tags[:10]:
                        await tag_input.fill(tag)
                        await editor_frame.keyboard.press("Enter")
                        await page.wait_for_timeout(300)
            except:
                logger.warning("[Naver] 태그 입력 스킵")

        # ── 6. 발행 ──
        try:
            publish_btn = '.publish_btn, button:has-text("발행"), [class*="publish"]'
            await editor_frame.click(publish_btn)
            await page.wait_for_timeout(2000)

            # 발행 확인 팝업
            confirm_btn = 'button:has-text("발행"), button:has-text("확인")'
            try:
                await page.click(confirm_btn, timeout=5000)
            except:
                pass

            await page.wait_for_timeout(3000)

            # 발행된 URL 가져오기
            post_url = page.url
            if "blog.naver.com" in post_url and "GoBlogWrite" not in post_url:
                logger.info(f"[Naver] 발행 성공: {post_url}")
                return {"success": True, "postUrl": post_url}
            else:
                return {"success": True, "postUrl": f"https://blog.naver.com/{naver_id}"}

        except Exception as e:
            return {"success": False, "error": f"발행 버튼 클릭 실패: {str(e)[:100]}"}

    except Exception as e:
        logger.error(f"[Naver] 에러: {e}")
        return {"success": False, "error": str(e)[:200]}

    finally:
        if browser:
            await browser.close()


def format_blog_html(post_data: dict) -> str:
    """AI 생성 데이터를 네이버 블로그 HTML로 변환"""
    parts = []

    # 도입부
    if post_data.get("intro"):
        parts.append(f'<p style="font-size:15pt">{post_data["intro"]}</p>')
        parts.append("<br>")

    # 섹션
    for section in (post_data.get("sections") or []):
        subtitle = section.get("subtitle", "")
        content = section.get("content", "")
        if subtitle:
            parts.append(f'<p style="font-size:17pt"><b>{subtitle}</b></p>')
        if content:
            # 문장 단위 줄바꿈
            sentences = re.split(r'(?<=[.!?])\s+', content)
            for sent in sentences:
                parts.append(f'<p style="font-size:15pt">{sent.strip()}</p>')
        parts.append("<br>")

    # 마무리
    if post_data.get("conclusion"):
        parts.append(f'<p style="font-size:15pt">{post_data["conclusion"]}</p>')

    return "\n".join(parts)
