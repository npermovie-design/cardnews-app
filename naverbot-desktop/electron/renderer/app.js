// NaverBot renderer - UI 로직 (v2 Clean)
const bridge = window.nbBridge;

if (!bridge) {
  document.body.innerHTML =
    '<div style="padding:40px;color:#3b82f6;font-family:sans-serif;">' +
    '<h2>preload.js 로드 실패</h2><p>Electron IPC 브릿지 문제.</p></div>';
  throw new Error("preload bridge not available");
}

// ── 업데이트 오��레이 ──
function showUpdateOverlay(message = "업데이트 중입니다...") {
  if (document.getElementById("hotUpdateOverlay")) return;
  const overlay = document.createElement("div");
  overlay.id = "hotUpdateOverlay";
  overlay.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;
      position:fixed;inset:0;z-index:99999;background:#f9fafb;">
      <div style="text-align:center;max-width:360px;padding:40px;">
        <div style="width:48px;height:48px;margin:0 auto 20px;border:3px solid #e5e7eb;
          border-top-color:#3b82f6;border-radius:50%;animation:spin .7s linear infinite;"></div>
        <h2 style="font-size:20px;font-weight:700;color:#333;margin-bottom:8px;" id="updateTitle">${message}</h2>
        <p style="font-size:13px;color:#6b7280;line-height:1.6;" id="updateSub">최신 화면으로 업데이트하고 있습니다.<br>잠시만 기다려주세요.</p>
        <div style="margin-top:20px;width:200px;height:4px;background:#e5e7eb;border-radius:4px;overflow:hidden;margin-left:auto;margin-right:auto;">
          <div id="updateProgressBar" style="width:30%;height:100%;background:linear-gradient(90deg,#3b82f6,#60a5fa);
            border-radius:4px;transition:width .3s;"></div>
        </div>
      </div>
    </div>
    <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
  `;
  document.body.appendChild(overlay);
}

function hideUpdateOverlay() {
  const el = document.getElementById("hotUpdateOverlay");
  if (el) el.remove();
}

function setUpdateProgress(pct, text) {
  const bar = document.getElementById("updateProgressBar");
  if (bar) bar.style.width = pct + "%";
  if (text) {
    const sub = document.getElementById("updateSub");
    if (sub) sub.textContent = text;
  }
}

// ── 핫 업데이트 체크 (앱 시작 시) ──
(async function checkHotUpdateOnBoot() {
  if (!bridge.hotUpdateSync) return;
  try {
    const result = await bridge.hotUpdateSync();
    if (result && result.updated) {
      // 새 UI 다운로드 완료 → 오버레이 표시 후 리로드
      showUpdateOverlay("새로운 버전을 적용하고 있습니다...");
      setUpdateProgress(80, "화면을 새로 불러오는 중...");
      setTimeout(() => location.reload(), 800);
      return; // 리로드 대기
    }
  } catch (e) {
    console.warn("[HotUpdate] check failed:", e);
  }
})();

// ── exe 업데이트 이벤트 리스너 ──
if (bridge.onExeUpdateAvailable) {
  bridge.onExeUpdateAvailable((info) => {
    console.log("[ExeUpdate] 새 버전:", info.version);
  });
}
if (bridge.onExeUpdateProgress) {
  bridge.onExeUpdateProgress((info) => {
    const bar = document.getElementById("updateProgressBar");
    const title = document.getElementById("updateTitle");
    if (!document.getElementById("hotUpdateOverlay")) {
      showUpdateOverlay("프로그램 업데이트 다운로드 중...");
    }
    if (bar) bar.style.width = info.percent + "%";
    if (title) title.textContent = `다���로드 중... ${info.percent}%`;
  });
}
if (bridge.onExeUpdateDownloaded) {
  bridge.onExeUpdateDownloaded((info) => {
    const title = document.getElementById("updateTitle");
    const sub = document.getElementById("updateSub");
    if (title) title.textContent = "업데이트 준비 완료!";
    if (sub) sub.textContent = `v${info.version} - 앱을 종료하면 자동 설치됩니다.`;
    setTimeout(hideUpdateOverlay, 3000);
  });
}

// ── 상태 ──
const state = {
  subtype: "info",
  tone: "friendly",
  speech: "polite_yo",
  wordCount: "medium",
  quoteStyle: "postit",
  useSticker: "off",
  aeoPosition: "top",
  useUnderline: "off",
  includeProsCons: true,
  briefCategory: "",
  loggedIn: false,
  user: null, // {email, nick, plan}
  botRunning: false,
};

// ── 관리자 이메일 (서버 검증 후 무제한 사용) ──
const ADMIN_EMAILS = ["npermovie@naver.com"];

function isAdminAccount(email, result = {}) {
  const normalized = (email || result.email || "").toLowerCase();
  return result.role === "admin" || result.plan === "admin" || ADMIN_EMAILS.includes(normalized);
}

const EXE_PLAN_RULES = {
  trial: {
    label: "무료 체험",
    maxPostsPerRun: 1,
    maxDurationDays: 1,
    canSchedule: true,
    canCafe: false,
    desc: "블로그 자동 운영 1일 체험 · 1회 1개 · 카페 제한",
  },
  starter: {
    label: "Basic",
    maxPostsPerRun: 1,
    maxDurationDays: 3,
    canSchedule: true,
    canCafe: false,
    desc: "블로그 자동 운영 · 1회 최대 1개 · 카페 제한",
  },
  pro: {
    label: "Pro",
    maxPostsPerRun: 3,
    maxDurationDays: 30,
    canSchedule: true,
    canCafe: true,
    desc: "블로그/카페 30일 자동 운영 · 하루 최대 3개",
  },
  premium: {
    label: "Premium",
    maxPostsPerRun: 10,
    maxDurationDays: 30,
    canSchedule: true,
    canCafe: true,
    desc: "블로그/카페 30일 자동 운영 · 하루 최대 10개",
  },
  admin: {
    label: "Admin",
    maxPostsPerRun: 0,
    maxDurationDays: 0,
    canSchedule: true,
    canCafe: true,
    desc: "관리자 · 제한 없음",
  },
};

const EXPERIENCE_LIMITS = {
  quick: 5,
  autopilot: 1,
};

function normalizeExePlan(user) {
  const plan = String(user?.plan || "").toLowerCase();
  const role = String(user?.role || "").toLowerCase();
  if (user?.admin || role === "admin" || plan === "admin") return "admin";
  if (user?.trial || plan === "trial" || !plan) return "trial";
  if (["premium", "business", "agency"].includes(plan)) return "premium";
  if (["pro"].includes(plan)) return "pro";
  return "starter";
}

function getExePlanRules(user = state.user) {
  return EXE_PLAN_RULES[normalizeExePlan(user)] || EXE_PLAN_RULES.trial;
}

function isExperienceLimitedUser(user = state.user) {
  const planKey = normalizeExePlan(user);
  return planKey === "trial" || planKey === "starter";
}

function formatPlanName(planKey, rawPlan = "") {
  const rules = EXE_PLAN_RULES[planKey] || EXE_PLAN_RULES.trial;
  if (planKey === "starter" && String(rawPlan || "").toLowerCase() === "basic") return "Basic";
  return rules.label;
}

function renderPlanFeatures(rules, user = state.user) {
  const postLimit = rules.maxPostsPerRun > 0 ? `1회 ${rules.maxPostsPerRun}개` : "제한 없음";
  const autoText = isExperienceLimitedUser(user) ? "체험 1회" : (rules.maxDurationDays > 0 ? `${rules.maxDurationDays}일` : "제한 없음");
  return `
    <div class="plan-feature-grid">
      <div class="plan-feature">
        <div class="plan-feature-label">발행 한도</div>
        <div class="plan-feature-value">${escapeHtml(postLimit)}</div>
      </div>
      <div class="plan-feature">
        <div class="plan-feature-label">자동 운영</div>
        <div class="plan-feature-value">${escapeHtml(autoText)}</div>
      </div>
      <div class="plan-feature">
        <div class="plan-feature-label">카페 발행</div>
        <div class="plan-feature-value ${rules.canCafe ? "ok" : "locked"}">${rules.canCafe ? "가능" : "Pro 이상"}</div>
      </div>
      <div class="plan-feature">
        <div class="plan-feature-label">예약 발행</div>
        <div class="plan-feature-value ${rules.canSchedule ? "ok" : "locked"}">${rules.canSchedule ? "가능" : "제한"}</div>
      </div>
    </div>
  `;
}

function requireExeFeature(feature, message) {
  if (!state.loggedIn) {
    showModal("로그인 필요", "먼저 메이킷 계정에 로그인하세요.", "확인");
    return false;
  }
  const rules = getExePlanRules();
  if (feature === "cafe" && !rules.canCafe) {
    showModal("Pro 기능", message || "카페 발행은 Pro 이상에서 사용할 수 있습니다.", "구독하기", () => bridge.openExternal("https://snsmakeit.com/pricing"));
    return false;
  }
  if (feature === "schedule" && !rules.canSchedule) {
    showModal("Pro 기능", message || "예약 자동화는 Pro 이상에서 사용할 수 있습니다.", "구독하기", () => bridge.openExternal("https://snsmakeit.com/pricing"));
    return false;
  }
  return true;
}

// ── 패널 전환 ──
const navItems = document.querySelectorAll(".nav-item");
const panels = document.querySelectorAll(".panel");

// 로그인 없이 접근 가능한 패널 (홈만)
const LOGIN_FREE_PANELS = ["home", "pricing", "about", "video-shorts", "video-longform"];
// 네이버 계정 필요 패널
const ACCOUNT_REQUIRED_PANELS = ["naver-blog", "naver-cafe"];

function isNaverAccountReady() {
  const nid = $("naverId") ? $("naverId").value.trim() : "";
  return !!nid;
}

navItems.forEach((item) => {
  item.addEventListener("click", () => {
    const target = item.dataset.panel;

    // 1) 메이킷 로그인 안 되어있으면 홈/정보 외 전부 차단
    if (!LOGIN_FREE_PANELS.includes(target) && !state.loggedIn) {
      showModal(
        "로그인 필요",
        "메이킷 계정에 먼저 로그인해주세요.",
        "로그인하러 가기",
        () => goToPanel("home")
      );
      return;
    }

    // 2) 네이버 계정 미설정 시 블로그/카페 진입 차단
    if (ACCOUNT_REQUIRED_PANELS.includes(target) && !isNaverAccountReady()) {
      showModal(
        "계정 설정 필요",
        "네이버 계정을 먼저 등록해주세요.",
        "계정 설정으로 이동",
        () => goToPanel("naver-account")
      );
      return;
    }

    navItems.forEach((n) => n.classList.toggle("active", n === item));
    panels.forEach((p) => p.classList.toggle("hidden", p.dataset.panel !== target));

    // 패널별 진입 시 렌더링
    if (target === "home") renderHomeDashboard();
    if (target === "pricing") renderPricingPanel();
  });
});

function goToPanel(name) {
  const btn = document.querySelector(`.nav-item[data-panel="${name}"]`);
  if (btn) btn.click();
}

function renderPricingPanel() {
  const box = $("pricingCurrentPlan");
  if (!box) return;
  if (!state.user || !state.user.valid) {
    box.textContent = "로그인하면 현재 플랜과 이용 가능 범위가 표시됩니다.";
    return;
  }
  const planKey = normalizeExePlan(state.user);
  const rules = getExePlanRules(state.user);
  const planLabel = formatPlanName(planKey, state.user.plan);
  const expiresText = state.user.expires_at ? ` · 만료 ${new Date(state.user.expires_at).toLocaleDateString("ko-KR")}` : "";
  const postLimit = isExperienceLimitedUser() ? "즉시 발행 체험 5회" : (rules.maxPostsPerRun > 0 ? `1회 최대 ${rules.maxPostsPerRun}개` : "제한 없음");
  box.innerHTML = `
    <strong>${escapeHtml(planLabel)}</strong>${escapeHtml(expiresText)}<br>
    ${escapeHtml(rules.desc)}<br>
    발행 한도: ${escapeHtml(postLimit)} · 카페 발행: ${rules.canCafe ? "가능" : "Pro 이상"} · 예약 발행: ${rules.canSchedule ? "가능" : "제한"}
  `;
}

async function checkForAppUpdate() {
  if (!bridge.checkUpdate) return;
  try {
    const r = await bridge.checkUpdate();
    if (!r || !r.ok || !r.has_update) return;
    const cfg = (await bridge.loadConfig()) || {};
    const today = new Date().toISOString().slice(0, 10);
    const noticeKey = `${r.latest_version || ""}:${today}`;
    if (!r.required && cfg._last_update_notice === noticeKey) return;
    cfg._last_update_notice = noticeKey;
    await bridge.saveConfig(cfg);

    const current = r.current_version || "";
    const latest = r.latest_version || "";
    const notes = r.notes ? `\n\n${r.notes}` : "";
    showModal(
      "새 버전 업데이트",
      `현재 버전: ${current}\n최신 버전: ${latest}${notes}\n\n최신 설치 파일을 다운로드해 업데이트하세요.`,
      "다운로드",
      () => bridge.openExternal(r.download_url || "https://snsmakeit.com/pricing")
    );
  } catch (e) {
    console.warn("update check failed", e);
  }
}

// ── Chip 선택 ──
function initChips(id, key) {
  const wrap = document.getElementById(id);
  if (!wrap) return;
  wrap.addEventListener("click", (e) => {
    const btn = e.target.closest(".chip");
    if (!btn) return;
    wrap.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
    btn.classList.add("active");
    state[key] = btn.dataset.value;
  });
}
initChips("subtypeChips", "subtype");

// ── 아코디언 토글 ──
document.querySelectorAll(".acc-header").forEach(header => {
  header.addEventListener("click", () => {
    const target = header.dataset.accTarget;
    const body = document.querySelector(`[data-acc-body="${target}"]`);
    const arrow = header.querySelector(".acc-arrow");
    if (!body) return;
    const isOpen = body.style.display !== "none";
    body.style.display = isOpen ? "none" : "";
    if (arrow) arrow.style.transform = isOpen ? "rotate(-90deg)" : "rotate(0deg)";
  });
});
initChips("toneChips", "tone");
initChips("speechChips", "speech");
initChips("wordCountChips", "wordCount");

// ── 인용구 스타일 chip ──
if ($("quoteStyleChips")) {
  $("quoteStyleChips").addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    $("quoteStyleChips").querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
    chip.classList.add("active");
    state.quoteStyle = chip.dataset.value;
  });
}

// ── 스티커 토글 ──
if ($("stickerToggle")) {
  $("stickerToggle").addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    $("stickerToggle").querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
    chip.classList.add("active");
    state.useSticker = chip.dataset.value;
  });
}

// ── Q&A(AEO) 위치 선택 ──
if ($("apAeoPositionChips")) {
  $("apAeoPositionChips").addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    $("apAeoPositionChips").querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
    chip.classList.add("active");
    state.aeoPosition = chip.dataset.value;
  });
}

// ── 밑줄 옵션 ──
if ($("apUnderlineChips")) {
  $("apUnderlineChips").addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    $("apUnderlineChips").querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
    chip.classList.add("active");
    state.useUnderline = chip.dataset.value;
  });
}

// ── 글 구조 옵션 토글 (장단점) ──
if ($("apStructureChips")) {
  $("apStructureChips").addEventListener("click", (e) => {
    const chip = e.target.closest(".structure-toggle");
    if (!chip) return;
    const isActive = chip.classList.toggle("active");
    const key = chip.dataset.key;
    state[key] = isActive;
  });
}

// ── 콘텐츠 분야(브리프 카테고리) ──
if ($("apBriefCategoryChips")) {
  $("apBriefCategoryChips").addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    $("apBriefCategoryChips").querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
    chip.classList.add("active");
    state.briefCategory = chip.dataset.value || "";
  });
}

// ── 체험 차감 (%APPDATA%/NaverBotSaaS/trial_used.txt — 별도 파일) ──
let _trialUsedCache = 0;
async function _getTrialUsed() {
  _trialUsedCache = await bridge.getTrialUsed();
  return _trialUsedCache;
}
function _setTrialUsed(n) {
  _trialUsedCache = n;
  bridge.setTrialUsed(n);
}
function _deductTrial() {
  if (!state.user || !state.user.trial) return;
  if (state.user.admin) return; // 관리자 무제한
  const used = _trialUsedCache + 1;
  _setTrialUsed(used);
  state.user.trial_used = used;
  const rem = Math.max(0, state.user.trial_limit - used);
  setUserBadge(`체험 남은 ${rem}회`, rem > 0 ? "green" : "gray");
  clearExtraPlanCard();
  renderPlanCard(state.user);
  if (rem <= 0) {
    setTimeout(() => {
      showModal("체험 횟수 소진", "무료 체험 횟수가 모두 소진되었습니다.\n프로 등급으로 업그레이드하면 무제한 이용 가능합니다.", "프로 등급 구독", () => bridge.openExternal("https://snsmakeit.com/pricing"));
    }, 2000);
  }
}

async function getExperienceUsage() {
  const cfg = (await bridge.loadConfig()) || {};
  return {
    quick: Number(cfg._experience_quick_used || 0),
    autopilot: Number(cfg._experience_autopilot_used || 0),
  };
}

async function canUseExperience(kind) {
  if (!isExperienceLimitedUser()) return true;
  const usage = await getExperienceUsage();
  const limit = EXPERIENCE_LIMITS[kind] || 0;
  if (usage[kind] < limit) return true;

  const label = kind === "quick" ? "즉시 발행 5회" : "자동 운영 1회";
  showModal(
    "Pro 플랜 필요",
    `${label} 체험을 모두 사용했습니다.\n이후 자동 발행은 Pro 이상 플랜에서 이용할 수 있습니다.`,
    "Pro 구독하기",
    () => bridge.openExternal("https://snsmakeit.com/pricing")
  );
  return false;
}

async function markExperienceUsed(kind, count = 1) {
  if (!isExperienceLimitedUser() || count <= 0) return;
  const cfg = (await bridge.loadConfig()) || {};
  const key = kind === "quick" ? "_experience_quick_used" : "_experience_autopilot_used";
  const limit = EXPERIENCE_LIMITS[kind] || count;
  cfg[key] = Math.min(limit, Number(cfg[key] || 0) + count);
  await bridge.saveConfig(cfg);
  renderPlanCard(state.user);
}

// ── 커스텀 모달 ──
function showModal(title, message, btnText = "확인", onConfirm = null) {
  let overlay = document.getElementById("modalOverlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "modalOverlay";
    overlay.innerHTML = `
      <div class="modal-box">
        <div class="modal-title" id="modalTitle"></div>
        <div class="modal-message" id="modalMessage"></div>
        <div class="modal-actions">
          <button class="btn btn-outline" id="modalCancel">닫기</button>
          <button class="btn btn-primary" id="modalConfirm"></button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    document.getElementById("modalCancel").addEventListener("click", () => overlay.style.display = "none");
  }
  document.getElementById("modalTitle").textContent = title;
  document.getElementById("modalMessage").textContent = message;
  const confirmBtn = document.getElementById("modalConfirm");
  confirmBtn.textContent = btnText;
  confirmBtn.onclick = () => {
    overlay.style.display = "none";
    if (onConfirm) onConfirm();
  };
  overlay.style.display = "flex";
}

