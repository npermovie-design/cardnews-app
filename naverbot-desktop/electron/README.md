# NaverBot Electron GUI

## 개발 실행

```bash
cd "D:\홈페이지\NaverBot SaaS\client\electron"
npm install
npm start
```

## 빌드 (설치형 .exe)

```bash
npm run build:win
```

결과: `dist/` 폴더에 NSIS 설치 프로그램 생성.

## 구조

```
electron/
├── main.js          # 메인 프로세스 (IPC, 설정, Python 호출)
├── preload.js       # 렌더러 ↔ 메인 안전 브릿지
├── package.json
└── renderer/
    ├── index.html   # UI
    ├── style.css    # 다크 테마
    └── app.js       # 로직 (설정, 실행, 로그)
```

## 작동 원리

1. 사용자가 GUI에서 라이선스/계정/글타입/키워드 입력
2. [지금 1회 발행] 클릭
3. Electron이 설정을 `%APPDATA%\NaverBotSaaS\config.json`에 저장
4. `python runner.py run-once` subprocess 실행
5. runner.py가 config.json 읽고 → 서버 라이선스 검증 → 서버 글 생성 → 봇 발행
6. stdout JSON을 Electron이 파싱해서 결과 UI에 표시

## 설정 저장 위치

| 데이터 | 위치 |
|---|---|
| 앱 설정 | `%APPDATA%\NaverBotSaaS\config.json` |
| 네이버 비밀번호 | Windows Credential Manager (keyring) |
| 브라우저 세션 | `%APPDATA%\NaverBotSaaS\profiles\{user_id}\` |
| 라이선스 | 서버 검증, machine_id HMAC 바인딩 |
