"""Store Naver session cookies in the OS keyring.

On Windows, keyring uses the current user's DPAPI-backed credential store. This
keeps Naver cookies out of Playwright's persistent profile SQLite files.
"""

import json
from typing import Dict, List

import keyring


SERVICE_NAME = "NaverBotSaaS-NaverSession"


def save_naver_cookies(user_id: str, cookies: List[Dict]) -> None:
    if not user_id:
        raise ValueError("user_id required")
    keyring.set_password(SERVICE_NAME, user_id, json.dumps(cookies, ensure_ascii=False))


def load_naver_cookies(user_id: str) -> List[Dict]:
    if not user_id:
        return []
    data = keyring.get_password(SERVICE_NAME, user_id)
    if not data:
        return []
    try:
        return json.loads(data)
    except (json.JSONDecodeError, TypeError):
        return []


def delete_naver_cookies(user_id: str) -> bool:
    try:
        keyring.delete_password(SERVICE_NAME, user_id)
        return True
    except keyring.errors.PasswordDeleteError:
        return False
