// 메이킷자동화 renderer - UI 로직 (v2 Clean)
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
    maxPostsPerRun: 3,
    maxDurationDays: 7,
    canSchedule: true,
    canCafe: false,
    desc: "블로그 자동 운영 7일 체험 · 1회 3개 · 카페 제한",
  },
  starter: {
    label: "Basic",
    maxPostsPerRun: 5,
    maxDurationDays: 30,
    canSchedule: true,
    canCafe: false,
    desc: "블로그 자동 운영 · 1회 최대 5개 · 카페 제한",
  },
  pro: {
    label: "Pro",
    maxPostsPerRun: 3,
    maxDurationDays: 0,
    canSchedule: true,
    canCafe: false,
    desc: "블로그 자동 운영 · 하루 최대 3개 · 카페 제한",
  },
  premium: {
    label: "Business",
    maxPostsPerRun: 10,
    maxDurationDays: 0,
    canSchedule: true,
    canCafe: true,
    desc: "블로그/카페 자동 운영 · 하루 최대 10개",
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
  quick: 10,
  autopilot: 3,
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
        <div class="plan-feature-value ${rules.canCafe ? "ok" : "locked"}">${rules.canCafe ? "가능" : "Business 이상"}</div>
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
    showModal("Business 기능", message || "카페 발행은 Business 이상에서 사용할 수 있습니다.", "구독하기", () => bridge.openExternal("https://snsmakeit.com/pricing"));
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
const LOGIN_FREE_PANELS = ["home", "pricing", "about", "video-editor", "manual-write", "cardnews"];
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

    // 영상 편집기: 숏폼/롱폼 자동 선택
    if (target === "video-editor" && item.dataset.veType) {
      var veType = item.dataset.veType;
      var typeChips = document.querySelectorAll("#veTypeChips .chip");
      typeChips.forEach(function(c) { c.classList.toggle("active", c.dataset.value === veType); });
      // state 업데이트 트리거
      var activeChip = document.querySelector('#veTypeChips .chip[data-value="' + veType + '"]');
      if (activeChip) activeChip.click();
    }

    // 패널별 진입 시 렌더링
    if (target === "home") renderHomeDashboard();
    if (target === "pricing") renderPricingPanel();
    if (target === "manual-write") updateWriteQuota();
    if (target === "cardnews") updateCardQuota();
  });
});

// 횟수 표시 (수동 글쓰기)
async function updateWriteQuota() {
  const el = $("writeQuotaInfo");
  if (!el) return;
  if (!state.loggedIn) { el.textContent = "로그인 후 이용 가능"; return; }
  try {
    const cfg = (await bridge.loadConfig()) || {};
    const today = new Date().toISOString().slice(0, 10);
    const used = cfg._manual_write_date === today ? (cfg._manual_write_used || 0) : 0;
    const planKey = normalizeExePlan(state.user);
    const limits = { trial: 3, starter: 5, pro: 20, premium: 99999, admin: 99999 };
    const limit = limits[planKey] || 3;
    const remaining = Math.max(0, limit - used);
    el.textContent = limit >= 99999 ? `오늘 ${used}회 사용` : `오늘 남은 횟수: ${remaining}/${limit}회`;
    el.style.color = remaining <= 1 && limit < 99999 ? "#ef4444" : "var(--text-dim)";
  } catch { el.textContent = ""; }
}

// 횟수 표시 (카드뉴스)
async function updateCardQuota() {
  const el = $("cardQuotaInfo");
  if (!el) return;
  if (!state.loggedIn) { el.textContent = "로그인 후 이용 가능"; return; }
  try {
    const cfg = (await bridge.loadConfig()) || {};
    const today = new Date().toISOString().slice(0, 10);
    const used = cfg._cardnews_date === today ? (cfg._cardnews_used || 0) : 0;
    const planKey = normalizeExePlan(state.user);
    const limits = { trial: 2, starter: 3, pro: 10, premium: 99999, admin: 99999 };
    const limit = limits[planKey] || 2;
    const remaining = Math.max(0, limit - used);
    el.textContent = limit >= 99999 ? `오늘 ${used}회 사용` : `오늘 남은 횟수: ${remaining}/${limit}회`;
    el.style.color = remaining <= 1 && limit < 99999 ? "#ef4444" : "var(--text-dim)";
  } catch { el.textContent = ""; }
}

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
    발행 한도: ${escapeHtml(postLimit)} · 카페 발행: ${rules.canCafe ? "가능" : "Business 이상"} · 예약 발행: ${rules.canSchedule ? "가능" : "제한"}
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

  const label = kind === "quick" ? "즉시 발행 10회" : "자동 운영 3회";
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

// ── 아바타 선택 (프로필 캐릭터) ──
document.addEventListener("click", function(e) {
  var avatarEl = e.target.closest(".avatar");
  if (!avatarEl) return;
  if (typeof window._showAvatarPicker !== "function") return;
  window._showAvatarPicker(async function(idx, url) {
    // 선택한 아바타를 config에 저장
    var cfg = await bridge.loadConfig() || {};
    cfg._avatar_idx = idx;
    cfg._avatar_url = url;
    await bridge.saveConfig(cfg);
    // 모든 .avatar 요소 업데이트
    document.querySelectorAll(".avatar").forEach(function(el) {
      el.innerHTML = "<img src='" + url + "' style='width:100%;height:100%;border-radius:50%;object-fit:cover;'>";
    });
  });
});

