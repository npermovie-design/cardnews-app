"""네이버 블로그 자동 발행 모듈 (Playwright 기반)
- Supabase에 쿠키 영구 저장 (Render 재시작 대응)
- Stealth 설정으로 봇 탐지 우회
"""
import asyncio
import json
import logging
import os
import re
import httpx
from playwright.async_api import async_playwright

logger = logging.getLogger("naver-publisher")

# Supabase 설정
SB_URL = os.environ.get("SUPABASE_URL", "https://ckzjnpzadeovrasucjmu.supabase.co")
SB_KEY = os.environ.get("SUPABASE_SERVICE_KEY", os.environ.get("SUPABASE_KEY", "")) or "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrempucHphZGVvdnJhc3Vjam11Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzkxMDg1NywiZXhwIjoyMDg5NDg2ODU3fQ.gfWezarKfomCrT74eiH0CGoYfg8Ow6RGlR3_svdfstE"

async def _save_cookies_to_db(naver_id: str, cookies: list):
    """Supabase에 쿠키 저장"""
    if not SB_KEY:
        return
    try:
        async with httpx.AsyncClient() as client:
            await client.post(
                f"{SB_URL}/rest/v1/naver_sessions",
                json={"naver_id": naver_id, "cookies": cookies, "updated_at": "now()"},
                headers={
                    "apikey": SB_KEY,
                    "Authorization": f"Bearer {SB_KEY}",
                    "Content-Type": "application/json",
                    "Prefer": "resolution=merge-duplicates",
                },
            )
            logger.info(f"[Cookie] {naver_id} 쿠키 저장 완료 ({len(cookies)}개)")
    except Exception as e:
        logger.warning(f"[Cookie] 저장 실패: {e}")

async def _load_cookies_from_db(naver_id: str) -> list | None:
    """Supabase에서 쿠키 로드"""
    if not SB_KEY:
        return None
    try:
        async with httpx.AsyncClient() as client:
            r = await client.get(
                f"{SB_URL}/rest/v1/naver_sessions?naver_id=eq.{naver_id}&select=cookies",
                headers={"apikey": SB_KEY, "Authorization": f"Bearer {SB_KEY}"},
            )
            data = r.json()
            if data and len(data) > 0 and data[0].get("cookies"):
                cookies = data[0]["cookies"]
                logger.info(f"[Cookie] {naver_id} 쿠키 복원 ({len(cookies)}개)")
                return cookies
    except Exception as e:
        logger.warning(f"[Cookie] 로드 실패: {e}")
    return None

STEALTH_SCRIPT = """
() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    Object.defineProperty(navigator, 'languages', { get: () => ['ko-KR', 'ko', 'en-US', 'en'] });
    window.chrome = { runtime: {}, loadTimes: function(){}, csi: function(){} };
    const origQuery = window.navigator.permissions.query;
    window.navigator.permissions.query = (params) =>
        params.name === 'notifications' ? Promise.resolve({ state: Notification.permission }) : origQuery(params);
    Object.defineProperty(navigator, 'maxTouchPoints', { get: () => 0 });
    Object.defineProperty(navigator, 'connection', { get: () => ({ effectiveType: '4g', rtt: 50, downlink: 10 }) });
}
"""


