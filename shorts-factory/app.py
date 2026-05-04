import sys
import os
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
    allow_origins=["*"],
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

# YouTube 쿠키 파일 (환경변수 YOUTUBE_COOKIES에서 로드)
COOKIES_FILE = BASE_DIR / "youtube_cookies.txt"
_yt_cookies_env = os.environ.get("YOUTUBE_COOKIES", "")
if _yt_cookies_env:
    COOKIES_FILE.write_text(_yt_cookies_env)
    logger.info(f"YouTube cookies loaded ({len(_yt_cookies_env)} bytes)")
else:
    logger.warning("No YOUTUBE_COOKIES env — YouTube may block downloads")


def _is_good_ending(text: str) -> bool:
    """문장이 완전하게 끝나는지 체크"""
    t = text.strip().rstrip(".!?~…")
    if not t:
        return False
    GOOD = (
        # ~요 계열
        "요", "세요", "까요", "네요", "거든요", "잖아요", "는데요", "했어요", "해요",
        "돼요", "볼게요", "될까요", "줄게요", "할게요", "드릴게요", "같아요", "싶어요",
        "봤어요", "났어요", "왔어요", "갔어요", "겠어요", "있어요", "없어요", "맞아요",
        # ~다 계열
        "다", "니다", "습니다", "합니다", "입니다", "됩니다", "있다", "없다", "같다",
        "했다", "된다", "한다", "간다", "온다", "본다",
        # ~죠 계열
        "죠", "거죠", "잖죠", "겠죠", "이죠",
        # 기타 확실한 종결
        "음", "듯", "거야", "이야", "잖아", "지요", "래요", "던데요",
    )
    return any(t.endswith(g) for g in GOOD)


def _is_connector_ending(text: str) -> bool:
    """접속사/연결어로 끝나는지 체크 (이런 걸로 끝나면 말이 끊긴 느낌)"""
    t = text.strip().rstrip(".!?")
    CONN = (
        # 접속사
        "그리고", "그래서", "근데", "하지만", "또", "그런데", "그러면",
        "그러니까", "왜냐하면", "그러므로", "그렇지만", "아니면", "그럼",
        # 연결 어미 (말이 이어지는 느낌)
        "해서", "하고", "인데", "지만", "니까", "더니", "면서", "려고",
        "때문에", "통해서", "라서", "해가지고", "가지고",
    )
    return any(t.endswith(c) for c in CONN)


