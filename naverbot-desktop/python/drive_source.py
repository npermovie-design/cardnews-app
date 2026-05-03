"""Google Drive folder source helpers.

Public/shared folders are read with the Drive v3 API when an API key is
available. Individual Google Docs can also be exported through their document
URL when the file is shared for reading.
"""

from __future__ import annotations

import re
import os
from dataclasses import dataclass, field
from typing import Iterable
from urllib.parse import parse_qs, unquote, urlparse

import requests


DRIVE_PROXY_URL = os.environ.get("NAVERBOT_DRIVE_PROXY_URL", "https://naverbot-saas.vercel.app/api/naverbot/drive")
DRIVE_IMAGE_PROXY_URL = os.environ.get("NAVERBOT_DRIVE_IMAGE_PROXY_URL", "https://naverbot-saas.vercel.app/api/naverbot/drive-image")
FOLDER_MIME = "application/vnd.google-apps.folder"
DOC_MIME = "application/vnd.google-apps.document"
SHEET_MIME = "application/vnd.google-apps.spreadsheet"
SLIDE_MIME = "application/vnd.google-apps.presentation"


@dataclass
class DriveItem:
    id: str
    name: str
    mime_type: str
    text: str
    web_url: str = ""
    image_url: str = ""
    folder_id: str = ""
    folder_name: str = ""
    related_images: list["DriveItem"] = field(default_factory=list)


def extract_folder_id(value: str) -> str:
    value = (value or "").strip()
    if not value:
        return ""

    parsed = urlparse(value)
    qs = parse_qs(parsed.query)
    if qs.get("id"):
        return qs["id"][0]

    patterns = [
        r"/folders/([A-Za-z0-9_-]+)",
        r"[?&]folderId=([A-Za-z0-9_-]+)",
    ]
    for pattern in patterns:
        match = re.search(pattern, value)
        if match:
            return match.group(1)

    if re.fullmatch(r"[A-Za-z0-9_-]{10,}", value):
        return value
    return ""


def extract_file_id(value: str) -> str:
    value = (value or "").strip()
    patterns = [
        r"/document/d/([A-Za-z0-9_-]+)",
        r"/spreadsheets/d/([A-Za-z0-9_-]+)",
        r"/presentation/d/([A-Za-z0-9_-]+)",
        r"/file/d/([A-Za-z0-9_-]+)",
        r"[?&]id=([A-Za-z0-9_-]+)",
    ]
    for pattern in patterns:
        match = re.search(pattern, value)
        if match:
            return match.group(1)
    if re.fullmatch(r"[A-Za-z0-9_-]{10,}", value):
        return value
    return ""


def _drive_get(url: str, *, api_key: str, params: dict | None = None) -> requests.Response:
    merged = dict(params or {})
    if api_key:
        merged["key"] = api_key
    resp = requests.get(url, params=merged, timeout=25)
    resp.raise_for_status()
    return resp


def _raise_proxy_error(resp: requests.Response) -> None:
    if resp.ok:
        return
    detail = ""
    try:
        data = resp.json()
        detail = data.get("error") or data.get("message") or ""
    except Exception:
        detail = resp.text[:300]
    if detail:
        raise RuntimeError(f"Drive 프록시 오류 {resp.status_code}: {detail}")
    resp.raise_for_status()