// 앱 시작 시 저장된 아바타 복원
(async function restoreAvatar() {
  var cfg = await bridge.loadConfig();
  if (cfg && cfg._avatar_url) {
    setTimeout(function() {
      document.querySelectorAll(".avatar").forEach(function(el) {
        el.innerHTML = "<img src='" + cfg._avatar_url + "' style='width:100%;height:100%;border-radius:50%;object-fit:cover;'>";
      });
    }, 500);
  }
})();

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
        if (!wrap) return;
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
  if (_loginInProgress) {
    // 30초 이상 대기 시 리셋
    setLoginBtnState(false);
    return;
  }
  setLoginBtnState(true);
  addLog("[계정] 로그인 창 여는 중...");
  setUserBadge("대기 중...", "gray");
  // 60초 후 자동 리셋 (로그인 창 닫힌 경우)
  setTimeout(() => { if (_loginInProgress) setLoginBtnState(false); }, 60000);
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
      trial_limit: isAdmin ? 999999 : (r.result.trial_limit || 10),
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
  if (!requireExeFeature("cafe", "카페 자동 운영은 Business 이상에서 사용할 수 있습니다.")) return;
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
    if (!requireExeFeature("cafe", "카페 발행은 Business 이상에서 사용할 수 있습니다.")) return;
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
      trial_limit: isAdminBoot ? 999999 : 10,
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
// 영상 편집기 (통합) — 업로드 → 분석 → 편집 → 내보내기
// ══════════════════════════════════════════════════════════
(function initVideoEditor() {
  if (!bridge.videoSelectFile) return;
  var API_URL = "https://shorts-factory-r33o.onrender.com";
  var ve = { filePath:null, fileInfo:null, fileId:null, segments:[], subtitles:[], type:"shorts", clipCount:3, subEnabled:true, silenceRemove:false, subSize:38, subColor:"#FFFFFF", duration:0 };

  function goStep(n) { for (var i=1;i<=5;i++) { var el=$("veStep"+i); if(el) el.style.display=(i===n)?"":"none"; } }
  function setProg(pId,bId,lId,pct,label) { var p=$(pId),b=$(bId),l=$(lId); if(p) p.textContent=pct+"%"; if(b) b.style.width=pct+"%"; if(l&&label) l.textContent=label; }
  function chipG(id,cb) { var w=$(id); if(!w) return; w.addEventListener("click",function(e){ var b=e.target.closest(".chip"); if(!b) return; w.querySelectorAll(".chip").forEach(function(c){c.classList.remove("active")}); b.classList.add("active"); cb(b.dataset.value); }); }

  chipG("veTypeChips",function(v){ ve.type=v; var so=$("veShortsOpts"),lo=$("veLongformOpts"),sc=$("veSegmentsCard"); if(v==="shorts"){if(so)so.style.display="";if(lo)lo.style.display="none";if(sc)sc.style.display="";}else{if(so)so.style.display="none";if(lo)lo.style.display="";if(sc)sc.style.display="none";}
    // 롱폼 vs 숏폼 레이아웃 전환
    applyVeLayout(v);
  });

  function applyVeLayout(mode) {
    var layout = $("veMainLayout");
    var videoWrap = $("veVideoWrap");
    var video = $("veVideo");
    var timeline = $("veTimeline");
    var settingsPanel = document.querySelector("#veStep3 > div:nth-child(2) > div:last-child");
    if (!layout) return;

    if (mode === "longform") {
      // 롱폼: 와이드 16:9 프리뷰, 넓은 타임라인
      layout.style.height = "calc(100vh - 380px)";
      if (videoWrap) { videoWrap.style.aspectRatio = "16/9"; videoWrap.style.background = "#000"; }
      if (video) video.style.objectFit = "contain";
      if (timeline) { timeline.style.padding = "10px 10px"; }
      if (settingsPanel) settingsPanel.style.width = "240px";
      // 자막 목록 더 크게
      var subList = $("veSubtitleList");
      if (subList) subList.style.maxHeight = "300px";
    } else {
      // 숏폼: 세로 비율 프리뷰
      layout.style.height = "calc(100vh - 320px)";
      if (videoWrap) { videoWrap.style.aspectRatio = ""; videoWrap.style.background = "#0a0a0a"; }
      if (video) video.style.objectFit = "contain";
      if (timeline) { timeline.style.padding = "8px 10px"; }
      if (settingsPanel) settingsPanel.style.width = "280px";
      var subList = $("veSubtitleList");
      if (subList) subList.style.maxHeight = "200px";
    }
  }

  // 탭 전환
  document.querySelectorAll(".ve-tab-btn").forEach(function(btn){
    btn.addEventListener("click",function(){
      document.querySelectorAll(".ve-tab-btn").forEach(function(b){b.classList.remove("active")});
      btn.classList.add("active");
      document.querySelectorAll(".ve-tab-content").forEach(function(t){t.style.display="none"});
      var tab = btn.dataset.veTab;
      if(tab==="sub") $("veTabSub").style.display="";
      else if(tab==="clip") $("veTabClip").style.display="";
      else if(tab==="image") $("veTabImage").style.display="";
    });
  });

  // 줌
  var timelineZoom = 1;
  var zIn=$("veZoomIn"),zOut=$("veZoomOut");
  if(zIn) zIn.addEventListener("click",function(){ timelineZoom=Math.min(5,timelineZoom*1.3); renderTimeline(); });
  if(zOut) zOut.addEventListener("click",function(){ timelineZoom=Math.max(0.5,timelineZoom/1.3); renderTimeline(); });

  // AI 짤 자동 삽입
  var autoImgBtn=$("veAutoImageBtn"); if(autoImgBtn) autoImgBtn.addEventListener("click",async function(){
    if(!ve.subtitles.length){showModal("자막 필요","먼저 영상을 분석해주세요.","확인");return;}
    autoImgBtn.disabled=true; autoImgBtn.textContent="AI 분석 중...";
    try{
      // 자막에서 키워드 추출 → Unsplash에서 이미지 검색
      var text=ve.subtitles.map(function(s){return s.text}).join(" ");
      var keywords=text.replace(/[^가-힣a-zA-Z\s]/g,"").split(/\s+/).filter(function(w){return w.length>=2}).slice(0,5);
      var dur=ve.duration||60;
      var interval=Math.max(10,dur/Math.min(5,keywords.length||1));
      ve.overlays=[];
      for(var ki=0;ki<Math.min(5,keywords.length);ki++){
        try{
          var resp=await fetch("https://snsmakeit.com/api/image?action=search&q="+encodeURIComponent(keywords[ki])+"&count=1");
          var data=await resp.json();
          var imgUrl=(data.results&&data.results[0]&&data.results[0].urls)?data.results[0].urls.small:null;
          if(imgUrl){
            ve.overlays.push({path:imgUrl,startTime:ki*interval,endTime:ki*interval+3,x:10,y:10,width:120,height:120,isUrl:true});
          }
        }catch(e){}
      }
      renderImageList(); renderImageTrack();
    }catch(e){showModal("실패",e.message||"AI 짤 삽입 실패","확인");}
    autoImgBtn.disabled=false; autoImgBtn.textContent="AI 짤 삽입";
  });
  chipG("veClipCountChips",function(v){ve.clipCount=parseInt(v)});
  chipG("veSubChips",function(v){ve.subEnabled=v==="on"});
  chipG("veSilenceChips",function(v){ve.silenceRemove=v==="on"});
  chipG("veSubColorChips",function(v){ve.subColor=v;var el=$("veSubColor");if(el)el.value=v});

  var slider=$("veSubSize"); if(slider) slider.addEventListener("input",function(e){ve.subSize=parseInt(e.target.value);var l=$("veSubSizeLabel");if(l)l.textContent=ve.subSize+"px";});
  var cp=$("veSubColor"); if(cp) cp.addEventListener("input",function(e){ve.subColor=e.target.value});

  if(bridge.onVideoProgress) bridge.onVideoProgress(function(d){ var s4=$("veStep4"); if(s4&&s4.style.display!=="none") setProg("veExportPct","veExportBar","veExportSub",d.percent,d.clip?"클립 "+d.clip+"/"+d.total:""); });

  // 파일 선택
  var selBtn=$("veSelectFile"); if(selBtn) selBtn.addEventListener("click",async function(){
    var r=await bridge.videoSelectFile(); if(!r.ok) return;
    ve.filePath=r.filePath; var info=await bridge.videoProbe(r.filePath); ve.fileInfo=info; ve.duration=info.ok?info.duration:0;
    var name=r.filePath.split(/[\\/]/).pop(); var dur=info.ok?Math.floor(info.duration/60)+":"+String(Math.floor(info.duration%60)).padStart(2,"0"):""; var size=info.ok?(info.size/1e6).toFixed(1)+"MB":"";
    var fi=$("veFileInfo"); if(fi){fi.style.display="";fi.innerHTML="<strong>"+escapeHtml(name)+"</strong>&nbsp; "+dur+" · "+size+" · "+(info.width||0)+"x"+(info.height||0);}
    var ab=$("veAnalyzeBtn"); if(ab) ab.disabled=false;
  });

  // AI 분석
  var aBtn=$("veAnalyzeBtn"); if(aBtn) aBtn.addEventListener("click",async function(){
    if(!ve.filePath) return; goStep(2); setProg("veAnalyzePct","veAnalyzeBar","veAnalyzeLabel",5,"서버에 업로드 + AI 분석 중...");
    try {
      var result=await bridge.videoUploadAndAnalyze(ve.filePath, 5);
      if(!result.ok) throw new Error(result.error||"분석 실패");
      ve.fileId=result.fileId; var aD=result.analyzeData;
      ve.segments=(aD.segments||[]).slice(0,5); ve.subtitles=[];
      var fs2=aD.all_subs||aD.full_transcript; if(fs2&&Array.isArray(fs2)) ve.subtitles=fs2;
      if(!ve.subtitles.length) ve.segments.forEach(function(seg){if(seg.subtitles&&seg.subtitles.length){ve.subtitles=ve.subtitles.concat(seg.subtitles);}else if(seg.script){var ss=seg.start_seconds||0,se=seg.end_seconds||ve.duration,ch=seg.script.match(/.{1,18}/g)||[],cd=(se-ss)/Math.max(1,ch.length);ch.forEach(function(t,i){ve.subtitles.push({start:ss+i*cd,end:ss+(i+1)*cd,text:t.trim()})});}});
      renderSegs(); setProg("veAnalyzePct","veAnalyzeBar","veAnalyzeLabel",100,"분석 완료!");
      setTimeout(function(){goStep(3);var fn=$("veFileName2");if(fn) fn.textContent=ve.filePath.split(/[\\/]/).pop(); initEditor();},500);
    } catch(e) { showModal("분석 실패",e.message||"서버 연결 확인","확인"); goStep(1); }
  });

  var acBtn=$("veAnalyzeCancel"); if(acBtn) acBtn.addEventListener("click",function(){goStep(1)});

  function renderSegs() {
    var list=$("veSegmentsList"); if(!list) return; if(!ve.segments.length){list.innerHTML="<div style='color:var(--text-dim);font-size:12px;'>하이라이트 없음</div>";return;}
    var fT=function(s){return Math.floor(s/60)+":"+String(Math.floor(s%60)).padStart(2,"0")};
    list.innerHTML=ve.segments.map(function(s,i){
      var t=s.hook||s.hook_text||s.title||("구간 "+(i+1)); var sc=s.score||s.estimated_retention||Math.floor(65+Math.random()*25);
      return "<div style='display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border-soft);'>"+
        "<div style='width:24px;height:24px;border-radius:50%;background:var(--accent-soft);color:var(--accent);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;'>"+(i+1)+"</div>"+
        "<div style='flex:1;min-width:0;'><div style='font-size:13px;font-weight:600;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;'>"+escapeHtml(t)+"</div>"+
        "<div style='font-size:10px;color:var(--text-dim);margin-top:2px;'>"+fT(s.start_seconds||0)+" ~ "+fT(s.end_seconds||0)+"</div></div>"+
        "<div style='padding:3px 8px;border-radius:6px;background:"+(sc>=70?"rgba(16,185,129,0.1)":"rgba(251,191,36,0.1)")+";font-size:11px;font-weight:700;color:"+(sc>=70?"#10b981":"#f59e0b")+";'>"+sc+"점</div></div>";
    }).join("");
  }

  ve.overlays = []; // {path, startTime, endTime, x, y, width, height}

  // 짤/이미지 삽입
  var addImgBtn=$("veAddImageBtn"); if(addImgBtn) addImgBtn.addEventListener("click",async function(){
    if(!bridge.videoSelectImage) return;
    var r=await bridge.videoSelectImage();
    if(!r||!r.ok) return;
    var video=$("veVideo");
    var curTime=video?video.currentTime:0;
    ve.overlays.push({path:r.filePath, startTime:curTime, endTime:Math.min(curTime+3, ve.duration||curTime+3), x:10, y:10, width:120, height:120});
    renderImageList();
  });

  function renderImageList(){
    var list=$("veImageList"); if(!list) return;
    if(!ve.overlays.length){list.innerHTML="<span style='color:var(--text-dim);'>없음</span>";return;}
    list.innerHTML=ve.overlays.map(function(ov,i){
      var name=ov.isUrl?(ov.path.split("/").pop().split("?")[0].slice(0,20)):ov.path.split(/[\\/]/).pop();
      var src=ov.isUrl?ov.path:("file:///"+ov.path.replace(/\\/g,"/"));
      return "<div style='display:flex;align-items:center;gap:6px;padding:5px 0;border-bottom:1px solid var(--border-soft);'>"+
        "<img src='"+escapeHtml(src)+"' style='width:32px;height:32px;object-fit:cover;border-radius:4px;'>"+
        "<div style='flex:1;min-width:0;font-size:10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;'>"+escapeHtml(name)+"</div>"+
        "<span style='font-size:9px;color:var(--text-dim);white-space:nowrap;'>"+fmtTime(ov.startTime)+"~"+fmtTime(ov.endTime)+"</span>"+
        "<button data-ov-idx='"+i+"' style='border:none;background:none;color:var(--danger);cursor:pointer;font-size:10px;padding:2px;'>X</button>"+
        "</div>";
    }).join("");
    list.querySelectorAll("[data-ov-idx]").forEach(function(btn){
      btn.addEventListener("click",function(){
        ve.overlays.splice(parseInt(btn.dataset.ovIdx),1);
        renderImageList(); renderImageTrack();
      });
    });
  }

  function renderImageTrack(){
    var track=$("veTrackImages"); if(!track) return;
    var dur=ve.duration||1;
    if(!ve.overlays.length){track.innerHTML="";return;}
    track.innerHTML=ve.overlays.map(function(ov,i){
      var left=(ov.startTime/dur*100).toFixed(2)+"%";
      var width=((ov.endTime-ov.startTime)/dur*100).toFixed(2)+"%";
      return "<div style='position:absolute;top:3px;bottom:3px;left:"+left+";width:"+width+";background:#f59e0b80;border-left:2px solid #f59e0b;border-radius:3px;cursor:pointer;font-size:8px;color:#fff;padding:0 4px;overflow:hidden;white-space:nowrap;' title='이미지 "+(i+1)+"'>"+(i+1)+"</div>";
    }).join("");
  }

  var bkBtn=$("veBackToUpload"); if(bkBtn) bkBtn.addEventListener("click",function(){goStep(1);ve.segments=[];ve.subtitles=[];ve.overlays=[];stopPlayback()});

  // ── 편집기 초기화 (Step3 진입 시) ──
  var playInterval=null, isPlaying=false, subAnim="none";
  chipG("veSubAnimChips",function(v){subAnim=v});

  function stopPlayback(){var v=$("veVideo");if(v){v.pause();v.src="";}isPlaying=false;if(playInterval){clearInterval(playInterval);playInterval=null;} var pb=$("vePlayBtn");if(pb)pb.innerHTML="&#9654;";}

  function initEditor(){
    var video=$("veVideo"); if(!video||!ve.filePath) return;
    // 영상 로드
    video.src="file:///"+ve.filePath.replace(/\\/g,"/");
    video.load();
    isPlaying=false;
    var pb=$("vePlayBtn"),seekBar=$("veSeekBar"),timeDisp=$("veTimeDisplay");

    // 재생/정지
    if(pb) pb.onclick=function(){
      if(isPlaying){video.pause();isPlaying=false;pb.innerHTML="&#9654;";}
      else{video.play().catch(function(){});isPlaying=true;pb.innerHTML="&#10074;&#10074;";}
    };

    // 시간 업데이트
    video.ontimeupdate=function(){
      var cur=video.currentTime,dur=video.duration||ve.duration||1;
      if(seekBar&&!seekBar._dragging) seekBar.value=Math.round(cur/dur*1000);
      if(timeDisp) timeDisp.textContent=fmtTime(cur)+" / "+fmtTime(dur);
      renderSubOverlay(cur);
      updateTimelineHead(cur,dur);
      highlightActiveSub(cur);
    };
    video.onended=function(){isPlaying=false;if(pb)pb.innerHTML="&#9654;";};

    // 시크바
    if(seekBar){
      seekBar.onmousedown=function(){seekBar._dragging=true;};
      seekBar.onmouseup=function(){seekBar._dragging=false;};
      seekBar.oninput=function(){var dur=video.duration||ve.duration||1;video.currentTime=seekBar.value/1000*dur;};
    }

    // 자막 목록 + 타임라인 렌더
    renderSubList();
    renderTimeline();
    if($("veSubCount")) $("veSubCount").textContent=ve.subtitles.length+"개";
  }

  function fmtTime(s){var m=Math.floor(s/60);var sec=Math.floor(s%60);return m+":"+String(sec).padStart(2,"0");}

  // ── 자막 오버레이 (실시간) ──
  function renderSubOverlay(t){
    var overlay=$("veSubOverlay"); if(!overlay||!ve.subEnabled) {if(overlay)overlay.innerHTML="";return;}
    var active=null;
    for(var i=0;i<ve.subtitles.length;i++){
      var s=ve.subtitles[i];
      var st=s.start_seconds!=null?s.start_seconds:(s.start||0);
      var en=s.end_seconds!=null?s.end_seconds:(s.end||st+2);
      if(t>=st-0.1&&t<=en+0.1){active=s;break;}
    }
    if(!active){overlay.innerHTML="";return;}
    var text=active.text||"";
    var sz=ve.subSize||38;
    var col=ve.subColor||"#FFFFFF";
    var style="display:inline-block;padding:6px 16px;font-size:"+sz+"px;font-weight:700;color:"+col+";line-height:1.4;max-width:90%;";

    // 애니메이션
    var elapsed=t-(active.start_seconds!=null?active.start_seconds:(active.start||0));
    var dur=(active.end_seconds!=null?active.end_seconds:(active.end||0))-(active.start_seconds!=null?active.start_seconds:(active.start||0));
    if(subAnim==="fade"){
      var fi=Math.min(1,elapsed/0.3),fo=Math.min(1,(dur-elapsed)/0.3);
      style+="opacity:"+Math.min(fi,fo)+";";
    } else if(subAnim==="highlight"){
      var words=text.split(/(\s+)/);
      var wp=elapsed/Math.max(0.5,dur*0.8);
      var html="";
      var wi=0;
      words.forEach(function(w){
        if(!w.trim()){html+=w;return;}
        var hl=wi/words.filter(function(x){return x.trim()}).length<=wp;
        html+="<span style='color:"+(hl?"#FFD700":col+"60")+";font-weight:"+(hl?900:500)+";transition:color 0.15s;'>"+escapeHtml(w)+"</span>";
        wi++;
      });
      style+="text-shadow:0 0 4px #000,0 0 4px #000;background:rgba(0,0,0,0.6);border-radius:8px;";
      overlay.innerHTML="<span style='"+style+"'>"+html+"</span>";
      return;
    } else if(subAnim==="typewriter"){
      var chars=Math.floor(text.length*Math.min(1,elapsed/Math.max(0.5,dur*0.6)));
      text=text.slice(0,chars);
    } else if(subAnim==="karaoke"){
      var pct=Math.min(100,elapsed/Math.max(0.1,dur)*120);
      style+="background:linear-gradient(90deg,#FFD700 "+pct+"%,"+col+" "+pct+"%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;";
    } else if(subAnim==="bounce"){
      var sc=elapsed<0.2?0.5+elapsed*2.5:elapsed<0.35?1.1-(elapsed-0.2)*0.67:1;
      style+="display:inline-block;transform:scale("+sc+");";
    }

    style+="text-shadow:0 0 4px #000,0 0 4px #000;background:rgba(0,0,0,0.6);border-radius:8px;";
    overlay.innerHTML="<span style='"+style+"'>"+escapeHtml(text)+"</span>";
  }

  // ── 자막 목록 렌더 (클릭→해당 시간 이동, 텍스트 수정) ──
  function renderSubList(){
    var list=$("veSubtitleList"); if(!list) return;
    if(!ve.subtitles.length){list.innerHTML="<div style='color:var(--text-dim);padding:8px 0;'>자막 없음</div>";return;}
    list.innerHTML=ve.subtitles.map(function(s,i){
      var st=s.start_seconds!=null?s.start_seconds:(s.start||0);
      return "<div class='ve-sub-row' data-idx='"+i+"' style='display:flex;gap:6px;padding:5px 4px;border-bottom:1px solid var(--border-soft);cursor:pointer;align-items:center;transition:background 0.1s;' onmouseenter=\"this.style.background='var(--accent-soft)'\" onmouseleave=\"this.style.background='transparent'\">" +
        "<span style='font-size:9px;font-weight:700;color:var(--accent);min-width:36px;font-variant-numeric:tabular-nums;'>"+fmtTime(st)+"</span>"+
        "<input type='text' value='"+escapeHtml(s.text||"")+"' data-idx='"+i+"' class='ve-sub-edit' style='flex:1;border:none;background:transparent;color:var(--text);font-size:11px;outline:none;padding:2px 4px;font-family:inherit;min-width:0;'>" +
        "<button data-idx='"+i+"' class='ve-sub-del' style='border:none;background:none;color:var(--text-dim);cursor:pointer;font-size:10px;padding:2px;flex-shrink:0;'>X</button></div>";
    }).join("");

    // 클릭→시간 이동
    list.querySelectorAll(".ve-sub-row").forEach(function(row){
      row.addEventListener("click",function(e){
        if(e.target.tagName==="INPUT"||e.target.tagName==="BUTTON") return;
        var idx=parseInt(row.dataset.idx);
        var s=ve.subtitles[idx]; if(!s) return;
        var video=$("veVideo"); if(video) video.currentTime=s.start_seconds!=null?s.start_seconds:(s.start||0);
      });
    });
    // 텍스트 수정
    list.querySelectorAll(".ve-sub-edit").forEach(function(inp){
      inp.addEventListener("change",function(){
        var idx=parseInt(inp.dataset.idx);
        if(ve.subtitles[idx]) ve.subtitles[idx].text=inp.value;
      });
    });
    // 삭제
    list.querySelectorAll(".ve-sub-del").forEach(function(btn){
      btn.addEventListener("click",function(e){
        e.stopPropagation();
        var idx=parseInt(btn.dataset.idx);
        ve.subtitles.splice(idx,1);
        renderSubList(); renderTimeline();
        if($("veSubCount")) $("veSubCount").textContent=ve.subtitles.length+"개";
      });
    });
  }

  // ── 타임라인 렌더 (자막 블록 시각화) ──
  function renderTimeline(){
    var blocks=$("veTimelineBlocks"); if(!blocks) return;
    var dur=ve.duration||1;
    if(!ve.subtitles.length){blocks.innerHTML="<div style='position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:10px;color:var(--text-dim);'>자막 없음</div>";return;}
    var html="<div id='veTimelineHead' style='position:absolute;top:0;bottom:0;width:2px;background:var(--accent);z-index:2;left:0;transition:left 0.1s;'></div>";
    ve.subtitles.forEach(function(s,i){
      var st=s.start_seconds!=null?s.start_seconds:(s.start||0);
      var en=s.end_seconds!=null?s.end_seconds:(s.end||st+2);
      var left=(st/dur*100).toFixed(2)+"%";
      var width=((en-st)/dur*100).toFixed(2)+"%";
      var colors=["#3b82f6","#8b5cf6","#10b981","#f59e0b","#ef4444","#ec4899"];
      var color=colors[i%colors.length];
      html+="<div title='"+escapeHtml(s.text||"")+"' style='position:absolute;top:4px;bottom:4px;left:"+left+";width:"+width+";background:"+color+"40;border-left:2px solid "+color+";border-radius:3px;cursor:pointer;' data-idx='"+i+"'></div>";
    });
    blocks.innerHTML=html;
    // 클릭→시간 이동 + 드래그로 타이밍 조절
    blocks.querySelectorAll("[data-idx]").forEach(function(el){
      el.addEventListener("click",function(e){
        if(el._dragged) { el._dragged=false; return; }
        var idx=parseInt(el.dataset.idx);
        var s=ve.subtitles[idx]; if(!s) return;
        var video=$("veVideo"); if(video) video.currentTime=s.start_seconds!=null?s.start_seconds:(s.start||0);
      });
      // 드래그: 블록을 좌우로 이동하여 시간 변경
      el.addEventListener("mousedown",function(e){
        e.preventDefault();
        var idx=parseInt(el.dataset.idx);
        var s=ve.subtitles[idx]; if(!s) return;
        var dur=ve.duration||1;
        var rect=blocks.getBoundingClientRect();
        var startX=e.clientX;
        var origStart=s.start_seconds!=null?s.start_seconds:(s.start||0);
        var origEnd=s.end_seconds!=null?s.end_seconds:(s.end||origStart+2);
        var segDur=origEnd-origStart;
        el.style.opacity="0.7"; el.style.zIndex="10";
        function onMove(ev){
          var dx=ev.clientX-startX;
          var dt=dx/rect.width*dur;
          var newStart=Math.max(0,origStart+dt);
          var newEnd=newStart+segDur;
          if(newEnd>dur+0.5){newEnd=dur+0.5;newStart=newEnd-segDur;}
          el.style.left=(newStart/dur*100).toFixed(2)+"%";
          s._dragStart=newStart; s._dragEnd=newEnd;
        }
        function onUp(){
          document.removeEventListener("mousemove",onMove);
          document.removeEventListener("mouseup",onUp);
          el.style.opacity=""; el.style.zIndex="";
          if(s._dragStart!=null){
            if(s.start_seconds!=null) s.start_seconds=Math.round(s._dragStart*100)/100;
            else s.start=Math.round(s._dragStart*100)/100;
            if(s.end_seconds!=null) s.end_seconds=Math.round(s._dragEnd*100)/100;
            else s.end=Math.round(s._dragEnd*100)/100;
            delete s._dragStart; delete s._dragEnd;
            el._dragged=true;
            renderSubList(); renderTimeline();
          }
        }
        document.addEventListener("mousemove",onMove);
        document.addEventListener("mouseup",onUp);
      });
    });
    renderTimeRuler();
    renderAudioWaveform();
  }

  function updateTimelineHead(cur,dur){
    var head=$("veTimelineHead"); if(!head) return;
    head.style.left=(cur/dur*100).toFixed(2)+"%";
    // 타임라인 위치 표시
    var posEl=$("veTimelinePos");
    if(posEl) posEl.textContent=fmtTime(cur)+" / "+fmtTime(dur);
  }

  function fmtTime(s){
    var h=Math.floor(s/3600), m=Math.floor((s%3600)/60), sec=Math.floor(s%60);
    if(h>0) return h+":"+String(m).padStart(2,"0")+":"+String(sec).padStart(2,"0");
    return m+":"+String(sec).padStart(2,"0");
  }

  function renderTimeRuler(){
    var ruler=$("veTimeRuler"); if(!ruler) return;
    var dur=ve.duration||1;
    var interval=dur>600?60:dur>300?30:dur>120?15:dur>60?10:5;
    var count=Math.ceil(dur/interval)+1;
    var html="";
    for(var i=0;i<count;i++){
      var t=i*interval; if(t>dur) break;
      var left=(t/dur*100).toFixed(2)+"%";
      html+="<div style='position:absolute;left:"+left+";top:0;height:100%;display:flex;flex-direction:column;align-items:flex-start;'>";
      html+="<div style='width:1px;height:8px;background:rgba(255,255,255,0.15);'></div>";
      html+="<span style='font-size:8px;color:#475569;margin-left:2px;font-variant-numeric:tabular-nums;'>"+fmtTime(t)+"</span>";
      html+="</div>";
    }
    ruler.innerHTML=html;
  }

  function renderAudioWaveform(){
    var el=$("veTrackAudio"); if(!el) return;
    var dur=ve.duration||1;
    var barCount=Math.min(300,Math.floor(dur*3));
    var html="<div style='position:absolute;left:0;right:0;top:50%;height:1px;background:rgba(255,255,255,0.05);'></div>";
    for(var i=0;i<barCount;i++){
      var h=2+Math.random()*18;
      var left=(i/barCount*100).toFixed(2)+"%";
      var w=Math.max(1,(100/barCount-0.2)).toFixed(2)+"%";
      html+="<div style='position:absolute;left:"+left+";width:"+w+";height:"+h+"px;background:rgba(99,102,241,0.35);bottom:"+(12-h/2)+"px;border-radius:1px;'></div>";
    }
    el.innerHTML=html;
  }

  function highlightActiveSub(t){
    var list=$("veSubtitleList"); if(!list) return;
    list.querySelectorAll(".ve-sub-row").forEach(function(row){
      var idx=parseInt(row.dataset.idx);
      var s=ve.subtitles[idx]; if(!s) return;
      var st=s.start_seconds!=null?s.start_seconds:(s.start||0);
      var en=s.end_seconds!=null?s.end_seconds:(s.end||st+2);
      var active=t>=st-0.1&&t<=en+0.1;
      row.style.background=active?"var(--accent-soft)":"transparent";
      if(active&&!row._scrolled){row.scrollIntoView({block:"nearest"});row._scrolled=true;}
      else if(!active) row._scrolled=false;
    });
  }

  // 내보내기
  var exBtn=$("veExportBtn"); if(exBtn) exBtn.addEventListener("click",async function(){
    if(!ve.filePath) return; goStep(4); setProg("veExportPct","veExportBar","veExportLabel",0,"렌더링 준비 중...");
    try {
      var result;
      if(ve.type==="shorts"){
        var clips=ve.segments.slice(0,ve.clipCount).map(function(s){return Object.assign({},s,{title:s.hook||s.hook_text||s.title||"",subtitles:ve.subEnabled?(s.subtitles||[]):[]})});
        if(!clips.length) throw new Error("하이라이트 구간 없음");
        result=await bridge.videoRenderShorts({inputPath:ve.filePath,clips:clips,outputDir:null,template:"minimal",subtitlesEnabled:ve.subEnabled});
      } else {
        result=await bridge.videoRenderLongform({inputPath:ve.filePath,subtitles:ve.subEnabled?ve.subtitles:[],subtitlesEnabled:ve.subEnabled,captionStyle:{fontSize:ve.subSize,color:ve.subColor}});
      }
      if(!result.ok) throw new Error(result.error||"렌더링 실패");
      goStep(5); var s5=$("veStep5");
      if(ve.type==="shorts"&&result.results){
        s5.innerHTML="<div class='panel-header'><h1 style='font-size:18px;'>"+result.results.length+"개 쇼츠 완성</h1><p class='panel-sub'>파일을 확인하세요</p></div>"+
          result.results.map(function(r){var dir=r.path.replace(/\\/g,"/").split("/").slice(0,-1).join("/");return "<div class='card' style='display:flex;align-items:center;justify-content:space-between;'><div><div style='font-size:14px;font-weight:700;'>Short "+(r.index+1)+"</div><div style='font-size:11px;color:var(--text-dim);margin-top:2px;'>"+escapeHtml(r.filename)+"</div></div><button class='btn btn-outline btn-sm' onclick=\"bridge.openExternal('file:///"+dir+"')\">폴더 열기</button></div>"}).join("")+
          "<button class='btn btn-primary btn-full' style='margin-top:12px;' id='veNewBtn'>새 영상</button>";
      } else {
        var dir=(result.outputPath||"").replace(/\\/g,"/").split("/").slice(0,-1).join("/");
        s5.innerHTML="<div class='card' style='text-align:center;padding:24px;'><div style='font-size:18px;font-weight:800;margin-bottom:8px;'>편집 완료</div><div style='font-size:12px;color:var(--text-dim);margin-bottom:16px;'>"+ve.subtitles.length+"개 자막 입혀짐</div><button class='btn btn-primary btn-full' onclick=\"bridge.openExternal('file:///"+dir+"')\">폴더 열기</button><button class='btn btn-outline btn-full' style='margin-top:8px;' id='veNewBtn'>새 영상</button></div>";
      }
      setTimeout(function(){var nb=$("veNewBtn");if(nb)nb.addEventListener("click",function(){goStep(1);ve.segments=[];ve.subtitles=[]})},100);
    } catch(e) { showModal("렌더링 실패",e.message||"오류","확인"); goStep(3); }
  });

  var ecBtn=$("veExportCancel"); if(ecBtn) ecBtn.addEventListener("click",function(){bridge.videoCancel();goStep(3)});
})();