def snap_to_subtitle_boundaries(start: float, end: float, subs: list[dict]) -> tuple[float, float]:
    """시작/끝 시간을 자막 문장 경계에 맞춰 조정 (말 끊김 방지)

    원칙:
    - 시작점: 자막 문장이 시작되는 정확한 포인트 (말 중간 시작 절대 금지)
    - 끝점: 완전한 문장이 끝나는 자막의 끝 (억지 연장 없이)
    """
    if not subs:
        return start, end

    # ── 시작점: 완전한 문장이 시작되는 자막의 시작점으로 스냅 ──
    best_start = start
    start_idx = 0
    for i, s in enumerate(subs):
        if s["start_seconds"] < start < s["end_seconds"]:
            if start - s["start_seconds"] < 0.5:
                best_start = s["start_seconds"]
                start_idx = i
            elif i + 1 < len(subs):
                best_start = subs[i + 1]["start_seconds"]
                start_idx = i + 1
            break
        if s["start_seconds"] >= start:
            best_start = s["start_seconds"]
            start_idx = i
            break

    # 시작 자막이 이전 문장의 이어짐인지 체크
    # 이전 자막이 접속사/연결어로 끝나면 → 현재 자막은 이전 문장의 연속 → 다음 좋은 시작점으로
    if start_idx > 0:
        prev_text = subs[start_idx - 1]["text"].strip()
        if _is_connector_ending(prev_text) and not _is_good_ending(prev_text):
            # 이전 문장이 이어지는 중 → 현재 자막 포함하고, 좋은 끝 이후의 다음 자막을 찾음
            for j in range(start_idx, min(start_idx + 3, len(subs))):
                if _is_good_ending(subs[j]["text"]) and j + 1 < len(subs):
                    best_start = subs[j + 1]["start_seconds"]
                    break

    # ── 끝점: 완전한 문장으로 끝나는 자막 찾기 ──
    # end 근처에서 가장 가까운 "좋은 끝"을 가진 자막을 찾음
    best_end = end
    # end 시점 직전/직후의 자막들을 후보로
    candidates = []
    for s in subs:
        if s["end_seconds"] < best_start + 3:
            continue  # 너무 짧은 건 제외
        if abs(s["end_seconds"] - end) < 5.0:  # end 기준 ±5초 범위
            candidates.append(s)

    if candidates:
        # 1순위: 완전한 문장 끝 + end에 가까운 것
        good_candidates = [s for s in candidates if _is_good_ending(s["text"]) and not _is_connector_ending(s["text"])]
        if good_candidates:
            # end보다 뒤에 있지만 가장 가까운 것 우선, 없으면 앞쪽
            after = [s for s in good_candidates if s["end_seconds"] >= end - 0.5]
            before = [s for s in good_candidates if s["end_seconds"] < end - 0.5]
            chosen = min(after, key=lambda s: s["end_seconds"] - end) if after else max(before, key=lambda s: s["end_seconds"])
            best_end = chosen["end_seconds"] + 0.3
        else:
            # 좋은 끝이 없으면 end 직전의 마지막 자막 끝으로
            before_end = [s for s in candidates if s["end_seconds"] <= end + 1.0]
            if before_end:
                best_end = max(s["end_seconds"] for s in before_end) + 0.3
    else:
        # 후보가 없으면 기존 방식: end 직전 자막 끝
        for s in reversed(subs):
            if s["end_seconds"] <= end + 1.0:
                best_end = s["end_seconds"] + 0.3
                break

    return best_start, best_end


@app.get("/", response_class=HTMLResponse)
async def index():
    html_path = BASE_DIR / "templates" / "index.html"
    return HTMLResponse(html_path.read_text(encoding="utf-8"))


# ═══ 네이버 블로그 자동 발행 ═══════════════════════════════════
@app.post("/naver-publish")
async def naver_publish(request: Request):
    """네이버 블로그에 글 자동 발행"""
    try:
        data = await request.json()
        naver_id = data.get("naverId", "")
        naver_pw = data.get("naverPw", "")
        post = data.get("post", {})

        if not naver_id or not naver_pw:
            return {"success": False, "error": "네이버 ID/PW가 필요합니다"}
        if not post.get("title"):
            return {"success": False, "error": "글 제목이 필요합니다"}

        from naver_publisher import publish_to_naver_blog, format_blog_html

        html_content = format_blog_html(post)
        tags = post.get("tags", [])

        result = await publish_to_naver_blog(
            naver_id=naver_id,
            naver_pw=naver_pw,
            title=post["title"],
            html_content=html_content,
            tags=tags,
        )
        return result

    except Exception as e:
        logger.error(f"[naver-publish] {e}")
        return {"success": False, "error": str(e)[:200]}


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "shorts-factory"}


@app.get("/download/makeit-setup.exe")
async def download_setup_exe():
    """Supabase에 분할 저장된 exe를 합쳐서 단일 파일로 스트리밍"""
    import httpx

    SB_BASE = "https://ckzjnpzadeovrasucjmu.supabase.co/storage/v1/object/public/downloads"
    PARTS = ["makeit-exe-part-aa", "makeit-exe-part-ab", "makeit-exe-part-ac",
             "makeit-exe-part-ad", "makeit-exe-part-ae", "makeit-exe-part-af", "makeit-exe-part-ag"]

    async def stream_parts():
        async with httpx.AsyncClient(timeout=120) as client:
            for part in PARTS:
                r = await client.get(f"{SB_BASE}/{part}")
                if r.status_code == 200:
                    yield r.content

    return StreamingResponse(
        stream_parts(),
        media_type="application/octet-stream",
        headers={
            "Content-Disposition": 'attachment; filename="makeit-sns-automation-setup-0.1.2.exe"',
            "Content-Length": str(328879612),
        },
    )


