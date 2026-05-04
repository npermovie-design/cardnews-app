// 프로필 캐릭터 100종 (DiceBear Notionists 스타일)
// CC0 라이센스 - 상업적 사용 가능
// https://www.dicebear.com/styles/notionists/

var AVATAR_SEEDS = [
  "Felix","Aneka","Mia","Leo","Zoe","Max","Luna","Kai","Aria","Noah",
  "Chloe","Ryan","Emma","Jack","Lily","Sam","Ivy","Owen","Ruby","Finn",
  "Nora","Theo","Ella","Luke","Maya","Ethan","Sage","Cole","Iris","Liam",
  "Hazel","Dylan","Olive","Alex","Jade","Miles","Wren","Blake","Cora","Jesse",
  "Piper","Quinn","Scout","River","Eden","Atlas","Fern","Asher","Violet","Hugo",
  "Stella","Oscar","Clara","Jasper","Daisy","Milo","Pearl","Rowan","Flora","Silas",
  "Lyra","Ezra","Willow","Caleb","Poppy","Jude","Maple","Ellis","Briar","Otto",
  "Dahlia","Rhys","Ember","Orion","Clover","Arlo","Ivy2","Cedar","Lark","Kit",
  "Willa","Nash","Thea","Reid","Opal","Vince","Freya","Beau","Astrid","Hayes",
  "Elara","Crew","Maren","Shay","Petra","Lane","Suki","Tate","Remi","Sage2"
];

var AVATAR_BG_COLORS = [
  "c0aede","b6e3f4","d1d4f9","ffd5dc","ffdfbf",
  "c1f0c1","f9c9b6","a3d9e8","e8d5b7","d4f4dd"
];

// DiceBear API URL 생성
function getAvatarURL(index) {
  var seed = AVATAR_SEEDS[index % AVATAR_SEEDS.length];
  var bg = AVATAR_BG_COLORS[index % AVATAR_BG_COLORS.length];
  return "https://api.dicebear.com/7.x/notionists/svg?seed=" + seed + "&backgroundColor=" + bg;
}

// 오프라인 폴백: 이니셜 기반 SVG
function getAvatarFallback(index) {
  var seed = AVATAR_SEEDS[index % AVATAR_SEEDS.length];
  var bg = AVATAR_BG_COLORS[index % AVATAR_BG_COLORS.length];
  var initial = seed.charAt(0).toUpperCase();
  return "data:image/svg+xml," + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" rx="24" fill="#' + bg + '"/>' +
    '<text x="24" y="30" text-anchor="middle" font-family="Pretendard,sans-serif" font-size="20" font-weight="700" fill="#333">' + initial + '</text></svg>'
  );
}

// 아바타 선택 모달 표시
function showAvatarPicker(onSelect) {
  var existing = document.getElementById("avatarPickerModal");
  if (existing) existing.remove();

  var modal = document.createElement("div");
  modal.id = "avatarPickerModal";
  modal.style.cssText = "position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.4);backdrop-filter:blur(4px);";

  var inner = document.createElement("div");
  inner.style.cssText = "background:#fff;border-radius:16px;padding:24px;max-width:480px;width:90%;max-height:80vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,0.2);";

  var header = document.createElement("div");
  header.style.cssText = "display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;";
  header.innerHTML = '<div style="font-size:16px;font-weight:700;">프로필 캐릭터 선택</div><div style="display:flex;gap:8px;align-items:center;"><button id="avatarRandomBtn" style="border:1px solid #e2e8f0;background:#f8fafc;padding:6px 14px;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;color:#3b82f6;transition:all 0.15s;">랜덤</button><button id="avatarPickerClose" style="border:none;background:none;font-size:20px;cursor:pointer;color:#666;padding:4px 8px;">X</button></div>';

  var grid = document.createElement("div");
  grid.style.cssText = "display:grid;grid-template-columns:repeat(5,1fr);gap:10px;overflow-y:auto;padding:4px;";

  for (var i = 0; i < 100; i++) {
    var cell = document.createElement("div");
    cell.dataset.avatarIdx = i;
    cell.style.cssText = "cursor:pointer;border-radius:12px;border:2px solid transparent;padding:4px;transition:all 0.15s;display:flex;align-items:center;justify-content:center;";
    var img = document.createElement("img");
    img.src = getAvatarURL(i);
    img.style.cssText = "width:100%;aspect-ratio:1;border-radius:10px;background:#f8fafc;";
    img.loading = "lazy";
    img.onerror = function() { this.src = getAvatarFallback(parseInt(this.parentElement.dataset.avatarIdx)); };
    cell.appendChild(img);
    cell.addEventListener("mouseenter", function() { this.style.borderColor = "#3b82f6"; this.style.transform = "scale(1.05)"; });
    cell.addEventListener("mouseleave", function() { this.style.borderColor = "transparent"; this.style.transform = "scale(1)"; });
    (function(idx) {
      cell.addEventListener("click", function() {
        if (onSelect) onSelect(idx, getAvatarURL(idx));
        modal.remove();
      });
    })(i);
    grid.appendChild(cell);
  }

  inner.appendChild(header);
  inner.appendChild(grid);
  modal.appendChild(inner);
  document.body.appendChild(modal);

  modal.addEventListener("click", function(e) { if (e.target === modal) modal.remove(); });
  document.getElementById("avatarPickerClose").addEventListener("click", function() { modal.remove(); });
  document.getElementById("avatarRandomBtn").addEventListener("click", function() {
    var randIdx = Math.floor(Math.random() * 100);
    if (onSelect) onSelect(randIdx, getAvatarURL(randIdx));
    modal.remove();
  });
}

window._showAvatarPicker = showAvatarPicker;
window._getAvatarURL = getAvatarURL;
window._getAvatarFallback = getAvatarFallback;
window._AVATAR_SEEDS = AVATAR_SEEDS;
