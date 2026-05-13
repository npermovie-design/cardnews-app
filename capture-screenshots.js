const { chromium } = require('playwright-core');
const path = require('path');
const fs = require('fs');

const OUT = path.join(__dirname, 'public', 'screenshots', 'naverbot');

async function main() {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const ctx = browser.contexts()[0];
  const page = ctx.pages()[0];

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.waitForTimeout(2000);

  // Screenshot helper - clip to avoid full page issues
  async function capture(name) {
    await page.waitForTimeout(800);
    const buf = await page.screenshot({ type: 'png', timeout: 10000 });
    fs.writeFileSync(path.join(OUT, name), buf);
    console.log('OK:', name);
  }

  // 1. Login screen
  await capture('sc-01-login.png');

  // Check if login form exists
  const loginBtn = await page.$('button:has-text("로그인")');
  if (loginBtn) {
    console.log('Need login. Attempting Google login via Supabase session injection...');

    // Try to inject auth session from environment or prompt
    // First check if there's an existing Supabase session in Electron's user data
    const authKeys = await page.evaluate(() => {
      const result = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.includes('supabase') || key.includes('auth') || key.includes('sb-')) {
          result[key] = localStorage.getItem(key)?.slice(0, 50) + '...';
        }
      }
      return result;
    });
    console.log('Auth keys in localStorage:', JSON.stringify(authKeys));

    // Check email/password saved
    const savedData = await page.evaluate(() => ({
      email: localStorage.getItem('savedEmail') || localStorage.getItem('saved_email') || '',
      autoLogin: localStorage.getItem('autoLogin') || '',
      remember: localStorage.getItem('rememberMe') || '',
    }));
    console.log('Saved data:', JSON.stringify(savedData));

    // Try to find all input fields
    const inputs = await page.$$eval('input', els => els.map(el => ({
      type: el.type, placeholder: el.placeholder, name: el.name, id: el.id
    })));
    console.log('Inputs:', JSON.stringify(inputs));

    // Try to find all clickable elements in sidebar
    const allLinks = await page.$$eval('div, a, span, button', els =>
      els.filter(el => el.textContent.trim().length < 20 && el.textContent.trim().length > 0 && el.offsetParent !== null)
        .slice(0, 40)
        .map(el => el.textContent.trim())
    );
    console.log('Visible elements:', JSON.stringify([...new Set(allLinks)]));
  }

  // Try clicking sidebar menu items even without login
  const sidebarTexts = ['홈', '커뮤니티', '계정 설정', '글쓰기', '카드뉴스', '영상 편집'];

  for (const text of sidebarTexts) {
    try {
      const el = await page.locator(`text="${text}"`).first();
      if (await el.isVisible({ timeout: 1000 })) {
        await el.click();
        await page.waitForTimeout(1500);
        const safeName = text.replace(/\s+/g, '-');
        await capture(`sc-${safeName}.png`);
      }
    } catch (e) {
      console.log(`Skip "${text}": ${e.message.slice(0, 60)}`);
    }
  }

  // Scroll and capture full page in sections
  const totalHeight = await page.evaluate(() => document.body.scrollHeight);
  console.log('Total page height:', totalHeight);

  console.log('All done!');
}

main().catch(e => console.error('Fatal:', e.message));