@app.get("/download/makeit-setup.zip")
async def download_setup_zip():
    """Supabase에 분할 저장된 zip을 합쳐서 단일 파일로 스트리밍"""
    import httpx

    SB_BASE = "https://ckzjnpzadeovrasucjmu.supabase.co/storage/v1/object/public/downloads"
    PARTS = ["makeit-zip-part-aa", "makeit-zip-part-ab", "makeit-zip-part-ac",
             "makeit-zip-part-ad", "makeit-zip-part-ae", "makeit-zip-part-af", "makeit-zip-part-ag"]

    async def stream_parts():
        async with httpx.AsyncClient(timeout=120) as client:
            for part in PARTS:
                r = await client.get(f"{SB_BASE}/{part}")
                if r.status_code == 200:
                    yield r.content

    return StreamingResponse(
        stream_parts(),
        media_type="application/zip",
        headers={
            "Content-Disposition": 'attachment; filename="makeit-sns-automation-setup-0.1.2.zip"',
            "Content-Length": str(328990579),
        },
    )


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
                if r.status_code == 200 and len(r.content) > 10000:
                    video_path.write_bytes(r.content)
                    logger.info("Downloaded from stream_url successfully")
        except Exception as e:
            errors.append(f"stream_url: {str(e)[:80]}")

    # Webshare Rotating Residential 프록시
    import os
    proxy_urls = []
    webshare_token = os.environ.get("WEBSHARE_API_KEY", "")
    if webshare_token:
        try:
            import httpx
            async with httpx.AsyncClient(timeout=10) as pc:
                pr = await pc.get("https://proxy.webshare.io/api/v2/proxy/list/?mode=backbone&page=1&page_size=3",
                    headers={"Authorization": f"Token {webshare_token}"})
                if pr.status_code == 200:
                    proxies = pr.json().get("results", [])
                    for p in proxies:
                        user = p.get("username", "")
                        pw = p.get("password", "")
                        if user and pw:
                            proxy_urls.append(f"http://{user}:{pw}@p.webshare.io:80")
                    logger.info(f"Got {len(proxy_urls)} Webshare proxies")
        except Exception as e:
            logger.warning(f"Webshare proxy fetch failed: {e}")
    proxy_urls.append(None)  # 마지막에 직접 연결 시도

    # 1) yt-dlp (여러 player_client + 프록시 시도)
    for proxy in proxy_urls:
      if video_path.exists():
        break
      for client in [["web_creator"], ["mweb"], ["default"], ["ios"], ["tv_embedded"]]:
        if video_path.exists():
            break
        try:
            import yt_dlp
            ydl_opts = {
                "format": "best[ext=mp4][height<=720]/bestvideo[ext=mp4][height<=720]+bestaudio[ext=m4a]/best[ext=mp4]/best",
                "outtmpl": str(video_path),
                "quiet": True,
                "no_warnings": True,
                "extractor_args": {"youtube": {"player_client": client}},
                "cookiefile": str(COOKIES_FILE) if COOKIES_FILE.exists() else None,
                "socket_timeout": 15,
                "retries": 1,
                "fragment_retries": 2,
                "http_headers": {
                    "User-Agent": "Mozilla/5.0 (Linux; Android 14; SM-S926B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
                    "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
                },
                "merge_output_format": "mp4",
                "live_from_start": False,
                "concurrent_fragment_downloads": 4,
            }
            if proxy:
                ydl_opts["proxy"] = proxy
                logger.info(f"Trying proxy: {proxy[:30]}...")
            loop = asyncio.get_event_loop()
            def do_download(opts=ydl_opts):
                with yt_dlp.YoutubeDL(opts) as ydl:
                    ydl.download([url])
            await loop.run_in_executor(None, do_download)
            if video_path.exists():
                logger.info(f"yt-dlp succeeded with client={client}, proxy={proxy}")
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
            "cookiefile": str(COOKIES_FILE) if COOKIES_FILE.exists() else None,
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


