import os
import subprocess
from pathlib import Path

import httpx

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
OPENROUTER_KEY = os.getenv("OPENROUTER_API_KEY", "")


def transcribe_video(video_path: str, output_dir: str, max_chars: int = 0) -> str:
    """영상에서 음성 인식 → SRT 자막 생성 (Groq Whisper API → 로컬 폴백)"""
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    srt_path = str(output_dir / "subtitle.srt")

    # 1) 영상에서 오디오 추출 (ffmpeg)
    audio_path = str(output_dir / "audio.mp3")
    audio_ok = False
    try:
        result = subprocess.run([
            "ffmpeg", "-i", video_path, "-vn", "-acodec", "libmp3lame",
            "-ab", "64k", "-ar", "16000", "-ac", "1", "-y", audio_path
        ], capture_output=True, timeout=120)
        audio_ok = result.returncode == 0 and os.path.exists(audio_path) and os.path.getsize(audio_path) > 1000
        if not audio_ok:
            print(f"FFmpeg failed: returncode={result.returncode}, stderr={result.stderr.decode()[:200]}")
    except Exception as e:
        print(f"FFmpeg audio extraction failed: {e}")

    if not audio_ok:
        audio_path = video_path  # 원본 파일 사용

    # 2) Groq Whisper API (무료, 빠름)
    if GROQ_API_KEY:
        audio_size = os.path.getsize(audio_path) if os.path.exists(audio_path) else 0
        print(f"[transcribe] audio_path={audio_path}, size={audio_size}, audio_ok={audio_ok}")
        try:
            result = _transcribe_groq(audio_path)
            if result:
                _write_srt(srt_path, result, max_chars)
                return srt_path
            print("[transcribe] Groq returned None")
        except Exception as e:
            import traceback
            print(f"Groq transcription failed: {e}\n{traceback.format_exc()}")
        # Groq 실패 시 원본 영상으로 재시도
        if audio_path != video_path:
            try:
                print(f"[transcribe] Retrying Groq with original video: {video_path}")
                result = _transcribe_groq(video_path)
                if result:
                    _write_srt(srt_path, result, max_chars)
                    return srt_path
            except Exception as e:
                print(f"Groq retry failed: {e}")

    # 3) 로컬 faster-whisper 폴백 — Render 메모리 제한으로 비활성화
    # faster-whisper 모델 로딩이 512MB+ 메모리를 사용하여 서버 크래시 유발
    # try:
    #     result = _transcribe_local(video_path, max_chars)
    #     if result:
    #         _write_srt_entries(srt_path, result)
    #         return srt_path
    # except Exception as e:
    #     print(f"Local whisper failed: {e}")

    raise RuntimeError("음성 인식에 실패했습니다. 자막(SRT) 파일을 직접 업로드해주세요.")


def _transcribe_groq(audio_path: str) -> dict | None:
    """Groq Whisper API로 음성 인식 (25MB 초과 시 분할)"""
    file_size = os.path.getsize(audio_path)

    if file_size > 25 * 1024 * 1024:
        print(f"Audio file too large ({file_size} bytes), splitting...")
        return _transcribe_groq_chunked(audio_path)

    with open(audio_path, "rb") as f:
        resp = httpx.post(
            "https://api.groq.com/openai/v1/audio/transcriptions",
            headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
            files={"file": (os.path.basename(audio_path), f, "audio/mpeg")},
            data={
                "model": "whisper-large-v3",
                "response_format": "verbose_json",
                "timestamp_granularities[]": "word",
                "language": "ko",
            },
            timeout=180,
        )

    if resp.status_code != 200:
        print(f"Groq API error {resp.status_code}: {resp.text[:200]}")
        return None

    return resp.json()


