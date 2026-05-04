// Electron preload - 안전한 IPC 브릿지
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("nbBridge", {
  // 설정
  loadConfig: () => ipcRenderer.invoke("config:load"),
  saveConfig: (cfg) => ipcRenderer.invoke("config:save", cfg),
  getAppVersion: () => ipcRenderer.invoke("app:getVersion"),
  checkUpdate: () => ipcRenderer.invoke("app:checkUpdate"),

  // 핫 업데이트 (CSS/JS 서버 로드)
  hotUpdateSync: () => ipcRenderer.invoke("app:hotUpdateSync"),
  getRendererVersion: () => ipcRenderer.invoke("app:getRendererVersion"),

  // exe 자동 업데이트 (electron-updater)
  checkExeUpdate: () => ipcRenderer.invoke("app:checkExeUpdate"),
  downloadExeUpdate: () => ipcRenderer.invoke("app:downloadExeUpdate"),
  installExeUpdate: () => ipcRenderer.invoke("app:installExeUpdate"),
  onExeUpdateAvailable: (cb) => ipcRenderer.on("exe-update:available", (_, d) => cb(d)),
  onExeUpdateProgress: (cb) => ipcRenderer.on("exe-update:progress", (_, d) => cb(d)),
  onExeUpdateDownloaded: (cb) => ipcRenderer.on("exe-update:downloaded", (_, d) => cb(d)),

  // 비밀번호 (service: NaverBotSaaS | NaverBotSaaS_Makeit)
  savePassword: (username, password, service) =>
    ipcRenderer.invoke("password:save", { username, password, service }),

  // 메이킷 계정 검증
  verifyAccount: () => ipcRenderer.invoke("account:verify"),

  // 토큰 갱신
  refreshToken: (refreshToken) => ipcRenderer.invoke("auth:refreshToken", refreshToken),

  // 네이버 세션 저장 (first_login)
  naverFirstLogin: (naverId) => ipcRenderer.invoke("naver:firstLogin", naverId),
  resetNaverLogin: (naverId) => ipcRenderer.invoke("naver:resetLogin", naverId),

  // 키워드 글감 분석
  analyzeKeyword: (keyword) => ipcRenderer.invoke("keyword:analyze", keyword),

  // 봇 실행
  runOnce: (overrides) => ipcRenderer.invoke("bot:runOnce", overrides),
  stopBot: () => ipcRenderer.invoke("bot:stop"),
  runAnalyze: (url) => ipcRenderer.invoke("bot:analyze-ref", url),
  onLog: (cb) => {
    ipcRenderer.on("bot:log", (_, text) => cb(text));
  },

  // 체험 횟수 (별도 파일로 저장 — 경쟁 상태 없음)
  getTrialUsed: () => ipcRenderer.invoke("trial:get"),
  setTrialUsed: (n) => ipcRenderer.invoke("trial:set", n),

  // 외부 링크
  openExternal: (url) => ipcRenderer.invoke("shell:openExternal", url),

  // Custom protocol 콜백 (브라우저 로그인 완료 시 호출됨)
  onAuthCallback: (cb) => {
    ipcRenderer.on("auth:callback", (_, params) => cb(params));
  },

  // 로그인 창 닫힘 콜백
  onAuthWindowClosed: (cb) => {
    ipcRenderer.on("auth:windowClosed", () => cb());
  },

  // 내부 로그인 창 열기
  openLoginWindow: () => ipcRenderer.invoke("auth:openLoginWindow"),

  // snsmakeit.com 로그인 페이지 열기 (Google/이메일 통합)
  openGoogleOAuth: () => ipcRenderer.send("auth:google"),
});