@app.post("/whisper")
async def whisper_stt(request: Request):
    """오디오 → Groq Whisper STT (word-level timestamps)"""
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(400, "JSON body 필요 (audio_base64, file_name)")

    audio_b64 = body.get("audio_base64", "")
    file_name = body.get("file_name", "audio.mp3")
    lang = body.get("lang", "ko")

    if not audio_b64:
        raise HTTPException(400, "audio_base64 필드가 없습니다")

    import base64
    audio_data = base64.b64decode(audio_b64)
    if len(audio_data) > 25 * 1024 * 1024:
        raise HTTPException(413, "파일 크기는 25MB 이하여야 합니다")

    GROQ_KEY = os.getenv("GROQ_API_KEY", "")
    if not GROQ_KEY:
        raise HTTPException(500, "GROQ_API_KEY 환경변수 필요")

    import httpx
    files = {"file": (file_name, audio_data, "audio/mpeg")}
    data = {
        "model": "whisper-large-v3",
        "response_format": "verbose_json",
        "timestamp_granularities[]": "word",
        "language": lang,
    }
    resp = httpx.post(
        "https://api.groq.com/openai/v1/audio/transcriptions",
        headers={"Authorization": f"Bearer {GROQ_KEY}"},
        files=files,
        data=data,
        timeout=180,
    )
    if resp.status_code != 200:
        raise HTTPException(resp.status_code, f"Groq Whisper 실패: {resp.text[:200]}")

    return resp.json()


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
        # 파일 스토어에 없으면 디스크에서 복구 시도
        file_dir = UPLOAD_DIR / file_id
        video_path = file_dir / "video.mp4"
        if video_path.exists():
            file_store[file_id] = {
                "video_path": str(video_path), "subtitle_path": None,
                "subtitle_ext": ".srt", "logo_path": "", "custom_font_path": "",
                "needs_transcription": True, "subs_parsed": None,
            }
            logger.info(f"[analyze] Recovered file_store from disk: {file_id}")
        else:
            raise HTTPException(404, f"파일을 찾을 수 없습니다 (id={file_id})")

    try:
        body = await request.json()
    except Exception:
        body = {}
    max_chars = body.get("max_chars", 0)
    max_segments = body.get("max_segments", 5)

    meta = file_store[file_id]
    logger.info(f"[analyze] file_id={file_id}, needs_transcription={meta.get('needs_transcription')}, video_path={meta.get('video_path')}, max_segments={max_segments}")

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
            tb = traceback.format_exc()
            logger.error(f"[analyze] Transcription failed: {e}\n{tb}")
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
    segments = analyze_subtitles(text, max_segments=max_segments)

    # 자막 경계에 맞춰 시작/끝 시간 조정 + 유효성 검증
    last_sub_end = subs[-1]["end_seconds"] if subs else 300
    valid_segments = []
    for seg in segments:
        s = float(seg.get("start_seconds", 0))
        e = float(seg.get("end_seconds", 0))
        # 음수 보정
        s = max(0, s)
        e = max(0, e)
        # end가 start보다 앞이면 swap
        if e <= s:
            s, e = min(s, e), max(s, e)
        # 여전히 같으면 최소 15초 보장
        if e <= s:
            e = s + 15
        # 영상 범위 초과 방지
        if s >= last_sub_end:
            s = max(0, last_sub_end - 30)
        if e > last_sub_end + 1:
            e = last_sub_end + 0.5
        # 최소 5초 보장
        if e - s < 5:
            e = min(s + 15, last_sub_end + 0.5)
        seg["start_seconds"] = s
        seg["end_seconds"] = e
        seg["start_seconds"], seg["end_seconds"] = snap_to_subtitle_boundaries(
            seg["start_seconds"], seg["end_seconds"], subs
        )
        # 스냅 후에도 end > start 재확인
        if seg["end_seconds"] <= seg["start_seconds"]:
            seg["end_seconds"] = seg["start_seconds"] + 15
        valid_segments.append(seg)

    segments = valid_segments
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
    subtitles_enabled = body.get("subtitles_enabled", True)

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
            ] if subtitles_enabled else []
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
                "subtitles_enabled": subtitles_enabled,
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

    is_longform = body.get("longform", False)

    def run_generation():
        python_exe = sys.executable
        worker_script = str(BASE_DIR / "generate_worker.py")
        for idx, clip in enumerate(clips):
            job_store[job_id]["current"] = idx
            output_file = output_dir / (f"longform_{idx+1:02d}.mp4" if is_longform else f"short_{idx+1:02d}.mp4")
            subtitles_on = body.get("subtitles_enabled", True)
            edited_subs = [
                {"start_seconds": s["start"], "end_seconds": s["end"], "text": s["text"]}
                for s in clip.get("subtitles", [])
            ] if subtitles_on else []

            if is_longform:
                worker_args = json.dumps({
                    "longform": True,
                    "video_path": meta["video_path"],
                    "output_path": str(output_file),
                    "video_segments": body.get("video_segments", []),
                    "subs": edited_subs,
                    "subtitles_enabled": subtitles_on,
                    "caption_style": body.get("caption_style", {}),
                    "remove_silence": body.get("remove_silence", False),
                    "silence_regions": body.get("silence_regions", []),
                    "silence_gap": body.get("silence_gap", 0.25),
                }, ensure_ascii=False)
            else:
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
                    "subtitles_enabled": subtitles_on,
                }, ensure_ascii=False)

            try:
                # 롱폼은 타임아웃 20분, 숏폼은 10분
                timeout = 1200 if is_longform else 600
                proc_result = subprocess.run(
                    [python_exe, worker_script, worker_args],
                    capture_output=True, text=True, timeout=timeout, cwd=str(BASE_DIR),
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


@app.post("/detect-silence/{file_id}")
async def detect_silence(file_id: str, request: Request):
    """무음 구간 감지 (ffmpeg silencedetect) — 편집기에서 자동 삭제용"""
    if file_id not in file_store:
        raise HTTPException(404, "파일을 찾을 수 없습니다")

    try:
        body = await request.json()
    except Exception:
        body = {}

    threshold = body.get("threshold", -30)  # dB
    min_duration = body.get("min_duration", 0.5)  # 초

    meta = file_store[file_id]
    video_path = meta["video_path"]

    try:
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(None, lambda: subprocess.run(
            ["ffmpeg", "-i", video_path, "-af",
             f"silencedetect=noise={threshold}dB:d={min_duration}",
             "-f", "null", "-"],
            capture_output=True, text=True, timeout=120
        ))

        import re
        silences = []
        starts = re.findall(r"silence_start: ([\d.]+)", result.stderr)
        ends = re.findall(r"silence_end: ([\d.]+)", result.stderr)

        for i in range(min(len(starts), len(ends))):
            s, e = float(starts[i]), float(ends[i])
            if e - s >= min_duration:
                silences.append({"start": round(s, 2), "end": round(e, 2), "duration": round(e - s, 2)})

        return {"file_id": file_id, "silences": silences, "count": len(silences)}
    except Exception as e:
        raise HTTPException(500, f"무음 감지 실패: {str(e)[:200]}")


@app.post("/prompt-edit/{file_id}")
async def prompt_edit(file_id: str, request: Request):
    """프롬프트 기반 편집 — 사용자 요청에 맞는 구간 AI 추출"""
    if file_id not in file_store:
        raise HTTPException(404, "파일을 찾을 수 없습니다")

    body = await request.json()
    user_prompt = body.get("prompt", "").strip()
    if not user_prompt:
        raise HTTPException(400, "프롬프트가 필요합니다")

    meta = file_store[file_id]
    subs = meta.get("subs_parsed")
    if not subs:
        raise HTTPException(400, "먼저 영상을 분석해주세요 (자막 데이터 필요)")

    full_text = "\n".join(
        f"[{s['start_seconds']:.1f}~{s['end_seconds']:.1f}] {s['text']}" for s in subs
    )

    prompt = f"""아래는 영상의 전체 자막 (타임스탬프 포함)이야:

{full_text}

사용자 요청: "{user_prompt}"

사용자의 요청에 해당하는 구간을 찾아서 JSON으로 반환해.
- 요청에 맞는 내용이 포함된 시간대를 정확히 찾아야 함
- 각 구간은 자막 경계에 맞춰야 함 (말 중간 절단 금지)
- 가능하면 앞뒤 0.5초 여유를 줘

반드시 아래 JSON 형식으로만 응답:
[
  {{
    "start_seconds": 0.0,
    "end_seconds": 30.0,
    "title": "구간 제목",
    "reason": "이 구간을 선정한 이유",
    "hook_text": "짧은 훅 문장"
  }}
]"""

    import httpx as hx
    OR_KEY = os.getenv("OPENROUTER_API_KEY", "")
    resp = hx.post(
        "https://openrouter.ai/api/v1/chat/completions",
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {OR_KEY}",
        },
        json={
            "model": "anthropic/claude-sonnet-4-5",
            "max_tokens": 4096,
            "messages": [
                {"role": "system", "content": "너는 영상 편집 전문가야. 사용자의 요청에 맞는 영상 구간을 정확히 찾아주는 게 임무야."},
                {"role": "user", "content": prompt},
            ],
        },
        timeout=120,
    )

    if resp.status_code != 200:
        raise HTTPException(500, f"AI API 오류: {resp.status_code}")

    text = resp.json()["choices"][0]["message"]["content"].strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1].rsplit("```", 1)[0]

    segments = json.loads(text)

    # 자막 경계에 맞춤 + 자막 데이터 추가
    for seg in segments:
        seg["start_seconds"], seg["end_seconds"] = snap_to_subtitle_boundaries(
            seg["start_seconds"], seg["end_seconds"], subs
        )
        seg["subtitles"] = [
            {"start": s["start_seconds"], "end": s["end_seconds"], "text": s["text"]}
            for s in subs
            if s["start_seconds"] >= seg["start_seconds"] - 0.5 and s["end_seconds"] <= seg["end_seconds"] + 0.5
        ]

    return {"file_id": file_id, "segments": segments}


@app.get("/source/{file_id}")
async def get_source_video(file_id: str):
    """원본 업로드 영상 제공 (편집기 미리보기용)"""
    file_dir = UPLOAD_DIR / file_id
    if not file_dir.exists():
        raise HTTPException(404, "파일을 찾을 수 없습니다")
    for ext in [".mp4", ".mov", ".avi", ".mkv", ".webm"]:
        video_path = file_dir / f"video{ext}"
        if video_path.exists():
            return FileResponse(video_path, media_type="video/mp4")
    raise HTTPException(404, "원본 영상을 찾을 수 없습니다")


@app.get("/outputs/{file_id}/{filename}")
async def download_output(file_id: str, filename: str):
    file_path = OUTPUT_DIR / file_id / filename
    if not file_path.exists():
        raise HTTPException(404, "파일을 찾을 수 없습니다")
    return FileResponse(file_path, filename=filename, media_type="video/mp4")