def _transcribe_groq_chunked(audio_path: str) -> dict | None:
    """긴 오디오를 3분 단위로 분할해서 Groq API 호출"""
    parent = Path(audio_path).parent
    chunk_dir = parent / "chunks"
    chunk_dir.mkdir(exist_ok=True)

    # ffmpeg로 3분(180초) 단위 분할
    try:
        subprocess.run([
            "ffmpeg", "-i", audio_path, "-f", "segment",
            "-segment_time", "180", "-acodec", "libmp3lame",
            "-ab", "64k", "-ar", "16000", "-ac", "1", "-y",
            str(chunk_dir / "chunk_%03d.mp3")
        ], capture_output=True, timeout=120)
    except Exception as e:
        print(f"Audio split failed: {e}")
        return None

    # 각 청크를 Groq으로 전사
    all_segments = []
    chunk_files = sorted(chunk_dir.glob("chunk_*.mp3"))
    if not chunk_files:
        return None

    time_offset = 0.0
    for chunk_file in chunk_files:
        try:
            with open(chunk_file, "rb") as f:
                resp = httpx.post(
                    "https://api.groq.com/openai/v1/audio/transcriptions",
                    headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
                    files={"file": (chunk_file.name, f, "audio/mpeg")},
                    data={
                        "model": "whisper-large-v3",
                        "response_format": "verbose_json",
                        "timestamp_granularities[]": "segment",
                    },
                    timeout=180,
                )
            if resp.status_code == 200:
                data = resp.json()
                for seg in data.get("segments", []):
                    seg["start"] = seg.get("start", 0) + time_offset
                    seg["end"] = seg.get("end", 0) + time_offset
                    all_segments.append(seg)
                # 다음 청크 오프셋 = 이 청크의 마지막 세그먼트 끝 또는 180초
                if data.get("segments"):
                    time_offset += max(s.get("end", 0) for s in data["segments"])
                else:
                    time_offset += 180
            else:
                print(f"Groq chunk error {resp.status_code}: {resp.text[:100]}")
                time_offset += 180
        except Exception as e:
            print(f"Groq chunk failed: {e}")
            time_offset += 180

    if not all_segments:
        return None

    return {"segments": all_segments}


def _write_srt(srt_path: str, data: dict, max_chars: int = 0):
    """Groq API 응답을 SRT 파일로 변환 (word 타임스탬프 활용)"""
    # word 단위 타임스탬프가 있으면 더 정확한 자막 생성
    words = data.get("words", [])
    segments = data.get("segments", [])
    entries = []

    if words and len(words) > 0:
        # word 단위로 자막 생성 (더 정확한 타이밍)
        target_chars = max_chars if max_chars > 0 else 15
        chunk = ""
        chunk_start = None
        chunk_end = 0
        for w in words:
            word_text = w.get("word", "").strip()
            if not word_text:
                continue
            w_start = w.get("start", 0)
            w_end = w.get("end", 0)
            if chunk_start is None:
                chunk_start = w_start
            test = (chunk + " " + word_text).strip() if chunk else word_text
            if len(test) > target_chars and chunk:
                entries.append((chunk_start, chunk_end, chunk.strip()))
                chunk = word_text
                chunk_start = w_start
            else:
                chunk = test
            chunk_end = w_end
        if chunk and chunk_start is not None:
            entries.append((chunk_start, chunk_end, chunk.strip()))
    elif segments:
        # segment 단위 폴백
        for seg in segments:
            text = seg.get("text", "").strip()
            if not text:
                continue
            start = seg.get("start", 0)
            end = seg.get("end", 0)
            if max_chars > 0 and len(text) > max_chars:
                words_list = text.split()
                chunk = ""
                chunk_start = start
                duration = (end - start) / max(len(words_list), 1)
                for j, wd in enumerate(words_list):
                    test = (chunk + " " + wd).strip() if chunk else wd
                    if len(test) > max_chars and chunk:
                        chunk_end = start + duration * j
                        entries.append((chunk_start, chunk_end, chunk))
                        chunk = wd
                        chunk_start = chunk_end
                    else:
                        chunk = test
                if chunk:
                    entries.append((chunk_start, end, chunk))
            else:
                entries.append((start, end, text))

    with open(srt_path, "w", encoding="utf-8") as f:
        for i, (s, e, t) in enumerate(entries, 1):
            f.write(f"{i}\n{_format_time(s)} --> {_format_time(e)}\n{t}\n\n")


def _transcribe_local(video_path: str, max_chars: int = 0) -> list:
    """로컬 faster-whisper 폴백"""
    from faster_whisper import WhisperModel
    model = WhisperModel("tiny", device="cpu", compute_type="int8")
    segments, info = model.transcribe(
        video_path, language=None, vad_filter=True,
        vad_parameters=dict(min_silence_duration_ms=300),
        word_timestamps=True,
    )
    entries = []
    for seg in segments:
        text = seg.text.strip()
        if not text:
            continue
        entries.append((seg.start, seg.end, text))
    return entries


def _write_srt_entries(srt_path: str, entries: list):
    with open(srt_path, "w", encoding="utf-8") as f:
        for i, (s, e, t) in enumerate(entries, 1):
            f.write(f"{i}\n{_format_time(s)} --> {_format_time(e)}\n{t}\n\n")


def _format_time(seconds: float) -> str:
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    ms = int((seconds % 1) * 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"