def list_folder_files(
    folder_url_or_id: str,
    api_key: str,
    recursive: bool = False,
    limit: int = 30,
    include_folders: bool = False,
) -> list[dict]:
    folder_id = extract_folder_id(folder_url_or_id)
    if not folder_id:
        raise ValueError("구글 드라이브 폴더 ID를 찾을 수 없습니다.")
    if not api_key:
        resp = requests.post(
            DRIVE_PROXY_URL,
            json={
                "action": "list",
                "folder": folder_url_or_id,
                "recursive": recursive,
                "limit": limit,
                "include_folders": include_folders,
            },
            timeout=35,
        )
        _raise_proxy_error(resp)
        return resp.json().get("files", [])[:limit]

    files: list[dict] = []
    queue = [(folder_id, "", "")]
    seen_folders: set[str] = set()

    while queue and len(files) < limit:
        current, parent_name, folder_path = queue.pop(0)
        if current in seen_folders:
            continue
        seen_folders.add(current)

        page_token = ""
        while len(files) < limit:
            params = {
                "q": f"'{current}' in parents and trashed = false",
                "fields": "nextPageToken, files(id,name,mimeType,webViewLink)",
                "pageSize": min(100, max(10, limit)),
                "orderBy": "name",
                "supportsAllDrives": "true",
                "includeItemsFromAllDrives": "true",
            }
            if page_token:
                params["pageToken"] = page_token
            data = _drive_get("https://www.googleapis.com/drive/v3/files", api_key=api_key, params=params).json()
            for item in data.get("files", []):
                item["_parentId"] = current
                item["_parentName"] = parent_name
                item["_folderPath"] = folder_path
                if item.get("mimeType") == FOLDER_MIME:
                    item["_isFolder"] = True
                    item["_folderName"] = item.get("name", "")
                    if recursive:
                        next_path = f"{folder_path}/{item.get('name', '')}".strip("/")
                        queue.append((item["id"], item.get("name", ""), next_path))
                    if include_folders:
                        files.append(item)
                        if len(files) >= limit:
                            break
                    continue
                files.append(item)
                if len(files) >= limit:
                    break
            page_token = data.get("nextPageToken", "")
            if not page_token:
                break

    return files[:limit]


def _export_url(file_id: str, mime_type: str) -> str:
    if mime_type == DOC_MIME:
        return f"https://docs.google.com/document/d/{file_id}/export?format=txt"
    if mime_type == SHEET_MIME:
        return f"https://docs.google.com/spreadsheets/d/{file_id}/export?format=csv"
    if mime_type == SLIDE_MIME:
        return f"https://docs.google.com/presentation/d/{file_id}/export/txt"
    return ""


def fetch_file_text(file_id: str, mime_type: str = "", api_key: str = "") -> str:
    file_id = extract_file_id(file_id)
    if not file_id:
        return ""

    export_url = _export_url(file_id, mime_type)
    if export_url:
        resp = requests.get(export_url, timeout=30)
        if resp.ok and resp.text.strip():
            return resp.text

    if not api_key:
        resp = requests.post(
            DRIVE_PROXY_URL,
            json={"action": "text", "file_id": file_id, "mime_type": mime_type},
            timeout=35,
        )
        _raise_proxy_error(resp)
        return resp.json().get("text", "")

    if api_key:
        meta = _drive_get(
            f"https://www.googleapis.com/drive/v3/files/{file_id}",
            api_key=api_key,
            params={"fields": "id,name,mimeType", "supportsAllDrives": "true"},
        ).json()
        real_mime = meta.get("mimeType", mime_type)
        export_url = _export_url(file_id, real_mime)
        if export_url:
            resp = _drive_get(export_url, api_key=api_key)
            return resp.text
        resp = _drive_get(
            f"https://www.googleapis.com/drive/v3/files/{file_id}",
            api_key=api_key,
            params={"alt": "media", "supportsAllDrives": "true"},
        )
        return resp.text

    return ""


