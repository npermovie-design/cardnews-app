import pysrt
from pathlib import Path


def parse_srt(file_path: str) -> list[dict]:
    """SRT 파일을 파싱하여 구조화된 자막 리스트 반환"""
    subs = pysrt.open(file_path, encoding="utf-8")
    result = []
    for sub in subs:
        result.append({
            "index": sub.index,
            "start_seconds": _time_to_seconds(sub.start),
            "end_seconds": _time_to_seconds(sub.end),
            "text": sub.text.replace("\n", " "),
        })
    return result


def parse_txt(file_path: str) -> list[dict]:
    """타임스탬프가 포함된 TXT 파일 파싱 (HH:MM:SS 또는 MM:SS 형식)"""
    import re
    lines = Path(file_path).read_text(encoding="utf-8").splitlines()
    result = []
    timestamp_pattern = re.compile(
        r"(\d{1,2}:?\d{2}:\d{2}(?:[.,]\d+)?)\s*[-~>]+\s*(\d{1,2}:?\d{2}:\d{2}(?:[.,]\d+)?)"
    )
    idx = 0
    i = 0
    while i < len(lines):
        match = timestamp_pattern.search(lines[i])
        if match:
            start = _parse_flexible_time(match.group(1))
            end = _parse_flexible_time(match.group(2))
            text_lines = []
            i += 1
            while i < len(lines) and not timestamp_pattern.search(lines[i]) and lines[i].strip():
                text_lines.append(lines[i].strip())
                i += 1
            if text_lines:
                idx += 1
                result.append({
                    "index": idx,
                    "start_seconds": start,
                    "end_seconds": end,
                    "text": " ".join(text_lines),
                })
        else:
            i += 1
    return result


def subtitles_to_text(subs: list[dict]) -> str:
    """전체 자막을 타임스탬프 포함 텍스트로 변환 (Claude에 보낼 용도)"""
    lines = []
    for s in subs:
        start = _seconds_to_timestamp(s["start_seconds"])
        end = _seconds_to_timestamp(s["end_seconds"])
        lines.append(f"[{start} -> {end}] {s['text']}")
    return "\n".join(lines)


def _time_to_seconds(t) -> float:
    return t.hours * 3600 + t.minutes * 60 + t.seconds + t.milliseconds / 1000


def _parse_flexible_time(s: str) -> float:
    s = s.replace(",", ".")
    parts = s.split(":")
    if len(parts) == 3:
        h, m, sec = parts
        return int(h) * 3600 + int(m) * 60 + float(sec)
    elif len(parts) == 2:
        m, sec = parts
        return int(m) * 60 + float(sec)
    return float(s)


def _seconds_to_timestamp(seconds: float) -> str:
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = seconds % 60
    return f"{h:02d}:{m:02d}:{s:05.2f}"
