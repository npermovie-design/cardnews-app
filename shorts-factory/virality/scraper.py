"""Instagram scraper - Apify API 또는 수동 입력 지원."""
import os
import re
import hashlib
import httpx
from datetime import datetime, timedelta
from . import db


APIFY_TOKEN = os.getenv("APIFY_API_TOKEN", "")
APIFY_BASE = "https://api.apify.com/v2"
PROFILE_ACTOR = "apify/instagram-profile-scraper"
REELS_ACTOR = "apify/instagram-reel-scraper"


# ═══════════════ 수동 영상 추가 ═══════════════

def add_video_manually(
    creator_id: int,
    url: str = "",
    caption: str = "",
    views: int = 0,
    likes: int = 0,
    comments: int = 0,
    thumbnail_url: str = "",
    posted_at: str = "",
) -> dict:
    """수동으로 영상 추가 (API 없이)."""
    # shortcode 생성: URL에서 추출하거나 해시 생성
    shortcode = _extract_shortcode(url) if url else hashlib.md5(
        f"{creator_id}_{caption[:50]}_{datetime.utcnow().isoformat()}".encode()
    ).hexdigest()[:11]

    return db.upsert_video(
        creator_id=creator_id,
        shortcode=shortcode,
        url=url,
        thumbnail_url=thumbnail_url,
        video_url="",
        caption=caption[:2000],
        views=views,
        likes=likes,
        comments=comments,
        posted_at=posted_at or datetime.utcnow().isoformat(),
    )


def _extract_shortcode(url: str) -> str:
    """Instagram URL에서 shortcode 추출."""
    patterns = [
        r"instagram\.com/reel/([A-Za-z0-9_-]+)",
        r"instagram\.com/p/([A-Za-z0-9_-]+)",
        r"instagram\.com/reels/([A-Za-z0-9_-]+)",
    ]
    for pat in patterns:
        m = re.search(pat, url)
        if m:
            return m.group(1)
    return hashlib.md5(url.encode()).hexdigest()[:11]


# ═══════════════ Instagram 공개 프로필 (API 불필요) ═══════════════

async def scrape_creator_profile(username: str) -> dict:
    """크리에이터 프로필 정보 가져오기."""
    username = username.strip().lstrip("@")

    # Apify 토큰이 있으면 Apify 사용
    if APIFY_TOKEN:
        return await _apify_profile(username)

    # 없으면 기본값 반환 (수동 입력 모드)
    return {
        "username": username,
        "followers": 0,
        "reels_30d": 0,
        "avg_views": 0,
        "profile_pic_url": "",
        "bio": f"@{username} - 수동 입력 모드 (APIFY_API_TOKEN 설정 시 자동 스크래핑)",
    }


async def scrape_creator_videos(
    username: str, creator_id: int, days: int = 30, max_videos: int = 10
) -> list[dict]:
    """크리에이터의 최근 릴스/영상을 스크래핑."""
    username = username.strip().lstrip("@")

    if APIFY_TOKEN:
        return await _apify_videos(username, creator_id, days, max_videos)

    # Apify 없으면 빈 리스트 (수동 입력 모드)
    return []


async def refresh_creator(creator_id: int) -> dict:
    """크리에이터 프로필 새로고침."""
    creator = db.get_creator(creator_id)
    if not creator:
        return {}

    profile = await scrape_creator_profile(creator["username"])
    updated = db.update_creator(
        creator_id,
        followers=profile["followers"],
        reels_30d=profile["reels_30d"],
        avg_views=profile["avg_views"],
        profile_pic_url=profile.get("profile_pic_url", ""),
        bio=profile.get("bio", ""),
        scraped_at=datetime.utcnow().isoformat(),
    )
    return updated


# ═══════════════ Apify 구현 (토큰 있을 때만) ═══════════════

async def _apify_profile(username: str) -> dict:
    async with httpx.AsyncClient(timeout=120) as client:
        run_input = {"usernames": [username], "resultsLimit": 1}
        resp = await client.post(
            f"{APIFY_BASE}/acts/{PROFILE_ACTOR}/runs",
            params={"token": APIFY_TOKEN},
            json=run_input,
        )
        resp.raise_for_status()
        run_id = resp.json()["data"]["id"]
        dataset_id = await _wait_for_run(client, run_id)
        if not dataset_id:
            return {"username": username, "followers": 0, "reels_30d": 0, "avg_views": 0}

        items_resp = await client.get(
            f"{APIFY_BASE}/datasets/{dataset_id}/items",
            params={"token": APIFY_TOKEN},
        )
        items = items_resp.json()
        if not items:
            return {"username": username, "followers": 0, "reels_30d": 0, "avg_views": 0}

        profile = items[0]
        return {
            "username": username,
            "followers": profile.get("followersCount", 0),
            "reels_30d": profile.get("postsCount", 0),
            "avg_views": profile.get("avgVideoViews", 0) or 0,
            "profile_pic_url": profile.get("profilePicUrl", ""),
            "bio": profile.get("biography", ""),
        }


async def _apify_videos(username: str, creator_id: int, days: int, max_videos: int) -> list[dict]:
    async with httpx.AsyncClient(timeout=180) as client:
        run_input = {"username": [username], "resultsLimit": max_videos}
        resp = await client.post(
            f"{APIFY_BASE}/acts/{REELS_ACTOR}/runs",
            params={"token": APIFY_TOKEN},
            json=run_input,
        )
        resp.raise_for_status()
        run_id = resp.json()["data"]["id"]
        dataset_id = await _wait_for_run(client, run_id)
        if not dataset_id:
            return []

        items_resp = await client.get(
            f"{APIFY_BASE}/datasets/{dataset_id}/items",
            params={"token": APIFY_TOKEN},
        )
        items = items_resp.json()
        cutoff = datetime.utcnow() - timedelta(days=days)
        videos = []
        for item in items:
            posted_at = item.get("timestamp", "")
            if posted_at:
                try:
                    post_dt = datetime.fromisoformat(posted_at.replace("Z", "+00:00"))
                    if post_dt.replace(tzinfo=None) < cutoff:
                        continue
                except (ValueError, TypeError):
                    pass

            video = db.upsert_video(
                creator_id=creator_id,
                shortcode=item.get("shortCode", item.get("id", "")),
                url=item.get("url", ""),
                thumbnail_url=item.get("displayUrl", item.get("thumbnailUrl", "")),
                video_url=item.get("videoUrl", ""),
                caption=item.get("caption", "")[:2000],
                views=item.get("videoViewCount", item.get("playCount", 0)) or 0,
                likes=item.get("likesCount", 0) or 0,
                comments=item.get("commentsCount", 0) or 0,
                posted_at=posted_at,
            )
            videos.append(video)
        return videos


async def _wait_for_run(client: httpx.AsyncClient, run_id: str, max_wait: int = 300) -> str | None:
    import asyncio
    for _ in range(max_wait // 5):
        resp = await client.get(
            f"{APIFY_BASE}/actor-runs/{run_id}",
            params={"token": APIFY_TOKEN},
        )
        data = resp.json()["data"]
        status = data.get("status", "")
        if status == "SUCCEEDED":
            return data.get("defaultDatasetId", "")
        if status in ("FAILED", "ABORTED", "TIMED-OUT"):
            return None
        await asyncio.sleep(5)
    return None