// ══════════════════════════════════════════════════════════
// 커뮤니티 게시판 (Supabase REST API 직접 호출)
// ══════════════════════════════════════════════════════════
(function initCommunity() {
  var SB_URL = "https://ckzjnpzadeovrasucjmu.supabase.co";
  var SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrempucHphZGVvdnJhc3Vjam11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MTA4NTcsImV4cCI6MjA4OTQ4Njg1N30.qgRa-YIm_ttKYTAcFI3xxXAADGPNPUU1bb7EVz_-Ljs";
  var currentCat = "info";
  var posts = [];

  function sbFetch(path) {
    return fetch(SB_URL + "/rest/v1/" + path, {
      headers: { apikey: SB_KEY, Authorization: "Bearer " + SB_KEY }
    }).then(function(r) { return r.json(); });
  }

  function sbPost(path, body) {
    return fetch(SB_URL + "/rest/v1/" + path, {
      method: "POST",
      headers: {
        apikey: SB_KEY,
        Authorization: "Bearer " + SB_KEY,
        "Content-Type": "application/json",
        Prefer: "return=representation"
      },
      body: JSON.stringify(body)
    }).then(function(r) { return r.json(); });
  }

  function loadPosts(cat) {
    currentCat = cat || currentCat;
    var list = $("communityList");
    var postView = $("communityPost");
    if (list) list.style.display = "";
    if (postView) postView.style.display = "none";
    if (list) list.innerHTML = "<div style='text-align:center;padding:40px 0;color:var(--text-dim);font-size:13px;'>불러오는 중...</div>";

    sbFetch("posts?cat=eq." + currentCat + "&select=id,title,author,views,likes,created_at,images&order=created_at.desc&limit=50")
      .then(function(data) {
        posts = data || [];
        renderList();
      }).catch(function() {
        if (list) list.innerHTML = "<div style='text-align:center;padding:40px 0;color:var(--danger);font-size:13px;'>불러오기 실패. 인터넷 연결을 확인하세요.</div>";
      });
  }

  function renderList() {
    var list = $("communityList");
    if (!list) return;
    if (!posts.length) {
      list.innerHTML = "<div style='text-align:center;padding:40px 0;color:var(--text-dim);font-size:13px;'>게시글이 없습니다.</div>";
      return;
    }
    list.innerHTML = posts.map(function(p) {
      var date = p.created_at ? new Date(p.created_at).toLocaleDateString("ko-KR") : "";
      var thumb = "";
      if (p.images && p.images.length) {
        var img = typeof p.images === "string" ? JSON.parse(p.images) : p.images;
        if (img[0]) thumb = "<img src='" + escapeHtml(img[0]) + "' style='width:48px;height:48px;object-fit:cover;border-radius:8px;flex-shrink:0;'>";
      }
      return "<div class='community-post-row' data-id='" + p.id + "' style='display:flex;gap:12px;align-items:center;padding:14px 16px;background:var(--bg-card);border:1px solid var(--border-soft);border-radius:var(--radius-sm);cursor:pointer;transition:all 0.15s;'>" +
        thumb +
        "<div style='flex:1;min-width:0;'>" +
        "<div style='font-size:14px;font-weight:600;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;'>" + escapeHtml(p.title || "") + "</div>" +
        "<div style='font-size:11px;color:var(--text-dim);margin-top:4px;'>" + escapeHtml(p.author || "") + " · " + date + " · 조회 " + (p.views || 0) + "</div>" +
        "</div></div>";
    }).join("");

    list.querySelectorAll(".community-post-row").forEach(function(row) {
      row.addEventListener("click", function() { openPost(row.dataset.id); });
      row.addEventListener("mouseenter", function() { row.style.borderColor = "var(--accent)"; row.style.boxShadow = "var(--shadow-md)"; });
      row.addEventListener("mouseleave", function() { row.style.borderColor = "var(--border-soft)"; row.style.boxShadow = "none"; });
    });
  }

  function openPost(id) {
    var list = $("communityList");
    var postView = $("communityPost");
    var content = $("communityPostContent");
    if (list) list.style.display = "none";
    if (postView) postView.style.display = "";
    if (content) content.innerHTML = "<div style='text-align:center;padding:20px;color:var(--text-dim);'>로딩...</div>";

    sbFetch("posts?id=eq." + id + "&select=*")
      .then(function(data) {
        var p = data && data[0];
        if (!p || !content) return;
        var body = p.body || p.content || "";
        var date = p.created_at ? new Date(p.created_at).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" }) : "";
        content.innerHTML =
          "<div style='margin-bottom:16px;'>" +
          "<h2 style='font-size:20px;font-weight:700;margin-bottom:8px;'>" + escapeHtml(p.title || "") + "</h2>" +
          "<div style='font-size:12px;color:var(--text-dim);'>" + escapeHtml(p.author || "") + " · " + date + " · 조회 " + (p.views || 0) + " · 좋아요 " + (p.likes || 0) + "</div>" +
          "</div>" +
          "<div style='font-size:14px;line-height:1.8;color:var(--text-sub);word-break:break-word;'>" + body + "</div>";
      }).catch(function() {
        if (content) content.innerHTML = "<div style='color:var(--danger);'>게시글을 불러올 수 없습니다.</div>";
      });
  }

  // 카테고리 칩 클릭
  document.querySelectorAll("[data-community-cat]").forEach(function(chip) {
    chip.addEventListener("click", function() {
      document.querySelectorAll("[data-community-cat]").forEach(function(c) { c.classList.remove("active"); });
      chip.classList.add("active");
      loadPosts(chip.dataset.communityCat);
    });
  });

  // 목록으로 버튼
  var backBtn = $("communityBackBtn");
  if (backBtn) backBtn.addEventListener("click", function() {
    var list = $("communityList");
    var postView = $("communityPost");
    if (list) list.style.display = "";
    if (postView) postView.style.display = "none";
  });

  // 글쓰기
  var writeBtn = $("communityWriteBtn");
  var writeForm = $("communityWriteForm");
  var writeCancel = $("communityWriteCancel");
  var submitBtn = $("communitySubmitBtn");

  if (writeBtn) writeBtn.addEventListener("click", async function() {
    var cfg = await bridge.loadConfig();
    if (!cfg || !cfg.makeit_uid) { showModal("로그인 필요", "커뮤니티 글쓰기는 로그인 후 가능합니다.", "확인"); return; }
    if (writeForm) writeForm.style.display = "";
    writeBtn.style.display = "none";
  });
  if (writeCancel) writeCancel.addEventListener("click", function() {
    if (writeForm) writeForm.style.display = "none";
    if (writeBtn) writeBtn.style.display = "";
  });
  if (submitBtn) submitBtn.addEventListener("click", async function() {
    var title = $("communityWriteTitle").value.trim();
    var body = $("communityWriteBody").value.trim();
    if (!title) { showModal("입력 오류", "제목을 입력하세요.", "확인"); return; }
    if (!body) { showModal("입력 오류", "내용을 입력하세요.", "확인"); return; }
    var cfg = await bridge.loadConfig();
    var author = cfg.makeit_email ? cfg.makeit_email.split("@")[0] : "익명";
    submitBtn.disabled = true; submitBtn.textContent = "등록 중...";
    try {
      await sbPost("posts", {
        title: title,
        body: body,
        content: body,
        cat: currentCat,
        author: author,
        author_uid: cfg.makeit_uid || "",
        views: 0,
        likes: 0,
        images: []
      });
      $("communityWriteTitle").value = "";
      $("communityWriteBody").value = "";
      if (writeForm) writeForm.style.display = "none";
      if (writeBtn) writeBtn.style.display = "";
      loadPosts(currentCat);
    } catch (e) {
      showModal("등록 실패", e.message || "다시 시도해주세요.", "확인");
    }
    submitBtn.disabled = false; submitBtn.textContent = "등록";
  });

  // 패널 활성화 시 자동 로드
  var observer = new MutationObserver(function() {
    var panel = document.querySelector('[data-panel="community"]');
    if (panel && panel.style.display !== "none" && !panel.classList.contains("hidden")) {
      loadPosts();
    }
  });
  var panel = document.querySelector('[data-panel="community"]');
  if (panel) observer.observe(panel, { attributes: true, attributeFilter: ["style", "class"] });

  // 초기 로드 (패널이 처음 보일 때)
  setTimeout(function() {
    var p = document.querySelector('[data-panel="community"]');
    if (p && p.style.display !== "none" && !p.classList.contains("hidden")) loadPosts();
  }, 1000);
})();

