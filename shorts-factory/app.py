import sys
import uuid
import json
import asyncio
import subprocess
from pathlib import Path

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.responses import StreamingResponse

from srt_parser import parse_srt, parse_txt, subtitles_to_text
from analyzer import analyze_subtitles
from video_processor import generate_short, TEMPLATES
from transcriber import transcribe_video

from virality.routes import router as virality_router
from virality.db import init_db

app = FastAPI(title="Shorts Factory")

# CORS - iframe 임베딩 허용
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://www.snsmakeit.com", "https://snsmakeit.com", "http://localhost:5173", "http://localhost:3000", "https://*.vercel.app"],
    allow_origin_regex=r"https://cardnews-.*-npermovie-7580s-projects\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(virality_router)

@app.middleware("http")
async def add_frame_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Frame-Options"] = "ALLOWALL"
    response.headers["Content-Security-Policy"] = "frame-ancestors 'self' https://www.snsmakeit.com https://snsmakeit.com http://localhost:*"
    return response

# Initialize virality database
init_db()

import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("shorts-factory")

BASE_DIR = Path(__file__).parent
UPLOAD_DIR = BASE_DIR / "uploads"
OUTPUT_DIR = BASE_DIR / "outputs"
UPLOAD_DIR.mkdir(exist_ok=True)
OUTPUT_DIR.mkdir(exist_ok=True)

file_store: dict[str, dict] = {}


def snap_to_subtitle_boundaries(start: float, end: float, subs: list[dict]) -> tuple[float, float]:
    """시작/끝 시간을 자막 문장 경계에 맞춰 조정 (말 끊김 방지)"""
    if not subs:
        return start, end

    # start: 시작 시점에 걸친 자막이 있으면 그 자막의 시작점으로
    best_start = start
    for s in subs:
        if s["start_seconds"] <= start <= s["end_seconds"]:
            best_start = s["start_seconds"]
            break
        if s["start_seconds"] > start:
            # 다음 자막 시작이 1초 이내면 그걸로
            if s["start_seconds"] - start < 1.0:
                best_start = s["start_seconds"]
            break

    # end: 끝 시점에 걸친 자막이 있으면 그 자막이 끝날 때까지 연장
    best_end = end
    for s in subs:
        if s["start_seconds"] <= end <= s["end_seconds"]:
            # 말이 끝나기 전에 잘리는 것 방지 — 자막 끝까지 연장 (최대 2초)
            if s["end_seconds"] - end < 2.0:
                best_end = s["end_seconds"] + 0.3
            break
    # end 직전의 마지막 자막이 끝나는 시점으로
    for s in reversed(subs):
        if s["end_seconds"] <= end + 0.5:
            best_end = max(best_end, s["end_seconds"] + 0.3)
            break

    return best_start, best_end


@app.get("/", response_class=HTMLResponse)
async def index():
    html_path = BASE_DIR / "templates" / "index.html"
    return HTMLResponse(html_path.read_text(encoding="utf-8"))


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "shorts-factory"}


@app.get("/virality", response_class=HTMLResponse)
async def virality_page():
    html_path = BASE_DIR / "templates" / "virality.html"
    return HTMLResponse(html_path.read_text(encoding="utf-8"))


@app.get("/api/templates")
async def get_templates():
    """사용 가능한 템플릿 목록 반환"""
    return {"templates": list(TEMPLATES.keys())}


INVIDIOUS_INSTANCES = [
    "https://invidious.io.lol",
    "https://yt.cdaut.de",
    "https://invidious.privacyredirect.com",
    "https://inv.tux.pizza",
]

def extract_yt_id(url: str) -> str:
    import re
    m = re.search(r'(?:v=|youtu\.be/|shorts/|embed/)([^&?/\s]{11})', url)
    return m.group(1) if m else ""