function showModalAsync(title, message, btnText = "확인") {
  return new Promise(resolve => showModal(title, message, btnText, resolve));
}

// ── 효과음 ──
function playSound(type) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.value = 0.3;

    if (type === "success") {
      // 성공: 밝은 2음 (도-미)
      osc.frequency.value = 523; // C5
      osc.type = "sine";
      osc.start();
      osc.frequency.setValueAtTime(659, ctx.currentTime + 0.15); // E5
      osc.stop(ctx.currentTime + 0.3);
    } else {
      // 실패: 낮은 1음
      osc.frequency.value = 220; // A3
      osc.type = "triangle";
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    }
  } catch (e) {}
}

// ── 데스크톱 알림 ──
function notify(title, body, onClick) {
  try {
    if (Notification.permission === "granted") {
      const n = new Notification(title, { body, icon: undefined });
      if (onClick) n.onclick = () => { onClick(); n.close(); };
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then(p => { if (p === "granted") notify(title, body, onClick); });
    }
  } catch(e) {}
}

// ── 유틸 ──
function $(id) { return document.getElementById(id); }

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function initialOf(text) {
  if (!text) return "?";
  return text.trim().charAt(0).toUpperCase();
}

// ── 진행 상황 프로그레스바 ──
const PROGRESS_STEPS = ["account", "generate", "editor", "write", "publish"];
const PROGRESS_PCT = { account: 10, generate: 35, editor: 50, write: 75, publish: 95 };
const PROGRESS_LABELS = { account: "계정 확인 중...", generate: "AI가 글을 작성하고 있습니다...", editor: "네이버 에디터를 여는 중...", write: "본문을 입력하고 있습니다...", publish: "발행 중..." };

function showProgress() {
  const el = $("publishProgress");
  if (el) { el.style.display = ""; _setProgress("account", "시작 준비 중..."); }
}
function hideProgress() {
  const el = $("publishProgress");
  if (el) el.style.display = "none";
}
function _setProgress(step, msg) {
  const fill = $("progressFill");
  const title = $("progressTitle");
  const stepsEl = $("progressSteps");
  if (!fill || !stepsEl) return;
  const pct = PROGRESS_PCT[step] || 0;
  fill.style.width = pct + "%";
  if (title) title.textContent = msg || PROGRESS_LABELS[step] || "";
  const idx = PROGRESS_STEPS.indexOf(step);
  stepsEl.querySelectorAll("span").forEach((span, i) => {
    span.className = i < idx ? "step-done" : i === idx ? "step-active" : "";
  });
}
function _updateProgress(logText) {
  if (!$("publishProgress") || $("publishProgress").style.display === "none") return;
  const t = logText.toLowerCase();
  if (t.includes("계정 확인") || t.includes("토큰 갱신")) _setProgress("account", logText.replace(/^\[.*?\]\s*/, ""));
  else if (t.includes("글 생성") || t.includes("뉴스 수집") || t.includes("키워드 분석")) _setProgress("generate", logText.replace(/^\[.*?\]\s*/, ""));
  else if (t.includes("에디터") || t.includes("로그인") || t.includes("글쓰기 페이지")) _setProgress("editor", logText.replace(/^\[.*?\]\s*/, ""));
  else if (t.includes("본문") || t.includes("소제목") || t.includes("이미지") || t.includes("인용구") || t.includes("색상")) _setProgress("write", logText.replace(/^\[.*?\]\s*/, ""));
  else if (t.includes("발행") && (t.includes("시작") || t.includes("클릭") || t.includes("성공"))) _setProgress("publish", logText.replace(/^\[.*?\]\s*/, ""));
  if (t.includes("발행 성공") || t.includes("완료")) {
    const fill = $("progressFill");
    if (fill) fill.style.width = "100%";
  }
}

// ── 에러 메시지 사용자 친화적 변환 ──
function _friendlyError(err) {
  if (!err) return "알 수 없는 오류가 발생했습니다.";
  const map = [
    [/사이드패널.*버튼/i, "발행 버튼을 찾지 못했습니다. 네이버 에디터 화면이 변경되었을 수 있습니다. 다시 시도해주세요."],
    [/1단계.*발행.*버튼/i, "발행 버튼을 찾지 못했습니다. 네이버 페이지 로딩이 느릴 수 있으니 다시 시도해주세요."],
    [/2단계.*발행.*버튼/i, "최종 발행 확인 버튼을 찾지 못했습니다. 네이버가 업데이트되었을 수 있습니다."],
    [/로그인 실패.*캡차/i, "네이버 로그인 중 보안 인증이 필요합니다. '네이버 계정 설정'에서 수동 로그인을 1회 진행해주세요."],
    [/로그인 실패/i, "네이버 로그인에 실패했습니다. 계정 설정에서 비밀번호를 확인하고, 수동 로그인을 시도해주세요."],
    [/제목 입력 실패/i, "글 제목을 입력하지 못했습니다. 네이버 에디터 로딩이 느릴 수 있으니 다시 시도해주세요."],
    [/본문 입력 실패/i, "글 본문을 입력하지 못했습니다. 에디터 로딩 지연이 원인일 수 있습니다."],
    [/네트워크 오류/i, "인터넷 연결을 확인해주세요. 서버와 통신할 수 없습니다."],
    [/일일 한도/i, "오늘의 발행 한도에 도달했습니다. 내일 다시 시도하거나 플랜을 업그레이드하세요."],
    [/라이선스/i, "구독이 만료되었거나 비활성 상태입니다. snsmakeit.com에서 구독을 확인해주세요."],
    [/글 생성 실패/i, "AI 글 생성에 실패했습니다. 잠시 후 다시 시도해주세요."],
    [/timeout|시간 초과|TIMEOUT/i, "작업 시간이 초과되었습니다. 인터넷 속도를 확인하고 다시 시도해주세요."],
    [/카테고리.*선택 실패/i, "블로그 메뉴를 선택하지 못했습니다. 메뉴명을 정확히 입력했는지 확인해주세요."],
  ];
  for (const [pattern, msg] of map) {
    if (pattern.test(err)) return msg;
  }
  return err;
}

// ── 로그 ──
const logEl = $("log");
function addLog(text) {
  const isFirst = logEl.textContent.startsWith("준비 완료") || logEl.innerHTML.includes("준비 완료");
  // URL을 클릭 가능한 링크로 변환
  const escaped = escapeHtml(text);
  const linked = escaped.replace(/(https?:\/\/[^\s<]+)/g, '<a class="log-link" data-url="$1">$1</a>');
  const line = `<div class="log-line">${linked}</div>`;
  if (isFirst) {
    logEl.innerHTML = line;
  } else {
    logEl.innerHTML += line;
  }
  logEl.scrollTop = logEl.scrollHeight;
}
function clearLog() { logEl.innerHTML = ""; }
// 로그 내 링크 클릭 처리
logEl.addEventListener("click", (e) => {
  const link = e.target.closest(".log-link");
  if (link && link.dataset.url) {
    bridge.openExternal(link.dataset.url);
  }
});
$("clearLogBtn").addEventListener("click", clearLog);

// ── 발행 중단 ──
if ($("stopBotBtn")) {
  $("stopBotBtn").addEventListener("click", async () => {
    if (!confirm("발행을 중단하시겠습니까?")) return;
    const r = await bridge.stopBot();
    addLog("[중단] 발행이 중단되었습니다.");
    $("stopBotBtn").style.display = "none";
    playSound("fail");
  });
}

function showStopBtn() { if ($("stopBotBtn")) $("stopBotBtn").style.display = "inline-block"; }
function hideStopBtn() { if ($("stopBotBtn")) $("stopBotBtn").style.display = "none"; }

// ── 발행 이력 관리 ──
async function getPublishHistory() {
  const cfg = (await bridge.loadConfig()) || {};
  return Array.isArray(cfg.publish_history) ? cfg.publish_history : [];
}

async function addPublishHistory(entry) {
  const cfg = (await bridge.loadConfig()) || {};
  if (!Array.isArray(cfg.publish_history)) cfg.publish_history = [];
  const now = new Date();
  const dateKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  cfg.publish_history.unshift({ ...entry, dateKey, time: now.toLocaleString("ko-KR") });
  // 최근 500개 유지
  cfg.publish_history = cfg.publish_history.slice(0, 500);
  await bridge.saveConfig(cfg);
  renderPublishHistory();
}

async function renderPublishHistory() {
  // 달력 기반으로 전환됨 — 달력 재렌더링
  const cfg = (await bridge.loadConfig()) || {};
  window._cachedConfig = cfg;
  renderCalendar();
  renderHomeDashboard();
}

$("clearHistoryBtn").addEventListener("click", async () => {
  if (!confirm("발행 이력을 모두 삭제하시겠습니까?")) return;
  const cfg = (await bridge.loadConfig()) || {};
  cfg.publish_history = [];
  await bridge.saveConfig(cfg);
  renderPublishHistory();
});

// ── 홈 대시보드 ──
async function renderHomeDashboard() {
  const cfg = (await bridge.loadConfig()) || {};
  const history = Array.isArray(cfg.publish_history) ? cfg.publish_history : [];
  const dash = $("homeDashboard");
  if (!dash) return;

  // 로그인 안 된 상태면 대시보드 숨김
  if (!cfg.naver_id && !cfg.makeit_email) { dash.style.display = "none"; return; }
  dash.style.display = "";

  // 이번 주 계산 (월~일)
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
  weekStart.setHours(0, 0, 0, 0);
  const weekKey = weekStart.toISOString().slice(0, 10);

  const weekItems = history.filter(h => h.dateKey && h.dateKey >= weekKey);
  const weekOk = weekItems.filter(h => !h.error).length;
  const weekFail = weekItems.filter(h => h.error).length;
  const totalOk = history.filter(h => !h.error).length;

  if ($("dashWeekCount")) $("dashWeekCount").textContent = weekOk;
  if ($("dashSuccessRate")) $("dashSuccessRate").textContent = history.length > 0 ? Math.round(totalOk / history.length * 100) + "%" : "-";
  if ($("dashTotalCount")) $("dashTotalCount").textContent = totalOk;

  // 자동 운영 상태
  const ap = cfg.autopilot;
  const apCard = $("dashAutopilotStatus");
  if (apCard) {
    if (ap && ap.active) {
      apCard.style.display = "";
      const apInfo = $("dashApInfo");
      if (apInfo) apInfo.innerHTML = `키워드: <strong>${escapeHtml(ap.theme || "")}</strong> · ${ap.posts_per_day || 3}개/일 · 메뉴: ${escapeHtml(ap.category || "없음")}`;
    } else {
      apCard.style.display = "none";
    }
  }

  // 최근 발행 글 (최대 5개, 성공만)
  const box = $("dashRecentPosts");
  if (!box) return;
  const recent = history.filter(h => !h.error).slice(0, 5);
  if (recent.length === 0) {
    box.innerHTML = '<div style="color:var(--text-dim);padding:8px 0;">아직 발행된 글이 없습니다.</div>';
    return;
  }
  box.innerHTML = recent.map(h => `
    <div style="display:flex;align-items:center;padding:8px 0;border-bottom:1px solid var(--border-soft);gap:10px;">
      <div style="width:6px;height:6px;border-radius:50%;background:var(--success);flex-shrink:0;"></div>
      <div style="flex:1;min-width:0;">
        <div style="font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(h.title || "")}</div>
        <div style="font-size:11px;color:var(--text-dim);">${escapeHtml(h.time || "")} · ${escapeHtml(h.naver_id || "")}</div>
      </div>
      ${h.url ? `<a class="btn btn-outline btn-sm" style="flex-shrink:0;font-size:11px;padding:4px 10px;" data-url="${escapeHtml(h.url)}">보기</a>` : ""}
    </div>
  `).join("");
  box.querySelectorAll("a[data-url]").forEach(a => a.addEventListener("click", () => bridge.openExternal(a.dataset.url)));
}

// ── 대시보드 자동 운영 상태 ──
async function renderDashboardAutopilot() {
  const cfg = (await bridge.loadConfig()) || {};
  const ap = cfg.autopilot;
  const card = $("dashboardAutopilotCard");
  if (!card) return;
  if (!ap || !ap.active) {
    card.style.display = "none";
    return;
  }
  card.style.display = "";
  const badge = $("dashboardAutopilotBadge");
  badge.textContent = "운영 중";
  badge.style.background = "var(--success-soft)";
  badge.style.color = "#065f46";

  const startDate = ap.started_at ? new Date(ap.started_at).toLocaleDateString("ko-KR") : "-";
  let endText = "무기한";
  if (ap.duration_days > 0 && ap.started_at) {
    const end = new Date(new Date(ap.started_at).getTime() + ap.duration_days * 86400000);
    endText = end.toLocaleDateString("ko-KR") + "까지";
  }

  $("dashboardAutopilotInfo").innerHTML = `
    <strong>키워드:</strong> ${escapeHtml(ap.theme || "")}<br>
    <strong>발행:</strong> 하루 ${ap.posts_per_day || 3}개<br>
    <strong>시작:</strong> ${startDate}<br>
    <strong>기간:</strong> ${endText}<br>
    <strong>실행 시간:</strong> 매일 ${ap.start_time || "09:00"}
  `;
}

$("dashboardStopBtn").addEventListener("click", async () => {
  if (!confirm("자동 운영을 중지하시겠습니까?")) return;
  // 실행 중인 봇 프로세스 즉시 종료
  await bridge.stopBot();
  await bridge.clearSchedule();
  const cfg = (await bridge.loadConfig()) || {};
  if (cfg.autopilot) cfg.autopilot.active = false;
  await bridge.saveConfig(cfg);
  renderDashboardAutopilot();
  if ($("startAutopilotBtn")) $("startAutopilotBtn").style.display = "";
  if ($("stopAutopilotBtn")) $("stopAutopilotBtn").style.display = "none";
  if ($("autopilotStatus")) $("autopilotStatus").style.display = "none";
  hideStopBtn();
  addLog("[자동 운영] 즉시 중지됨");
  playSound("fail");
});

bridge.onLog((text) => {
  addLog(text.trim());
  _updateProgress(text.trim());
});

// ── 사이드바 유저 배지 ──
function setUserBadge(text, state = "gray") {
  const badge = $("userBadge");
  badge.querySelector(".user-dot").className = "user-dot dot-" + state;
  badge.querySelector(".user-text").textContent = text;
}

// ── 플랜 카드 ──
function renderPlanCard(data) {
  const card = $("planCard");
  if (!card) return;
  card.innerHTML = "";

  if (!data || !data.valid) {
    card.innerHTML = `
      <div class="plan-summary-head">
        <div>
          <div class="plan-badge">로그인 필요</div>
          <div class="plan-title">구독 정보 없음</div>
          <div class="plan-desc">로그인 후 이용 가능한 플랜과 발행 한도가 표시됩니다.</div>
        </div>
      </div>
      <div class="plan-actions">
        <button class="btn btn-primary btn-sm" id="planLoginBtn">로그인</button>
        <button class="btn btn-outline btn-sm" id="subscribeBtn">구독 보기</button>
      </div>
    `;
    const loginBtn = card.querySelector("#planLoginBtn");
    if (loginBtn) loginBtn.addEventListener("click", handleBrowserLogin);
    const subBtn = card.querySelector("#subscribeBtn");
    if (subBtn) subBtn.addEventListener("click", () => bridge.openExternal("https://snsmakeit.com/pricing"));
    renderPricingPanel();
    return;
  }

  const planKey = normalizeExePlan(data);
  const planLabel = formatPlanName(planKey, data.plan);
  const nick = data.nick || (data.email || "").split("@")[0];
  const email = data.email || "";
  const avatar = initialOf(nick);
  const rules = getExePlanRules(data);
  const expiresText = data.expires_at ? `만료 ${new Date(data.expires_at).toLocaleDateString("ko-KR")}` : "";
  const experienceText = isExperienceLimitedUser(data)
    ? `<div class="plan-desc">체험 범위: 즉시 발행 ${EXPERIENCE_LIMITS.quick}회 · 자동 운영 ${EXPERIENCE_LIMITS.autopilot}회 · 이후 Pro 필요</div>`
    : "";
  if (data.trial) {
    const remaining = Math.max(0, data.trial_limit - data.trial_used);
    card.innerHTML = `
      <div class="plan-summary-head">
        <div class="user-card compact">
          <div class="avatar">${escapeHtml(avatar)}</div>
          <div class="user-info">
            <div class="user-name">${escapeHtml(nick)}</div>
            <div class="user-email">${escapeHtml(email)}</div>
          </div>
        </div>
        <div class="plan-badge trial">무료 체험</div>
      </div>
      <div class="plan-title">무료 체험 중</div>
      <div class="plan-desc">남은 횟수 <strong style="color:#3b82f6;">${remaining}회</strong> / ${data.trial_limit}회 · ${escapeHtml(rules.desc)}</div>
      ${experienceText}
      ${renderPlanFeatures(rules, data)}
      <div class="plan-actions">
        <button class="btn btn-primary btn-sm" id="subscribeBtn">구독하기</button>
        <button class="btn btn-outline btn-sm" id="refreshBtn">새로고침</button>
        <button class="btn btn-outline btn-sm" id="logoutBtn">로그아웃</button>
      </div>
    `;
  } else {
    card.innerHTML = `
      <div class="plan-summary-head">
        <div class="user-card compact">
          <div class="avatar">${escapeHtml(avatar)}</div>
          <div class="user-info">
            <div class="user-name">${escapeHtml(nick)}</div>
            <div class="user-email">${escapeHtml(email)}</div>
          </div>
        </div>
        <div class="plan-badge active">${escapeHtml(planLabel)}</div>
      </div>
      <div class="plan-title">${escapeHtml(planLabel)} 플랜 활성</div>
      <div class="plan-desc">${escapeHtml(rules.desc)}${expiresText ? " · " + escapeHtml(expiresText) : ""}</div>
      ${experienceText}
      ${renderPlanFeatures(rules, data)}
      <div class="plan-actions">
        <button class="btn btn-outline btn-sm" id="refreshBtn">새로고침</button>
        <button class="btn btn-outline btn-sm" id="managePricingBtn">구독 관리</button>
        <button class="btn btn-outline btn-sm" id="logoutBtn">로그아웃</button>
      </div>
    `;
  }

  const logoutBtn = card.querySelector("#logoutBtn");
  if (logoutBtn) logoutBtn.addEventListener("click", handleLogout);
  const refreshBtn = card.querySelector("#refreshBtn");
  if (refreshBtn) refreshBtn.addEventListener("click", () =>
    bridge.verifyAccount().then((r) => handleVerifyResult(r, data.email))
  );
  const subBtn = card.querySelector("#subscribeBtn");
  if (subBtn) subBtn.addEventListener("click", () => bridge.openExternal("https://snsmakeit.com/pricing"));
  const mgrBtn = card.querySelector("#managePricingBtn");
  if (mgrBtn) mgrBtn.addEventListener("click", () => bridge.openExternal("https://snsmakeit.com/mypage"));
  renderPricingPanel();
}

