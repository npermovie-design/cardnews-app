// Electron preload - 안전한 IPC 브릿지
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("nbBridge", {
  // 로컬 개발 모드 플래그
  isLocalDev: process.env.NAVERBOT_LOCAL_DEV === "1",
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
  onExeUpdateAvailable: (cb) => { ipcRenderer.removeAllListeners("exe-update:available"); ipcRenderer.on("exe-update:available", (_, d) => cb(d)); },
  onExeUpdateProgress: (cb) => { ipcRenderer.removeAllListeners("exe-update:progress"); ipcRenderer.on("exe-update:progress", (_, d) => cb(d)); },
  onExeUpdateDownloaded: (cb) => { ipcRenderer.removeAllListeners("exe-update:downloaded"); ipcRenderer.on("exe-update:downloaded", (_, d) => cb(d)); },

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
  isBotRunning: () => ipcRenderer.invoke("bot:isRunning"),
  runAnalyze: (url) => ipcRenderer.invoke("bot:analyze-ref", url),
  onLog: (cb) => {
    ipcRenderer.removeAllListeners("bot:log");
    ipcRenderer.on("bot:log", (_, text) => cb(text));
  },

  // 체험 횟수 (별도 파일로 저장 — 경쟁 상태 없음)
  getTrialUsed: () => ipcRenderer.invoke("trial:get"),
  setTrialUsed: (n) => ipcRenderer.invoke("trial:set", n),

  // 스케줄 (인앱 타이머)
  createSchedule: (times) => ipcRenderer.invoke("schedule:create", times),
  clearSchedule: () => ipcRenderer.invoke("schedule:clear"),
  onScheduleTrigger: (cb) => { ipcRenderer.removeAllListeners("schedule:trigger"); ipcRenderer.on("schedule:trigger", (_, time) => cb(time)); },

  // 미디어 라이브러리
  mediaDownload: (url, filename) => ipcRenderer.invoke("media:download", url, filename),
  mediaSelectFiles: () => ipcRenderer.invoke("media:selectFiles"),
  mediaGetLocalFiles: () => ipcRenderer.invoke("media:getLocalFiles"),
  mediaImportFiles: (paths) => ipcRenderer.invoke("media:importFiles", paths),
  mediaDeleteFile: (path) => ipcRenderer.invoke("media:deleteFile", path),
  mediaGetMakeitFiles: (cat) => ipcRenderer.invoke("media:getMakeitFiles", cat),
  mediaImportToMakeit: (paths, dest) => ipcRenderer.invoke("media:importToMakeit", paths, dest),
  mediaFileToDataUrl: (path) => ipcRenderer.invoke("media:fileToDataUrl", path),
  mediaGetThumbnail: (path) => ipcRenderer.invoke("media:getThumbnail", path),

  // 외부 링크
  openExternal: (url) => ipcRenderer.invoke("shell:openExternal", url),

  // Custom protocol 콜백 (브라우저 로그인 완료 시 호출됨)
  onAuthCallback: (cb) => {
    ipcRenderer.removeAllListeners("auth:callback");
    ipcRenderer.on("auth:callback", (_, params) => cb(params));
  },

  // 로그인 창 닫힘 콜백
  onAuthWindowClosed: (cb) => {
    ipcRenderer.removeAllListeners("auth:windowClosed");
    ipcRenderer.on("auth:windowClosed", () => cb());
  },

  // 내부 로그인 창 열기
  openLoginWindow: () => ipcRenderer.invoke("auth:openLoginWindow"),

  // snsmakeit.com 로그인 페이지 열기 (Google/이메일 통합)
  openGoogleOAuth: () => ipcRenderer.send("auth:google"),

  // 영상 업로드+분석 (main process에서 직접 처리)
  videoUploadAndAnalyze: (filePath, maxSegs) => ipcRenderer.invoke("video:uploadAndAnalyze", filePath, maxSegs),

  // ── 영상 편집 (로컬 ffmpeg) ──
  videoSelectFile: () => ipcRenderer.invoke("video:selectFile"),
  videoSelectImage: () => ipcRenderer.invoke("video:selectImage"),
  videoProbe: (filePath) => ipcRenderer.invoke("video:probe", filePath),
  videoRenderShorts: (opts) => ipcRenderer.invoke("video:renderShorts", opts),
  videoRenderLongform: (opts) => ipcRenderer.invoke("video:renderLongform", opts),
  videoCancel: () => ipcRenderer.invoke("video:cancel"),
  videoSelectSaveDir: () => ipcRenderer.invoke("video:selectSaveDir"),
  videoSelectSaveFile: (opts) => ipcRenderer.invoke("video:selectSaveFile", opts || {}),
  // 프로젝트 저장/불러오기
  projectSave: (data) => ipcRenderer.invoke("project:save", data),
  projectList: () => ipcRenderer.invoke("project:list"),
  projectLoad: (id) => ipcRenderer.invoke("project:load", id),
  projectDelete: (id) => ipcRenderer.invoke("project:delete", id),
  videoDetectSilence: (opts) => ipcRenderer.invoke("video:detectSilence", opts),
  videoRemoveSilence: (opts) => ipcRenderer.invoke("video:removeSilence", opts),
  onVideoProgress: (cb) => {
    const handler = (_, d) => cb(d);
    ipcRenderer.on("video:progress", handler);
    return () => ipcRenderer.removeListener("video:progress", handler);
  },
  offVideoProgress: () => ipcRenderer.removeAllListeners("video:progress"),
});
