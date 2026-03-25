"""FastAPI routes for Virality System."""
import asyncio
import json
from datetime import datetime

from fastapi import APIRouter, HTTPException, Request
from starlette.responses import StreamingResponse

from . import db
from .scraper import scrape_creator_profile, scrape_creator_videos, refresh_creator, add_video_manually
from .ai_analyzer import analyze_video, generate_concepts

router = APIRouter(prefix="/api/virality", tags=["virality"])


# ═══════════════ Creators ═══════════════

@router.get("/creators")
async def list_creators(category: str = ""):
    return db.get_creators(category)


@router.post("/creators")
async def add_creator(request: Request):
    body = await request.json()
    username = body.get("username", "").strip().lstrip("@")
    category = body.get("category", "")
    if not username:
        raise HTTPException(400, "username 필수")

    try:
        creator = db.create_creator(username, category)
    except Exception:
        raise HTTPException(409, "이미 등록된 크리에이터입니다")

    # 백그라운드로 프로필 스크래핑
    profile = await scrape_creator_profile(username)
    creator = db.update_creator(
        creator["id"],
        followers=profile["followers"],
        reels_30d=profile["reels_30d"],
        avg_views=profile["avg_views"],
        profile_pic_url=profile.get("profile_pic_url", ""),
        bio=profile.get("bio", ""),
        scraped_at=datetime.utcnow().isoformat(),
    )
    return creator


@router.post("/creators/{creator_id}/refresh")
async def refresh_creator_endpoint(creator_id: int):
    result = await refresh_creator(creator_id)
    if not result:
        raise HTTPException(404, "크리에이터를 찾을 수 없습니다")
    return result


@router.put("/creators/{creator_id}")
async def edit_creator(creator_id: int, request: Request):
    body = await request.json()
    allowed = {"category", "username"}
    updates = {k: v for k, v in body.items() if k in allowed}
    if not updates:
        raise HTTPException(400, "수정할 항목이 없습니다")
    return db.update_creator(creator_id, **updates)


@router.delete("/creators/{creator_id}")
async def remove_creator(creator_id: int):
    db.delete_creator(creator_id)
    return {"ok": True}


# ═══════════════ Configs ═══════════════

@router.get("/configs")
async def list_configs():
    return db.get_configs()


@router.post("/configs")
async def create_config(request: Request):
    body = await request.json()
    return db.create_config(
        name=body.get("name", "Untitled"),
        category=body.get("category", ""),
        analysis_instructions=body.get("analysis_instructions", ""),
        concept_instructions=body.get("concept_instructions", ""),
    )


@router.put("/configs/{config_id}")
async def edit_config(config_id: int, request: Request):
    body = await request.json()
    allowed = {"name", "category", "analysis_instructions", "concept_instructions"}
    updates = {k: v for k, v in body.items() if k in allowed}
    return db.update_config(config_id, **updates)


@router.delete("/configs/{config_id}")
async def remove_config(config_id: int):
    db.delete_config(config_id)
    return {"ok": True}


# ═══════════════ Videos ═══════════════

@router.get("/videos")
async def list_videos(config_id: int = 0, creator_id: int = 0, sort: str = "views"):
    videos = db.get_videos(config_id=config_id, creator_id=creator_id, sort=sort)
    # 각 비디오에 분석/콘셉트 존재 여부 추가
    for v in videos:
        v["has_analysis"] = False
        v["has_concepts"] = False
        if config_id:
            a = db.get_analysis(v["id"], config_id)
            v["has_analysis"] = a is not None
            c = db.get_concepts(v["id"], config_id)
            v["has_concepts"] = len(c) > 0
    return videos


@router.get("/videos/{video_id}")
async def get_video(video_id: int, config_id: int = 0):
    video = db.get_video(video_id)
    if not video:
        raise HTTPException(404, "영상을 찾을 수 없습니다")
    if config_id:
        video["analysis"] = db.get_analysis(video_id, config_id)
        video["concepts"] = db.get_concepts(video_id, config_id)
    return video


@router.post("/videos/manual")
async def add_video(request: Request):
    """수동으로 영상 추가 (Apify 없이)."""
    body = await request.json()
    creator_id = body.get("creator_id")
    if not creator_id:
        raise HTTPException(400, "creator_id 필수")
    creator = db.get_creator(creator_id)
    if not creator:
        raise HTTPException(404, "크리에이터를 찾을 수 없습니다")

    video = add_video_manually(
        creator_id=creator_id,
        url=body.get("url", ""),
        caption=body.get("caption", ""),
        views=body.get("views", 0),
        likes=body.get("likes", 0),
        comments=body.get("comments", 0),
        thumbnail_url=body.get("thumbnail_url", ""),
        posted_at=body.get("posted_at", ""),
    )
    return video


@router.delete("/videos/{video_id}")
async def remove_video(video_id: int):
    conn = db.get_conn()
    conn.execute("DELETE FROM videos WHERE id = ?", (video_id,))
    conn.commit()
    conn.close()
    return {"ok": True}


# ═══════════════ Analysis & Concepts ═══════════════

@router.post("/videos/{video_id}/analyze")
async def analyze_single(video_id: int, request: Request):
    body = await request.json()
    config_id = body.get("config_id", 0)
    video = db.get_video(video_id)
    if not video:
        raise HTTPException(404, "영상을 찾을 수 없습니다")

    config = db.get_config(config_id) if config_id else None
    custom_instructions = config["analysis_instructions"] if config else ""

    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(None, lambda: analyze_video(
        caption=video["caption"],
        views=video["views"],
        likes=video["likes"],
        comments=video["comments"],
        creator_username=video["creator_username"],
        custom_instructions=custom_instructions,
    ))

    analysis = db.save_analysis(
        video_id=video_id,
        config_id=config_id,
        hook=result["hook_analysis"],
        retention=result["retention_analysis"],
        script=result["script_analysis"],
        full=result["full_analysis"],
    )

    # 콘셉트도 자동 생성
    concept_instructions = config["concept_instructions"] if config else ""
    concepts_raw = await loop.run_in_executor(None, lambda: generate_concepts(
        video_caption=video["caption"],
        analysis_text=result["full_analysis"],
        views=video["views"],
        creator_username=video["creator_username"],
        concept_instructions=concept_instructions,
    ))
    db.save_concepts(video_id, config_id, concepts_raw)

    return {
        "analysis": analysis,
        "concepts": db.get_concepts(video_id, config_id),
    }


