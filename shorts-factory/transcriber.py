from pathlib import Path
from faster_whisper import WhisperModel


_model: WhisperModel | None = None


def get_model() -> WhisperModel:
    """Whisper 모델 로드 (최초 1회, 이후 캐시)"""
    global _model
    if _model is None:
        _model = WhisperModel("base", device="cpu", compute_type="int8")
    return _model


def transcribe_video(video_path: str, output_dir: str, max_chars: int = 0) -> str:
    """영상에서 음성 인식 → SRT 자막 생성

    Args:
        max_chars: 자막 한 줄 최대 글자수 (0이면 제한 없음)
    """
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    srt_path = str(output_dir / "subtitle.srt")

    model = get_model()
    segments, info = model.transcribe(
        video_path,
        language="ko",
        vad_filter=True,
        vad_parameters=dict(min_silence_duration_ms=300),
        word_timestamps=True,
    )

    srt_entries = []
    for seg in segments:
        text = seg.text.strip()
        if not text:
            continue

        if max_chars > 0 and seg.words:
            # 글자수 제한: 단어 단위로 쪼개서 짧은 자막 생성
            chunks = _split_by_chars(seg.words, max_chars)
            for chunk_text, chunk_start, chunk_end in chunks:
                if chunk_text.strip():
                    srt_entries.append((chunk_start, chunk_end, chunk_text.strip()))
        else:
            srt_entries.append((seg.start, seg.end, text))

    with open(srt_path, "w", encoding="utf-8") as f:
        for i, (start, end, text) in enumerate(srt_entries, 1):
            f.write(f"{i}\n{_format_srt_time(start)} --> {_format_srt_time(end)}\n{text}\n\n")

    return srt_path


def _split_by_chars(words, max_chars: int) -> list[tuple[str, float, float]]:
    """단어 리스트를 max_chars 기준으로 분할"""
    chunks = []
    current_text = ""
    chunk_start = None
    chunk_end = None

    for w in words:
        word_text = w.word.strip()
        if not word_text:
            continue

        if chunk_start is None:
            chunk_start = w.start

        test = (current_text + " " + word_text).strip() if current_text else word_text

        if len(test) > max_chars and current_text:
            chunks.append((current_text, chunk_start, chunk_end))
            current_text = word_text
            chunk_start = w.start
            chunk_end = w.end
        else:
            current_text = test
            chunk_end = w.end

    if current_text and chunk_start is not None:
        chunks.append((current_text, chunk_start, chunk_end))

    return chunks


def _format_srt_time(seconds: float) -> str:
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    ms = int((seconds % 1) * 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"
