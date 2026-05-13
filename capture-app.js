const { chromium } = require('playwright-core');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const OUT = path.join(__dirname, 'public', 'screenshots', 'naverbot');

// PowerShell screenshot function
function captureWindow(filename) {
  const ps = `
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Win32 {
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern IntPtr GetWindowRect(IntPtr hWnd, ref RECT rect);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
}
"@
$proc = Get-Process -Name electron | Where-Object { $_.MainWindowTitle -eq "SNS메이킷" }
if (-not $proc) { Write-Output "NOTFOUND"; exit }
$hwnd = $proc.MainWindowHandle
[Win32]::ShowWindow($hwnd, 9) | Out-Null
Start-Sleep -Milliseconds 300
[Win32]::SetForegroundWindow($hwnd) | Out-Null
Start-Sleep -Milliseconds 500
$rect = New-Object Win32+RECT
[Win32]::GetWindowRect($hwnd, [ref]$rect) | Out-Null
$w = $rect.Right - $rect.Left; $h = $rect.Bottom - $rect.Top
$bmp = New-Object System.Drawing.Bitmap($w, $h)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.CopyFromScreen($rect.Left, $rect.Top, 0, 0, (New-Object System.Drawing.Size($w, $h)))
$g.Dispose()
$bmp.Save("${filename}", [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
Write-Output "OK"
`;
  const tmpPs = path.join(OUT, '_capture.ps1');
  fs.writeFileSync(tmpPs, ps, 'utf8');
  const result = execSync(`powershell.exe -NoProfile -ExecutionPolicy Bypass -File "${tmpPs}"`, { encoding: 'utf8' }).trim();
  fs.unlinkSync(tmpPs);
  return result;
}

async function main() {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const ctx = browser.contexts()[0];
  const page = ctx.pages()[0];

  // Navigate helper
  async function clickMenu(text) {
    try {
      const el = await page.locator(`text="${text}"`).first();
      if (await el.isVisible({ timeout: 2000 })) {
        await el.click();
        await page.waitForTimeout(2000);
        return true;
      }
    } catch (e) {}
    return false;
  }

  async function captureScreen(name) {
    await page.waitForTimeout(500);
    const filepath = path.join(OUT, name);
    const result = captureWindow(filepath);
    console.log(`${name}: ${result}`);
  }

  // Set window size
  await page.evaluate(() => {
    if (window.resizeTo) window.resizeTo(1400, 900);
  });
  await page.waitForTimeout(1000);

  // Capture login screen
  await captureScreen('sc-01-login.png');

  // Navigate to each section
  const menus = [
    { text: '홈', name: 'sc-02-home.png' },
    { text: '커뮤니티', name: 'sc-03-community.png' },
    { text: '계정 설정', name: 'sc-04-account.png' },
    { text: '블로그', name: 'sc-05-blog.png' },
    { text: '카페', name: 'sc-06-cafe.png' },
    { text: '글쓰기', name: 'sc-07-write.png' },
    { text: '카드뉴스', name: 'sc-08-cardnews.png' },
    { text: '영상 편집', name: 'sc-09-video.png' },
  ];

  for (const menu of menus) {
    const clicked = await clickMenu(menu.text);
    if (clicked) {
      await captureScreen(menu.name);
    } else {
      console.log(`"${menu.text}" not found, skipping`);
    }
  }

  // Try expanding submenus
  const expandables = ['콘텐츠 제작', '자료실', '운영', '기타'];
  for (const sub of expandables) {
    try {
      const el = await page.locator(`text="${sub}"`).first();
      if (await el.isVisible({ timeout: 1000 })) {
        await el.click();
        await page.waitForTimeout(800);
        console.log(`Expanded: ${sub}`);
      }
    } catch (e) {}
  }

  // Try again after expanding
  for (const menu of menus) {
    const clicked = await clickMenu(menu.text);
    if (clicked) {
      await captureScreen(menu.name);
    }
  }

  console.log('All captures done!');
  process.exit(0);
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