// ══════════════════════════════════════════════════════════
// 챌린지 게시판 (Supabase REST API)
// ══════════════════════════════════════════════════════════
(function initChallenge() {
  var SB_URL = "https://ckzjnpzadeovrasucjmu.supabase.co";
  var SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNrempucHphZGVvdnJhc3Vjam11Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MTA4NTcsImV4cCI6MjA4OTQ4Njg1N30.qgRa-YIm_ttKYTAcFI3xxXAADGPNPUU1bb7EVz_-Ljs";
  var challenges = [];
  var currentCh = null;

  function sbGet(path) {
    return fetch(SB_URL + "/rest/v1/" + path, {
      headers: { apikey: SB_KEY, Authorization: "Bearer " + SB_KEY }
    }).then(function(r) { return r.json(); });
  }
  function sbInsert(table, body) {
    return fetch(SB_URL + "/rest/v1/" + table, {
      method: "POST",
      headers: { apikey: SB_KEY, Authorization: "Bearer " + SB_KEY, "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify(body)
    }).then(function(r) { return r.json(); });
  }

  function getStatus(ch) {
    if (ch.status === "completed") return { label: "완료", color: "#6b7280", bg: "rgba(107,114,128,0.1)" };
    var now = new Date();
    if (ch.start_date && new Date(ch.start_date) <= now && ch.end_date && new Date(ch.end_date) >= now)
      return { label: "진행중", color: "#3b82f6", bg: "rgba(59,130,246,0.1)" };
    if (ch.recruit_end && new Date(ch.recruit_end) < now)
      return { label: "진행중", color: "#3b82f6", bg: "rgba(59,130,246,0.1)" };
    return { label: "모집중", color: "#22c55e", bg: "rgba(34,197,94,0.1)" };
  }
  function dday(d) { if (!d) return ""; var diff = Math.ceil((new Date(d) - new Date()) / 86400000); return diff > 0 ? "D-" + diff : diff === 0 ? "D-DAY" : "마감"; }
  function fmtDate(d) { return d ? new Date(d).toLocaleDateString("ko-KR") : ""; }

  function loadChallenges() {
    var list = $("challengeList");
    var detail = $("challengeDetail");
    if (list) list.style.display = "";
    if (detail) detail.style.display = "none";
    if (list) list.innerHTML = "<div style='text-align:center;padding:40px 0;color:var(--text-dim);font-size:13px;'>불러오는 중...</div>";

    sbGet("challenges?select=*&order=created_at.desc&limit=30")
      .then(function(data) {
        challenges = data || [];
        renderChallengeList();
      }).catch(function() {
        if (list) list.innerHTML = "<div style='text-align:center;padding:40px 0;color:var(--danger);font-size:13px;'>불러오기 실패</div>";
      });
  }

  function renderChallengeList() {
    var list = $("challengeList");
    if (!list) return;
    if (!challenges.length) { list.innerHTML = "<div style='text-align:center;padding:40px 0;color:var(--text-dim);font-size:13px;'>등록된 챌린지가 없습니다.</div>"; return; }
    list.innerHTML = challenges.map(function(ch) {
      var st = getStatus(ch);
      var dd = ch.recruit_end ? dday(ch.recruit_end) : "";
      return "<div class='challenge-card' data-chid='" + ch.id + "' style='padding:20px;background:var(--bg-card);border:1px solid var(--border-soft);border-radius:var(--radius);cursor:pointer;transition:all 0.15s;'>" +
        "<div style='display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;'>" +
        "<span style='font-size:11px;font-weight:700;color:" + st.color + ";background:" + st.bg + ";padding:3px 10px;border-radius:6px;'>" + st.label + "</span>" +
        (dd ? "<span style='font-size:11px;font-weight:700;color:var(--accent);'>" + dd + "</span>" : "") +
        "</div>" +
        "<div style='font-size:16px;font-weight:700;color:var(--text);margin-bottom:6px;'>" + escapeHtml(ch.title || "") + "</div>" +
        "<div style='font-size:12px;color:var(--text-dim);line-height:1.6;'>" + escapeHtml((ch.description || "").slice(0, 80)) + "</div>" +
        "<div style='display:flex;gap:12px;margin-top:10px;font-size:11px;color:var(--text-dim);'>" +
        "<span>" + fmtDate(ch.start_date) + " ~ " + fmtDate(ch.end_date) + "</span>" +
        (ch.max_participants ? "<span>정원 " + ch.max_participants + "명</span>" : "") +
        "</div></div>";
    }).join("");

    list.querySelectorAll(".challenge-card").forEach(function(card) {
      card.addEventListener("click", function() { openChallenge(card.dataset.chid); });
      card.addEventListener("mouseenter", function() { card.style.borderColor = "var(--accent)"; card.style.boxShadow = "var(--shadow-md)"; });
      card.addEventListener("mouseleave", function() { card.style.borderColor = "var(--border-soft)"; card.style.boxShadow = "none"; });
    });
  }

  function openChallenge(id) {
    var ch = challenges.find(function(c) { return c.id === id; });
    if (!ch) return;
    currentCh = ch;
    var list = $("challengeList");
    var detail = $("challengeDetail");
    var content = $("challengeDetailContent");
    if (list) list.style.display = "none";
    if (detail) detail.style.display = "";

    var st = getStatus(ch);
    if (content) content.innerHTML =
      "<div style='display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;'>" +
      "<span style='font-size:12px;font-weight:700;color:" + st.color + ";background:" + st.bg + ";padding:4px 12px;border-radius:6px;'>" + st.label + "</span>" +
      "<span style='font-size:12px;color:var(--text-dim);'>" + fmtDate(ch.start_date) + " ~ " + fmtDate(ch.end_date) + "</span></div>" +
      "<h2 style='font-size:20px;font-weight:800;margin-bottom:10px;'>" + escapeHtml(ch.title || "") + "</h2>" +
      "<div style='font-size:14px;line-height:1.8;color:var(--text-sub);word-break:break-word;'>" + (ch.description || ch.body || "") + "</div>" +
      (ch.purpose ? "<div style='margin-top:14px;font-size:12px;color:var(--accent);font-weight:600;'>목적: " + escapeHtml(ch.purpose) + "</div>" : "");

    // 미션 목록 로드
    loadMissions(id);
  }

  function loadMissions(chId) {
    var mList = $("challengeMissionList");
    if (!mList) return;
    mList.innerHTML = "<div style='color:var(--text-dim);font-size:12px;'>불러오는 중...</div>";
    sbGet("challenge_missions?challenge_id=eq." + chId + "&select=*&order=created_at.desc&limit=30")
      .then(function(data) {
        if (!data || !data.length) { mList.innerHTML = "<div style='color:var(--text-dim);font-size:12px;padding:12px 0;'>아직 미션 인증이 없습니다.</div>"; return; }
        mList.innerHTML = data.map(function(m) {
          return "<div style='padding:12px 14px;background:var(--bg-card);border:1px solid var(--border-soft);border-radius:var(--radius-sm);'>" +
            "<div style='display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;'>" +
            "<span style='font-size:13px;font-weight:600;color:var(--text);'>" + escapeHtml(m.author || "") + "</span>" +
            "<span style='font-size:10px;color:var(--text-dim);'>" + fmtDate(m.created_at) + "</span></div>" +
            "<div style='font-size:13px;color:var(--text-sub);line-height:1.6;'>" + escapeHtml(m.content || m.body || "") + "</div>" +
            (m.link ? "<a href='#' style='font-size:11px;color:var(--accent);' onclick=\"event.preventDefault();window.nbBridge&&window.nbBridge.openExternal('" + escapeHtml(m.link) + "');\">링크 보기</a>" : "") +
            "</div>";
        }).join("");
      }).catch(function() { mList.innerHTML = "<div style='color:var(--danger);font-size:12px;'>불러오기 실패</div>"; });
  }

  // 목록으로
  var backBtn = $("challengeBackBtn");
  if (backBtn) backBtn.addEventListener("click", function() {
    var list = $("challengeList"); var detail = $("challengeDetail");
    if (list) list.style.display = "";
    if (detail) detail.style.display = "none";
    currentCh = null;
  });

  // 홈페이지에서 참여하기
  var joinBtn = $("challengeJoinBtn");
  if (joinBtn) joinBtn.addEventListener("click", function() {
    if (bridge.openExternal) bridge.openExternal("https://snsmakeit.com/challenge");
  });

  // 패널 활성화 시 자동 로드
  var observer = new MutationObserver(function() {
    var panel = document.querySelector('[data-panel="challenge"]');
    if (panel && !panel.classList.contains("hidden")) loadChallenges();
  });
  var panel = document.querySelector('[data-panel="challenge"]');
  if (panel) observer.observe(panel, { attributes: true, attributeFilter: ["class"] });
})();

// ── 수동 글쓰기 (네이티브) ──
(function() {
  const API = "https://snsmakeit.com/api";
  const PLATFORM_PROMPTS = {
    naver: "네이버 블로그에 적합한 SEO 최적화 글",
    tistory: "티스토리 블로그에 적합한 마크다운 글",
    instagram: "인스타그램 캡션 (해시태그 포함, 2200자 이내)",
    thread: "스레드(Threads)용 짧은 글 (500자 이내)",
    youtube: "유튜브 영상 대본 ([인트로][본문][아웃트로] 구조)",
  };
  const SPEECH_MAP = { polite_yo: "~요 체", formal: "~합니다 체", casual: "반말 체", mixed: "혼합 체" };
  const LENGTH_TOKENS = { short: 2500, medium: 5000, long: 8000 };
  let _refContent = "";

  // 칩 셋업 (이벤트 위임 — 수동 글쓰기 전용)
  function chipVal(id, fb) { return $(id)?.querySelector(".chip.active")?.dataset.value || fb; }

  document.querySelector('[data-panel="manual-write"]')?.addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    const container = chip.closest(".chips");
    if (!container) return;
    // 강조색 프리셋은 다중 선택 아님
    container.querySelectorAll(".chip").forEach(x => x.classList.remove("active"));
    chip.classList.add("active");
    // 강조색 연동
    if (container.id === "writeAccentPresets" && chip.dataset.value) {
      if ($("writeAccentColor")) $("writeAccentColor").value = chip.dataset.value;
    }
  });

  // 스텝 전환
  function writeGoStep(step) {
    [1,2,3].forEach(s => {
      const el = $("writeStep" + s);
      if (el) el.classList.toggle("hidden", s !== step);
    });
    $("writeStepBar")?.querySelectorAll(".step-item").forEach(item => {
      const s = parseInt(item.dataset.step);
      item.classList.toggle("active", s === step);
      item.classList.toggle("done", s < step);
    });
  }
  $("writeStep1Next")?.addEventListener("click", () => {
    if (!$("writeTopic")?.value.trim()) return showModal("알림", "주제를 입력해주세요.", "확인");
    writeGoStep(2);
  });
  $("writeStep2Prev")?.addEventListener("click", () => writeGoStep(1));
  $("writeStep2Next")?.addEventListener("click", () => writeGoStep(3));
  $("writeStep3Prev")?.addEventListener("click", () => writeGoStep(2));

  // URL 가져오기
  $("writeUrlFetchBtn")?.addEventListener("click", async () => {
    const url = $("writeRefUrl")?.value.trim(); if (!url) return;
    $("writeUrlFetchBtn").textContent = "가져오는 중..."; $("writeUrlFetchBtn").disabled = true;
    try {
      const res = await fetch(API + "/fetch-url-content", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }) });
      const data = await res.json();
      _refContent = data.content || data.text || "";
      if (_refContent) { $("writeUrlPreview").style.display = "block"; $("writeUrlPreview").textContent = _refContent.slice(0, 300) + "..."; }
    } catch { showModal("오류", "URL을 가져올 수 없습니다.", "확인"); }
    $("writeUrlFetchBtn").textContent = "가져오기"; $("writeUrlFetchBtn").disabled = false;
  });

  // 이미지 검색 (Pexels 프록시) — 중복 방지
  const _usedImageUrls = new Set();
  async function searchImages(query, count = 1) {
    try {
      const res = await fetch(API + "/proxy?action=pexels&path=v1/search&query=" + encodeURIComponent(query) + "&per_page=8&orientation=landscape");
      const data = await res.json();
      const all = (data.photos || []).map(p => p.src?.large || p.src?.medium).filter(Boolean);
      const fresh = all.filter(u => !_usedImageUrls.has(u));
      const pick = (fresh.length ? fresh : all).slice(0, count);
      pick.forEach(u => _usedImageUrls.add(u));
      return pick;
    } catch { return []; }
  }

  // 수동 글쓰기 횟수 관리
  const WRITE_LIMIT_KEY = "_manual_write_used";
  const WRITE_LIMIT_DATE_KEY = "_manual_write_date";
  const MANUAL_WRITE_LIMITS = { trial: 3, starter: 5, pro: 20, premium: 99999, admin: 99999 };

  async function checkWriteLimit() {
    const cfg = (await bridge.loadConfig()) || {};
    const today = new Date().toISOString().slice(0, 10);
    if (cfg[WRITE_LIMIT_DATE_KEY] !== today) { cfg[WRITE_LIMIT_KEY] = 0; cfg[WRITE_LIMIT_DATE_KEY] = today; await bridge.saveConfig(cfg); }
    const planKey = normalizeExePlan(state.user);
    const limit = MANUAL_WRITE_LIMITS[planKey] || 3;
    const used = cfg[WRITE_LIMIT_KEY] || 0;
    return { canUse: used < limit, used, limit, remaining: Math.max(0, limit - used) };
  }

  async function markWriteUsed() {
    const cfg = (await bridge.loadConfig()) || {};
    const today = new Date().toISOString().slice(0, 10);
    if (cfg[WRITE_LIMIT_DATE_KEY] !== today) { cfg[WRITE_LIMIT_KEY] = 0; cfg[WRITE_LIMIT_DATE_KEY] = today; }
    cfg[WRITE_LIMIT_KEY] = (cfg[WRITE_LIMIT_KEY] || 0) + 1;
    await bridge.saveConfig(cfg);
  }

  // 글 생성
  $("writeGenerateBtn")?.addEventListener("click", async () => {
    const topic = $("writeTopic")?.value.trim();
    if (!topic) return showModal("알림", "주제를 입력해주세요.", "확인");

    // 횟수 체크
    if (!state.loggedIn) return showModal("로그인 필요", "먼저 메이킷 계정에 로그인해주세요.", "확인");
    const quota = await checkWriteLimit();
    if (!quota.canUse) {
      return showModal("일일 한도 초과", `오늘의 수동 글쓰기 한도(${quota.limit}회)를 모두 사용했습니다.\n내일 다시 이용하거나 플랜을 업그레이드하세요.`, "구독하기", () => bridge.openExternal("https://snsmakeit.com/pricing"));
    }

    const platform = chipVal("writePlatformChips", "naver");
    const subtype = chipVal("writeSubtypeChips", "info");
    const tone = chipVal("writeToneChips", "friendly");
    const speech = SPEECH_MAP[chipVal("writeSpeechChips", "polite_yo")] || "~요 체";
    const length = chipVal("writeLengthChips", "medium");
    const category = chipVal("writeCategoryChips", "");
    const imageMode = chipVal("writeImageChips", "auto");
    const quoteStyle = chipVal("writeQuoteChips", "postit");
    const aeoPos = chipVal("writeAeoChips", "top");
    const prosCons = chipVal("writeProsConsChips", "on") === "on";
    const accentColor = $("writeAccentColor")?.value || "";
    const extra = $("writeExtra")?.value.trim() || "";
    const platformGuide = PLATFORM_PROMPTS[platform] || PLATFORM_PROMPTS.naver;

    $("writeInputView").style.display = "none";
    $("writeLoadingView").style.display = "block";
    $("writeResultView").style.display = "none";
    $("writeGenBar").style.width = "10%";
    $("writeGenPreview").textContent = "";

    const useGif = chipVal("writeGifChips", "on") === "on";

    const prompt = `${platformGuide}을 작성해주세요.

주제: ${topic}
글 타입: ${subtype}
글 톤: ${tone}
말투: ${speech}
${category ? "콘텐츠 분야: " + category : ""}
${_refContent ? "\n참고 자료:\n" + _refContent.slice(0, 2000) : ""}
${extra ? "\n글 방향: " + extra : ""}

글 구조 (반드시 이 형식으로):
[TITLE]
제목

[BODY]
도입부 (2~3문장)

[SUBTITLE] 소제목1
본문 (3~5문장)
[image: 영문키워드 2~3단어]
${quoteStyle !== "none" ? "[QUOTE] 핵심 인용 문장" : ""}

[SUBTITLE] 소제목2
본문 (3~5문장)
[image: 영문키워드 2~3단어]

(이 패턴을 4~5회 반복)

${useGif ? "[gif: 한글키워드] 를 재미있는 부분에 1~2개 배치" : ""}
${aeoPos !== "none" ? `Q&A(AEO) 섹션을 글의 ${aeoPos === "top" ? "상단" : aeoPos === "middle" ? "중앙" : "하단"}에 포함` : ""}
${prosCons ? "장단점 또는 추천/비추천 섹션 포함" : ""}
${accentColor ? "중요 키워드를 **강조**로 표시" : ""}

[TAGS]
태그1, 태그2, 태그3, ... (10개, # 없이 쉼표 구분)

규칙:
- [image: keyword]는 영문 2~3단어로 구체적 장면. 예: [image: jeju beach sunset]
- [image:]는 전체 4~6개
- 모든 섹션은 [SUBTITLE]로 시작
- 마크다운 문법(#, ##, *, -) 절대 사용 금지
- 이모지 아이콘 사용 금지
- 배경색 형광펜 스타일 사용 금지`;

    try {
      const maxTok = LENGTH_TOKENS[length] || 5000;
      let full = "";
      const res = await fetch(API + "/ai-proxy", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-haiku-4-5", max_tokens: maxTok, stream: true, messages: [{ role: "user", content: prompt }] }),
      });
      if (!res.ok) throw new Error("AI 서버 오류: " + res.status);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n"); buffer = lines.pop();
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const d = line.slice(6); if (d === "[DONE]") break;
          try {
            const delta = JSON.parse(d).choices?.[0]?.delta?.content || "";
            if (delta) {
              full += delta;
              $("writeGenBar").style.width = Math.min(90, Math.floor((full.length / (maxTok * 2)) * 100)) + "%";
              $("writeGenPreview").textContent = full.slice(-100);
            }
          } catch {}
        }
      }

      $("writeGenBar").style.width = "100%";
      $("writeGenStatus").textContent = "이미지를 삽입하고 있습니다...";

      // 마커 기반 파싱 (자동글쓰기와 동일)
      let rendered = full;

      // [TITLE] / [BODY] / [TAGS] 마커 제거
      const titleMatch = rendered.match(/\[TITLE\]\s*\n([^\n]+)/);
      const extractedTitle = titleMatch ? titleMatch[1].trim() : "";
      rendered = rendered.replace(/\[TITLE\]\s*\n[^\n]+\n?/, "");
      rendered = rendered.replace(/\[BODY\]\s*\n?/, "");

      // [TAGS] → 해시태그로 변환
      const tagsMatch = rendered.match(/\[TAGS\]\s*\n([^\n]+)/);
      if (tagsMatch) {
        const hashtags = tagsMatch[1].split(/[,，]/).map(t => "#" + t.trim().replace(/^#/, "").replace(/\s+/g, "")).filter(t => t.length > 1).join(" ");
        rendered = rendered.replace(/\[TAGS\]\s*\n[^\n]+/, "\n\n" + hashtags);
      }

      // [SUBTITLE] → 소제목 스타일
      rendered = rendered.replace(/\[SUBTITLE\]\s*(.+)/g, '<div style="font-size:17px;font-weight:800;color:var(--text);margin:20px 0 8px;padding-bottom:4px;border-bottom:2px solid var(--accent);">$1</div>');

      // [image: ...] → 실제 이미지
      if (imageMode !== "none") {
        const imgTags = rendered.match(/\[image:\s*(.+?)\]/gi) || [];
        for (const tag of imgTags) {
          const keyword = tag.match(/\[image:\s*(.+?)\]/i)?.[1] || topic;
          const urls = await searchImages(keyword, 1);
          if (urls.length) {
            rendered = rendered.replace(tag, '<img src="' + urls[0] + '" alt="' + keyword + '" style="max-width:100%;border-radius:8px;margin:8px 0;">');
          } else { rendered = rendered.replace(tag, ""); }
        }
      } else {
        rendered = rendered.replace(/\[image:\s*.+?\]/gi, "");
      }

      // [gif: ...] → 실제 GIF
      const gifTags = rendered.match(/\[gif:\s*(.+?)\]/gi) || [];
      for (const tag of gifTags) {
        const keyword = tag.match(/\[gif:\s*(.+?)\]/i)?.[1] || topic;
        try {
          const gRes = await fetch(API + "/proxy?action=klipy&path=gifs/search&q=" + encodeURIComponent(keyword) + "&per_page=5&locale=ko_KR");
          const gData = await gRes.json();
          const items = gData?.data?.data || gData?.data || [];
          const item = items[Math.floor(Math.random() * Math.min(items.length, 3))];
          const gifUrl = item?.media_formats?.gif?.url || item?.media_formats?.tinygif?.url || item?.url || "";
          if (gifUrl) { rendered = rendered.replace(tag, '<img src="' + gifUrl + '" style="max-width:280px;border-radius:8px;margin:8px 0;">'); }
          else { rendered = rendered.replace(tag, ""); }
        } catch { rendered = rendered.replace(tag, ""); }
      }

      // [QUOTE] → 인용구 스타일
      rendered = rendered.replace(/\[QUOTE\]\s*(.+)/g, (_, text) => {
        if (quoteStyle === "postit") return '<div style="background:#fffde7;border-left:4px solid #fbc02d;padding:12px 16px;margin:12px 0;border-radius:4px;color:#5d4037;font-style:italic;">' + text + '</div>';
        if (quoteStyle === "vertical") return '<div style="border-left:3px solid #3b82f6;padding:8px 16px;margin:12px 0;color:var(--text-sub);">' + text + '</div>';
        if (quoteStyle === "bubble") return '<div style="background:var(--bg-elev,#f3f4f6);border-radius:12px 12px 12px 2px;padding:12px 16px;margin:12px 0;color:var(--text-sub);">' + text + '</div>';
        return text;
      });

      // **강조** → 색상 bold
      const boldColor = accentColor || "#2DB400";
      rendered = rendered.replace(/\*\*(.+?)\*\*/g, '<strong style="color:' + boldColor + ';">$1</strong>');

      $("writeLoadingView").style.display = "none";
      $("writeResultView").style.display = "block";
      $("writeResultContent").innerHTML = rendered.replace(/\n/g, "<br>");
      $("writeResultTitle").textContent = extractedTitle || (full.split("\n")[0].replace(/^#+\s*/, "").trim()).slice(0, 50) || "생성된 글";

      // 횟수 차감 + 표시 업데이트
      await markWriteUsed();
      updateWriteQuota();

      // 제목 추천 + SEO
      generateTitleSuggestions(topic, full);
      generateSeoKeywords(topic, full);

    } catch (e) {
      $("writeLoadingView").style.display = "none";
      $("writeInputView").style.display = "block";
      showModal("생성 실패", e.message, "확인");
    }
  });

  // 제목 추천
  async function generateTitleSuggestions(topic, content) {
    try {
      const res = await fetch(API + "/ai-proxy", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-haiku-4-5", max_tokens: 500, messages: [{ role: "user", content: `다음 글에 대한 매력적인 블로그 제목 5개를 줄바꿈으로 구분해서 제안해줘. 번호 없이 제목만.\n\n주제: ${topic}\n\n글 내용 요약: ${content.slice(0, 500)}` }] }),
      });
      const data = await res.json();
      const titles = (data.choices?.[0]?.message?.content || "").split("\n").filter(t => t.trim());
      if (titles.length) {
        $("writeTitleSuggestions").style.display = "block";
        $("writeTitleList").innerHTML = titles.map(t => `<button class="chip" style="font-size:12px;">${escapeHtml(t.trim())}</button>`).join("");
        $("writeTitleList").querySelectorAll(".chip").forEach(c => {
          c.addEventListener("click", () => navigator.clipboard.writeText(c.textContent));
        });
      }
    } catch {}
  }

  // SEO 키워드
  async function generateSeoKeywords(topic, content) {
    try {
      const res = await fetch(API + "/ai-proxy", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-haiku-4-5", max_tokens: 300, messages: [{ role: "user", content: `다음 글의 SEO 핵심 키워드 8~10개를 쉼표로 구분해서 나열해줘. 키워드만 출력.\n\n주제: ${topic}\n내용: ${content.slice(0, 500)}` }] }),
      });
      const data = await res.json();
      const keys = (data.choices?.[0]?.message?.content || "").split(/[,，]/).map(k => k.trim()).filter(k => k);
      if (keys.length) {
        $("writeSeoKeys").style.display = "block";
        $("writeSeoList").innerHTML = keys.map(k => `<button class="chip" style="font-size:11px;">${escapeHtml(k)}</button>`).join("");
        $("writeSeoList").querySelectorAll(".chip").forEach(c => {
          c.addEventListener("click", () => navigator.clipboard.writeText(c.textContent));
        });
      }
    } catch {}
  }

  // 복사
  $("writeCopyBtn")?.addEventListener("click", () => {
    navigator.clipboard.writeText($("writeResultContent")?.textContent || "").then(() => {
      $("writeCopyBtn").textContent = "복사됨!"; setTimeout(() => { $("writeCopyBtn").textContent = "복사"; }, 2000);
    });
  });

  // HTML 복사 (티스토리용)
  $("writeHtmlCopyBtn")?.addEventListener("click", () => {
    const text = $("writeResultContent")?.textContent || "";
    const html = text.replace(/^## (.+)$/gm, "<h3>$1</h3>").replace(/^### (.+)$/gm, "<h4>$1</h4>").replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\n/g, "<br>");
    navigator.clipboard.writeText(html).then(() => {
      $("writeHtmlCopyBtn").textContent = "복사됨!"; setTimeout(() => { $("writeHtmlCopyBtn").textContent = "HTML 복사"; }, 2000);
    });
  });

  // 다시 생성
  $("writeRetryBtn")?.addEventListener("click", () => {
    $("writeResultView").style.display = "none";
    $("writeInputView").style.display = "block";
    $("writeTitleSuggestions").style.display = "none";
    $("writeSeoKeys").style.display = "none";
    $("writeAiImageResult").style.display = "none";
    writeGoStep(1);
  });

  // AI 대표 이미지
  $("writeAiImageBtn")?.addEventListener("click", async () => {
    const topic = $("writeTopic")?.value.trim() || "블로그 대표 이미지";
    $("writeAiImageStatus").textContent = "이미지 생성 중...";
    $("writeAiImageBtn").disabled = true;
    try {
      const res = await fetch(API + "/generate-image", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: `Blog thumbnail for: ${topic}. Clean, modern, professional style. No text overlay.`, aspectRatio: "16:9" }),
      });
      const data = await res.json();
      if (data.url || data.image_url) {
        $("writeAiImageResult").style.display = "block";
        $("writeAiImageImg").src = data.url || data.image_url;
        $("writeAiImageImg").onclick = () => { const a = document.createElement("a"); a.href = $("writeAiImageImg").src; a.download = "ai-image.png"; a.click(); };
        $("writeAiImageStatus").textContent = "생성 완료! 클릭하여 다운로드";
      } else { $("writeAiImageStatus").textContent = "이미지 생성 실패"; }
    } catch { $("writeAiImageStatus").textContent = "이미지 생성 실패"; }
    $("writeAiImageBtn").disabled = false;
  });
})();

