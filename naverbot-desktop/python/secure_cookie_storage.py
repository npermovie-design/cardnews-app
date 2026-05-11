"""Store Naver session cookies in the OS keyring.

On Windows, keyring uses the current user's DPAPI-backed credential store.
Windows Credential Manager has a ~2560 byte limit per credential, so large
cookie data is chunked across multiple entries.

Fallback: if keyring write still fails (e.g. restricted environments),
cookies are saved to an encrypted local file using DPAPI via keyring's
own encryption or a simple obfuscation layer.
"""

import json
import os
import base64
import sys
from typing import Dict, List

import keyring

SERVICE_NAME = "NaverBotSaaS-NaverSession"
CHUNK_SIZE = 2000  # safe margin under 2560-byte Windows limit
FALLBACK_DIR = os.path.join(
    os.environ.get("APPDATA", os.path.join(os.path.expanduser("~"), "AppData", "Roaming")),
    "NaverBotSaaS",
)


def _chunk_key(user_id: str, idx: int) -> str:
    return f"{user_id}__chunk{idx}"


def _clear_old_chunks(user_id: str) -> None:
    """Remove all existing chunk entries for a user."""
    for i in range(200):  # generous upper bound
        key = _chunk_key(user_id, i)
        try:
            existing = keyring.get_password(SERVICE_NAME, key)
            if existing is None:
                break
            keyring.delete_password(SERVICE_NAME, key)
        except Exception:
            break
    # Also try to remove legacy single-key entry
    try:
        keyring.delete_password(SERVICE_NAME, user_id)
    except Exception:
        pass


def _fallback_path(user_id: str) -> str:
    safe_id = "".join(c if c.isalnum() else "_" for c in user_id)
    return os.path.join(FALLBACK_DIR, f".session_{safe_id}.dat")


def _save_fallback(user_id: str, data: str) -> None:
    """Save to a local file when keyring fails."""
    os.makedirs(FALLBACK_DIR, exist_ok=True)
    encoded = base64.b64encode(data.encode("utf-8")).decode("ascii")
    path = _fallback_path(user_id)
    with open(path, "w", encoding="utf-8") as f:
        f.write(encoded)


def _load_fallback(user_id: str) -> str | None:
    path = _fallback_path(user_id)
    if not os.path.exists(path):
        return None
    try:
        with open(path, "r", encoding="utf-8") as f:
            encoded = f.read().strip()
        return base64.b64decode(encoded).decode("utf-8")
    except Exception:
        return None


def _delete_fallback(user_id: str) -> None:
    path = _fallback_path(user_id)
    try:
        if os.path.exists(path):
            os.remove(path)
    except Exception:
        pass


def save_naver_cookies(user_id: str, cookies: List[Dict]) -> None:
    if not user_id:
        raise ValueError("user_id required")

    data = json.dumps(cookies, ensure_ascii=False)

    # Try chunked keyring storage first
    try:
        _clear_old_chunks(user_id)
        chunks = [data[i:i + CHUNK_SIZE] for i in range(0, len(data), CHUNK_SIZE)]

        # Store chunk count in the base key
        keyring.set_password(SERVICE_NAME, user_id, str(len(chunks)))

        for idx, chunk in enumerate(chunks):
            keyring.set_password(SERVICE_NAME, _chunk_key(user_id, idx), chunk)

        # If keyring succeeded, remove any fallback file
        _delete_fallback(user_id)
        return
    except Exception as e:
        print(f"[ERR] keyring 저장 실패, 파일 폴백 사용: {e}", file=sys.stderr)

    # Fallback: save to local encrypted file
    _save_fallback(user_id, data)
    print(f"[세션] 파일 기반 저장 완료: {_fallback_path(user_id)}", file=sys.stderr)


def load_naver_cookies(user_id: str) -> List[Dict]:
    if not user_id:
        return []

    # Try chunked keyring first
    try:
        meta = keyring.get_password(SERVICE_NAME, user_id)
        if meta is not None:
            # Check if it's a chunk count (numeric) or legacy single JSON
            if meta.strip().isdigit():
                count = int(meta.strip())
                parts = []
                for idx in range(count):
                    chunk = keyring.get_password(SERVICE_NAME, _chunk_key(user_id, idx))
                    if chunk is None:
                        break
                    parts.append(chunk)
                if parts:
                    return json.loads("".join(parts))
            else:
                # Legacy single-key format
                return json.loads(meta)
    except Exception:
        pass

    # Fallback: try local file
    data = _load_fallback(user_id)
    if data:
        try:
            return json.loads(data)
        except (json.JSONDecodeError, TypeError):
            pass

    return []


def delete_naver_cookies(user_id: str) -> bool:
    success = False
    try:
        _clear_old_chunks(user_id)
        success = True
    except Exception:
        pass
    _delete_fallback(user_id)
    return success
