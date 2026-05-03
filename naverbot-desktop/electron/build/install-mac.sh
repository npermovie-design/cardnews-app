#!/bin/bash
clear
echo ""
echo "============================================"
echo "   메이킷 SNS자동화 설치 중..."
echo "============================================"
echo ""

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_NAME="메이킷 SNS자동화.app"
APP_SRC="${SCRIPT_DIR}/${APP_NAME}"
APP_DEST="/Applications/${APP_NAME}"

if [ ! -d "$APP_SRC" ]; then
  echo "[오류] 앱을 찾을 수 없습니다."
  echo "DMG 파일을 먼저 열어주세요."
  echo ""
  read -p "아무 키나 눌러 종료..."
  exit 1
fi

if [ -d "$APP_DEST" ]; then
  echo "기존 버전을 제거합니다..."
  rm -rf "$APP_DEST"
fi

echo "앱을 설치합니다..."
cp -R "$APP_SRC" "$APP_DEST"

echo "보안 설정을 적용합니다..."
xattr -cr "$APP_DEST"

echo ""
echo "설치 완료! 앱을 실행합니다..."
echo ""

open "$APP_DEST"
exit 0