@app.post("/youtube-download")
async def youtube_download(request: Request):
    """YouTube URL에서 영상 다운로드 (Invidious → yt-dlp 폴백)"""
    import httpx
    body = await request.json()
    url = body.get("url", "").strip()
    if not url:
        raise HTTPException(400, "URL이 필요합니다")

    vid = extract_yt_id(url)
    if not vid:
        raise HTTPException(400, "유효하지 않은 YouTube URL입니다")

    file_id = uuid.uuid4().hex[:12]
    file_dir = UPLOAD_DIR / file_id
    file_dir.mkdir(parents=True, exist_ok=True)
    video_path = file_dir / "video.mp4"

    errors = []

    # 0) 클라이언트가 stream URL을 전달한 경우 직접 다운로드
    stream_url = body.get("stream_url", "")
    if stream_url:
        try:
            import httpx
            async with httpx.AsyncClient(timeout=120, follow_redirects=True) as client_http:
                r = await client_http.get(stream_url, headers={"User-Agent": "Mozilla/5.0"})
                if r.status_code == 200:
                    video_path.write_bytes(r.content)
                    logger.info("Downloaded from stream_url successfully")
        except Exception as e:
            errors.append(f"stream_url: {str(e)[:80]}")
            logger.warning(f"stream_url download failed: {e}")

    # 1) yt-dlp (여러 player_client 시도)
    for client in [["mweb"], ["android"], ["default"], ["ios"], ["tv_embedded"]]:
        if video_path.exists():
            break
        try:
            import yt_dlp
            ydl_opts = {
                "format": "best[ext=mp4][height<=720]/bestvideo[ext=mp4][height<=720]+bestaudio[ext=m4a]/best[ext=mp4]/best",
                "outtmpl": str(video_path),
                "quiet": True,
                "no_warnings": True,
                "extractor_args": {"youtube": {"player_client": client, "player_skip": ["webpage"]}},
                "socket_timeout": 30,
                "retries": 5,
                "fragment_retries": 5,
                "http_headers": {
                    "User-Agent": "Mozilla/5.0 (Linux; Android 14; SM-S926B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
                    "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
                },
                "merge_output_format": "mp4",
                "live_from_start": False,
                "concurrent_fragment_downloads": 4,
            }
            loop = asyncio.get_event_loop()
            def do_download(opts=ydl_opts):
                with yt_dlp.YoutubeDL(opts) as ydl:
                    ydl.download([url])
            await loop.run_in_executor(None, do_download)
            if video_path.exists():
                logger.info(f"yt-dlp succeeded with client={client}")
                break
        except Exception as e:
            errors.append(f"yt-dlp({client[0]}): {str(e)[:80]}")
            logger.warning(f"yt-dlp {client} failed: {e}")

    # 2) pytubefix 폴백
    if not video_path.exists():
        try:
            from pytubefix import YouTube as PyTube
            loop = asyncio.get_event_loop()
            def do_pytube():
                yt = PyTube(url, use_oauth=False, allow_oauth_cache=False)
                stream = yt.streams.filter(progressive=True, file_extension="mp4").order_by("resolution").desc().first()
                if not stream:
                    stream = yt.streams.filter(file_extension="mp4").order_by("resolution").desc().first()
                if stream:
                    stream.download(output_path=str(file_dir), filename="video.mp4")
            await loop.run_in_executor(None, do_pytube)
        except Exception as e:
            errors.append(f"pytubefix: {str(e)[:100]}")
            logger.warning(f"pytubefix failed: {e}")

    if not video_path.exists():
        logger.warning(f"Download failed, trying caption-only analysis: {errors}")
        # 다운로드 실패 시 → 자막만 가져와서 분석 가능하게
        caption_srt = await _fetch_youtube_captions(vid, str(file_dir))
        if caption_srt:
            file_store[file_id] = {
                "video_path": "",
                "subtitle_path": caption_srt,
                "subtitle_ext": ".srt",
                "logo_path": "",
                "custom_font_path": "",
                "needs_transcription": False,
                "subs_parsed": None,
                "caption_only": True,
            }
            return {"file_id": file_id, "needs_transcription": False, "caption_only": True,
                    "message": "영상 다운로드가 차단되어 자막으로 분석합니다. 영상 생성 시 MP4 파일을 업로드해주세요."}
        raise HTTPException(500, f"다운로드 실패: YouTube가 서버 다운로드를 차단했어요. MP4 파일을 직접 업로드해주세요.")

    file_store[file_id] = {
        "video_path": str(video_path),
        "subtitle_path": None,
        "subtitle_ext": ".srt",
        "logo_path": "",
        "custom_font_path": "",
        "needs_transcription": True,
        "segments": None,
        "subs_parsed": None,
    }

    return {"file_id": file_id, "needs_transcription": True, "message": "YouTube 영상 다운로드 완료"}


