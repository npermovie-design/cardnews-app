import uuid
import json
import asyncio
from pathlib import Path

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, HTMLResponse
from starlette.responses import StreamingResponse

from srt_parser import parse_srt, parse_txt, subtitles_to_text
from analyzer import analyze_subtitles
from video_processor import generate_short, TEMPLATES
from transcriber import transcribe_video

from virality.routes import router as virality_router
from virality.db import init_db

app = FastAPI(title="Shorts Factory")
app.include_router(virality_router)

# Initialize virality database
init_db()

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

    # start: 가장 가까운 자막 시작점으로 (start 이전 자막의 시작점)
    best_start = start
    for s in subs:
        if s["start_seconds"] <= start <= s["end_seconds"]:
            best_start = s["start_seconds"]
            break
        if s["start_seconds"] > start:
            best_start = s["start_seconds"]
            break

    # end: 가장 가까운 자막 끝점으로 (end 시점에 걸친 자막의 끝점)
    best_end = end
    for s in reversed(subs):
        if s["start_seconds"] <= end <= s["end_seconds"]:
            best_end = s["end_seconds"]
            break
        if s["end_seconds"] <= end:
            best_end = s["end_seconds"]
            break

    return best_start, best_end


@app.get("/", response_class=HTMLResponse)
async def index():
    html_path = BASE_DIR / "templates" / "index.html"
    return HTMLResponse(html_path.read_text(encoding="utf-8"))


@app.get("/virality", response_class=HTMLResponse)
async def virality_page():
    html_path = BASE_DIR / "templates" / "virality.html"
    return HTMLResponse(html_path.read_text(encoding="utf-8"))


@app.get("/api/templates")
async def get_templates():
    """사용 가능한 템플릿 목록 반환"""
    return {"templates": list(TEMPLATES.keys())}


@app.post("/youtube-download")
async def youtube_download(request: Request):
    """YouTube URL에서 영상 다운로드"""
    body = await request.json()
    url = body.get("url", "").strip()
    if not url:
        raise HTTPException(400, "URL이 필요합니다")

    file_id = uuid.uuid4().hex[:12]
    file_dir = UPLOAD_DIR / file_id
    file_dir.mkdir(parents=True, exist_ok=True)
    video_path = file_dir / "video.mp4"

    try:
        import yt_dlp
        ydl_opts = {
            "format": "best[ext=mp4]/best",
            "outtmpl": str(video_path),
            "quiet": True,
            "no_warnings": True,
        }
        loop = asyncio.get_event_loop()
        def do_download():
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.download([url])
        await loop.run_in_executor(None, do_download)
    except Exception as e:
        raise HTTPException(500, f"다운로드 실패: {str(e)}")

    if not video_path.exists():
        raise HTTPException(500, "다운로드된 파일을 찾을 수 없습니다")

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

    if meta.get("needs_transcription") or not meta.get("subtitle_path"):
        try:
            loop = asyncio.get_event_loop()
            file_dir = Path(meta["video_path"]).parent
            srt_path = await loop.run_in_executor(
                None, transcribe_video, meta["video_path"], str(file_dir), max_chars,
            )
            meta["subtitle_path"] = srt_path
            meta["subtitle_ext"] = ".srt"
            meta["needs_transcription"] = False
        except Exception as e:
            raise HTTPException(500, f"음성 인식 실패: {str(e)}")

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
    python_exe = str(BASE_DIR / "venv" / "Scripts" / "python.exe")
    worker_script = str(BASE_DIR / "generate_worker.py")

    results = []
    for idx, clip in enumerate(clips):
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
                    results.append({"type": "done", "index": idx, "filename": output_file.name})
                else:
                    results.append({"type": "error", "index": idx, "message": out.get("error", "알 수 없는 오류")})
            else:
                results.append({"type": "error", "index": idx, "message": proc_result.stderr[-500:] if proc_result.stderr else "프로세스 실패"})
        except subprocess.TimeoutExpired:
            results.append({"type": "error", "index": idx, "message": "영상 생성 시간 초과 (10분)"})
        except Exception as e:
            results.append({"type": "error", "index": idx, "message": str(e)})

    async def event_stream():
        for r in results:
            yield f"data: {json.dumps(r)}\n\n"
        yield f"data: {json.dumps({'type': 'complete'})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


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