// 기존 plan 카드 제거 (중복 방지)
function clearExtraPlanCard() {
  // 플랜 카드는 이제 고정 영역(planCard) 안에서만 다시 그린다.
}

// ── 설정 로드 ──
async function loadSavedConfig() {
  const cfg = await bridge.loadConfig();
  if (!cfg) return;

  if (cfg.makeit_email && $("makeitEmail")) $("makeitEmail").value = cfg.makeit_email;
  if ($("showBrowser")) {
    // showBrowser 제거됨 — 항상 헤드리스
  }
  if ($("useGif")) {
    $("useGif").checked = !!cfg.use_gif; // 기본값 false
  }
  if (cfg.naver_id) {
    $("naverId").value = cfg.naver_id;
    // 기존 계정을 리스트에 자동 추가
    if (!Array.isArray(cfg.naver_accounts)) cfg.naver_accounts = [];
    if (!cfg.naver_accounts.includes(cfg.naver_id)) {
      cfg.naver_accounts.push(cfg.naver_id);
      await bridge.saveConfig(cfg);
    }
  }

  if (cfg.write) {
    ["subtype", "tone", "speech", "wordCount"].forEach((k) => {
      if (cfg.write[k]) {
        state[k] = cfg.write[k];
        const map = { subtype: "subtypeChips", tone: "toneChips", speech: "speechChips", wordCount: "wordCountChips" };
        const wrap = $(map[k]);
        wrap.querySelectorAll(".chip").forEach((c) => {
          c.classList.toggle("active", c.dataset.value === cfg.write[k]);
        });
      }
    });
    if (cfg.write.category && $("blogCategory")) {
      $("blogCategory").value = cfg.write.category;
    }
  }

}

// ── 현재 UI 상태 → config ──
function collectConfig() {
  return {
    naver_id: ($("naverId") && $("naverId").value.trim()) || "",
    show_browser: false,
    font_size: "15",
    quote_style: "postit",
    use_sticker: "off",
    use_gif: false,
    write: {
      subtype: state.subtype,
      tone: state.tone,
      speech: state.speech,
      wordCount: state.wordCount,
      image_count: ($("blogImageCount") && parseInt($("blogImageCount").value)) || 5,
      font_size: ($("fontSize") && $("fontSize").value) || "15",
      quote_style: state.quoteStyle || "postit",
      use_sticker: state.useSticker || "off",
      aeoPosition: state.aeoPosition || "top",
      includeProsCons: state.includeProsCons !== false,
      briefCategory: state.briefCategory || "",
      category: ($("blogCategory") && $("blogCategory").value.trim()) || "",
    },
  };
}

// ── 메이킷 브라우저 로그인 ──
// 버튼 클릭 시 브라우저 열림 → 로그인 완료 후 makeit-sns:// protocol로 복귀
let _loginInProgress = false;

function setLoginBtnState(loading) {
  const btn = $("browserLoginBtn");
  if (!btn) return;
  _loginInProgress = loading;
  if (loading) {
    btn.disabled = true;
    btn.dataset.origText = btn.textContent.trim();
    btn.innerHTML = '<span class="login-spinner"></span> 로그인 중...';
    btn.classList.add("btn-loading");
  } else {
    btn.disabled = false;
    btn.innerHTML = btn.dataset.origText || "로그인";
    btn.classList.remove("btn-loading");
  }
}

async function handleBrowserLogin() {
  if (_loginInProgress) return;
  setLoginBtnState(true);
  addLog("[계정] 로그인 창 여는 중...");
  setUserBadge("대기 중...", "gray");
  await bridge.openLoginWindow();
}

// Custom protocol 콜백 수신 (main.js가 전달)
bridge.onAuthCallback(async (params) => {
  setLoginBtnState(false);
  if (!params || !params.access_token) {
    addLog("[계정] 잘못된 콜백");
    setUserBadge("로그인 실패", "red");
    return;
  }

  addLog("[계정] 토큰 수신 완료, 구독 상태 확인 중...");
  setUserBadge("확인 중...", "gray");

  // config에 토큰 + 이메일 저장
  const cfg = (await bridge.loadConfig()) || {};
  cfg.makeit_access_token = params.access_token;
  cfg.makeit_refresh_token = params.refresh_token || "";
  cfg.makeit_email = params.email || "";
  cfg.makeit_uid = params.uid || "";
  cfg.makeit_token_expires = params.expires_at || "";
  await bridge.saveConfig(cfg);

  // 구독 상태 확인 (verify)
  const r = await bridge.verifyAccount();
  handleVerifyResult(r, params.email);

  // 계정 패널로 이동
  goToPanel("home");
});

function handleVerifyResult(r, email) {
  clearExtraPlanCard();
  // 로그인 카드 표시/숨김
  const loginCard = document.getElementById("loginCard");
  if (r.ok && r.result && r.result.status === "ok") {
    if (loginCard) loginCard.style.display = "none";
  } else {
    if (loginCard) loginCard.style.display = "";
  }
  if (r.ok && r.result && r.result.status === "ok") {
    // 관리자 이메일 체크
    const isAdmin = isAdminAccount(email, r.result);
    const data = {
      valid: true,
      email,
      nick: r.result.nick || "",
      plan: isAdmin ? "admin" : (r.result.plan || "member"),
      role: isAdmin ? "admin" : (r.result.role || ""),
      expires_at: r.result.expires_at || "",
      trial: isAdmin ? false : !!r.result.trial,
      trial_used: isAdmin ? 0 : Math.max(r.result.trial_used || 0, _trialUsedCache),
      trial_limit: isAdmin ? 999999 : (r.result.trial_limit || 5),
      admin: isAdmin,
    };
    state.loggedIn = true;
    state.user = data;
    const remaining = data.trial ? Math.max(0, data.trial_limit - data.trial_used) : 0;
    const badgeText = isAdmin
      ? `관리자 · ${data.nick || email}`
      : data.trial
        ? `체험 남은 ${remaining}회`
        : `${data.plan} · ${data.nick || email}`;
    setUserBadge(badgeText, "green");
    renderPlanCard(data);
    addLog(isAdmin
      ? `[계정] 관리자 로그인 — 무제한`
      : data.trial
        ? `[계정] 체험 모드 — ${data.trial_used}/${data.trial_limit} 사용`
        : `[계정] 로그인 성공 — ${data.plan} 플랜`);
  } else {
    // 관리자면 verify 실패해도 로그인 유지
    if (state.user && state.user.admin) {
      console.log("[관리자] verify 실패 무시, 로그인 유지");
      return;
    }
    const err = (r.result && r.result.error) || r.error || "로그인 실패";
    state.loggedIn = false;
    state.user = null;
    setUserBadge("로그인 실패", "red");
    renderPlanCard(null);
    addLog(`[계정] 실패: ${err}`);
  }
}

async function handleLogout() {
  state.loggedIn = false;
  state.user = null;
  const cfg = (await bridge.loadConfig()) || {};
  delete cfg.makeit_access_token;
  delete cfg.makeit_refresh_token;
  delete cfg.makeit_uid;
  delete cfg.makeit_email;
  await bridge.saveConfig(cfg);
  clearExtraPlanCard();
  renderPlanCard(null);
  // 로그인 카드 다시 표시
  const loginCard = document.getElementById("loginCard");
  if (loginCard) loginCard.style.display = "";
  setUserBadge("로그인 필요", "gray");
  addLog("[계정] 로그아웃됨");
}

$("browserLoginBtn").addEventListener("click", handleBrowserLogin);

// 로그인 창이 닫히면 버튼 상태 복원 (콜백 없이 닫은 경우)
if (bridge.onAuthWindowClosed) {
  bridge.onAuthWindowClosed(() => {
    if (_loginInProgress) setLoginBtnState(false);
  });
}

// 외부 링크
$("brandLink").addEventListener("click", (e) => {
  e.preventDefault();
  bridge.openExternal("https://snsmakeit.com/");
});
$("pricingLink").addEventListener("click", (e) => {
  e.preventDefault();
  bridge.openExternal("https://snsmakeit.com/pricing");
});
document.querySelectorAll(".pricingOpenBtn").forEach((btn) => {
  btn.addEventListener("click", () => bridge.openExternal("https://snsmakeit.com/pricing"));
});
if ($("homeStartBlogBtn")) {
  $("homeStartBlogBtn").addEventListener("click", () => goToPanel("naver-blog"));
}
$("aboutWeb").addEventListener("click", (e) => {
  e.preventDefault();
  bridge.openExternal("https://snsmakeit.com/");
});

// ── 잡담방 ──
async function loadChat() {
  const el = document.getElementById("chatMessages");
  if (!el) return;
  try {
    const res = await fetch(`${SB_URL}/rest/v1/app_chat?order=created_at.desc&limit=50`, { headers: { apikey: SB_ANON } });
    const data = await res.json();
    if (!data.length) {
      el.innerHTML = '<div style="color:#999;font-size:13px;text-align:center;padding:40px 0;">아직 메시지가 없습니다. 첫 메시지를 남겨보세요!</div>';
      return;
    }
    // 오래된 순으로 표시
    const sorted = data.reverse();
    const isAdmin = state.user?.role === "admin";
    el.innerHTML = sorted.map((m) => {
      const isMe = state.user && m.email === state.user.email;
      const isNotice = m.nick === "[공지]" || m.message.startsWith("[공지]");
      const time = new Date(m.created_at).toLocaleString("ko-KR", { month:"short", day:"numeric", hour:"2-digit", minute:"2-digit" });
      const canDelete = isAdmin || isMe;

      if (isNotice) {
        return `<div style="margin-bottom:12px;padding:12px 16px;border-radius:10px;background:#fffbeb;border:1px solid #fde68a;">
          <div style="font-size:12px;font-weight:800;color:#d97706;margin-bottom:4px;">공지사항</div>
          <div style="font-size:13px;color:#92400e;line-height:1.6;">${m.message.replace("[공지]","").trim().replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\n/g,"<br>")}</div>
          <div style="display:flex;align-items:center;gap:8px;margin-top:6px;">
            <span style="font-size:10px;color:#bbb;">${time}</span>
            ${canDelete ? `<button onclick="deleteChat('${m.id}')" style="font-size:10px;color:#ef4444;background:none;border:none;cursor:pointer;">삭제</button>` : ""}
          </div>
        </div>`;
      }

      return `<div style="margin-bottom:12px;display:flex;flex-direction:column;align-items:${isMe ? "flex-end" : "flex-start"};">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;">
          <span style="font-size:12px;font-weight:700;color:${isMe ? "#3b82f6" : "#333"};">${m.nick || m.email?.split("@")[0] || "익명"}</span>
          <span style="font-size:10px;color:#bbb;">${time}</span>
          ${canDelete ? `<button onclick="deleteChat('${m.id}')" style="font-size:10px;color:#ef4444;background:none;border:none;cursor:pointer;">삭제</button>` : ""}
        </div>
        <div style="max-width:80%;padding:10px 14px;border-radius:${isMe ? "14px 14px 4px 14px" : "14px 14px 14px 4px"};background:${isMe ? "#3b82f6" : "#f3f4f6"};color:${isMe ? "#fff" : "#333"};font-size:13px;line-height:1.6;word-break:break-word;">
          ${m.message.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>")}
        </div>
      </div>`;
    }).join("");
    el.scrollTop = el.scrollHeight;
  } catch {
    el.innerHTML = '<div style="color:#999;font-size:13px;text-align:center;padding:40px 0;">메시지를 불러올 수 없습니다.</div>';
  }
}

const chatSendBtn = document.getElementById("chatSendBtn");
const chatInput = document.getElementById("chatInput");
if (chatSendBtn && chatInput) {
  const sendChat = async () => {
    const msg = chatInput.value.trim();
    if (!msg) return;
    chatSendBtn.textContent = "...";
    chatSendBtn.disabled = true;
    try {
      await fetch(`${SB_URL}/rest/v1/app_chat`, {
        method: "POST",
        headers: { apikey: SB_ANON, Authorization: `Bearer ${SB_ANON}`, "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify({
          email: state.user?.email || "",
          nick: state.user?.nick || state.user?.email?.split("@")[0] || "익명",
          message: msg,
        }),
      });
      chatInput.value = "";
      await loadChat();
    } catch (e) {
      alert("전송 실패: " + e.message);
    }
    chatSendBtn.textContent = "전송";
    chatSendBtn.disabled = false;
    chatInput.focus();
  };
  chatSendBtn.addEventListener("click", sendChat);
  chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat(); }
  });
}

// 메시지 삭제 (전역)
window.deleteChat = async function(id) {
  if (!confirm("삭제하시겠습니까?")) return;
  try {
    await fetch(`${SB_URL}/rest/v1/app_chat?id=eq.${id}`, {
      method: "DELETE",
      headers: { apikey: SB_ANON, Authorization: `Bearer ${SB_ANON}` },
    });
    loadChat();
  } catch {}
};

document.querySelector('.nav-item[data-panel="chat"]')?.addEventListener("click", loadChat);

// ── 요청합니다 (피드백) ──
const SB_URL = "https://ckzjnpzadeovrasucjmu.supabase.co";
const SB_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrempucHphZGVvdnJhc3Vjam11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MTA4NTcsImV4cCI6MjA4OTQ4Njg1N30.qgRa-YIm_ttKYTAcFI3xxXAADGPNGU1bb7EVz_-Ljs";

let feedbackCat = "feature";
const feedbackCatChips = document.getElementById("feedbackCatChips");
if (feedbackCatChips) {
  feedbackCatChips.addEventListener("click", (e) => {
    const btn = e.target.closest(".chip") || e.target.closest("button");
    if (!btn || !btn.dataset.value) return;
    feedbackCat = btn.dataset.value;
    feedbackCatChips.querySelectorAll("button").forEach((b) => {
      const active = b.dataset.value === feedbackCat;
      b.style.border = active ? "1.5px solid #3b82f6" : "1px solid #e5e7eb";
      b.style.background = active ? "#3b82f615" : "transparent";
      b.style.color = active ? "#3b82f6" : "#888";
      b.style.fontWeight = active ? "700" : "500";
      b.className = active ? "chip active" : "chip";
    });
  });
}

const feedbackSubmitBtn = document.getElementById("feedbackSubmitBtn");
if (feedbackSubmitBtn) {
  feedbackSubmitBtn.addEventListener("click", async () => {
    const title = document.getElementById("feedbackTitle").value.trim();
    const body = document.getElementById("feedbackBody").value.trim();
    if (!title) return alert("제목을 입력해주세요.");
    if (!body) return alert("내용을 입력해주세요.");

    const email = state.user?.email || "비로그인";
    feedbackSubmitBtn.textContent = "제출 중...";
    feedbackSubmitBtn.disabled = true;

    try {
      const res = await fetch(`${SB_URL}/rest/v1/app_feedback`, {
        method: "POST",
        headers: { apikey: SB_ANON, Authorization: `Bearer ${SB_ANON}`, "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify({
          category: feedbackCat,
          title,
          body,
          email,
          app_version: "0.1.2",
          status: "pending",
        }),
      });
      if (res.ok) {
        alert("요청이 제출되었습니다. 감사합니다!");
        document.getElementById("feedbackTitle").value = "";
        document.getElementById("feedbackBody").value = "";
        loadFeedbackList();
      } else {
        alert("제출 실패: " + res.status);
      }
    } catch (e) {
      alert("제출 실패: " + e.message);
    }
    feedbackSubmitBtn.textContent = "요청 제출하기";
    feedbackSubmitBtn.disabled = false;
  });
}