async def _fetch_youtube_captions(vid: str, output_dir: str) -> str | None:
    """YouTube 자막/캡션만 가져오기 (다운로드 차단 우회)"""
    import httpx
    srt_path = str(Path(output_dir) / "subtitle.srt")

    # 1) yt-dlp로 자막만 추출 (영상 다운로드 없이)
    try:
        import yt_dlp
        ydl_opts = {
            "skip_download": True,
            "writesubtitles": True,
            "writeautomaticsub": True,
            "subtitleslangs": ["ko", "en", "ja"],
            "subtitlesformat": "srt",
            "outtmpl": str(Path(output_dir) / "video"),
            "quiet": True,
        }
        loop = asyncio.get_event_loop()
        def do_subs():
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.download([f"https://www.youtube.com/watch?v={vid}"])
        await loop.run_in_executor(None, do_subs)
        # 자막 파일 찾기
        for lang in ["ko", "en", "ja"]:
            for ext in [".srt", ".vtt"]:
                p = Path(output_dir) / f"video.{lang}{ext}"
                if p.exists() and p.stat().st_size > 10:
                    if ext == ".vtt":
                        _convert_vtt_to_srt(str(p), srt_path)
                    else:
                        import shutil
                        shutil.copy(str(p), srt_path)
                    logger.info(f"Caption extracted: {lang}")
                    return srt_path
    except Exception as e:
        logger.warning(f"yt-dlp caption failed: {e}")

    # 2) Invidious API로 캡션 가져오기
    INVIDIOUS = ["https://invidious.io.lol", "https://inv.tux.pizza", "https://yt.cdaut.de"]
    for base in INVIDIOUS:
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                r = await client.get(f"{base}/api/v1/captions/{vid}")
                if r.status_code == 200:
                    caps = r.json().get("captions", [])
                    for lang in ["ko", "Korean", "en", "English"]:
                        cap = next((c for c in caps if lang.lower() in c.get("label", "").lower() or lang.lower() in c.get("language_code", "").lower()), None)
                        if cap and cap.get("url"):
                            cr = await client.get(base + cap["url"])
                            if cr.status_code == 200:
                                with open(srt_path, "w", encoding="utf-8") as f:
                                    f.write(cr.text)
                                return srt_path
        except Exception:
            continue

    return None


def _convert_vtt_to_srt(vtt_path: str, srt_path: str):
    """VTT → SRT 간단 변환"""
    with open(vtt_path, "r", encoding="utf-8") as f:
        content = f.read()
    import re
    content = re.sub(r"WEBVTT.*?\n\n", "", content, count=1)
    content = content.replace(".", ",")
    lines = content.strip().split("\n\n")
    with open(srt_path, "w", encoding="utf-8") as f:
        for i, block in enumerate(lines, 1):
            parts = block.strip().split("\n")
            if len(parts) >= 2:
                f.write(f"{i}\n" + "\n".join(parts) + "\n\n")


@app.post("/api/yt-dl")
async def yt_dl_alias(request: Request):
    """YouTube 다운로드 alias (프론트엔드 호환)"""
    return await youtube_download(request)