# ═══════════════ Pipeline ═══════════════

@router.post("/pipeline/run")
async def run_pipeline(request: Request):
    """파이프라인 실행 (SSE 스트림)."""
    body = await request.json()
    config_id = body.get("config_id")
    max_videos_per_creator = body.get("max_videos", 3)
    days = body.get("days", 30)

    if not config_id:
        raise HTTPException(400, "config_id 필수")

    config = db.get_config(config_id)
    if not config:
        raise HTTPException(404, "설정을 찾을 수 없습니다")

    # 해당 카테고리의 크리에이터들
    creators = db.get_creators(config["category"])
    if not creators:
        raise HTTPException(400, f"'{config['category']}' 카테고리에 크리에이터가 없습니다")

    run = db.create_pipeline_run(config_id)
    run_id = run["id"]

    async def event_stream():
        total_videos = 0
        analyzed = 0

        yield _sse({"type": "start", "run_id": run_id, "creators": len(creators)})

        all_videos = []
        for i, creator in enumerate(creators):
            yield _sse({
                "type": "scraping",
                "creator": creator["username"],
                "index": i,
                "total": len(creators),
            })

            # 1단계: Apify 스크래핑 시도
            scraped = []
            try:
                scraped = await scrape_creator_videos(
                    creator["username"], creator["id"],
                    days=days, max_videos=max_videos_per_creator,
                )
            except Exception as e:
                yield _sse({"type": "error", "creator": creator["username"], "message": str(e)})

            # 2단계: 스크래핑 결과 없으면 DB에서 기존 영상 가져오기
            if not scraped:
                existing = db.get_videos(creator_id=creator["id"], sort="views", limit=max_videos_per_creator)
                # 아직 이 config로 분석 안 된 영상만
                for v in existing:
                    a = db.get_analysis(v["id"], config_id)
                    if not a:
                        scraped.append(v)

            all_videos.extend(scraped)
            total_videos += len(scraped)
            yield _sse({
                "type": "scraped",
                "creator": creator["username"],
                "videos_found": len(scraped),
                "total_so_far": total_videos,
            })

        db.update_pipeline_run(run_id, status="analyzing", total_videos=total_videos)

        # 조회수 상위 영상들만 분석
        all_videos.sort(key=lambda v: v.get("views", 0), reverse=True)
        to_analyze = all_videos[:max_videos_per_creator * len(creators)]

        if not to_analyze:
            yield _sse({"type": "info", "message": "분석할 영상이 없습니다. Videos 페이지에서 '+ Add Video'로 영상을 먼저 추가하세요."})
            db.update_pipeline_run(run_id, status="completed", analyzed_videos=0, finished_at=datetime.utcnow().isoformat())
            yield _sse({"type": "complete", "run_id": run_id, "total_videos": 0, "analyzed": 0})
            return

        for i, video in enumerate(to_analyze):
            yield _sse({
                "type": "analyzing",
                "video_id": video["id"],
                "caption": (video.get("caption", "") or "")[:100],
                "views": video.get("views", 0),
                "index": i,
                "total": len(to_analyze),
            })

            try:
                loop = asyncio.get_event_loop()
                result = await loop.run_in_executor(None, lambda v=video: analyze_video(
                    caption=v.get("caption", ""),
                    views=v.get("views", 0),
                    likes=v.get("likes", 0),
                    comments=v.get("comments", 0),
                    creator_username=v.get("creator_username", ""),
                    custom_instructions=config["analysis_instructions"],
                ))

                db.save_analysis(
                    video_id=video["id"],
                    config_id=config_id,
                    hook=result["hook_analysis"],
                    retention=result["retention_analysis"],
                    script=result["script_analysis"],
                    full=result["full_analysis"],
                )

                # 콘셉트 생성
                concepts_raw = await loop.run_in_executor(None, lambda v=video, r=result: generate_concepts(
                    video_caption=v.get("caption", ""),
                    analysis_text=r["full_analysis"],
                    views=v.get("views", 0),
                    creator_username=v.get("creator_username", ""),
                    concept_instructions=config["concept_instructions"],
                ))
                db.save_concepts(video["id"], config_id, concepts_raw)

                analyzed += 1
                yield _sse({
                    "type": "analyzed",
                    "video_id": video["id"],
                    "index": i,
                    "analyzed_count": analyzed,
                })
            except Exception as e:
                yield _sse({
                    "type": "analysis_error",
                    "video_id": video["id"],
                    "message": str(e),
                    "index": i,
                })

        db.update_pipeline_run(
            run_id, status="completed",
            analyzed_videos=analyzed,
            finished_at=datetime.utcnow().isoformat(),
        )

        yield _sse({
            "type": "complete",
            "run_id": run_id,
            "total_videos": total_videos,
            "analyzed": analyzed,
        })

    return StreamingResponse(event_stream(), media_type="text/event-stream")


# ═══════════════ Utils ═══════════════

@router.get("/categories")
async def list_categories():
    return db.get_categories()


def _sse(data: dict) -> str:
    return f"data: {json.dumps(data, ensure_ascii=False)}\n\n"
