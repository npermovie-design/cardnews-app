export function fileToBase64(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

export function resizeImage(dataUrl, maxW = 384) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const ratio = Math.min(maxW / img.width, maxW / img.height, 1);
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * ratio);
      c.height = Math.round(img.height * ratio);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      resolve(c.toDataURL("image/jpeg", 0.6));
    };
    img.src = dataUrl;
  });
}

// 3자리 hex → 6자리 변환
export const normHex = (c) => {
  if (!c || !c.startsWith("#")) return c || "#ffffff";
  const h = c.slice(1);
  if (h.length === 3) return `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`;
  return c;
};

// 배경색에서 밝기 계산
export function parseBgColor(bgCol) {
  const firstHex = bgCol.startsWith("linear-gradient")
    ? normHex((bgCol.match(/#[0-9a-fA-F]{3,8}/) || ["#ffffff"])[0])
    : bgCol;
  const hexClean = (firstHex || "#ffffff").replace("#", "");
  const bgR = parseInt(hexClean.slice(0, 2), 16) || 255;
  const bgG = parseInt(hexClean.slice(2, 4), 16) || 255;
  const bgB = parseInt(hexClean.slice(4, 6), 16) || 255;
  const isDarkBg = (bgR * 299 + bgG * 587 + bgB * 114) / 1000 < 128;
  return { isDarkBg, bgR, bgG, bgB };
}

// 【】 형태의 강조 텍스트 렌더링
export function renderBoldBracket(content, color, fontSize = 15) {
  if (!content) return null;
  const parts = String(content).split(/(【[^】]*】)/g);
  return parts.map((part, pi) => {
    const m = part.match(/^【(.*)】$/);
    if (m) return <span key={pi} style={{ fontWeight: 900, color, fontSize: fontSize + 2 }}>{m[1]}</span>;
    return <span key={pi}>{part}</span>;
  });
}
