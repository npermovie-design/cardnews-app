"""URL에서 Playwright로 이미지+텍스트 추출 (다중 페이지 탐색)"""
import sys, json, os
from urllib.parse import urljoin, urlparse

EXTRACT_IMAGES_JS = r"""() => {
    const imgs = [];
    const seen = new Set();
    const skip = /(icon|logo|sprite|pixel|tracker|btn|button|badge|avatar|snslink|sidemenu|sns_|social_|nav_|menu_|arrow|close|search|spinner|placeholder|blank|spacer|_off\.|_on\.)/i;
    const skipPath = /\/(skin|skins|template|templates|layout|common|assets\/img)\//i;

    function addImg(src) {
        if (!src || src.startsWith('data:') || src.endsWith('.svg')) return;
        if (src.startsWith('//')) src = 'https:' + src;
        if (skip.test(src) || skipPath.test(src)) return;
        if (seen.has(src)) return;
        seen.add(src);
        imgs.push(src);
    }

    document.querySelectorAll('img').forEach(el => {
        addImg(el.currentSrc || el.src);
        addImg(el.dataset.src);
        addImg(el.dataset.lazySrc);
        addImg(el.dataset.original);
        const srcset = el.getAttribute('srcset');
        if (srcset) {
            const parts = srcset.split(',').map(s => s.trim().split(/\s+/));
            if (parts.length) addImg(parts[parts.length - 1][0]);
        }
    });

    document.querySelectorAll('picture source').forEach(el => {
        const srcset = el.getAttribute('srcset');
        if (srcset) addImg(srcset.split(',')[0].trim().split(/\s+/)[0]);
    });

    document.querySelectorAll('*').forEach(el => {
        try {
            const bg = getComputedStyle(el).backgroundImage;
            if (bg && bg !== 'none') {
                const m = bg.match(/url\(["']?([^"')]+)["']?\)/);
                if (m) {
                    const rect = el.getBoundingClientRect();
                    if (rect.width >= 30 && rect.height >= 30) addImg(m[1]);
                }
            }
        } catch {}
    });

    document.querySelectorAll('a[href]').forEach(el => {
        const href = el.getAttribute('href') || '';
        if (/\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(href)) addImg(href);
    });

    return imgs;
}"""

EXTRACT_LINKS_JS = r"""(baseDomain) => {
    const links = [];
    const seen = new Set();
    document.querySelectorAll('a[href]').forEach(el => {
        let href = el.href;
        if (!href || href.startsWith('javascript:') || href.startsWith('#')) return;
        try {
            const u = new URL(href);
            if (u.hostname !== baseDomain) return;
            if (u.pathname === '/' || u.pathname.length < 2) return;
            if (/(login|cart|mypage|member|order|search|api|admin)/i.test(u.pathname)) return;
            const key = u.origin + u.pathname;
            if (seen.has(key)) return;
            seen.add(key);
            links.push(key);
        } catch {}
    });
    return links;
}"""

def main():
    url = sys.argv[1] if len(sys.argv) > 1 else ""
    if not url:
        print(json.dumps({"ok": False, "error": "URL 필요"}))
        return

    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print(json.dumps({"ok": False, "error": "playwright not installed"}))
        return

    result = {"ok": True, "title": "", "content": "", "images": [], "thumbnail": ""}
    all_images = []
    seen_urls = set()
    base_domain = urlparse(url).netloc

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            ctx = browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36",
                viewport={"width": 1280, "height": 900},
            )

            def scroll_and_extract(page):
                for _ in range(20):
                    page.evaluate("window.scrollBy(0, window.innerHeight)")
                    page.wait_for_timeout(250)
                page.evaluate("window.scrollTo(0, 0)")
                page.wait_for_timeout(300)
                return page.evaluate(EXTRACT_IMAGES_JS)

            # 1. 메인 페이지
            page = ctx.new_page()
            try:
                page.goto(url, wait_until="networkidle", timeout=20000)
            except Exception:
                try:
                    page.goto(url, wait_until="domcontentloaded", timeout=15000)
                except Exception as e:
                    result["ok"] = False
                    result["error"] = str(e)[:200]
                    print(json.dumps(result, ensure_ascii=False))
                    browser.close()
                    return

            result["title"] = page.title() or ""

            og_img = page.evaluate("() => { const m = document.querySelector('meta[property=\"og:image\"]'); return m ? m.content : ''; }")
            if og_img:
                result["thumbnail"] = og_img

            for img in scroll_and_extract(page):
                if img not in seen_urls:
                    seen_urls.add(img)
                    all_images.append(img)

            # 본문 텍스트
            content = page.evaluate("""() => {
                const sels = ['article', 'main', '.content', '.post-content', '#content', '.entry-content', '.product-detail', '.goods_description'];
                for (const s of sels) { const el = document.querySelector(s); if (el && el.innerText.trim().length > 100) return el.innerText.trim(); }
                return document.body.innerText.trim().slice(0, 5000);
            }""")
            result["content"] = (content or "")[:3000]

            # 2. 내부 페이지 탐색
            internal_links = page.evaluate(EXTRACT_LINKS_JS, base_domain)
            page.close()

            for link in internal_links[:30]:
                try:
                    sp = ctx.new_page()
                    sp.goto(link, wait_until="domcontentloaded", timeout=10000)
                    for img in scroll_and_extract(sp):
                        if img not in seen_urls:
                            seen_urls.add(img)
                            all_images.append(img)
                    sp.close()
                except Exception:
                    try: sp.close()
                    except: pass

            browser.close()

    except Exception as e:
        result["ok"] = False
        result["error"] = str(e)[:200]

    result["images"] = all_images[:150]
    result["ok"] = True
    print(json.dumps(result, ensure_ascii=False))

if __name__ == "__main__":
    main()