async function loadFeedbackList() {
  const listEl = document.getElementById("feedbackList");
  if (!listEl) return;
  try {
    const res = await fetch(`${SB_URL}/rest/v1/app_feedback?order=created_at.desc&limit=20`, {
      headers: { apikey: SB_ANON },
    });
    const data = await res.json();
    if (!data.length) {
      listEl.innerHTML = '<div style="color:#999;font-size:13px;padding:16px 0;text-align:center;">아직 요청이 없습니다.</div>';
      return;
    }
    const catLabels = { feature: "기능 요청", bug: "버그 신고", improve: "개선 제안", other: "기타" };
    const catColors = { feature: "#3b82f6", bug: "#ef4444", improve: "#f59e0b", other: "#888" };
    const statusLabels = { pending: "검토 대기", reviewed: "검토 중", done: "반영 완료", rejected: "보류" };
    const statusColors = { pending: "#888", reviewed: "#3b82f6", done: "#10b981", rejected: "#ef4444" };

    listEl.innerHTML = data.map((f) => `
      <div style="padding:12px 0;border-bottom:1px solid #f0f0f0;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
          <span style="font-size:11px;padding:2px 8px;border-radius:4px;background:${catColors[f.category] || "#888"}15;color:${catColors[f.category] || "#888"};font-weight:700;">${catLabels[f.category] || f.category}</span>
          <span style="font-size:14px;font-weight:700;color:#1a1a2e;">${f.title}</span>
          <span style="margin-left:auto;font-size:10px;padding:2px 8px;border-radius:4px;background:${statusColors[f.status] || "#888"}15;color:${statusColors[f.status] || "#888"};font-weight:600;">${statusLabels[f.status] || f.status}</span>
        </div>
        <div style="font-size:12px;color:#666;line-height:1.6;">${f.body.slice(0, 100)}${f.body.length > 100 ? "..." : ""}</div>
        <div style="font-size:10px;color:#aaa;margin-top:4px;">${f.email || ""} · ${new Date(f.created_at).toLocaleDateString("ko-KR")}</div>
      </div>
    `).join("");
  } catch {
    listEl.innerHTML = '<div style="color:#999;font-size:13px;padding:16px 0;text-align:center;">목록을 불러올 수 없습니다.</div>';
  }
}

// 피드백 패널 진입 시 목록 로드
document.querySelector('.nav-item[data-panel="feedback"]')?.addEventListener("click", loadFeedbackList);

// ── 네이버 계정 리스트 관리 ──
async function getNaverAccounts() {
  const cfg = (await bridge.loadConfig()) || {};
  return Array.isArray(cfg.naver_accounts) ? cfg.naver_accounts : [];
}

async function addNaverAccount(id) {
  const cfg = (await bridge.loadConfig()) || {};
  if (!Array.isArray(cfg.naver_accounts)) cfg.naver_accounts = [];
  if (!cfg.naver_accounts.includes(id)) {
    cfg.naver_accounts.push(id);
    await bridge.saveConfig(cfg);
  }
}

async function removeNaverAccount(id) {
  const cfg = (await bridge.loadConfig()) || {};
  if (!Array.isArray(cfg.naver_accounts)) return;
  cfg.naver_accounts = cfg.naver_accounts.filter(a => a !== id);
  if (cfg.naver_id === id) cfg.naver_id = cfg.naver_accounts[0] || "";
  await bridge.saveConfig(cfg);
}

async function resetNaverLogin(id) {
  const naverId = String(id || "").trim();
  if (!naverId) return showModal("알림", "네이버 ID를 입력하세요.", "확인");

  const ok = confirm(`"${naverId}" 계정의 저장된 네이버 로그인 세션과 비밀번호를 초기화할까요?\n초기화 후 새 비밀번호로 다시 로그인해야 합니다.`);
  if (!ok) return;

  addLog(`[네이버] 저장된 로그인 초기화 시작: ${naverId}`);
  try {
    const r = await bridge.resetNaverLogin(naverId);
    if (r && r.ok) {
      if ($("naverId")) $("naverId").value = naverId;
      if ($("naverPw")) $("naverPw").value = "";
      addLog(`[네이버] 저장된 로그인 초기화 완료: ${naverId}`);
      showModal("초기화 완료", "저장된 세션과 비밀번호를 초기화했습니다.\n새 비밀번호를 입력한 뒤 네이버 로그인을 다시 진행해주세요.", "확인");
      renderNaverAccountList();
    } else {
      const err = (r && r.error) || "초기화 실패";
      addLog(`[네이버] 저장된 로그인 초기화 실패: ${err}`);
      showModal("초기화 실패", err, "확인");
    }
  } catch (e) {
    const err = e.message || String(e);
    addLog(`[네이버] 저장된 로그인 초기화 오류: ${err}`);
    showModal("초기화 실패", err, "확인");
  }
}

async function renderNaverAccountList() {
  const accounts = await getNaverAccounts();
  const box = $("naverAccountList");
  const currentId = ($("naverId") && $("naverId").value.trim()) || "";

  if (accounts.length === 0) {
    box.innerHTML = '<div style="font-size:12px;color:var(--text-dim);">저장된 계정이 없습니다. 아래에서 계정을 추가하세요.</div>';
    return;
  }

  box.innerHTML = "";
  accounts.forEach(id => {
    const item = document.createElement("div");
    item.style.cssText = "display:flex;align-items:center;gap:8px;padding:8px 12px;margin:4px 0;border-radius:8px;background:var(--bg-elev);border:2px solid " + (id === currentId ? "var(--accent)" : "transparent") + ";cursor:pointer;transition:all 0.15s;";
    item.innerHTML = `
      <div style="flex:1;font-size:13px;font-weight:${id === currentId ? '600' : '400'};color:var(--text);">${escapeHtml(id)}</div>
      ${id === currentId ? '<span style="font-size:11px;color:var(--accent);font-weight:600;">사용 중</span>' : ''}
      <button class="btn btn-outline btn-sm" style="padding:2px 8px;font-size:11px;" data-reset="${escapeHtml(id)}">초기화</button>
      <button class="btn btn-outline btn-sm" style="padding:2px 8px;font-size:11px;" data-remove="${escapeHtml(id)}">삭제</button>
    `;
    // 계정 선택
    item.addEventListener("click", (e) => {
      if (e.target.dataset.reset) return;
      if (e.target.dataset.remove) return;
      $("naverId").value = id;
      bridge.loadConfig().then(cfg => {
        cfg = cfg || {};
        cfg.naver_id = id;
        bridge.saveConfig(cfg);
      });
      renderNaverAccountList();
      addLog(`[네이버] 계정 전환: ${id}`);
    });
    // 삭제 버튼
    const rmBtn = item.querySelector("[data-remove]");
    if (rmBtn) {
      rmBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        if (confirm(`"${id}" 계정을 목록에서 삭제하시겠습니까?`)) {
          await removeNaverAccount(id);
          if ($("naverId").value === id) $("naverId").value = "";
          renderNaverAccountList();
          addLog(`[네이버] 계정 삭제: ${id}`);
        }
      });
    }
    // 초기화 버튼
    const resetBtn = item.querySelector("[data-reset]");
    if (resetBtn) {
      resetBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        await resetNaverLogin(id);
      });
    }
    box.appendChild(item);
  });
}

// ── 네이버 계정 저장 ──
// savePwBtn 제거됨 — 네이버 로그인 버튼에 통합
if ($("savePwBtn")) $("savePwBtn").style.display = "none";

// ── 이미지 갯수 슬라이더 ──
if ($("blogImageCount")) {
  $("blogImageCount").addEventListener("input", () => {
    if ($("blogImageCountBadge")) $("blogImageCountBadge").textContent = $("blogImageCount").value;
  });
}
if ($("cafeImageCount")) {
  $("cafeImageCount").addEventListener("input", () => {
    if ($("cafeImageCountBadge")) $("cafeImageCountBadge").textContent = $("cafeImageCount").value;
  });
}

// ── 블로그 모드 선택 ──
let blogAutopilotSourceMode = "normal";

function showBlogMode(mode) {
  $("blogModeSelect").style.display = mode ? "none" : "";
  $("blogAutopilotView").style.display = (mode === "autopilot" || mode === "drive-autopilot") ? "" : "none";
  blogAutopilotSourceMode = mode === "drive-autopilot" ? "drive" : "normal";
  if ($("driveSourceSection")) {
    $("driveSourceSection").style.display = blogAutopilotSourceMode === "drive" ? "" : "none";
  }
}

if ($("modeAutopilot")) $("modeAutopilot").addEventListener("click", async () => {
  if (state.loggedIn && !(await canUseExperience("autopilot"))) {
    return;
  }
  showBlogMode("autopilot");
  renderAutopilotAccountList();
});
if ($("modeDriveAutopilot")) $("modeDriveAutopilot").addEventListener("click", () => {
  if (isExperienceLimitedUser()) {
    return showModal("Pro 플랜 필요", "구글 드라이브 자료 기반 자동 운영은 Pro 이상 플랜에서 이용할 수 있습니다.", "Pro 구독하기", () => bridge.openExternal("https://snsmakeit.com/pricing"));
  }
  showBlogMode("drive-autopilot");
  renderAutopilotAccountList();
});

// ── 빠른 시작 ──
if ($("quickStartBtn")) $("quickStartBtn").addEventListener("click", async () => {
  const theme = ($("quickTheme") && $("quickTheme").value.trim()) || "";
  const category = ($("quickCategory") && $("quickCategory").value.trim()) || "";
  if (!theme) return showModal("알림", "키워드를 입력하세요.", "확인");
  if (!category) return showModal("알림", "메뉴명을 입력하세요.", "확인");
  if (!state.loggedIn) return showModal("알림", "먼저 메이킷 계정에 로그인하세요.", "확인");
  if (!(await canUseExperience("quick"))) return;

  const customTitle = ($("quickTitle") && $("quickTitle").value.trim()) || "";
  const quickTemplate = ($("quickTemplate") && $("quickTemplate").value.trim()) || "";
  const cfg = await bridge.loadConfig() || {};
  const naverId = selectedNaverAccount || cfg.naver_id;
  if (!naverId) return showModal("알림", "먼저 네이버 계정을 등록해주세요.\n(왼쪽 메뉴 > 계정 설정)", "확인");

  // 스마트 기본값으로 설정 구성
  const merged = {
    ...cfg,
    naver_id: naverId,
    custom_title: customTitle,
    autopilot: {
      theme,
      category,
      subtype: "info",
      tone: "friendly",
      speech: "polite_yo",
      wordCount: "medium",
      quote_style: "postit",
      accent_color: "#2DB400",
      color_mode: "text",
      use_sticker: "off",
      use_gif: false,
      interval: "random",
      template: quickTemplate,
      posts_per_day: 1,
      duration_days: 1,
      started_at: new Date().toISOString(),
      active: true,
    },
  };
  await bridge.saveConfig(merged);

  addLog(`[빠른 시작] 키워드: "${theme}", 메뉴: "${category}"${quickTemplate ? ", 템플릿: " + quickTemplate : ""} — 1개 발행 시작`);
  state.botRunning = true;
  $("quickStartBtn").disabled = true;
  $("quickStartBtn").textContent = "발행 중...";
  goToPanel("execlog");
  showStopBtn();
  showProgress();

  try {
    const r = await bridge.runOnce(merged);
    if (r.ok && r.result && r.result.status === "ok") {
      playSound("success");
      const posts = r.result.posts || [];
      const sp = posts.filter(p => p.url);
      await markExperienceUsed("quick", sp.length);
      showModal("발행 완료", `${sp.length}개 발행 성공!${sp.map((p,i) => `\n${i+1}. ${p.title||p.topic}`).join("")}`, "확인");
      for (const p of posts) {
        if (p.url) {
          addLog(`[발행] ${p.title || ""}`);
          addLog(`[링크] ${p.url}`);
          await addPublishHistory({ title: p.title||p.topic||"블로그", topic: p.topic||"", url: p.url, naver_id: naverId, type: "blog" });
        }
      }
      if (sp.length > 0) bridge.openExternal(sp[sp.length-1].url);
      notify(`발행 완료 (${sp.length}개)`, sp.map(p=>p.title||p.topic).join(", "), sp.length>0 ? ()=>bridge.openExternal(sp[sp.length-1].url) : null);
    } else {
      const err = (r.result && r.result.message) || r.error || "실패";
      playSound("fail");
      showModal("발행 실패", _friendlyError(err), "확인");
      addLog(`[빠른 시작] 실패: ${_friendlyError(err)}`);
      notify("발행 실패", _friendlyError(err));
    }
  } finally {
    state.botRunning = false;
    hideStopBtn();
    hideProgress();
    $("quickStartBtn").disabled = false;
    $("quickStartBtn").textContent = "1개 바로 발행";
  }
});
if ($("autopilotBackBtn")) $("autopilotBackBtn").addEventListener("click", () => showBlogMode(null));

let selectedNaverAccount = "";  // 선택된 네이버 계정 (빈 문자열 = 기본 계정)

async function renderAutopilotAccountList() {
  const accounts = await getNaverAccounts();
  const box = $("autopilotAccountList");
  if (!box) return;
  const currentId = selectedNaverAccount || ($("naverId") && $("naverId").value.trim()) || "";
  if (accounts.length === 0) {
    box.innerHTML = '<div style="font-size:12px;color:var(--text-dim);">저장된 계정 없음. 계정 설정에서 먼저 계정을 추가하세요.</div>';
    return;
  }
  box.innerHTML = accounts.map(id =>
    `<div class="account-chip" data-id="${escapeHtml(id)}" style="display:inline-block;padding:6px 14px;margin:3px;border-radius:20px;font-size:12px;cursor:pointer;background:${id === currentId ? 'var(--accent-soft)' : 'var(--bg-elev)'};color:${id === currentId ? 'var(--accent)' : 'var(--text)'};font-weight:${id === currentId ? '600' : '400'};border:1px solid ${id === currentId ? 'var(--accent)' : 'var(--border-soft)'};">${escapeHtml(id)}</div>`
  ).join("") + (accounts.length > 1 ? '<div style="font-size:11px;color:var(--text-dim);margin-top:4px;">클릭하여 발행할 계정을 선택하세요.</div>' : "");
  // 계정 클릭 이벤트
  box.querySelectorAll(".account-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      selectedNaverAccount = chip.dataset.id;
      renderAutopilotAccountList();
    });
  });
  if (!selectedNaverAccount && accounts.length > 0) selectedNaverAccount = currentId || accounts[0];
}

// ── 달력 ──
let calYear = new Date().getFullYear();
let calMonth = new Date().getMonth();
let calSelectedDate = new Date().toISOString().slice(0, 10);

function renderCalendar() {
  const grid = $("calendarGrid");
  if (!grid) return;
  const title = $("calendarTitle");
  title.textContent = `${calYear}년 ${calMonth + 1}월`;

  const today = new Date().toISOString().slice(0, 10);
  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();

  let html = "";
  const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
  dayNames.forEach(d => { html += `<div class="cal-header">${d}</div>`; });

  // 이전 달 빈칸
  for (let i = 0; i < firstDay; i++) html += `<div class="cal-day other-month"></div>`;

  // 날짜
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const isToday = dateStr === today;
    const isSelected = dateStr === calSelectedDate;
    const cls = `cal-day${isToday ? " today" : ""}${isSelected ? " selected" : ""}`;
    // 해당 날짜 이력 확인
    const dots = getDotsForDate(dateStr);
    html += `<div class="${cls}" data-date="${dateStr}">
      ${d}
      <div class="cal-dots">${dots}</div>
    </div>`;
  }

  grid.innerHTML = html;
  renderDayHistory(calSelectedDate);
}

// 달력 클릭 이벤트 위임 (한 번만 등록, 리스너 누적 방지)
(function initCalendarDelegation() {
  const grid = $("calendarGrid");
  if (!grid) return;
  grid.addEventListener("click", (e) => {
    const day = e.target.closest(".cal-day[data-date]");
    if (!day) return;
    calSelectedDate = day.dataset.date;
    renderCalendar();
    renderDayHistory(calSelectedDate);
  });
})();

function getDotsForDate(dateStr) {
  // config에서 publish_history 확인
  const cfg = window._cachedConfig || {};
  const history = Array.isArray(cfg.publish_history) ? cfg.publish_history : [];
  // 간단 매칭: 날짜 포함 여부
  const matched = history.filter(h => {
    if (h.dateKey === dateStr) return true;
    if (!h.time) return false;
    // "2026. 4. 12." 형식 매칭
    const parts = dateStr.split("-");
    const y = parseInt(parts[0]);
    const m = parseInt(parts[1]);
    const d = parseInt(parts[2]);
    return h.time.includes(`${y}. ${m}. ${d}.`) || h.time.includes(`${y}.${m}.${d}`);
  });
  if (matched.length === 0) return "";
  const ok = matched.filter(h => !h.error).length;
  const fail = matched.filter(h => h.error).length;
  if (ok > 0 && fail === 0) return `<span class="cal-badge ok">${ok}</span>`;
  if (ok === 0 && fail > 0) return `<span class="cal-badge fail">${fail}</span>`;
  if (ok > 0 && fail > 0) return `<span class="cal-badge mixed">${ok}/${matched.length}</span>`;
  return "";
}