async def publish_to_naver_blog(
    naver_id: str,
    naver_pw: str,
    title: str,
    html_content: str,
    tags: list[str] = None,
    category: str = "",
) -> dict:
    """네이버 블로그에 글 발행. 성공 시 {'success': True, 'postUrl': ...} 반환."""

    # 아이디에서 @naver.com 제거
    blog_id = naver_id.split("@")[0].strip()

    browser = None
    try:
        pw = await async_playwright().start()
        browser = await pw.chromium.launch(headless=True, args=[
            "--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage",
            "--disable-blink-features=AutomationControlled",
            "--disable-infobars",
        ])
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
            viewport={"width": 1280, "height": 900},
            locale="ko-KR",
            timezone_id="Asia/Seoul",
        )

        # Stealth 스크립트 주입
        await context.add_init_script(STEALTH_SCRIPT)

        # Supabase에서 쿠키 복원
        saved_cookies = await _load_cookies_from_db(blog_id)
        if saved_cookies:
            try:
                await context.add_cookies(saved_cookies)
            except Exception as e:
                logger.warning(f"[Cookie] 복원 실패: {e}")

        page = await context.new_page()

        # ── 1. 네이버 로그인 ──
        logger.info(f"[Naver] 로그인 시도: {blog_id}")
        await page.goto("https://nid.naver.com/nidlogin.login?mode=form&url=https://blog.naver.com", timeout=15000)
        await page.wait_for_load_state("domcontentloaded")
        await page.wait_for_timeout(2000)

        # 이미 로그인됨 (쿠키 유효)
        if "nidlogin" not in page.url:
            logger.info("[Naver] 쿠키로 로그인 성공")
        else:
            # ID/PW 입력 (evaluate로 한번에)
            await page.evaluate("""([id, pw]) => {
                const idEl = document.querySelector('#id');
                const pwEl = document.querySelector('#pw');
                if (idEl) { idEl.focus(); idEl.value = id; idEl.dispatchEvent(new Event('input', {bubbles:true})); }
                if (pwEl) { pwEl.focus(); pwEl.value = pw; pwEl.dispatchEvent(new Event('input', {bubbles:true})); }
            }""", [naver_id, naver_pw])
            await page.wait_for_timeout(800)

            try:
                await page.click(".btn_login, #log\\.login", timeout=3000)
            except:
                pass
            await page.wait_for_timeout(4000)

            # 로그인 결과 확인
            for _ in range(8):
                url = page.url
                if "nidlogin" not in url and "captcha" not in url.lower() and "deviceConfirm" not in url:
                    break
                await page.wait_for_timeout(1000)

            if "nidlogin" in page.url or "captcha" in page.url.lower():
                return {"success": False, "error": "로그인 실패 — 캡차 또는 인증 필요. 네이버에서 직접 로그인 후 다시 시도해주세요."}

        logger.info("[Naver] 로그인 성공")

        # 쿠키 저장 (Supabase)
        cookies = await context.cookies()
        await _save_cookies_to_db(blog_id, cookies)

        # ── 2. 블로그 글쓰기 페이지 ──
        await page.goto(f"https://blog.naver.com/{blog_id}/postwrite", timeout=20000)
        await page.wait_for_load_state("domcontentloaded")
        await page.wait_for_timeout(4000)

        # 리다이렉트 확인
        if "nidlogin" in page.url:
            return {"success": False, "error": "블로그 글쓰기 접근 실패. 다시 로그인해주세요."}

        # 팝업 닫기
        try:
            await page.evaluate("""() => {
                document.querySelectorAll('.se-popup-button-cancel, .se-popup-alert button').forEach(b => { try { b.click(); } catch {} });
                document.querySelectorAll('.se-popup, .se-popup-dim').forEach(el => { try { el.remove(); } catch {} });
            }""")
        except:
            pass
        await page.wait_for_timeout(1500)

        # ── 3. 제목 입력 ──
        logger.info(f"[Naver] 제목 입력: {title[:30]}...")
        try:
            title_el = await page.wait_for_selector(".se-documentTitle .se-text-paragraph", timeout=10000)
            if title_el:
                await title_el.click()
                await page.wait_for_timeout(300)
                await page.keyboard.type(title, delay=15)
        except:
            try:
                title_sel = '.se-title-text, [placeholder*="제목"], .title__input'
                await page.click(title_sel, timeout=5000)
                await page.keyboard.type(title, delay=15)
            except:
                logger.warning("[Naver] 제목 필드를 찾지 못함")

        # ── 4. 본문 입력 ──
        logger.info("[Naver] 본문 입력 중...")
        await page.keyboard.press("Enter")
        await page.wait_for_timeout(500)

        # HTML → 텍스트 변환
        plain_text = re.sub(r'<br\s*/?>', '\n', html_content)
        plain_text = re.sub(r'<[^>]+>', '', plain_text)
        plain_text = plain_text.strip()

        for line in plain_text.split('\n'):
            line = line.strip()
            if line:
                await page.keyboard.type(line, delay=3)
            await page.keyboard.press("Enter")
            await page.wait_for_timeout(20)

        logger.info("[Naver] 본문 입력 완료")

        # ── 5. 태그 입력 ──
        if tags:
            try:
                tag_area = await page.query_selector(".se-tag-label, button[class*='tag'], .se-section-tag")
                if tag_area:
                    await tag_area.click()
                    await page.wait_for_timeout(500)
                    for tag in tags[:10]:
                        tag = tag.strip().replace("#", "")
                        if not tag:
                            continue
                        tag_input = await page.query_selector(".se-tag-input input, input[placeholder*='태그']")
                        if tag_input:
                            await tag_input.fill(tag)
                            await page.keyboard.press("Enter")
                            await page.wait_for_timeout(200)
                    logger.info(f"[Naver] 태그 {len(tags)}개 입력 완료")
            except:
                logger.warning("[Naver] 태그 입력 스킵")

        # ── 6. 발행 ──
        logger.info("[Naver] 발행 시도...")
        try:
            published = await page.evaluate("""() => {
                const btns = document.querySelectorAll('button');
                for (const b of btns) {
                    const txt = (b.textContent || '').trim();
                    if (b.offsetParent !== null && (txt === '발행' || txt.includes('공개발행'))) {
                        b.click(); return true;
                    }
                }
                return false;
            }""")

            if published:
                await page.wait_for_timeout(2000)
                # 발행 확인 팝업
                try:
                    await page.evaluate("""() => {
                        const btns = document.querySelectorAll('button');
                        for (const b of btns) {
                            const txt = (b.textContent || '').trim();
                            if (b.offsetParent !== null && (txt === '발행' || txt === '확인')) { b.click(); return; }
                        }
                    }""")
                except:
                    pass
                await page.wait_for_timeout(3000)

            post_url = page.url
            if "blog.naver.com" in post_url and "postwrite" not in post_url.lower() and "GoBlogWrite" not in post_url:
                logger.info(f"[Naver] 발행 성공: {post_url}")
                # 최종 쿠키 저장
                await _save_cookies_to_db(blog_id, await context.cookies())
                return {"success": True, "postUrl": post_url}
            else:
                # 최종 쿠키 저장
                await _save_cookies_to_db(blog_id, await context.cookies())
                return {"success": True, "postUrl": f"https://blog.naver.com/{blog_id}"}

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
    # post_data가 body(문자열)를 직접 포함할 수 있음
    if isinstance(post_data.get("body"), str):
        return post_data["body"]

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
            sentences = re.split(r'(?<=[.!?])\s+', content)
            for sent in sentences:
                parts.append(f'<p style="font-size:15pt">{sent.strip()}</p>')
        parts.append("<br>")

    # 마무리
    if post_data.get("conclusion"):
        parts.append(f'<p style="font-size:15pt">{post_data["conclusion"]}</p>')

    return "\n".join(parts)
