const FOLDER_MIME = "application/vnd.google-apps.folder";
const DOC_MIME = "application/vnd.google-apps.document";
const SHEET_MIME = "application/vnd.google-apps.spreadsheet";
const SLIDE_MIME = "application/vnd.google-apps.presentation";

function driveKey() {
  const key = String(process.env.GOOGLE_DRIVE_API_KEY || "").trim();
  if (!key) throw new Error("GOOGLE_DRIVE_API_KEY 미설정");
  return key;
}

function extractFolderId(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    const url = new URL(raw);
    const id = url.searchParams.get("id") || url.searchParams.get("folderId");
    if (id) return id;
  } catch {}
  const match = raw.match(/\/folders\/([A-Za-z0-9_-]+)/) || raw.match(/[?&]folderId=([A-Za-z0-9_-]+)/);
  if (match) return match[1];
  return /^[A-Za-z0-9_-]{10,}$/.test(raw) ? raw : "";
}

async function driveFetch(url, params = {}) {
  const u = new URL(url);
  u.searchParams.set("key", driveKey());
  for (const [key, value] of Object.entries(params)) {
    u.searchParams.set(key, String(value));
  }
  const resp = await fetch(u);
  if (!resp.ok) {
    let detail = "";
    try {
      const data = await resp.clone().json();
      detail = data && data.error && data.error.message ? data.error.message : "";
    } catch {}
    if (!detail) {
      try {
        detail = (await resp.text()).slice(0, 300);
      } catch {}
    }
    throw new Error(`Drive API ${resp.status}${detail ? `: ${detail}` : ""}`);
  }
  return resp;
}

async function listDriveFiles(folder, recursive = false, limit = 30, includeFolders = false) {
  const root = extractFolderId(folder);
  if (!root) throw new Error("구글 드라이브 폴더 ID를 찾을 수 없습니다.");

  const files = [];
  const queue = [{ id: root, name: "", path: "" }];
  const seen = new Set();

  while (queue.length && files.length < limit) {
    const current = queue.shift();
    if (seen.has(current.id)) continue;
    seen.add(current.id);

    let pageToken = "";
    do {
      const params = {
        q: `'${current.id}' in parents and trashed = false`,
        fields: "nextPageToken, files(id,name,mimeType,webViewLink)",
        pageSize: Math.min(100, Math.max(10, limit)),
        orderBy: "name",
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      };
      if (pageToken) params.pageToken = pageToken;
      const data = await (await driveFetch("https://www.googleapis.com/drive/v3/files", params)).json();
      for (const item of data.files || []) {
        item._parentId = current.id;
        item._parentName = current.name;
        item._folderPath = current.path;
        if (item.mimeType === FOLDER_MIME) {
          item._isFolder = true;
          item._folderName = item.name || "";
          if (recursive) {
            queue.push({
              id: item.id,
              name: item.name || "",
              path: `${current.path}/${item.name || ""}`.replace(/^\/+/, ""),
            });
          }
          if (includeFolders) {
            files.push(item);
            if (files.length >= limit) break;
          }
          continue;
        }
        files.push(item);
        if (files.length >= limit) break;
      }
      pageToken = data.nextPageToken || "";
    } while (pageToken && files.length < limit);
  }

  return files.slice(0, limit);
}

function exportUrl(fileId, mimeType) {
  if (mimeType === DOC_MIME) return `https://docs.google.com/document/d/${fileId}/export?format=txt`;
  if (mimeType === SHEET_MIME) return `https://docs.google.com/spreadsheets/d/${fileId}/export?format=csv`;
  if (mimeType === SLIDE_MIME) return `https://docs.google.com/presentation/d/${fileId}/export/txt`;
  return "";
}

async function getDriveText(fileId, mimeType = "") {
  const exportTarget = exportUrl(fileId, mimeType);
  if (exportTarget) return await (await driveFetch(exportTarget)).text();

  const meta = await (await driveFetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    fields: "id,name,mimeType",
    supportsAllDrives: true,
  })).json();
  const target = exportUrl(fileId, meta.mimeType || mimeType);
  if (target) return await (await driveFetch(target)).text();
  return await (await driveFetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    alt: "media",
    supportsAllDrives: true,
  })).text();
}

async function getDriveMedia(fileId) {
  return await driveFetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    alt: "media",
    supportsAllDrives: true,
  });
}

module.exports = {
  getDriveMedia,
  getDriveText,
  listDriveFiles,
};