async function renderDayHistory(dateStr) {
  const parts = dateStr.split("-");
  const m = parseInt(parts[1]);
  const d = parseInt(parts[2]);
  if ($("dayHistoryTitle")) $("dayHistoryTitle").textContent = `${m}월 ${d}일 발행 이력`;

  const cfg = (await bridge.loadConfig()) || {};
  window._cachedConfig = cfg;
  const history = Array.isArray(cfg.publish_history) ? cfg.publish_history : [];
  const y = parseInt(parts[0]);
  const dayItems = history.filter(h => {
    if (h.dateKey === dateStr) return true;
    if (!h.time) return false;
    return h.time.includes(`${y}. ${m}. ${d}.`) || h.time.includes(`${y}.${m}.${d}`);
  });

  const box = $("publishHistory");
  if (!box) return;
  if (dayItems.length === 0) {
    box.innerHTML = '<div style="font-size:12px;color:var(--text-dim);padding:8px 0;">이 날짜에 발행 이력이 없습니다.</div>';
    return;
  }
  box.innerHTML = "";
  dayItems.forEach(h => {
    const ok = !h.error;
    const item = document.createElement("div");
    item.className = "history-item";
    item.innerHTML = `
      <div class="history-dot ${ok ? 'ok' : 'fail'}"></div>
      <div class="history-body">
        <div class="history-title">${escapeHtml(h.title || h.topic || "제목 없음")}</div>
        <div class="history-meta">${escapeHtml(h.time || "")} · ${escapeHtml(h.naver_id || "")}</div>
        ${ok && h.url ? `<a class="history-link" data-url="${escapeHtml(h.url)}">${escapeHtml(h.url)}</a>` : ""}
        ${h.error ? `<div style="color:var(--danger);font-size:11px;margin-top:2px;">${escapeHtml(h.error)}</div>` : ""}
      </div>
    `;
    const link = item.querySelector(".history-link");
    if (link) link.addEventListener("click", (e) => { e.preventDefault(); bridge.openExternal(link.dataset.url); });
    box.appendChild(item);
  });
}

if ($("calPrev")) $("calPrev").addEventListener("click", () => {
  calMonth--;
  if (calMonth < 0) { calMonth = 11; calYear--; }
  renderCalendar();
});
if ($("calNext")) $("calNext").addEventListener("click", () => {
  calMonth++;
  if (calMonth > 11) { calMonth = 0; calYear++; }
  renderCalendar();
});

// ── 네이버 로그인 (계정 저장 + 세션 저장 통합) ──
$("naverLoginBtn").addEventListener("click", async () => {
  const id = $("naverId").value.trim();
  const pw = $("naverPw").value;
  if (!id) return showModal("알림","네이버 ID를 입력하세요","확인");

  // 1. PW가 있으면 먼저 암호화 저장
  if (pw) {
    const saveR = await bridge.savePassword(id, pw, "NaverBotSaaS");
    if (saveR.ok) {
      $("naverPw").value = "";
      addLog("[네이버] 계정 정보 암호화 저장 완료");
    }
  }

  // 2. 세션 로그인 진행
  $("naverLoginBtn").disabled = true;
  $("naverLoginBtn").textContent = "브라우저 열는 중...";
  addLog("[네이버] 로그인 브라우저가 열립니다. 직접 로그인해주세요.");
  addLog("[안내] 캡차(보안문자)가 나오면 직접 입력 후 로그인하세요.");
  goToPanel("execlog");
  try {
    const r = await bridge.naverFirstLogin(id);
    if (r.ok) {
      addLog("[네이버] 세션 저장 완료! 이제 자동 발행 가능합니다.");
      await bridge.saveConfig({ ...(await bridge.loadConfig() || {}), naver_id: id });
      await addNaverAccount(id);
      renderNaverAccountList();
    } else {
      addLog("[네이버] 세션 저장 실패: " + (r.error || "로그인 미완료 또는 타임아웃"));
      addLog("[안내] 해결 방법: 일반 브라우저에서 먼저 네이버 로그인 → 이 앱에서 다시 시도");
    }
  } catch(e) {
    addLog("[네이버] 로그인 중 오류: " + (e.message || e));
  } finally {
    $("naverLoginBtn").disabled = false;
    $("naverLoginBtn").textContent = "네이버 로그인";
  }
});

if ($("naverResetBtn")) $("naverResetBtn").addEventListener("click", async () => {
  const id = ($("naverId") && $("naverId").value.trim()) || "";
  await resetNaverLogin(id);
});

// ── 자동 운영 Step 3 예약 발행 토글 ──
if ($("apScheduleToggle")) {
  $("apScheduleToggle").addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    $("apScheduleToggle").querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
    chip.classList.add("active");
    const show = chip.dataset.value === "daily";
    if ($("apScheduleSection")) $("apScheduleSection").style.display = show ? "" : "none";
  });
}

// ── 자동 운영 Step 3 템플릿 토글 ──
if ($("apTemplateToggle")) {
  $("apTemplateToggle").addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    $("apTemplateToggle").querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
    chip.classList.add("active");
    const show = chip.dataset.value === "yes";
    if ($("autopilotTemplate")) $("autopilotTemplate").style.display = show ? "" : "none";
  });
}

// ── 자동 운영 단계별 마법사 ──
function goApStep(n) {
  for (let i = 1; i <= 3; i++) {
    const step = $("apStep" + i);
    if (step) step.classList.toggle("hidden", i !== n);
  }
  const bar = $("apStepBar");
  if (bar) bar.querySelectorAll(".step-item").forEach(s => {
    s.classList.toggle("active", parseInt(s.dataset.step) <= n);
  });
  // Step 3일 때 발행 시작 버튼 복원
  if (n === 3 && $("startAutopilotBtn")) {
    $("startAutopilotBtn").style.display = "";
  }
}
if ($("apStep1Next")) $("apStep1Next").addEventListener("click", () => {
  if (!$("autopilotTheme").value.trim()) return showModal("알림", "키워드를 입력하세요", "확인");
  // 항상 Step 2(스타일 설정)로 이동해 사용자가 스타일을 검토/수정할 수 있도록
  goApStep(2);
});
if ($("apStep2Prev")) $("apStep2Prev").addEventListener("click", () => goApStep(1));
if ($("apStep2Next")) $("apStep2Next").addEventListener("click", () => goApStep(3));
if ($("apStep3Prev")) $("apStep3Prev").addEventListener("click", () => goApStep(2));

// Step 3 표시 시 발행 시작 버튼 항상 복원

// 자동 운영 chip 상태
let apSubtype = "info", apTone = "friendly", apSpeech = "polite_yo", apWordCount = "medium";
let apQuoteStyle = "postit", apAccentColor = "#2DB400", apSticker = "off", apGif = "off", apColorMode = "text";
for (const [id, setter] of [
  ["apSubtypeChips", v => apSubtype = v],
  ["apToneChips", v => apTone = v],
  ["apSpeechChips", v => apSpeech = v],
  ["apWordCountChips", v => apWordCount = v],
  ["apQuoteStyleChips", v => apQuoteStyle = v],
  ["apStickerChips", v => apSticker = v],
  ["apGifChips", v => apGif = v],
  ["apColorModeChips", v => apColorMode = v],
]) {
  const el = $(id);
  if (el) el.addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    el.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
    chip.classList.add("active");
    setter(chip.dataset.value);
  });
}
// 강조 색상 프리셋
if ($("apAccentColorPresets")) {
  $("apAccentColorPresets").addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    // active 표시
    $("apAccentColorPresets").querySelectorAll(".chip").forEach(c => c.style.outline = "");
    chip.style.outline = "2px solid var(--accent)";
    apAccentColor = chip.dataset.value;
    if ($("apAccentColor")) {
      $("apAccentColor").value = apAccentColor || "#000000";
    }
  });
}
if ($("apAccentColor")) {
  $("apAccentColor").addEventListener("input", (e) => { apAccentColor = e.target.value; });
}

// ── 자동 운영 프리셋 저장/로드 ──
async function loadApPresets() {
  const cfg = (await bridge.loadConfig()) || {};
  return Array.isArray(cfg.autopilot_presets) ? cfg.autopilot_presets : [];
}

async function saveApPresets(presets) {
  const cfg = (await bridge.loadConfig()) || {};
  cfg.autopilot_presets = presets;
  await bridge.saveConfig(cfg);
}

function collectApPresetData() {
  return {
    theme: ($("autopilotTheme") && $("autopilotTheme").value.trim()) || "",
    subtype: apSubtype,
    tone: apTone,
    speech: apSpeech,
    wordCount: apWordCount,
    quote_style: apQuoteStyle,
    accent_color: apAccentColor,
    color_mode: apColorMode,
    sticker: apSticker,
    gif: apGif,
    category: ($("autopilotCategory") && $("autopilotCategory").value.trim()) || "",
    category_count: parseInt(($("autopilotCategoryCount") && $("autopilotCategoryCount").value) || "1") || 1,
    template: ($("autopilotTemplate") && $("autopilotTemplate").value.trim()) || "",
    interval: ($("autopilotInterval") && $("autopilotInterval").value) || "random",
    custom_prompt: ($("autopilotPrompt") && $("autopilotPrompt").value.trim()) || "",
    drive_folder_url: ($("driveFolderUrl") && $("driveFolderUrl").value.trim()) || "",
    drive_recursive: !!($("driveRecursive") && $("driveRecursive").checked),
    aeoPosition: state.aeoPosition || "top",
    includeProsCons: state.includeProsCons !== false,
    briefCategory: state.briefCategory || "",
  };
}

function applyApPreset(p) {
  if (p.theme && $("autopilotTheme")) $("autopilotTheme").value = p.theme;
  if (p.category && $("autopilotCategory")) $("autopilotCategory").value = p.category;
  if (p.category_count && $("autopilotCategoryCount")) $("autopilotCategoryCount").value = p.category_count;
  if (p.template && $("autopilotTemplate")) $("autopilotTemplate").value = p.template;
  if (p.interval && $("autopilotInterval")) $("autopilotInterval").value = p.interval;
  if (p.custom_prompt && $("autopilotPrompt")) $("autopilotPrompt").value = p.custom_prompt;
  if (p.drive_folder_url && $("driveFolderUrl")) $("driveFolderUrl").value = p.drive_folder_url;
  if ($("driveRecursive")) $("driveRecursive").checked = !!p.drive_recursive;

  // 템플릿 토글
  if (p.template && $("apTemplateToggle")) {
    $("apTemplateToggle").querySelectorAll(".chip").forEach(c => c.classList.toggle("active", c.dataset.value === "yes"));
    if ($("autopilotTemplate")) $("autopilotTemplate").style.display = "";
  }

  // chip 상태 복원
  const chipMap = [
    ["apSubtypeChips", p.subtype, v => apSubtype = v],
    ["apToneChips", p.tone, v => apTone = v],
    ["apSpeechChips", p.speech, v => apSpeech = v],
    ["apWordCountChips", p.wordCount, v => apWordCount = v],
    ["apQuoteStyleChips", p.quote_style, v => apQuoteStyle = v],
    ["apStickerChips", p.sticker, v => apSticker = v],
    ["apGifChips", p.gif, v => apGif = v],
  ];
  for (const [id, val, setter] of chipMap) {
    if (!val) continue;
    const el = $(id);
    if (!el) continue;
    el.querySelectorAll(".chip").forEach(c => {
      c.classList.toggle("active", c.dataset.value === val);
    });
    setter(val);
  }

  // 강조 색상
  if (p.accent_color !== undefined) {
    apAccentColor = p.accent_color;
    if ($("apAccentColor") && p.accent_color) $("apAccentColor").value = p.accent_color;
  }
  // 강조 방식
  if (p.color_mode) {
    apColorMode = p.color_mode;
    if ($("apColorModeChips")) {
      $("apColorModeChips").querySelectorAll(".chip").forEach(c => c.classList.toggle("active", c.dataset.value === p.color_mode));
    }
  }

  // Q&A 위치 + 글 구조 옵션
  state.aeoPosition = p.aeoPosition || "top";
  state.includeProsCons = p.includeProsCons !== false;
  if ($("apAeoPositionChips")) {
    $("apAeoPositionChips").querySelectorAll(".chip").forEach(c => c.classList.toggle("active", c.dataset.value === state.aeoPosition));
  }
  if ($("apStructureChips")) {
    $("apStructureChips").querySelectorAll(".structure-toggle").forEach(c => {
      const key = c.dataset.key;
      c.classList.toggle("active", state[key]);
    });
  }
  // 콘텐츠 분야
  state.briefCategory = p.briefCategory || "";
  if ($("apBriefCategoryChips")) {
    $("apBriefCategoryChips").querySelectorAll(".chip").forEach(c => c.classList.toggle("active", (c.dataset.value || "") === state.briefCategory));
  }

  addLog(`[프리셋] "${p._name || ""}" 불러오기 완료`);
}

async function renderApPresetList() {
  const list = $("apPresetList");
  if (!list) return;
  const presets = await loadApPresets();
  if (presets.length === 0) {
    list.innerHTML = '<div style="font-size:12px;color:var(--text-dim);padding:4px 0;">저장된 프리셋이 없습니다.</div>';
    return;
  }
  list.innerHTML = "";
  presets.forEach((p, i) => {
    const chip = document.createElement("button");
    chip.className = "chip";
    chip.textContent = p._name || `프리셋 ${i + 1}`;
    chip.title = "클릭: 불러오기 / 우클릭: 삭제";
    chip.style.cursor = "pointer";
    chip.addEventListener("click", () => {
      list.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      applyApPreset(p);
    });
    chip.addEventListener("contextmenu", async (e) => {
      e.preventDefault();
      if (!confirm(`"${p._name}" 프리셋을 삭제하시겠습니까?`)) return;
      const cur = await loadApPresets();
      cur.splice(i, 1);
      await saveApPresets(cur);
      renderApPresetList();
      addLog(`[프리셋] "${p._name}" 삭제됨`);
    });
    list.appendChild(chip);
  });
}

if ($("saveApPresetBtn")) {
  $("saveApPresetBtn").addEventListener("click", async () => {
    const name = ($("apPresetName") && $("apPresetName").value.trim()) || "";
    if (!name) return showModal("알림", "프리셋 이름을 입력하세요", "확인");
    const data = collectApPresetData();
    data._name = name;
    const presets = await loadApPresets();
    const idx = presets.findIndex(p => p._name === name);
    if (idx >= 0) {
      presets[idx] = data;
    } else {
      presets.push(data);
    }
    await saveApPresets(presets);
    $("apPresetName").value = "";
    renderApPresetList();
    addLog(`[프리셋] "${name}" 저장 완료`);
    showModal("저장 완료", `"${name}" 프리셋이 저장되었습니다.`, "확인");
  });
}

// 초기 프리셋 목록 렌더링
renderApPresetList();

