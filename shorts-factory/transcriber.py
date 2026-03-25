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
    try:
        subprocess.run([
            "ffmpeg", "-i", video_path, "-vn", "-acodec", "libmp3lame",
            "-ab", "64k", "-ar", "16000", "-ac", "1", "-y", audio_path
        ], capture_output=True, timeout=120)
    except Exception as e:
        print(f"FFmpeg audio extraction failed: {e}")
        # 오디오 추출 실패 시 원본 파일 사용
        audio_path = video_path

    # 2) Groq Whisper API (무료, 빠름)
    if GROQ_API_KEY:
        try:
            result = _transcribe_groq(audio_path)
            if result:
                _write_srt(srt_path, result, max_chars)
                return srt_path
        except Exception as e:
            print(f"Groq transcription failed: {e}")

    # 3) 로컬 faster-whisper 폴백
    try:
        result = _transcribe_local(video_path, max_chars)
        if result:
            _write_srt_entries(srt_path, result)
            return srt_path
    except Exception as e:
        print(f"Local whisper failed: {e}")

    raise RuntimeError("음성 인식에 실패했습니다. 자막(SRT) 파일을 직접 업로드해주세요.")


def _transcribe_groq(audio_path: str) -> dict | None:
    """Groq Whisper API로 음성 인식"""
    file_size = os.path.getsize(audio_path)
    if file_size > 25 * 1024 * 1024:  # 25MB 제한
        print(f"Audio file too large for Groq: {file_size} bytes")
        return None

    with open(audio_path, "rb") as f:
        resp = httpx.post(
            "https://api.groq.com/openai/v1/audio/transcriptions",
            headers={"Authorization": f"Bearer {GROQ_API_KEY}"},
            files={"file": (os.path.basename(audio_path), f, "audio/mpeg")},
            data={
                "model": "whisper-large-v3",
                "response_format": "verbose_json",
                "timestamp_granularities[]": "segment",
            },
            timeout=180,
        )

    if resp.status_code != 200:
        print(f"Groq API error {resp.status_code}: {resp.text[:200]}")
        return None

    return resp.json()


def _write_srt(srt_path: str, data: dict, max_chars: int = 0):
    """Groq API 응답을 SRT 파일로 변환"""
    segments = data.get("segments", [])
    entries = []
    for seg in segments:
        text = seg.get("text", "").strip()
        if not text:
            continue
        start = seg.get("start", 0)
        end = seg.get("end", 0)

        if max_chars > 0 and len(text) > max_chars:
            # 긴 텍스트 분할
            words = text.split()
            chunk = ""
            chunk_start = start
            duration = (end - start) / max(len(words), 1)
            for j, w in enumerate(words):
                test = (chunk + " " + w).strip() if chunk else w
                if len(test) > max_chars and chunk:
                    chunk_end = start + duration * j
                    entries.append((chunk_start, chunk_end, chunk))
                    chunk = w
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
