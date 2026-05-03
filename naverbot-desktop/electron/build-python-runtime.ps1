#
# Python 런타임 + 의존성 + Playwright Chromium 번들링 스크립트
#
# 실행 후 결과: client/electron/python-runtime/ 폴더에
# - python.exe + 표준 라이브러리
# - site-packages (playwright, keyring, requests)
# - .playwright-browsers/chromium (동봉)
#
# 이 폴더가 electron-builder의 extraResources로 포함되어
# 설치시 resources/python-runtime/ 에 배치됩니다.
#

$ErrorActionPreference = "Stop"

$PY_VERSION = "3.12.7"
$PY_URL = "https://www.python.org/ftp/python/$PY_VERSION/python-$PY_VERSION-embed-amd64.zip"
$GETPIP_URL = "https://bootstrap.pypa.io/get-pip.py"

$ROOT = Split-Path -Parent $MyInvocation.MyCommand.Path
$RUNTIME_DIR = Join-Path $ROOT "python-runtime"
$BROWSERS_DIR = Join-Path $RUNTIME_DIR ".playwright-browsers"

Write-Host "=== NaverBot Python Runtime Builder ==="
Write-Host "Target: $RUNTIME_DIR"

# 1. 기존 런타임 제거
if (Test-Path $RUNTIME_DIR) {
    Write-Host "[1/6] 기존 런타임 제거 중..."
    Remove-Item -Recurse -Force $RUNTIME_DIR
}

# 2. Python embeddable 다운로드/압축해제
Write-Host "[2/6] Python $PY_VERSION embeddable 다운로드 중..."
New-Item -ItemType Directory -Force -Path $RUNTIME_DIR | Out-Null
$zipPath = Join-Path $env:TEMP "python-embed.zip"
Invoke-WebRequest -Uri $PY_URL -OutFile $zipPath
Expand-Archive -Path $zipPath -DestinationPath $RUNTIME_DIR -Force
Remove-Item $zipPath

# 3. ._pth 파일 수정 (site-packages import 활성화)
$pthFile = Get-ChildItem -Path $RUNTIME_DIR -Filter "python*._pth" | Select-Object -First 1
if ($pthFile) {
    Write-Host "[3/6] ._pth 파일 수정 ($($pthFile.Name))..."
    $content = Get-Content $pthFile.FullName
    $newContent = $content + @("import site", "Lib\site-packages")
    $newContent | Set-Content $pthFile.FullName
}

# 4. get-pip.py로 pip 설치
Write-Host "[4/6] pip 설치 중..."
$getpipPath = Join-Path $env:TEMP "get-pip.py"
Invoke-WebRequest -Uri $GETPIP_URL -OutFile $getpipPath
& "$RUNTIME_DIR\python.exe" $getpipPath --no-warn-script-location
Remove-Item $getpipPath

# 5. 의존성 설치
Write-Host "[5/6] 의존성 설치 중 (playwright, keyring, requests)..."
& "$RUNTIME_DIR\python.exe" -m pip install --no-warn-script-location `
    playwright `
    keyring `
    requests

# 6. Playwright Chromium 다운로드 (headful + headless-shell 둘 다)
Write-Host "[6/6] Playwright Chromium 다운로드 중 (~400MB)..."
$env:PLAYWRIGHT_BROWSERS_PATH = $BROWSERS_DIR
& "$RUNTIME_DIR\python.exe" -m playwright install chromium
& "$RUNTIME_DIR\python.exe" -m playwright install chromium-headless-shell

# 총 용량 계산
$size = (Get-ChildItem $RUNTIME_DIR -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
Write-Host ""
Write-Host "완료! 런타임 크기: $([math]::Round($size, 1)) MB"
Write-Host "위치: $RUNTIME_DIR"