// 자동 운영 시작 (즉시 실행)
$("startAutopilotBtn").addEventListener("click", async () => {
  if (state.botRunning) {
    addLog("[자동 운영] 이미 실행 중입니다. 현재 작업이 끝난 뒤 다시 시작하세요.");
    return showModal("실행 중", "자동 운영이 이미 실행 중입니다.", "확인");
  }
  const theme = $("autopilotTheme").value.trim();
  if (!theme) return showModal("알림","키워드를 입력하세요","확인");
  const naverId = $("naverId").value.trim();
  if (!naverId) return showModal("알림","네이버 계정을 설정하세요","확인");
  if (!state.loggedIn) return showModal("알림","먼저 메이킷 계정에 로그인하세요","확인");
  if (blogAutopilotSourceMode === "drive" && isExperienceLimitedUser()) {
    return showModal("Pro 플랜 필요", "구글 드라이브 자료 기반 자동 운영은 Pro 이상 플랜에서 이용할 수 있습니다.", "Pro 구독하기", () => bridge.openExternal("https://snsmakeit.com/pricing"));
  }
  if (!(await canUseExperience("autopilot"))) return;

  const postCount = parseInt($("autopilotCount") ? $("autopilotCount").value : "3") || 3;
  const rules = getExePlanRules();
  if (rules.maxPostsPerRun > 0 && postCount > rules.maxPostsPerRun) {
    return showModal(
      "플랜 한도",
      `${rules.label} 플랜은 1회 최대 ${rules.maxPostsPerRun}개까지 발행할 수 있습니다.\n현재 설정: ${postCount}개`,
      rules.maxPostsPerRun <= 1 ? "구독하기" : "확인",
      rules.maxPostsPerRun <= 1 ? () => bridge.openExternal("https://snsmakeit.com/pricing") : null
    );
  }
  const category = ($("autopilotCategory") && $("autopilotCategory").value.trim()) || "";
  if (!category) return showModal("알림", "메뉴명을 입력하세요", "확인");
  const categoryCount = parseInt(($("autopilotCategoryCount") && $("autopilotCategoryCount").value) || "1") || 1;

  // 템플릿 "네" 선택했으면 이름 필수
  const tmplActive = $("apTemplateToggle") && $("apTemplateToggle").querySelector(".chip.active");
  if (tmplActive && tmplActive.dataset.value === "yes") {
    const tmplName = ($("autopilotTemplate") && $("autopilotTemplate").value.trim()) || "";
    if (!tmplName) return showModal("알림", "템플릿 이름을 입력하세요", "확인");
  }
  const interval = ($("autopilotInterval") && $("autopilotInterval").value) || "random";
  const customPrompt = ($("autopilotPrompt") && $("autopilotPrompt").value.trim()) || "";
  const driveFolderUrl = ($("driveFolderUrl") && $("driveFolderUrl").value.trim()) || "";
  const driveRecursive = blogAutopilotSourceMode === "drive" || !!($("driveRecursive") && $("driveRecursive").checked);
  if (blogAutopilotSourceMode === "drive" && !driveFolderUrl) {
    return showModal("알림", "구글 드라이브 폴더 링크를 입력하세요.", "확인");
  }
  const scheduleToggle = $("apScheduleToggle") && $("apScheduleToggle").querySelector(".chip.active");
  const scheduleMode = (scheduleToggle && scheduleToggle.dataset.value) || "now";
  if (scheduleMode === "daily" && !requireExeFeature("schedule", "매일 자동 예약 발행은 Pro 이상에서 사용할 수 있습니다.")) return;
  const scheduleTime = (scheduleMode === "daily" && $("apScheduleTime")) ? $("apScheduleTime").value : "";
  const durationDays = scheduleMode === "daily" ? rules.maxDurationDays : 0;
  const durationLabel = scheduleMode === "daily"
    ? (durationDays > 0 ? `${durationDays}일` : "제한 없음")
    : "즉시 실행";
  const cfg = collectConfig();
  const saved = (await bridge.loadConfig()) || {};
  const merged = {
    ...saved, ...cfg,
    naver_id: selectedNaverAccount || saved.naver_id || cfg.naver_id,
    autopilot: {
      theme,
      posts_per_day: postCount,
      duration_days: durationDays,
      started_at: new Date().toISOString(),
      active: true,
      category,
      category_count: categoryCount,
      interval,
      custom_prompt: customPrompt,
      ref_url: "",
      drive_folder_url: blogAutopilotSourceMode === "drive" ? driveFolderUrl : "",
      drive_recursive: driveRecursive,
      drive_images_per_post: 4,
      drive_image_limit: Math.max(12, postCount * 4),
      template: ($("autopilotTemplate") && $("autopilotTemplate").value.trim()) || "",
      subtype: apSubtype,
      tone: apTone,
      speech: apSpeech,
      wordCount: apWordCount,
      quote_style: apQuoteStyle,
      accent_color: apAccentColor,
      color_mode: apColorMode,
      use_sticker: apSticker,
      use_underline: state.useUnderline === "on",
      use_gif: apGif === "on",
      aeoPosition: state.aeoPosition,
      schedule_mode: scheduleMode,
      schedule_time: scheduleTime,
    }
  };
  await bridge.saveConfig(merged);

  addLog(`[자동 운영] 즉시 시작 — 키워드: "${theme}", ${postCount}개, 기간: ${durationLabel}, 간격: ${interval}${category ? ", 메뉴 순환: " + category : ""}${driveFolderUrl ? ", 드라이브 자료/사진 반영" : ""}`);
  state.botRunning = true;
  $("startAutopilotBtn").disabled = true;
  $("startAutopilotBtn").style.display = "none";
  $("stopAutopilotBtn").style.display = "";
  goToPanel("execlog");
  showStopBtn();
  showProgress();

  try {
    // 즉시 실행
    const r = await bridge.runOnce(merged);

    if (r.ok && r.result && r.result.status === "ok") {
      playSound("success");
      // 발행된 글 링크 목록 생성
      const posts = r.result.posts || [];
      const successPosts = posts.filter(p => p.url);
      const failPosts = posts.filter(p => p.error);
      await markExperienceUsed("autopilot", successPosts.length > 0 ? 1 : 0);
      let linksMsg = r.result.message || "발행 완료";
      if (successPosts.length > 0) {
        linksMsg += `\n\n${successPosts.length}개 발행 성공:`;
        successPosts.forEach((p, i) => { linksMsg += `\n${i+1}. ${p.title || p.topic}`; });
      }
      if (failPosts.length > 0) {
        linksMsg += `\n\n${failPosts.length}개 실패:`;
        failPosts.forEach((p, i) => { linksMsg += `\n- ${p.topic || ""}: ${p.error || ""}`; });
      }
      showModal("자동 운영 완료", linksMsg, "확인");
      // 데스크톱 알림
      const lastUrl = successPosts.length > 0 ? successPosts[successPosts.length - 1].url : null;
      notify(
        `발행 완료 (${successPosts.length}/${posts.length}개 성공)`,
        successPosts.map(p => p.title || p.topic).join(", "),
        lastUrl ? () => bridge.openExternal(lastUrl) : null
      );
      addLog(`[자동 운영] ${r.result.message || "완료"}`);
      // 각 글 링크를 로그에 표시
      for (const p of posts) {
        if (p.url) {
          addLog(`[발행] ${p.title || ""}`);
          addLog(`[링크] ${p.url}`);
          await addPublishHistory({
            title: p.title || p.topic || "블로그 발행",
            topic: p.topic || "",
            url: p.url,
            naver_id: naverId,
            type: "blog",
            drive_folder_id: p.drive_folder_id || "",
            drive_folder_name: p.drive_folder_name || "",
          });
        } else if (p.error) {
          addLog(`[실패] ${p.topic || ""}: ${p.error}`);
          await addPublishHistory({
            title: p.topic || "블로그 발행 실패",
            topic: p.topic || "",
            error: p.error,
            naver_id: naverId,
            type: "blog",
          });
        }
      }
      // 마지막 성공 글 URL을 브라우저에서 자동 열기
      if (successPosts.length > 0) {
        const lastUrl = successPosts[successPosts.length - 1].url;
        if (lastUrl) bridge.openExternal(lastUrl);
      }
    } else {
      const err = (r.result && r.result.message) || r.error || "실패";
      playSound("fail");
      showModal("자동 운영 실패", _friendlyError(err), "확인");
      addLog(`[자동 운영] 실패: ${_friendlyError(err)}`);
      notify("발행 실패", _friendlyError(err));
    }
  } finally {
    state.botRunning = false;
    hideStopBtn();
    hideProgress();
    $("startAutopilotBtn").disabled = false;
    $("startAutopilotBtn").style.display = "";
    $("stopAutopilotBtn").style.display = "none";
  }

});

// 자동 운영 중지
$("stopAutopilotBtn").addEventListener("click", async () => {
  await bridge.stopBot();
  state.botRunning = false;
  const r = await bridge.clearSchedule();
  const cfg = (await bridge.loadConfig()) || {};
  if (cfg.autopilot) cfg.autopilot.active = false;
  await bridge.saveConfig(cfg);
  $("startAutopilotBtn").style.display = "";
  $("stopAutopilotBtn").style.display = "none";
  if ($("autopilotStatus")) $("autopilotStatus").style.display = "none";
  addLog("[자동 운영] 중지됨");
});

// 앱 시작 시 자동 운영 상태 + 이전 설정 복원
async function restoreAutopilotStatus() {
  const cfg = (await bridge.loadConfig()) || {};
  const ap = cfg.autopilot || {};

  // ── 이전에 사용했던 값 복원 (운영 중이 아니어도) ──
  if (ap.theme && $("autopilotTheme") && !$("autopilotTheme").value) {
    $("autopilotTheme").value = ap.theme;
  }
  if (ap.category && $("autopilotCategory") && !$("autopilotCategory").value) {
    $("autopilotCategory").value = ap.category;
  }
  if (ap.category_count && $("autopilotCategoryCount")) {
    $("autopilotCategoryCount").value = ap.category_count;
  }
  if (ap.template && $("autopilotTemplate") && !$("autopilotTemplate").value) {
    $("autopilotTemplate").value = ap.template;
    // 템플릿 토글도 "네"로
    if ($("apTemplateToggle")) {
      $("apTemplateToggle").querySelectorAll(".chip").forEach(c =>
        c.classList.toggle("active", c.dataset.value === "yes")
      );
      $("autopilotTemplate").style.display = "";
    }
  }
  if (ap.custom_prompt && $("autopilotPrompt") && !$("autopilotPrompt").value) {
    $("autopilotPrompt").value = ap.custom_prompt;
  }
  if (ap.drive_folder_url && $("driveFolderUrl") && !$("driveFolderUrl").value) {
    $("driveFolderUrl").value = ap.drive_folder_url;
  }
  if ($("driveRecursive")) {
    $("driveRecursive").checked = !!ap.drive_recursive;
  }
  if (ap.interval && $("autopilotInterval")) {
    $("autopilotInterval").value = ap.interval;
  }
  // chip 상태 복원
  const chipRestore = [
    ["apSubtypeChips", ap.subtype, v => apSubtype = v],
    ["apToneChips", ap.tone, v => apTone = v],
    ["apSpeechChips", ap.speech, v => apSpeech = v],
    ["apWordCountChips", ap.wordCount, v => apWordCount = v],
    ["apQuoteStyleChips", ap.quote_style, v => apQuoteStyle = v],
    ["apStickerChips", ap.use_sticker, v => apSticker = v],
    ["apGifChips", ap.use_gif ? "on" : "off", v => apGif = v],
  ];
  for (const [id, val, setter] of chipRestore) {
    if (!val) continue;
    const el = $(id);
    if (!el) continue;
    el.querySelectorAll(".chip").forEach(c => c.classList.toggle("active", c.dataset.value === val));
    setter(val);
  }
  if (ap.accent_color) {
    apAccentColor = ap.accent_color;
    if ($("apAccentColor")) $("apAccentColor").value = ap.accent_color;
  }
  if (ap.color_mode) {
    apColorMode = ap.color_mode;
    if ($("apColorModeChips")) {
      $("apColorModeChips").querySelectorAll(".chip").forEach(c => c.classList.toggle("active", c.dataset.value === ap.color_mode));
    }
  }

  // ── 운영 중 상태 표시 ──
  if (ap.active) {
    if ($("autopilotTheme")) $("autopilotTheme").value = ap.theme || "";
    $("startAutopilotBtn").style.display = "none";
    $("stopAutopilotBtn").style.display = "";
  }
}

// ═══════════════════════════════════════════════
// ── 카페 모드 선택 + 단계별 마법사 ──
// ═══════════════════════════════════════════════
function showCafeMode(mode) {
  if ($("cafeModeSelect")) $("cafeModeSelect").style.display = mode ? "none" : "";
  if ($("cafeAutopilotView")) $("cafeAutopilotView").style.display = mode === "autopilot" ? "" : "none";
}
if ($("cafeModeAutopilot")) $("cafeModeAutopilot").addEventListener("click", () => showCafeMode("autopilot"));
if ($("cafeAutopilotBackBtn")) $("cafeAutopilotBackBtn").addEventListener("click", () => showCafeMode(null));

// 카페 단계 전환
let cafeCurrentStep = 1;
let cafeAnalysisData = null;
function goCafeStep(step) {
  cafeCurrentStep = step;
  for (let i = 1; i <= 4; i++) {
    const el = $(`cafeStep${i}`);
    if (el) el.classList.toggle("hidden", i !== step);
  }
  document.querySelectorAll("#cafeStepBar .step-item").forEach(el => {
    const s = parseInt(el.dataset.step);
    el.classList.remove("active", "done");
    if (s === step) el.classList.add("active");
    else if (s < step) el.classList.add("done");
  });
}

// Step 1 → 2
if ($("cafeStep1Next")) $("cafeStep1Next").addEventListener("click", () => {
  if (!$("cafeNumber").value.trim() || !$("cafeMenuId").value.trim()) return showModal("알림", "카페 번호와 게시판 번호를 입력하세요.", "확인");
  goCafeStep(2);
});
if ($("cafeStep2Prev")) $("cafeStep2Prev").addEventListener("click", () => goCafeStep(1));

// Step 2 → 3 (글감 분석 자동 시작)
if ($("cafeStep2Next")) $("cafeStep2Next").addEventListener("click", async () => {
  const keyword = $("cafeKeyword").value.trim();
  if (!keyword) return showModal("알림","키워드를 입력하세요","확인");
  goCafeStep(3);

  // 분석 시작
  $("cafeAnalysisLoading").style.display = "block";
  $("cafeAnalysisResult").style.display = "none";
  $("cafeAnalysisError").style.display = "none";
  $("cafeAnalysisSkip").style.display = "none";

  try {
    const r = await bridge.analyzeKeyword(keyword);
    $("cafeAnalysisLoading").style.display = "none";
    if (r.ok && r.result) {
      cafeAnalysisData = r.result;
      $("cafeAnalysisResult").style.display = "block";
      const box = $("cafeSuggestedTitles");
      box.innerHTML = "";
      if (cafeAnalysisData.suggested_titles && cafeAnalysisData.suggested_titles.length > 0) {
        cafeAnalysisData.suggested_titles.forEach((t, i) => {
          const div = document.createElement("div");
          div.className = "suggest-title";
          div.textContent = `${i + 1}. ${t}`;
          div.dataset.title = t;
          div.addEventListener("click", () => {
            box.querySelectorAll(".suggest-title").forEach(s => s.classList.remove("selected"));
            div.classList.add("selected");
          });
          box.appendChild(div);
        });
      }
      $("cafeStructureSummary").textContent = cafeAnalysisData.structure_summary || "분석 데이터 없음";
      if (cafeAnalysisData.extra_prompt && $("cafeAnalysisExtra")) {
        $("cafeAnalysisExtra").value = cafeAnalysisData.extra_prompt;
      }
    } else {
      $("cafeAnalysisError").style.display = "block";
      $("cafeAnalysisError").textContent = `분석 실패: ${r.error || "알 수 없는 오류"}. "건너뛰기"를 눌러 직접 작성하세요.`;
    }
  } catch (e) {
    $("cafeAnalysisLoading").style.display = "none";
    $("cafeAnalysisError").style.display = "block";
    $("cafeAnalysisError").textContent = `오류: ${e.message}`;
  }
});

// Step 3 (글감 분석)
if ($("cafeStep3Skip")) $("cafeStep3Skip").addEventListener("click", () => {
  $("cafeAnalysisLoading").style.display = "none";
  $("cafeAnalysisResult").style.display = "none";
  $("cafeAnalysisError").style.display = "none";
  $("cafeAnalysisSkip").style.display = "block";
});
if ($("cafeStep3Prev")) $("cafeStep3Prev").addEventListener("click", () => goCafeStep(2));
if ($("cafeStep3Next")) $("cafeStep3Next").addEventListener("click", () => {
  // 분석 중이면 차단
  if ($("cafeAnalysisLoading") && $("cafeAnalysisLoading").style.display !== "none") {
    showModal("분석 중", "글감 분석이 진행 중입니다.\n분석이 완료되거나 '건너뛰기'를 눌러주세요.", "확인");
    return;
  }
  // 요약 생성
  const cfg_nid = $("naverId") ? $("naverId").value : "";
  const selectedTitle = document.querySelector("#cafeSuggestedTitles .suggest-title.selected");
  const extra = ($("cafeAnalysisExtra") && $("cafeAnalysisExtra").value.trim()) || ($("cafeExtra") && $("cafeExtra").value.trim()) || "";

  let summary = `<strong>네이버 ID:</strong> ${escapeHtml(cfg_nid)}<br>`;
  summary += `<strong>카페:</strong> ${escapeHtml($("cafeId").value)} (${escapeHtml($("cafeNumber").value)})<br>`;
  summary += `<strong>게시판:</strong> ${escapeHtml($("cafeBoardName").value || $("cafeMenuId").value)}<br>`;
  summary += `<strong>키워드:</strong> ${escapeHtml($("cafeKeyword").value)}<br>`;
  if (selectedTitle) summary += `<strong>참고 제목:</strong> ${escapeHtml(selectedTitle.dataset.title)}<br>`;
  summary += `<strong>글 타입:</strong> ${cafeSubtype}`;
  if (extra) summary += `<br><strong>프롬프트:</strong> ${escapeHtml(extra.slice(0, 100))}${extra.length > 100 ? "..." : ""}`;

  $("cafeSummary").innerHTML = summary;
  goCafeStep(4);
});

// Step 4 (발행)
if ($("cafeStep4Prev")) $("cafeStep4Prev").addEventListener("click", () => goCafeStep(3));

// 카페 자동 운영
let cafeApDuration = "30";
if ($("cafeApDurationChips")) {
  $("cafeApDurationChips").addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    $("cafeApDurationChips").querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
    chip.classList.add("active");
    cafeApDuration = chip.dataset.value;
  });
}
// 카페 갯수 슬라이더
if ($("cafeApCount")) {
  $("cafeApCount").addEventListener("input", () => {
    const badge = $("cafeApCountBadge");
    if (badge) badge.textContent = $("cafeApCount").value;
  });
}

if ($("startCafeApBtn")) $("startCafeApBtn").addEventListener("click", async () => {
  if (!requireExeFeature("cafe", "카페 자동 운영은 Pro 이상에서 사용할 수 있습니다.")) return;
  const theme = $("cafeApTheme").value.trim();
  if (!theme) return showModal("알림","키워드를 입력하세요","확인");
  const cafeId = ($("cafeApCafeId") && $("cafeApCafeId").value.trim()) || "";
  const cafeNumber = ($("cafeApCafeNumber") && $("cafeApCafeNumber").value.trim()) || "";
  const menuId = ($("cafeApMenuId") && $("cafeApMenuId").value.trim()) || "";
  const boardName = ($("cafeApBoardName") && $("cafeApBoardName").value.trim()) || "";
  if (!cafeNumber) return showModal("알림","카페 번호를 입력하세요","확인");
  if (!menuId) return showModal("알림","게시판 번호를 입력하세요","확인");
  const count = parseInt($("cafeApCount").value) || 5;
  const rules = getExePlanRules();
  if (rules.maxPostsPerRun > 0 && count > rules.maxPostsPerRun) {
    return showModal("플랜 한도", `${rules.label} 플랜은 1회 최대 ${rules.maxPostsPerRun}개까지 발행할 수 있습니다.`, "확인");
  }
  const startTime = $("cafeApStartTime").value || "10:00";
  const cfg = (await bridge.loadConfig()) || {};
  if (!cfg.naver_id) return showModal("알림","블로그 자동화에서 네이버 계정을 먼저 설정하세요","확인");

  // 카페 설정도 같이 저장
  cfg.cafe = { cafe_id: cafeId, cafe_number: cafeNumber, menu_id: menuId, board_name: boardName };
  cfg.cafe_autopilot = { theme, posts_per_day: count, duration_days: parseInt(cafeApDuration), start_time: startTime, started_at: new Date().toISOString(), active: true };
  await bridge.saveConfig(cfg);
  const r = await bridge.createSchedule([startTime]);
  if (r.ok) {
    addLog(`[카페 자동] 시작 — 키워드: "${theme}", 하루 ${count}개`);
    $("startCafeApBtn").style.display = "none";
    $("stopCafeApBtn").style.display = "";
    goToPanel("execlog");
  }
});
if ($("stopCafeApBtn")) $("stopCafeApBtn").addEventListener("click", async () => {
  await bridge.clearSchedule();
  const cfg = (await bridge.loadConfig()) || {};
  if (cfg.cafe_autopilot) cfg.cafe_autopilot.active = false;
  await bridge.saveConfig(cfg);
  $("startCafeApBtn").style.display = "";
  $("stopCafeApBtn").style.display = "none";
  addLog("[카페 자동] 중지됨");
});

// ── 카페 발행 모드 전환 (즉시 / 예약) ──
const cafePublishChips = $("cafePublishModeChips");
if (cafePublishChips) {
  cafePublishChips.addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    cafePublishChips.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
    chip.classList.add("active");
    const mode = chip.dataset.value;
    if ($("cafePublishNowSection")) $("cafePublishNowSection").style.display = mode === "now" ? "" : "none";
    if ($("cafePublishScheduleSection")) $("cafePublishScheduleSection").style.display = mode === "schedule" ? "" : "none";
  });
}