def load_drive_items(
    folder_url_or_id: str,
    api_key: str = "",
    *,
    recursive: bool = False,
    limit: int = 30,
) -> list[DriveItem]:
    raw_files = list_folder_files(
        folder_url_or_id,
        api_key,
        recursive=recursive,
        limit=max(limit * 8, limit),
        include_folders=recursive,
    )
    if recursive:
        grouped: dict[str, dict] = {}
        for raw in raw_files:
            if raw.get("mimeType") == FOLDER_MIME:
                grouped.setdefault(raw["id"], {
                    "id": raw["id"],
                    "name": raw.get("name") or "Google Drive 폴더",
                    "web_url": raw.get("webViewLink", ""),
                    "texts": [],
                    "file_names": [],
                })
                continue
            parent_id = raw.get("_parentId", "")
            parent_name = raw.get("_parentName", "")
            if not parent_id or not parent_name:
                continue
            bucket = grouped.setdefault(parent_id, {
                "id": parent_id,
                "name": parent_name,
                "web_url": "",
                "texts": [],
                "file_names": [],
            })
            bucket["file_names"].append(raw.get("name") or "")
            mime_type = raw.get("mimeType", "")
            if mime_type.startswith("image/") or mime_type.startswith("video/"):
                continue
            try:
                text = _clean_text(fetch_file_text(raw["id"], mime_type=mime_type, api_key=api_key))
            except Exception:
                continue
            if text:
                bucket["texts"].append(f"[{raw.get('name') or '자료'}]\n{text}")

        items: list[DriveItem] = []
        for folder in grouped.values():
            text_parts = folder["texts"]
            if not text_parts and folder["file_names"]:
                text_parts = ["폴더 안 파일: " + ", ".join([n for n in folder["file_names"] if n])]
            items.append(
                DriveItem(
                    id=folder["id"],
                    name=folder["name"],
                    mime_type=FOLDER_MIME,
                    text=_clean_text("\n\n".join(text_parts)),
                    web_url=folder.get("web_url", ""),
                    folder_id=folder["id"],
                    folder_name=folder["name"],
                )
            )
            if len(items) >= limit:
                break
        if items:
            return items

    items: list[DriveItem] = []
    for raw in raw_files:
        mime_type = raw.get("mimeType", "")
        if mime_type == FOLDER_MIME or mime_type.startswith("image/") or mime_type.startswith("video/"):
            continue
        try:
            text = fetch_file_text(raw["id"], mime_type=mime_type, api_key=api_key)
        except Exception:
            continue
        text = _clean_text(text)
        if not text:
            continue
        items.append(
            DriveItem(
                id=raw["id"],
                name=raw.get("name") or "Google Drive 자료",
                mime_type=mime_type,
                text=text,
                web_url=raw.get("webViewLink", ""),
                folder_id=raw.get("_parentId", ""),
                folder_name=raw.get("_parentName", ""),
            )
        )
        if len(items) >= limit:
            break
    return items


def load_drive_images(
    folder_url_or_id: str,
    api_key: str = "",
    *,
    recursive: bool = False,
    limit: int = 20,
) -> list[DriveItem]:
    raw_files = list_folder_files(
        folder_url_or_id,
        api_key,
        recursive=recursive,
        limit=max(limit * 8, limit),
        include_folders=False,
    )
    images: list[DriveItem] = []
    for raw in raw_files:
        mime_type = raw.get("mimeType", "")
        if not mime_type.startswith("image/"):
            continue
        file_id = raw["id"]
        image_url = (
            f"https://www.googleapis.com/drive/v3/files/{file_id}?alt=media&key={api_key}"
            if api_key
            else f"{DRIVE_IMAGE_PROXY_URL}?id={file_id}"
        )
        images.append(
            DriveItem(
                id=file_id,
                name=raw.get("name") or "Google Drive 이미지",
                mime_type=mime_type,
                text="",
                web_url=raw.get("webViewLink", ""),
                image_url=image_url,
                folder_id=raw.get("_parentId", ""),
                folder_name=raw.get("_parentName", ""),
            )
        )
        if len(images) >= limit:
            break
    return images


def build_drive_prompt(item: DriveItem, max_chars: int = 3500) -> str:
    body = item.text[:max_chars]
    source = f"\n원본 링크: {item.web_url}" if item.web_url else ""
    folder_hint = f"\n글감 폴더명: {item.folder_name}" if item.folder_name else ""
    material = body or "폴더명과 폴더 안 파일명을 기준으로 글의 방향을 잡으세요."
    return (
        "[구글 드라이브 자료 기반 작성]\n"
        f"자료 제목: {item.name}{folder_hint}{source}\n"
        "아래 자료의 핵심 내용을 바탕으로 새 블로그 글을 작성하세요.\n"
        "폴더명이 글 주제를 암시하면 그 폴더명을 가장 우선해서 제목과 본문 방향을 잡으세요.\n"
        "원문을 그대로 복사하지 말고, 구조를 재정리하고 설명을 보강하세요.\n"
        "자료에 없는 수치, 출처, 사례는 임의로 만들지 마세요.\n\n"
        f"--- 자료 내용 ---\n{material}\n---"
    )


def _clean_text(text: str) -> str:
    text = unquote(text or "")
    text = text.replace("\ufeff", "")
    text = re.sub(r"\r\n?", "\n", text)
    text = re.sub(r"\n{4,}", "\n\n\n", text)
    return text.strip()