@app.get("/api/youtube-info")
async def youtube_info(url: str = ""):
    """YouTube 영상 정보 조회 (Invidious → yt-dlp 폴백)"""
    import httpx
    if not url:
        raise HTTPException(400, "URL이 필요합니다")
    vid = extract_yt_id(url)
    if not vid:
        raise HTTPException(400, "유효하지 않은 YouTube URL")

    # 1) pytubefix
    try:
        from pytubefix import YouTube as PyTube
        yt = PyTube(f"https://www.youtube.com/watch?v={vid}", use_oauth=False, allow_oauth_cache=False)
        if yt.title:
            return {
                "title": yt.title or "",
                "duration": yt.length or 0,
                "thumbnail": yt.thumbnail_url or f"https://img.youtube.com/vi/{vid}/hqdefault.jpg",
                "channel": yt.author or "",
            }
    except Exception as e:
        logger.warning(f"pytubefix info failed: {e}")

    # 2) oEmbed 폴백
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            r = await client.get(f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={vid}&format=json")
            if r.status_code == 200:
                d = r.json()
                return {"title": d.get("title", ""), "duration": 0, "thumbnail": f"https://img.youtube.com/vi/{vid}/hqdefault.jpg", "channel": d.get("author_name", "")}
    except Exception:
        pass

    raise HTTPException(500, "영상 정보를 불러올 수 없습니다")


@app.post("/upload")
async def upload(request: Request):
    """영상 + 자막 + 로고 + 커스텀폰트 업로드"""
    form = await request.form()
    video = form.get("video")
    subtitle = form.get("subtitle")
    logo = form.get("logo")
    custom_font = form.get("custom_font")

    if not video or not hasattr(video, "read"):
        raise HTTPException(400, "영상 파일이 필요합니다")

    file_id = uuid.uuid4().hex[:12]
    file_dir = UPLOAD_DIR / file_id
    file_dir.mkdir(parents=True, exist_ok=True)

    video_ext = Path(video.filename or "video.mp4").suffix
    video_path = file_dir / f"video{video_ext}"
    video_path.write_bytes(await video.read())

    # 자막: 파일이 있고 내용이 있어야 유효
    sub_data = None
    if subtitle is not None and hasattr(subtitle, "read") and subtitle.filename:
        sub_data = await subtitle.read()
    has_subtitle = sub_data is not None and len(sub_data) > 0
    sub_path = None
    sub_ext = ".srt"
    if has_subtitle:
        sub_ext = Path(subtitle.filename or "sub.srt").suffix
        sub_path = file_dir / f"subtitle{sub_ext}"
        sub_path.write_bytes(sub_data)

    logo_path = None
    if logo is not None and hasattr(logo, "read") and logo.filename:
        logo_ext = Path(logo.filename).suffix
        logo_path = file_dir / f"logo{logo_ext}"
        logo_path.write_bytes(await logo.read())

    # 커스텀 폰트
    font_path = None
    if custom_font is not None and hasattr(custom_font, "read") and custom_font.filename:
        font_ext = Path(custom_font.filename).suffix
        font_path = file_dir / f"font{font_ext}"
        font_path.write_bytes(await custom_font.read())

    file_store[file_id] = {
        "video_path": str(video_path),
        "subtitle_path": str(sub_path) if sub_path else None,
        "subtitle_ext": sub_ext.lower(),
        "logo_path": str(logo_path) if logo_path else "",
        "custom_font_path": str(font_path) if font_path else "",
        "needs_transcription": not has_subtitle,
        "segments": None,
        "subs_parsed": None,
    }

    return {"file_id": file_id, "needs_transcription": not has_subtitle, "message": "업로드 완료"}


@app.get("/debug/env")
async def debug_env():
    """환경변수 확인용 디버그 엔드포인트"""
    import os
    return {
        "GROQ_API_KEY": "set" if os.getenv("GROQ_API_KEY") else "NOT SET",
        "OPENROUTER_API_KEY": "set" if os.getenv("OPENROUTER_API_KEY") else "NOT SET",
        "ffmpeg": bool(subprocess.run(["ffmpeg", "-version"], capture_output=True).returncode == 0),
        "file_store_ids": list(file_store.keys()),
    }

@app.post("/analyze/{file_id}")
async def analyze(file_id: str, request: Request):
    """자막 분석 → 추천 구간 JSON + 자막 데이터 반환"""
    if file_id not in file_store:
        raise HTTPException(404, "파일을 찾을 수 없습니다")

    try:
        body = await request.json()
    except Exception:
        body = {}
    max_chars = body.get("max_chars", 0)

    meta = file_store[file_id]
    logger.info(f"[analyze] file_id={file_id}, needs_transcription={meta.get('needs_transcription')}")

    if meta.get("needs_transcription") or not meta.get("subtitle_path"):
        try:
            loop = asyncio.get_event_loop()
            file_dir = Path(meta["video_path"]).parent
            logger.info(f"[analyze] Starting transcription for {meta['video_path']}")
            srt_path = await loop.run_in_executor(
                None, transcribe_video, meta["video_path"], str(file_dir), max_chars,
            )
            meta["subtitle_path"] = srt_path
            meta["subtitle_ext"] = ".srt"
            meta["needs_transcription"] = False
            logger.info(f"[analyze] Transcription complete: {srt_path}")
        except Exception as e:
            import traceback
            traceback.print_exc()
            logger.error(f"[analyze] Transcription failed: {e}")
            raise HTTPException(500, f"음성 인식 실패: {str(e)[:200]}")

    sub_path = meta["subtitle_path"]
    if meta["subtitle_ext"] == ".srt":
        subs = parse_srt(sub_path)
    else:
        subs = parse_txt(sub_path)

    if not subs:
        raise HTTPException(400, "자막을 파싱할 수 없습니다")

    meta["subs_parsed"] = subs
    text = subtitles_to_text(subs)
    segments = analyze_subtitles(text)

    # 자막 경계에 맞춰 시작/끝 시간 조정
    for seg in segments:
        seg["start_seconds"], seg["end_seconds"] = snap_to_subtitle_boundaries(
            seg["start_seconds"], seg["end_seconds"], subs
        )

    meta["segments"] = segments

    # 각 구간에 해당하는 자막도 함께 반환
    for seg in segments:
        seg_subs = [
            {"start": s["start_seconds"], "end": s["end_seconds"], "text": s["text"]}
            for s in subs
            if s["start_seconds"] >= seg["start_seconds"] - 0.5 and s["end_seconds"] <= seg["end_seconds"] + 0.5
        ]
        seg["subtitles"] = seg_subs

    return {"file_id": file_id, "segments": segments, "all_subs": [
        {"start": s["start_seconds"], "end": s["end_seconds"], "text": s["text"]} for s in subs
    ]}


@app.post("/generate")
async def generate(request: Request):
    """편집된 데이터로 숏폼 MP4 생성 (SSE 스트림) - 동기 방식으로 안정성 확보"""
    body = await request.json()
    file_id = body.get("file_id")
    clips = body.get("clips", [])
    remove_silence = body.get("remove_silence", False)
    template = body.get("template", "minimal")
    title_color = body.get("title_color", "")
    caption_color = body.get("caption_color", "")

    if not file_id or file_id not in file_store:
        raise HTTPException(404, "파일을 찾을 수 없습니다")

    meta = file_store[file_id]
    if not clips:
        raise HTTPException(400, "클립 데이터가 없습니다")

    output_dir = OUTPUT_DIR / file_id
    output_dir.mkdir(parents=True, exist_ok=True)

    # 클립별로 별도 프로세스에서 생성 (메모리 격리)
    import subprocess
    python_exe = sys.executable
    worker_script = str(BASE_DIR / "generate_worker.py")

    async def event_stream():
        for idx, clip in enumerate(clips):
            # 시작 알림
            yield f"data: {json.dumps({'type': 'start', 'index': idx, 'total': len(clips)})}\n\n"

            output_file = output_dir / f"short_{idx+1:02d}.mp4"
            edited_subs = [
                {"start_seconds": s["start"], "end_seconds": s["end"], "text": s["text"]}
                for s in clip.get("subtitles", [])
            ]
            worker_args = json.dumps({
                "video_path": meta["video_path"],
                "srt_path": meta.get("subtitle_path", ""),
                "start_seconds": clip["start_seconds"],
                "end_seconds": clip["end_seconds"],
                "output_path": str(output_file),
                "title": clip.get("title", ""),
                "subtitle": clip.get("subtitle_text", ""),
                "logo_path": meta.get("logo_path", ""),
                "remove_silence": remove_silence,
                "subs": edited_subs,
                "template": template,
                "custom_font": meta.get("custom_font_path", ""),
                "title_color": title_color,
                "caption_color": caption_color,
            }, ensure_ascii=False)

            try:
                loop = asyncio.get_event_loop()
                proc_result = await loop.run_in_executor(
                    None,
                    lambda args=worker_args: subprocess.run(
                        [python_exe, worker_script, args],
                        capture_output=True, text=True, timeout=600,
                        cwd=str(BASE_DIR),
                    ),
                )
                if proc_result.returncode == 0:
                    out = json.loads(proc_result.stdout.strip().split('\n')[-1])
                    if out.get("ok"):
                        yield f"data: {json.dumps({'type': 'done', 'index': idx, 'filename': output_file.name})}\n\n"
                    else:
                        yield f"data: {json.dumps({'type': 'error', 'index': idx, 'message': out.get('error', '알 수 없는 오류')})}\n\n"
                else:
                    err_msg = proc_result.stderr[-300:] if proc_result.stderr else "프로세스 실패"
                    yield f"data: {json.dumps({'type': 'error', 'index': idx, 'message': err_msg})}\n\n"
            except subprocess.TimeoutExpired:
                yield f"data: {json.dumps({'type': 'error', 'index': idx, 'message': '영상 생성 시간 초과 (10분)'})}\n\n"
            except Exception as e:
                yield f"data: {json.dumps({'type': 'error', 'index': idx, 'message': str(e)[:200]})}\n\n"

        yield f"data: {json.dumps({'type': 'complete'})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


# ── 비동기 생성 (백그라운드 처리) ──────────────────────────────
import threading
job_store: dict[str, dict] = {}

@app.post("/generate-async")
async def generate_async(request: Request):
    """비동기 영상 생성 — 즉시 job_id 반환, 백그라운드에서 처리"""
    body = await request.json()
    file_id = body.get("file_id")
    clips = body.get("clips", [])

    if not file_id or file_id not in file_store:
        raise HTTPException(404, "파일을 찾을 수 없습니다")
    if not clips:
        raise HTTPException(400, "클립 데이터가 없습니다")

    job_id = uuid.uuid4().hex[:12]
    meta = file_store[file_id]
    output_dir = OUTPUT_DIR / file_id
    output_dir.mkdir(parents=True, exist_ok=True)

    job_store[job_id] = {
        "status": "processing",
        "total": len(clips),
        "completed": 0,
        "current": 0,
        "results": [],
        "file_id": file_id,
    }

    def run_generation():
        python_exe = sys.executable
        worker_script = str(BASE_DIR / "generate_worker.py")
        for idx, clip in enumerate(clips):
            job_store[job_id]["current"] = idx
            output_file = output_dir / f"short_{idx+1:02d}.mp4"
            edited_subs = [
                {"start_seconds": s["start"], "end_seconds": s["end"], "text": s["text"]}
                for s in clip.get("subtitles", [])
            ]
            worker_args = json.dumps({
                "video_path": meta["video_path"],
                "srt_path": meta.get("subtitle_path", ""),
                "start_seconds": clip["start_seconds"],
                "end_seconds": clip["end_seconds"],
                "output_path": str(output_file),
                "title": clip.get("title", ""),
                "subtitle": clip.get("subtitle_text", ""),
                "logo_path": meta.get("logo_path", ""),
                "remove_silence": body.get("remove_silence", False),
                "subs": edited_subs,
                "template": body.get("template", "minimal"),
                "custom_font": meta.get("custom_font_path", ""),
                "title_color": body.get("title_color", ""),
                "caption_color": body.get("caption_color", ""),
            }, ensure_ascii=False)
            try:
                proc_result = subprocess.run(
                    [python_exe, worker_script, worker_args],
                    capture_output=True, text=True, timeout=600, cwd=str(BASE_DIR),
                )
                if proc_result.returncode == 0:
                    out = json.loads(proc_result.stdout.strip().split('\n')[-1])
                    if out.get("ok"):
                        job_store[job_id]["results"].append({"type": "done", "index": idx, "filename": output_file.name})
                    else:
                        job_store[job_id]["results"].append({"type": "error", "index": idx, "message": out.get("error", "")[:200]})
                else:
                    job_store[job_id]["results"].append({"type": "error", "index": idx, "message": (proc_result.stderr or "")[-200:]})
            except Exception as e:
                job_store[job_id]["results"].append({"type": "error", "index": idx, "message": str(e)[:200]})
            job_store[job_id]["completed"] = idx + 1

        job_store[job_id]["status"] = "complete"

    threading.Thread(target=run_generation, daemon=True).start()
    return {"job_id": job_id, "status": "processing", "total": len(clips)}


@app.get("/jobs/{job_id}")
async def get_job_status(job_id: str):
    """비동기 생성 작업 상태 조회"""
    if job_id not in job_store:
        raise HTTPException(404, "작업을 찾을 수 없습니다")
    job = job_store[job_id]
    return {
        "status": job["status"],
        "total": job["total"],
        "completed": job["completed"],
        "current": job["current"],
        "results": job["results"],
        "file_id": job["file_id"],
    }


@app.post("/api/calculate-points")
async def calculate_points(request: Request):
    """영상 길이에 따른 포인트 계산

    비용 구조:
    - AI 분석 (OpenRouter Claude Sonnet): 10P (1회, 분석 시)
    - 영상 생성 (서버 CPU/메모리): 영상 길이 비례
      - ~15초: 5P
      - ~30초: 10P
      - ~60초: 20P
      - 60초+: 30P
    - 음성인식 (Whisper 로컬): 무료
    """
    body = await request.json()
    clips = body.get("clips", [])
    include_analysis = body.get("include_analysis", False)

    total = 10 if include_analysis else 0  # AI 분석 비용
    breakdown = []
    for i, clip in enumerate(clips):
        dur = clip.get("end_seconds", 0) - clip.get("start_seconds", 0)
        if dur <= 15:
            cost = 5
        elif dur <= 30:
            cost = 10
        elif dur <= 60:
            cost = 20
        else:
            cost = 30
        total += cost
        breakdown.append({"index": i, "duration": round(dur), "cost": cost, "label": f"Short {i+1} ({round(dur)}초)"})

    return {
        "analysis_cost": 10 if include_analysis else 0,
        "generation_cost": sum(b["cost"] for b in breakdown),
        "total_cost": total,
        "breakdown": breakdown,
    }


@app.get("/api/subtitles/{file_id}/{clip_index}")
async def download_subtitles(file_id: str, clip_index: int, format: str = "srt"):
    """클립의 자막을 SRT 또는 TXT로 다운로드"""
    if file_id not in file_store:
        raise HTTPException(404, "파일을 찾을 수 없습니다")

    meta = file_store[file_id]
    subs = meta.get("subs_parsed") or []
    segments = meta.get("segments") or []

    if clip_index >= len(segments):
        raise HTTPException(404, "클립을 찾을 수 없습니다")

    seg = segments[clip_index]
    clip_subs = [
        s for s in subs
        if s["start_seconds"] >= seg["start_seconds"] - 0.5 and s["end_seconds"] <= seg["end_seconds"] + 0.5
    ]

    if format == "txt":
        content = "\n".join(s["text"] for s in clip_subs)
        filename = f"short_{clip_index+1}_subtitles.txt"
        media_type = "text/plain"
    else:
        lines = []
        for i, s in enumerate(clip_subs, 1):
            st = _fmt_srt(s["start_seconds"])
            et = _fmt_srt(s["end_seconds"])
            lines.append(f"{i}\n{st} --> {et}\n{s['text']}\n")
        content = "\n".join(lines)
        filename = f"short_{clip_index+1}_subtitles.srt"
        media_type = "application/x-subrip"

    from starlette.responses import Response
    return Response(
        content=content.encode("utf-8"),
        media_type=media_type,
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


def _fmt_srt(sec: float) -> str:
    h = int(sec // 3600)
    m = int((sec % 3600) // 60)
    s = int(sec % 60)
    ms = int((sec % 1) * 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


@app.get("/outputs/{file_id}/{filename}")
async def download_output(file_id: str, filename: str):
    file_path = OUTPUT_DIR / file_id / filename
    if not file_path.exists():
        raise HTTPException(404, "파일을 찾을 수 없습니다")
    return FileResponse(file_path, filename=filename, media_type="video/mp4")