// 카페 예약 스케줄
const cafeScheduleTimes = new Set();
if ($("cafeAddTimeBtn")) {
  $("cafeAddTimeBtn").addEventListener("click", () => {
    const t = $("cafeNewScheduleTime").value;
    if (t) { cafeScheduleTimes.add(t); renderCafeSchedule(); }
  });
}
function renderCafeSchedule() {
  const el = $("cafeScheduleTimes");
  if (!el) return;
  const sorted = [...cafeScheduleTimes].sort();
  if (sorted.length === 0) {
    el.innerHTML = '<div style="font-size:12px;color:var(--text-dim);padding:4px 0;">등록된 시간이 없습니다</div>';
    return;
  }
  el.innerHTML = "";
  sorted.forEach(t => {
    const div = document.createElement("div");
    div.className = "time-chip";
    div.innerHTML = `${t} <button data-time="${t}">x</button>`;
    el.appendChild(div);
  });
  el.querySelectorAll("button").forEach(btn => {
    btn.addEventListener("click", () => { cafeScheduleTimes.delete(btn.dataset.time); renderCafeSchedule(); });
  });
}
if ($("saveCafeScheduleBtn")) {
  $("saveCafeScheduleBtn").addEventListener("click", async () => {
    if (!requireExeFeature("schedule", "카페 예약 발행은 Pro 이상에서 사용할 수 있습니다.")) return;
    if (cafeScheduleTimes.size === 0) return showModal("알림", "시간을 1개 이상 추가하세요.", "확인");
    const times = [...cafeScheduleTimes].sort();
    // config에 카페 설정 + _cafe_mode 저장
    const cfg = (await bridge.loadConfig()) || {};
    cfg._cafe_mode = true;
    await bridge.saveConfig(cfg);
    const r = await bridge.createSchedule(times);
    if (r.ok) {
      addLog(`[카페 예약] ${times.length}개 스케줄 등록 완료: ${times.join(", ")}`);
      showModal("예약 완료", `매일 ${times.join(", ")}에 카페 글이 자동 발행됩니다.`, "확인");
    }
  });
}
if ($("clearCafeScheduleBtn")) {
  $("clearCafeScheduleBtn").addEventListener("click", async () => {
    await bridge.clearSchedule();
    cafeScheduleTimes.clear();
    renderCafeSchedule();
    addLog("[카페 예약] 스케줄 삭제 완료");
  });
}

// ── 카페 설정 저장 ──
if ($("saveCafeSettingsBtn")) {
  $("saveCafeSettingsBtn").addEventListener("click", async () => {
    const cfg = (await bridge.loadConfig()) || {};
    cfg.cafe = {
      cafe_id: ($("cafeId") && $("cafeId").value.trim()) || "",
      cafe_number: ($("cafeNumber") && $("cafeNumber").value.trim()) || "",
      menu_id: ($("cafeMenuId") && $("cafeMenuId").value.trim()) || "",
      board_name: ($("cafeBoardName") && $("cafeBoardName").value.trim()) || "",
    };
    await bridge.saveConfig(cfg);
    addLog("[카페] 설정 저장 완료");
  });
}

// 카페 설정 로드
async function loadCafeSettings() {
  const cfg = (await bridge.loadConfig()) || {};
  const cafe = cfg.cafe || {};
  if (cafe.cafe_id && $("cafeId")) $("cafeId").value = cafe.cafe_id;
  if (cafe.cafe_number && $("cafeNumber")) $("cafeNumber").value = cafe.cafe_number;
  if (cafe.menu_id && $("cafeMenuId")) $("cafeMenuId").value = cafe.menu_id;
  if (cafe.board_name && $("cafeBoardName")) $("cafeBoardName").value = cafe.board_name;
  if (cfg.naver_id && $("cafeNaverId")) $("cafeNaverId").value = cfg.naver_id;
  // 카페 자동 운영에 카페 설정 연동
  if (cafe.cafe_id && $("cafeApCafeId")) $("cafeApCafeId").value = cafe.cafe_id;
  if (cafe.cafe_number && $("cafeApCafeNumber")) $("cafeApCafeNumber").value = cafe.cafe_number;
  if (cafe.menu_id && $("cafeApMenuId")) $("cafeApMenuId").value = cafe.menu_id;
  if (cafe.board_name && $("cafeApBoardName")) $("cafeApBoardName").value = cafe.board_name;
  // 카페 자동 운영 상태 복원
  if (cfg.cafe_autopilot && cfg.cafe_autopilot.active) {
    if ($("cafeApTheme")) $("cafeApTheme").value = cfg.cafe_autopilot.theme || "";
    if ($("cafeApCount")) {
      $("cafeApCount").value = cfg.cafe_autopilot.posts_per_day || 5;
      if ($("cafeApCountBadge")) $("cafeApCountBadge").textContent = cfg.cafe_autopilot.posts_per_day || 5;
    }
    if ($("startCafeApBtn")) $("startCafeApBtn").style.display = "none";
    if ($("stopCafeApBtn")) $("stopCafeApBtn").style.display = "";
  }
}

// 카페 subtype chip
let cafeSubtype = "info";
if ($("cafeSubtypeChips")) {
  $("cafeSubtypeChips").addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    $("cafeSubtypeChips").querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
    chip.classList.add("active");
    cafeSubtype = chip.dataset.value;
  });
}

// 카페 발행
if ($("runCafeBtn")) {
  $("runCafeBtn").addEventListener("click", async () => {
    if (!state.loggedIn) {
      alert("먼저 계정 패널에서 메이킷 로그인하세요");
      return;
    }
    if (!requireExeFeature("cafe", "카페 발행은 Pro 이상에서 사용할 수 있습니다.")) return;
    if (state.user && state.user.trial) {
      const remaining = Math.max(0, state.user.trial_limit - state.user.trial_used);
      if (remaining <= 0) {
        showModal("체험 횟수 소진", "무료 체험 횟수가 모두 소진되었습니다.\n구독하면 무제한으로 이용할 수 있습니다.", "구독하기", () => bridge.openExternal("https://snsmakeit.com/pricing"));
        return;
      }
    }
    const cfg = (await bridge.loadConfig()) || {};
    const cafe = cfg.cafe || {};
    if (!cafe.cafe_number || !cafe.menu_id) return showModal("알림","카페 설정을 먼저 저장하세요","확인");
    const naverId = cfg.naver_id;
    if (!naverId) return showModal("알림","네이버 ID를 블로그 자동화에서 먼저 설정하세요","확인");
    const keyword = ($("cafeKeyword") && $("cafeKeyword").value.trim()) || "";
    if (!keyword) return showModal("알림","키워드를 입력하세요","확인");

    $("runCafeBtn").disabled = true;
    clearLog();
    addLog("[카페] 글 생성 + 발행 시작...");
    goToPanel("execlog");
    _deductTrial();

    // 브라우저 자동 실행 안내
    await showModalAsync("안내", "카페 글 작성을 위해 크롬 브라우저가 자동으로 실행됩니다.\n잠시 후 브라우저 창이 열리면 자동으로 글이 작성되니\n완료될 때까지 기다려주세요. (1~3분 소요)", "확인");

    // 글 생성 → 카페 발행
    const merged = {
      ...cfg,
      write: {
        keyword,
        extra: ($("cafeAnalysisExtra") && $("cafeAnalysisExtra").value.trim()) || ($("cafeExtra") && $("cafeExtra").value.trim()) || "",
        subtype: cafeSubtype,
        tone: "friendly",
        speech: "polite_yo",
        wordCount: "medium",
      },
      _cafe_mode: true,
    };
    // 카페 글감분석 선택 제목 저장
    const cafeSelectedTitle = document.querySelector("#cafeSuggestedTitles .suggest-title.selected");
    merged._selected_title = cafeSelectedTitle ? cafeSelectedTitle.dataset.title : "";
    await bridge.saveConfig(merged);
    const r = await bridge.runOnce(merged);

    $("runCafeBtn").disabled = false;
    const resultCard = $("cafeResultCard");
    const resultBody = $("cafeResultBody");
    if (resultCard) resultCard.style.display = "block";

    if (r.ok && r.result && r.result.status === "ok") {
      if (resultBody) resultBody.innerHTML = `<div class="result-success">카페 발행 성공</div><div style="margin-top:10px;font-size:13px;">${escapeHtml(r.result.title || "")}</div>${r.result.post_url ? `<a class="post-url" data-url="${escapeHtml(r.result.post_url)}">${escapeHtml(r.result.post_url)}</a>` : ""}`;
      addPublishHistory({ title: r.result.title, url: r.result.post_url, naver_id: naverId, type: "cafe" });
      playSound("success");
      showModal("카페 발행 완료", `글이 성공적으로 발행되었습니다.\n\n제목: ${r.result.title || ""}`, "확인");
      // 발행된 글 URL을 브라우저에서 자동 열기
      if (r.result.post_url) bridge.openExternal(r.result.post_url);
    } else {
      const err = (r.result && r.result.message) || r.error || "실패";
      if (resultBody) resultBody.innerHTML = `<div class="result-error">실패: ${escapeHtml(err)}</div>`;
      addPublishHistory({ title: "카페 발행 실패", error: err, naver_id: naverId, type: "cafe" });
      playSound("fail");
      showModal("카페 발행 실패", err, "확인");
    }

    // "새로 글쓰기" 버튼 추가 (카페)
    if (resultBody) {
      const newCafeBtn = document.createElement("button");
      newCafeBtn.className = "btn btn-primary btn-full";
      newCafeBtn.style.marginTop = "16px";
      newCafeBtn.textContent = "새로 글쓰기";
      newCafeBtn.addEventListener("click", () => {
        if ($("cafeKeyword")) $("cafeKeyword").value = "";
        if ($("cafeExtra")) $("cafeExtra").value = "";
        if (resultCard) resultCard.style.display = "none";
        goToPanel("naver-cafe");
      });
      resultBody.appendChild(newCafeBtn);
    }
  });
}

// ── 초기 (UI 블로킹 최소화) ──
// 1단계: 동기 UI 즉시 렌더
if (!state.loggedIn) {
  renderPlanCard(null);
  setUserBadge("로그인 필요", "gray");
}

setTimeout(checkForAppUpdate, 2500);

// 봇 상태 동기화 (Python 비정상 종료 시 복구)
if (bridge.isBotRunning) {
  bridge.isBotRunning().then(running => {
    if (state.botRunning && !running) {
      state.botRunning = false;
      addLog("[시스템] 봇 프로세스가 종료된 상태로 확인됨 — 상태 복구");
    }
  });
}

// exe 자동 업데이트 체크 (electron-updater)
setTimeout(async () => {
  if (bridge.checkExeUpdate) {
    try {
      const r = await bridge.checkExeUpdate();
      if (r && r.available) {
        console.log("[ExeUpdate] 새 버전 발견:", r.version, "→ 백그라운드 다운로드 시작");
        bridge.downloadExeUpdate();
      }
    } catch (e) { console.warn("[ExeUpdate]", e); }
  }
}, 5000);

// 2단계: config 로드 + UI 반영 (비동기, 빠름)
bridge.loadConfig().then(async cfg => {
  if (!cfg) return;

  // 설정 복원 (동기적 DOM 조작만)
  if (cfg.naver_id && $("naverId")) $("naverId").value = cfg.naver_id;
  if (cfg.write) {
    ["subtype", "tone", "speech", "wordCount"].forEach(k => {
      if (cfg.write[k]) {
        state[k] = cfg.write[k];
        const map = { subtype: "subtypeChips", tone: "toneChips", speech: "speechChips", wordCount: "wordCountChips" };
        const wrap = $(map[k]);
        if (wrap) wrap.querySelectorAll(".chip").forEach(c => c.classList.toggle("active", c.dataset.value === cfg.write[k]));
      }
    });
  }

  // 계정 리스트 자동 추가
  if (cfg.naver_id) {
    if (!Array.isArray(cfg.naver_accounts)) cfg.naver_accounts = [];
    if (!cfg.naver_accounts.includes(cfg.naver_id)) {
      cfg.naver_accounts.push(cfg.naver_id);
      bridge.saveConfig(cfg);
    }
  }

  renderNaverAccountList();
  loadCafeSettings();
  restoreAutopilotStatus();
  renderCalendar();
  renderDashboardAutopilot();

  // 자동 로그인 (즉시 UI 반영)
  const savedEmail = cfg.makeit_email || "";
  const isAdminBoot = ADMIN_EMAILS.includes(savedEmail.toLowerCase());

  if (cfg.makeit_access_token && savedEmail) {
    const nick = savedEmail.split("@")[0];
    const cachedUsed = isAdminBoot ? 0 : await bridge.getTrialUsed();
    _trialUsedCache = cachedUsed;
    state.loggedIn = true;
    state.user = {
      valid: true, email: savedEmail, nick,
      plan: isAdminBoot ? "admin" : (cfg._cached_plan || ""),
      role: isAdminBoot ? "admin" : "",
      trial: isAdminBoot ? false : !cfg._cached_plan,
      trial_used: cachedUsed,
      trial_limit: isAdminBoot ? 999999 : 5,
      admin: isAdminBoot,
    };
    setUserBadge(isAdminBoot ? `관리자 · ${nick}` : nick, "green");
    const loginCard = document.getElementById("loginCard");
    if (loginCard) loginCard.style.display = "none";
    renderPlanCard(state.user);
    if (isAdminBoot) addLog("[계정] 관리자 자동 로그인");
  } else if (savedEmail) {
    setUserBadge("다시 로그인 필요", "gray");
  }

  // 3단계: verify는 완전 지연 (UI 렌더 후 3초 뒤)
  setTimeout(async () => {
    if (cfg.makeit_access_token || cfg.makeit_email) {
      let r = await bridge.verifyAccount().catch(() => ({ ok: false }));

      // verify 실패 시 토큰 갱신 시도
      if (!r.ok || !r.result || r.result.status !== "ok") {
        if (cfg.makeit_refresh_token) {
          addLog("[계정] 토큰 만료, 갱신 시도 중...");
          const refreshR = await bridge.refreshToken(cfg.makeit_refresh_token).catch(() => null);
          if (refreshR && refreshR.ok && refreshR.access_token) {
            const c2 = (await bridge.loadConfig()) || {};
            c2.makeit_access_token = refreshR.access_token;
            if (refreshR.refresh_token) c2.makeit_refresh_token = refreshR.refresh_token;
            await bridge.saveConfig(c2);
            addLog("[계정] 토큰 갱신 성공");
            r = await bridge.verifyAccount().catch(() => ({ ok: false }));
          }
        }
      }

      handleVerifyResult(r, cfg.makeit_email || "");
      if (r.ok && r.result) {
        const c = (await bridge.loadConfig()) || {};
        const maxUsed = Math.max(_trialUsedCache, r.result.trial_used || 0);
        _setTrialUsed(maxUsed);
        c._cached_trial_used = maxUsed;
        c._cached_plan = r.result.plan || "";
        await bridge.saveConfig(c);
      }
    }
  }, 3000);
});

