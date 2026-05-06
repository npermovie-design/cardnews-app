"""라이선스 검증 모듈

서버에 라이선스 키 + machine_id를 보내 활성 상태 확인.
앱 시작 시 + 봇 실행 직전 두 번 호출.
"""

import hashlib
import platform
import uuid
import requests
from dataclasses import dataclass

LICENSE_API_URL = "https://snsmakeit.com/api/naverbot/license-verify"
TIMEOUT = 10


def get_machine_id() -> str:
    """PC 고유 식별자 (하드웨어 시리얼 + MAC + hostname 복합 해시)"""
    parts = []
    # Windows WMI: 마더보드/CPU/디스크 시리얼 (위조 어려움)
    if platform.system() == "Windows":
        try:
            import subprocess
            for cmd in [
                "wmic baseboard get serialnumber",
                "wmic cpu get processorid",
                "wmic diskdrive get serialnumber",
            ]:
                out = subprocess.check_output(cmd, shell=True, timeout=5,
                                              stderr=subprocess.DEVNULL).decode().strip()
                lines = [l.strip() for l in out.splitlines() if l.strip()]
                if len(lines) > 1:
                    parts.append(lines[-1])
        except Exception:
            pass
    # 폴백: MAC + hostname + OS
    try:
        parts.append(str(uuid.getnode()))
        parts.append(platform.node())
        parts.append(platform.system())
    except Exception:
        pass
    if not parts:
        return "unknown"
    raw = "-".join(parts)
    return hashlib.sha256(raw.encode()).hexdigest()[:32]


@dataclass
class LicenseStatus:
    valid: bool
    plan: str = ""  # starter | pro | business
    expires_at: str = ""
    error: str = ""


def verify_license(license_key: str) -> LicenseStatus:
    if not license_key:
        return LicenseStatus(valid=False, error="라이선스 키 없음")

    try:
        resp = requests.post(
            LICENSE_API_URL,
            json={
                "license_key": license_key,
                "machine_id": get_machine_id(),
            },
            timeout=TIMEOUT,
        )
        if resp.status_code != 200:
            return LicenseStatus(valid=False, error=f"서버 응답 {resp.status_code}")
        data = resp.json()
        return LicenseStatus(
            valid=bool(data.get("valid")),
            plan=data.get("plan", ""),
            expires_at=data.get("expires_at", ""),
            error=data.get("error", ""),
        )
    except requests.RequestException as e:
        return LicenseStatus(valid=False, error=f"네트워크 오류: {e}")
