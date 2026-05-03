// Electron 앱 스크린샷 캡처 (앱이 실행된 상태에서)
const { execSync } = require("child_process");
const path = require("path");

// PowerShell로 활성 윈도우 캡처
const outDir = path.join(__dirname, "screenshots");
const fs = require("fs");
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

function captureScreen(name) {
  const ps = `
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
$screen = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
$bmp = New-Object System.Drawing.Bitmap($screen.Width, $screen.Height)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.CopyFromScreen($screen.Location, [System.Drawing.Point]::Empty, $screen.Size)
$bmp.Save("${outDir.replace(/\\/g, "\\\\")}\\\\${name}.png")
$g.Dispose()
$bmp.Dispose()
`;
  try {
    execSync(`powershell -Command "${ps.replace(/\n/g, " ")}"`, { timeout: 5000 });
    console.log(`Saved: ${name}.png`);
  } catch (e) {
    console.error(`Failed: ${name}`, e.message);
  }
}

captureScreen("app_home");
console.log("Done! Check screenshots/ folder");