// ══════════════════════════════════════════════
//  키워드 분석 도구
// ══════════════════════════════════════════════
(function initKeywordAnalysis() {
  const API_BASE = "https://snsmakeit.com/api";
  let kaCategory = "all";

  const $keyword = document.getElementById("kaKeyword");
  const $searchBtn = document.getElementById("kaSearchBtn");
  const $loading = document.getElementById("kaLoading");
  const $error = document.getElementById("kaError");
  const $volumeCards = document.getElementById("kaVolumeCards");
  const $topResults = document.getElementById("kaTopResults");
  const $related = document.getElementById("kaRelated");
  const $catRanking = document.getElementById("kaCatRanking");

  // 카테고리 칩
  const catWrap = document.getElementById("kaCategoryChips");
  if (catWrap) {
    catWrap.addEventListener("click", e => {
      const btn = e.target.closest(".chip");
      if (!btn) return;
      catWrap.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
      btn.classList.add("active");
      kaCategory = btn.dataset.value;
    });
  }

  function fmt(n) {
    if (!n) return "0";
    if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
    if (n >= 1000) return (n / 1000).toFixed(1) + "K";
    return n.toLocaleString();
  }

  function hideAll() {
    [$volumeCards, $topResults, $related, $catRanking, $error].forEach(el => { if (el) el.style.display = "none"; });
  }

  async function analyze() {
    const kw = ($keyword.value || "").trim();
    if (!kw && kaCategory === "all") return;
    const searchKw = kw || getCatLabel(kaCategory);

    hideAll();
    $loading.style.display = "block";
    $searchBtn.disabled = true;
    $searchBtn.textContent = "분석 중...";

    try {
      const res = await fetch(`${API_BASE}/keyword-analysis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: searchKw, category: kaCategory }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "분석 실패");
      renderResult(data);
    } catch (e) {
      $error.textContent = e.message || "서버 연결 실패";
      $error.style.display = "block";
    }
    $loading.style.display = "none";
    $searchBtn.disabled = false;
    $searchBtn.textContent = "분석";
  }

  function renderResult(data) {
    // 검색량 카드
    if (data.naver) {
      document.getElementById("kaBlogTotal").textContent = fmt(data.naver.blog.total);
      document.getElementById("kaNewsTotal").textContent = fmt(data.naver.news.total);
      document.getElementById("kaCafeTotal").textContent = fmt(data.naver.cafe.total);
      $volumeCards.style.display = "grid";

      // 상위 결과
      renderTopList("kaBlogList", data.naver.blog.items);
      renderTopList("kaNewsList", data.naver.news.items);
      $topResults.style.display = "grid";
    }

    // 연관 검색어
    if (data.related && data.related.length) {
      const wrap = document.getElementById("kaRelatedTags");
      wrap.innerHTML = data.related.map(kw =>
        `<button class="ka-tag" data-kw="${esc(kw)}">${esc(kw)}</button>`
      ).join("");
      $related.style.display = "block";
    }

    // 카테고리 랭킹
    if (data.categoryRanking && data.categoryRanking.length) {
      const catLabel = getCatLabel(kaCategory);
      document.getElementById("kaCatTitle").textContent = `${catLabel} 인기 키워드`;
      const maxVal = data.categoryRanking[0]?.blogTotal || 1;
      document.getElementById("kaCatList").innerHTML = data.categoryRanking.map((item, i) => {
        const pct = Math.max((item.blogTotal / maxVal) * 100, 3);
        const isTop = i < 3;
        return `<div class="ka-rank-row">
          <span class="ka-rank-num" style="color:${isTop ? "var(--primary)" : "var(--text-dim)"}">${i + 1}</span>
          <div class="ka-rank-bar-wrap">
            <div class="ka-rank-bar" style="width:${pct}%;background:${isTop ? "var(--primary-bg)" : "var(--bg-elev)"}"></div>
            <button class="ka-rank-label" data-kw="${esc(item.keyword)}">${esc(item.keyword)}</button>
          </div>
          <span class="ka-rank-val">${fmt(item.blogTotal)}</span>
        </div>`;
      }).join("");
      $catRanking.style.display = "block";
    }
  }

  function renderTopList(id, items) {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = (items || []).map((item, i) =>
      `<a href="${esc(item.link)}" class="ka-top-item" target="_blank">
        <span class="ka-top-num">${i + 1}</span>${esc(item.title)}
      </a>`
    ).join("");
  }

  function esc(s) { return (s || "").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }

  function getCatLabel(key) {
    const m = { all: "트렌드", beauty: "뷰티", food: "맛집/요리", travel: "여행", it: "IT/테크", health: "건강/운동", finance: "재테크", parenting: "육아", pet: "반려동물" };
    return m[key] || key;
  }

  // 이벤트
  if ($searchBtn) $searchBtn.addEventListener("click", analyze);
  if ($keyword) $keyword.addEventListener("keydown", e => { if (e.key === "Enter") analyze(); });

  // 연관검색어/랭킹 키워드 클릭 → 재검색
  document.addEventListener("click", e => {
    const tag = e.target.closest("[data-kw]");
    if (tag && tag.dataset.kw) {
      $keyword.value = tag.dataset.kw;
      analyze();
    }
  });

  // 외부 링크 열기
  document.addEventListener("click", e => {
    const a = e.target.closest("a[target='_blank']");
    if (a && a.href && bridge?.openExternal) {
      e.preventDefault();
      bridge.openExternal(a.href);
    }
  });
})();

// ══════════════════════════════════════════════════════════
// 새로 시작하기 버튼
// ══════════════════════════════════════════════════════════
function resetToStart() {
  // 입력 필드 초기화
  if ($("autopilotTheme")) $("autopilotTheme").value = "";
  if ($("autopilotCategory")) $("autopilotCategory").value = "";
  if ($("autopilotPrompt")) $("autopilotPrompt").value = "";
  if ($("autopilotCount")) $("autopilotCount").value = "3";
  if ($("quickTheme")) $("quickTheme").value = "";
  if ($("quickCategory")) $("quickCategory").value = "";
  if ($("quickTitle")) $("quickTitle").value = "";
  // Step 1로 돌아가기
  if (typeof goApStep === "function") goApStep(1);
  // 발행 방식 선택 화면으로
  if (typeof showBlogMode === "function") showBlogMode(null);
  // 블로그 패널로 이동
  goToPanel("naver-blog");
}

if ($("blogResetBtn")) $("blogResetBtn").addEventListener("click", resetToStart);
if ($("execResetBtn")) $("execResetBtn").addEventListener("click", resetToStart);

// 튜토리얼 제거됨

// ══════════════════════════════════════════════════════════
// 다중계정 설정 저장 (계정별로 설정 자동 저장/복원)
// ══════════════════════════════════════════════════════════
(function initAccountProfiles() {
  let _prevAccountId = "";

  async function saveCurrentAccountProfile() {
    if (!_prevAccountId) return;
    const cfg = (await bridge.loadConfig()) || {};
    if (!cfg._account_profiles) cfg._account_profiles = {};
    cfg._account_profiles[_prevAccountId] = {
      write: cfg.write || {},
      autopilot: cfg.autopilot || {},
      autopilot_presets: cfg.autopilot_presets || [],
    };
    await bridge.saveConfig(cfg);
  }

  async function loadAccountProfile(accountId) {
    if (!accountId) return;
    const cfg = (await bridge.loadConfig()) || {};
    const profiles = cfg._account_profiles || {};
    const profile = profiles[accountId];
    if (!profile) return;
    // write 설정 복원
    if (profile.write) {
      cfg.write = { ...cfg.write, ...profile.write };
    }
    if (profile.autopilot) {
      cfg.autopilot = { ...cfg.autopilot, ...profile.autopilot };
    }
    if (profile.autopilot_presets) {
      cfg.autopilot_presets = profile.autopilot_presets;
    }
    await bridge.saveConfig(cfg);
  }

  // 네이버 계정 변경 감지
  const naverIdInput = $("naverId");
  if (naverIdInput) {
    _prevAccountId = naverIdInput.value.trim();

    // 계정 클릭으로 전환 시 (renderNaverAccountList 내부에서 value 변경)
    const _origRenderList = window.renderNaverAccountList;
    if (typeof _origRenderList === "function") {
      window.renderNaverAccountList = async function() {
        await _origRenderList.apply(this, arguments);
        const newId = naverIdInput.value.trim();
        if (newId !== _prevAccountId) {
          await saveCurrentAccountProfile();
          _prevAccountId = newId;
          await loadAccountProfile(newId);
          // UI에 설정 반영
          if (typeof loadSavedConfig === "function") await loadSavedConfig();
        }
      };
    }

    // 직접 입력으로 변경 시
    naverIdInput.addEventListener("change", async () => {
      const newId = naverIdInput.value.trim();
      if (newId !== _prevAccountId) {
        await saveCurrentAccountProfile();
        _prevAccountId = newId;
        await loadAccountProfile(newId);
        if (typeof loadSavedConfig === "function") await loadSavedConfig();
      }
    });
  }
})();

// ══════════════════════════════════════════════════════════
// 영상 편집 (숏폼 + 롱폼) — 로컬 ffmpeg 처리
// ══════════════════════════════════════════════════════════
(function initVideoEditors() {
  if (!bridge.videoSelectFile) return;
  const API = "https://shorts-factory-r33o.onrender.com";

  // ── 숏폼 ──
  const vs = {
    filePath: null, fileInfo: null, count: 3, length: 30,
    el: { selectFile: $("vsSelectFile"), fileInfo: $("vsFileInfo"), startBtn: $("vsStartBtn"),
      inputCard: $("vsInputCard"), progressCard: $("vsProgressCard"), progressPct: $("vsProgressPct"),
      progressLabel: $("vsProgressLabel"), progressSub: $("vsProgressSub"), progressBar: $("vsProgressBar"),
      cancelBtn: $("vsCancelBtn"), resultArea: $("vsResultArea") },
  };

  // 칩 초기화
  function initChipGroup(id, defaultVal, cb) {
    const wrap = $(id); if (!wrap) return;
    wrap.addEventListener("click", e => {
      const btn = e.target.closest(".chip"); if (!btn) return;
      wrap.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
      btn.classList.add("active");
      cb(btn.dataset.value);
    });
  }
  initChipGroup("vsCountChips", "3", v => { vs.count = parseInt(v); });
  initChipGroup("vsLengthChips", "30", v => { vs.length = parseInt(v); });

  // 파일 선택
  vs.el.selectFile?.addEventListener("click", async () => {
    const r = await bridge.videoSelectFile();
    if (!r.ok) return;
    vs.filePath = r.filePath;
    const info = await bridge.videoProbe(r.filePath);
    vs.fileInfo = info;
    const name = r.filePath.split(/[\\/]/).pop();
    const dur = info.ok ? `${Math.floor(info.duration/60)}:${String(Math.floor(info.duration%60)).padStart(2,"0")}` : "";
    const size = info.ok ? `${(info.size/1e6).toFixed(1)}MB` : "";
    vs.el.fileInfo.style.display = "";
    vs.el.fileInfo.innerHTML = `<strong>${escapeHtml(name)}</strong> ${dur} · ${size} · ${info.width}x${info.height}`;
    vs.el.startBtn.disabled = false;
  });

  // 진행률 수신
  bridge.onVideoProgress?.((d) => {
    if (vs.el.progressCard.style.display !== "none") {
      vs.el.progressPct.textContent = d.percent + "%";
      vs.el.progressBar.style.width = d.percent + "%";
      if (d.clip) vs.el.progressSub.textContent = `클립 ${d.clip}/${d.total}`;
    }
    if ($("vlProgressCard") && $("vlProgressCard").style.display !== "none") {
      $("vlProgressPct").textContent = d.percent + "%";
      $("vlProgressBar").style.width = d.percent + "%";
    }
  });

  // 시작
  vs.el.startBtn?.addEventListener("click", async () => {
    if (!vs.filePath) return;
    vs.el.inputCard.style.display = "none";
    vs.el.progressCard.style.display = "";
    vs.el.resultArea.style.display = "none";
    vs.el.progressPct.textContent = "0%";
    vs.el.progressBar.style.width = "0%";
    vs.el.progressLabel.textContent = "AI 분석 중 (서버)...";
    vs.el.progressSub.textContent = "하이라이트 구간 추출 + 자막 생성";

    try {
      // 1) 서버 업로드 + 분석
      const form = new FormData();
      const blob = new Blob([await (await fetch("file:///" + vs.filePath.replace(/\\/g, "/"))).arrayBuffer()]);
      form.append("video", blob, vs.filePath.split(/[\\/]/).pop());

      vs.el.progressLabel.textContent = "서버에 업로드 중...";
      const upResp = await fetch(`${API}/upload`, { method: "POST", body: form });
      if (!upResp.ok) throw new Error("업로드 실패");
      const upData = await upResp.json();
      vs.el.progressPct.textContent = "25%"; vs.el.progressBar.style.width = "25%";

      vs.el.progressLabel.textContent = "AI 분석 중...";
      const analyzeResp = await fetch(`${API}/analyze/${upData.file_id}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ max_segments: vs.count }),
      });
      if (!analyzeResp.ok) throw new Error("분석 실패");
      const analyzeData = await analyzeResp.json();
      const clips = (analyzeData.segments || []).slice(0, vs.count).map(s => ({
        ...s, title: s.hook || s.hook_text || s.title || "",
        subtitles: s.subtitles || [],
      }));
      vs.el.progressPct.textContent = "50%"; vs.el.progressBar.style.width = "50%";

      if (!clips.length) throw new Error("하이라이트 구간을 찾지 못했습니다");

      // 2) 로컬 ffmpeg 렌더링
      vs.el.progressLabel.textContent = "로컬 렌더링 중...";
      vs.el.progressSub.textContent = "ffmpeg (PC에서 직접 처리, 빠름)";
      const result = await bridge.videoRenderShorts({
        inputPath: vs.filePath, clips, outputDir: null,
        template: "minimal", subtitlesEnabled: true,
      });

      if (!result.ok) throw new Error(result.error || "렌더링 실패");

      // 3) 결과 표시
      vs.el.progressCard.style.display = "none";
      vs.el.resultArea.style.display = "";
      vs.el.resultArea.innerHTML = `
        <div class="panel-header" style="margin-bottom:12px;">
          <h1 style="font-size:18px;">${result.results.length}개 쇼츠 완성</h1>
          <p class="panel-sub">아래에서 파일을 확인하세요</p>
        </div>
        ${result.results.map((r, i) => `
          <div class="card" style="display:flex;align-items:center;justify-content:space-between;">
            <div>
              <div style="font-size:14px;font-weight:700;color:var(--text);">Short ${r.index + 1}</div>
              <div style="font-size:11px;color:var(--text-dim);margin-top:2px;">${escapeHtml(r.filename)}</div>
            </div>
            <button class="btn btn-outline btn-sm" onclick="bridge.openExternal('file:///${r.path.replace(/\\/g, "/").split("/").slice(0, -1).join("/")}')">폴더 열기</button>
          </div>
        `).join("")}
        <button class="btn btn-primary btn-full" style="margin-top:12px;" onclick="
          document.getElementById('vsInputCard').style.display='';
          document.getElementById('vsResultArea').style.display='none';
        ">새 영상</button>
      `;
    } catch (e) {
      vs.el.progressCard.style.display = "none";
      vs.el.inputCard.style.display = "";
      showModal("오류", e.message || "처리 실패", "확인");
    }
  });

  vs.el.cancelBtn?.addEventListener("click", () => {
    bridge.videoCancel();
    vs.el.progressCard.style.display = "none";
    vs.el.inputCard.style.display = "";
  });

  // ── 롱폼 ──
  const vl = {
    filePath: null,
    el: { selectFile: $("vlSelectFile"), fileInfo: $("vlFileInfo"), startBtn: $("vlStartBtn"),
      inputCard: $("vlInputCard"), progressCard: $("vlProgressCard"), progressPct: $("vlProgressPct"),
      progressLabel: $("vlProgressLabel"), progressBar: $("vlProgressBar"),
      cancelBtn: $("vlCancelBtn"), resultArea: $("vlResultArea") },
  };

  vl.el.selectFile?.addEventListener("click", async () => {
    const r = await bridge.videoSelectFile();
    if (!r.ok) return;
    vl.filePath = r.filePath;
    const info = await bridge.videoProbe(r.filePath);
    const name = r.filePath.split(/[\\/]/).pop();
    const dur = info.ok ? `${Math.floor(info.duration/60)}:${String(Math.floor(info.duration%60)).padStart(2,"0")}` : "";
    vl.el.fileInfo.style.display = "";
    vl.el.fileInfo.innerHTML = `<strong>${escapeHtml(name)}</strong> ${dur} · ${(info.size/1e6).toFixed(1)}MB`;
    vl.el.startBtn.disabled = false;
  });

  vl.el.startBtn?.addEventListener("click", async () => {
    if (!vl.filePath) return;
    vl.el.inputCard.style.display = "none";
    vl.el.progressCard.style.display = "";
    vl.el.resultArea.style.display = "none";
    vl.el.progressPct.textContent = "0%";
    vl.el.progressBar.style.width = "0%";
    vl.el.progressLabel.textContent = "서버에 업로드 중...";

    try {
      // 1) 서버 업로드 + STT
      const form = new FormData();
      const blob = new Blob([await (await fetch("file:///" + vl.filePath.replace(/\\/g, "/"))).arrayBuffer()]);
      form.append("video", blob, vl.filePath.split(/[\\/]/).pop());
      const upResp = await fetch(`${API}/upload`, { method: "POST", body: form });
      if (!upResp.ok) throw new Error("업로드 실패");
      const upData = await upResp.json();
      vl.el.progressPct.textContent = "20%"; vl.el.progressBar.style.width = "20%";

      vl.el.progressLabel.textContent = "AI 음성 인식 중...";
      const sttResp = await fetch(`${API}/analyze/${upData.file_id}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ max_segments: 3, longform: true, full_subtitles: true }),
      });
      if (!sttResp.ok) throw new Error("음성 인식 실패");
      const sttData = await sttResp.json();
      vl.el.progressPct.textContent = "50%"; vl.el.progressBar.style.width = "50%";

      // 자막 추출
      let subs = [];
      const segments = sttData.segments || [];
      const fullSubs = sttData.all_subs || sttData.full_transcript;
      if (fullSubs && Array.isArray(fullSubs)) subs = fullSubs;
      if (!subs.length) {
        for (const seg of segments) {
          if (seg.subtitles?.length) subs.push(...seg.subtitles);
          else if (seg.script) {
            const ss = seg.start_seconds || 0, se = seg.end_seconds || 60;
            const chunks = seg.script.match(/.{1,18}/g) || [];
            const cd = (se - ss) / Math.max(1, chunks.length);
            chunks.forEach((t, i) => subs.push({ start: ss + i * cd, end: ss + (i+1) * cd, text: t.trim() }));
          }
        }
      }
      if (!subs.length) throw new Error("자막을 생성하지 못했습니다");

      // 2) 로컬 ffmpeg 렌더링
      vl.el.progressLabel.textContent = "로컬 렌더링 중 (자막 번인)...";
      const result = await bridge.videoRenderLongform({
        inputPath: vl.filePath, subtitles: subs, subtitlesEnabled: true,
        captionStyle: { fontSize: 18, color: "#FFFFFF" },
      });

      if (!result.ok) throw new Error(result.error || "렌더링 실패");

      // 3) 결과
      vl.el.progressCard.style.display = "none";
      vl.el.resultArea.style.display = "";
      vl.el.resultArea.innerHTML = `
        <div class="card" style="text-align:center;padding:24px;">
          <div style="font-size:18px;font-weight:800;color:var(--text);margin-bottom:8px;">편집 완료</div>
          <div style="font-size:12px;color:var(--text-dim);margin-bottom:16px;">${subs.length}개 자막이 입혀졌습니다</div>
          <div style="font-size:12px;color:var(--text-sub);margin-bottom:16px;word-break:break-all;">${escapeHtml(result.outputPath)}</div>
          <button class="btn btn-primary btn-full" onclick="bridge.openExternal('file:///${result.outputPath.replace(/\\/g, "/").split("/").slice(0, -1).join("/")}')">폴더 열기</button>
          <button class="btn btn-outline btn-full" style="margin-top:8px;" onclick="
            document.getElementById('vlInputCard').style.display='';
            document.getElementById('vlResultArea').style.display='none';
          ">새 영상</button>
        </div>
      `;
    } catch (e) {
      vl.el.progressCard.style.display = "none";
      vl.el.inputCard.style.display = "";
      showModal("오류", e.message || "처리 실패", "확인");
    }
  });

  vl.el.cancelBtn?.addEventListener("click", () => {
    bridge.videoCancel();
    vl.el.progressCard.style.display = "none";
    vl.el.inputCard.style.display = "";
  });
})();
