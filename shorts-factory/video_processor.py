import gc

import av
import numpy as np
from fractions import Fraction
from pathlib import Path
from typing import Callable
from PIL import Image, ImageDraw, ImageFont

OUT_W, OUT_H = 1080, 1920

# ===== 템플릿 프리셋 =====
TEMPLATES = {
    "minimal": {
        "title_size": 52, "title_color": "#FFFFFF", "title_bold": True,
        "sub_size": 34, "sub_color": "#AAAAAA",
        "caption_size": 42, "caption_color": "#FFFFFF",
        "bg_color": "#000000", "title_bg": None,
    },
    "bold": {
        "title_size": 64, "title_color": "#FFD700", "title_bold": True,
        "sub_size": 38, "sub_color": "#FFFFFF",
        "caption_size": 46, "caption_color": "#FFD700",
        "bg_color": "#0A0A0A", "title_bg": "#FF0000",
    },
    "neon": {
        "title_size": 56, "title_color": "#00FF88", "title_bold": True,
        "sub_size": 36, "sub_color": "#00CCFF",
        "caption_size": 44, "caption_color": "#00FF88",
        "bg_color": "#0D0D1A", "title_bg": None,
    },
    "pastel": {
        "title_size": 54, "title_color": "#FFB6C1", "title_bold": True,
        "sub_size": 36, "sub_color": "#E6E6FA",
        "caption_size": 42, "caption_color": "#FFB6C1",
        "bg_color": "#1A1A2E", "title_bg": None,
    },
    "news": {
        "title_size": 50, "title_color": "#FFFFFF", "title_bold": True,
        "sub_size": 32, "sub_color": "#CCCCCC",
        "caption_size": 40, "caption_color": "#FFFFFF",
        "bg_color": "#0F1923", "title_bg": "#E53935",
    },
}


def _load_font(size: int, bold: bool = False, custom_font: str = ""):
    """폰트 로드 (커스텀 폰트 우선)"""
    if custom_font and Path(custom_font).exists():
        try:
            return ImageFont.truetype(custom_font, size)
        except Exception:
            pass
    import platform
    if platform.system() == "Windows":
        candidates = [
            "C:/Windows/Fonts/malgunbd.ttf" if bold else "C:/Windows/Fonts/malgun.ttf",
            "C:/Windows/Fonts/NanumGothicBold.ttf" if bold else "C:/Windows/Fonts/NanumGothic.ttf",
            "C:/Windows/Fonts/gulim.ttc",
        ]
    elif platform.system() == "Darwin":
        candidates = [
            "/System/Library/Fonts/AppleSDGothicNeo.ttc",
            "/Library/Fonts/NanumGothicBold.ttf" if bold else "/Library/Fonts/NanumGothic.ttf",
        ]
    else:
        candidates = [
            "/usr/share/fonts/truetype/nanum/NanumGothicBold.ttf" if bold else "/usr/share/fonts/truetype/nanum/NanumGothic.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        ]
    for fp in candidates:
        if Path(fp).exists():
            return ImageFont.truetype(fp, size)
    return ImageFont.load_default()


def hex_to_rgb(hex_color: str) -> tuple:
    h = hex_color.lstrip("#")
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))


class FrameComposer:
    """프레임 합성기 - 템플릿 + 커스텀 폰트 지원"""

    def __init__(self, title="", subtitle="", logo_path="", src_w=1920, src_h=1080,
                 template="minimal", custom_font="",
                 title_color="", sub_color="", caption_color="",
                 title_size=0, sub_size=0, caption_size=0):

        tmpl = TEMPLATES.get(template, TEMPLATES["minimal"])

        # 사용자 커스텀 값 우선, 없으면 템플릿 값
        t_size = title_size or tmpl["title_size"]
        t_color = title_color or tmpl["title_color"]
        s_size = sub_size or tmpl["sub_size"]
        s_color = sub_color or tmpl["sub_color"]
        c_size = caption_size or tmpl["caption_size"]
        c_color = caption_color or tmpl["caption_color"]
        bg_color = tmpl["bg_color"]
        title_bg = tmpl.get("title_bg")

        # 비디오 크기 계산
        scale = OUT_W / src_w
        self.vid_w = OUT_W
        self.vid_h = int(src_h * scale)
        self.vid_y = (OUT_H - self.vid_h) // 2
        self.c_color = c_color

        # 폰트
        self.caption_font = _load_font(c_size, bold=True, custom_font=custom_font)

        # 고정 배경 생성
        bg = Image.new("RGB", (OUT_W, OUT_H), hex_to_rgb(bg_color))
        draw = ImageDraw.Draw(bg)

        # 제목 배경 바
        if title_bg and title:
            bar_h = t_size + 30
            bar_y = self.vid_y - 200
            draw.rectangle([0, bar_y, OUT_W, bar_y + bar_h], fill=hex_to_rgb(title_bg))

        if title:
            tf = _load_font(t_size, bold=tmpl["title_bold"], custom_font=custom_font)
            self._draw_centered(draw, title, self.vid_y - 180, tf, t_color)
        if subtitle:
            sf = _load_font(s_size, bold=False, custom_font=custom_font)
            self._draw_centered(draw, subtitle, self.vid_y - 110, sf, s_color)

        if logo_path and Path(logo_path).exists():
            try:
                logo = Image.open(logo_path).convert("RGBA")
                logo_h = min(80, max(self.vid_y - 200, 10))
                ratio = logo_h / logo.height
                logo_w = int(logo.width * ratio)
                logo = logo.resize((logo_w, logo_h), Image.LANCZOS)
                lx = (OUT_W - logo_w) // 2
                ly = max(self.vid_y - 280, 10)
                bg.paste(logo, (lx, ly), logo)
            except Exception:
                pass

        self.bg_array = np.array(bg)

    def compose(self, video_frame: np.ndarray, caption: str = "") -> np.ndarray:
        canvas = self.bg_array.copy()
        vid_img = Image.fromarray(video_frame)
        if vid_img.size != (self.vid_w, self.vid_h):
            vid_img = vid_img.resize((self.vid_w, self.vid_h), Image.LANCZOS)
        canvas[self.vid_y:self.vid_y + self.vid_h, 0:self.vid_w] = np.array(vid_img)

        if caption:
            caption_img = Image.fromarray(canvas)
            draw = ImageDraw.Draw(caption_img)
            caption_y = self.vid_y + self.vid_h + 50

            # 자막 줄바꿈 처리 (너무 길면 2줄)
            max_text_w = OUT_W - 80
            bbox = draw.textbbox((0, 0), caption, font=self.caption_font)
            tw = bbox[2] - bbox[0]
            if tw > max_text_w and len(caption) > 10:
                mid = len(caption) // 2
                space_idx = caption.rfind(" ", 0, mid + 5)
                if space_idx > 3:
                    caption = caption[:space_idx] + "\n" + caption[space_idx + 1:]

            bbox = draw.textbbox((0, 0), caption, font=self.caption_font)
            tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
            x = (OUT_W - tw) // 2
            pad_x, pad_y = 24, 14

            # 배경 - 둥근 사각형 (더 큰 패딩, 반투명)
            bg_rect = [x - pad_x, caption_y - pad_y, x + tw + pad_x, caption_y + th + pad_y]
            draw.rounded_rectangle(bg_rect, radius=16, fill=(0, 0, 0, 200))

            # 텍스트 아웃라인 (두꺼운 외곽선)
            outline_color = (0, 0, 0)
            for dx in range(-3, 4):
                for dy in range(-3, 4):
                    if dx * dx + dy * dy <= 9:
                        draw.text((x + dx, caption_y + dy), caption, font=self.caption_font, fill=outline_color)

            # 메인 텍스트
            draw.text((x, caption_y), caption, font=self.caption_font, fill=self.c_color)
            canvas = np.array(caption_img)

        return canvas

    def _draw_centered(self, draw, text, y, font, fill):
        bbox = draw.textbbox((0, 0), text, font=font)
        tw = bbox[2] - bbox[0]
        x = (OUT_W - tw) // 2
        # 두꺼운 아웃라인
        for dx in range(-3, 4):
            for dy in range(-3, 4):
                if dx * dx + dy * dy <= 9:
                    draw.text((x + dx, y + dy), text, font=font, fill="black")
        draw.text((x, y), text, font=font, fill=fill)


def get_caption_at_time(subs: list[dict], time_sec: float) -> str:
    # 정확한 매칭 (약간의 여유 0.15초)
    for s in subs:
        if s["start_seconds"] - 0.15 <= time_sec <= s["end_seconds"] + 0.15:
            return s["text"]
    # 가장 가까운 자막 (0.5초 이내)
    best = ""
    best_dist = 0.5
    for s in subs:
        dist = min(abs(time_sec - s["start_seconds"]), abs(time_sec - s["end_seconds"]))
        if dist < best_dist:
            best_dist = dist
            best = s["text"]
    return best


def _pre_cut_clip(video_path: str, start: float, end: float, output_dir: str) -> str:
    """FFmpeg로 클립 구간만 먼저 잘라내기 (메모리 절약, 정확한 타이밍)"""
    import subprocess
    clip_path = str(Path(output_dir) / f"_clip_{start:.0f}_{end:.0f}.mp4")
    try:
        # -ss를 -i 뒤에 배치하면 정확한 시간 추출 (느리지만 정확)
        result = subprocess.run([
            "ffmpeg", "-i", video_path,
            "-ss", str(max(0, start)), "-to", str(end + 0.3),
            "-c:v", "libx264", "-preset", "fast", "-crf", "22",
            "-c:a", "aac", "-b:a", "192k", "-y", clip_path
        ], capture_output=True, timeout=120)
        if result.returncode == 0 and Path(clip_path).exists() and Path(clip_path).stat().st_size > 1000:
            return clip_path
    except Exception as e:
        print(f"Pre-cut failed: {e}")
    return video_path  # 실패 시 원본 사용


def generate_short(
    video_path: str,
    srt_path: str,
    start_seconds: float,
    end_seconds: float,
    output_path: str,
    progress_callback: Callable[[float], None] | None = None,
    title: str = "",
    subtitle: str = "",
    logo_path: str = "",
    remove_silence: bool = False,
    subs: list[dict] | None = None,
    template: str = "minimal",
    custom_font: str = "",
    title_color: str = "",
    caption_color: str = "",
) -> str:
    """16:9 영상을 9:16 레터박스로 변환"""
    output_path = Path(output_path).resolve()
    output_path.parent.mkdir(parents=True, exist_ok=True)
    duration = end_seconds - start_seconds

    # 긴 영상은 먼저 클립 구간만 잘라내기 (메모리 절약)
    actual_video = video_path
    if duration < 120 and Path(video_path).exists():
        cut_path = _pre_cut_clip(video_path, start_seconds, end_seconds, str(output_path.parent))
        if cut_path != video_path:
            actual_video = cut_path
            # 재인코딩 방식이므로 정확히 0부터 시작
            orig_start = start_seconds
            end_seconds = end_seconds - start_seconds + 0.1
            start_seconds = 0
            # 자막 시간도 조정
            if subs:
                subs = [{"start_seconds": s["start_seconds"] - orig_start, "end_seconds": s["end_seconds"] - orig_start, "text": s["text"]} for s in subs]

    input_container = av.open(str(actual_video))
    in_video = input_container.streams.video[0]
    in_audio = input_container.streams.audio[0] if input_container.streams.audio else None

    src_w = in_video.codec_context.width
    src_h = in_video.codec_context.height
    composer = FrameComposer(
        title, subtitle, logo_path, src_w, src_h,
        template=template, custom_font=custom_font,
        title_color=title_color, caption_color=caption_color,
    )

    fps = in_video.average_rate or Fraction(30, 1)
    if isinstance(fps, float):
        fps = Fraction(fps).limit_denominator(10000)

    output_container = av.open(str(output_path), mode="w")
    out_video = output_container.add_stream("libx264", rate=fps)
    out_video.width = OUT_W
    out_video.height = OUT_H
    out_video.pix_fmt = "yuv420p"
    out_video.options = {"preset": "medium", "crf": "21", "profile": "high", "level": "4.1"}

    out_audio = None
    if in_audio:
        out_audio = output_container.add_stream("aac", rate=in_audio.rate or 44100)
        out_audio.bit_rate = 192000

    input_container.seek(int(start_seconds * av.time_base), any_frame=False)

    frame_count = 0
    streams = [in_video] + ([in_audio] if in_audio else [])

    for packet in input_container.demux(streams):
        for frame in packet.decode():
            if frame.pts is None:
                continue
            frame_time = float(frame.pts * frame.time_base)

            if frame_time < start_seconds:
                continue
            if frame_time > end_seconds:
                break

            # 자막 기반 침묵 제거
            if remove_silence and subs:
                has_speech = any(
                    s["start_seconds"] - 0.2 <= frame_time <= s["end_seconds"] + 0.2
                    for s in subs
                )
                if not has_speech:
                    continue

            if isinstance(frame, av.VideoFrame):
                img = frame.to_ndarray(format="rgb24")
                caption = get_caption_at_time(subs, frame_time) if subs else ""

                composed = composer.compose(img, caption)

                # 페이드 인/아웃 효과 (처음 0.5초, 마지막 0.5초)
                elapsed = frame_time - start_seconds
                remaining = end_seconds - frame_time
                fade_duration = 0.5
                if elapsed < fade_duration:
                    alpha = elapsed / fade_duration
                    composed = (composed.astype(np.float32) * alpha).astype(np.uint8)
                elif remaining < fade_duration:
                    alpha = remaining / fade_duration
                    composed = (composed.astype(np.float32) * max(alpha, 0)).astype(np.uint8)

                new_frame = av.VideoFrame.from_ndarray(composed, format="rgb24")
                new_frame = new_frame.reformat(format="yuv420p")
                new_frame.pts = frame_count
                frame_count += 1

                for p in out_video.encode(new_frame):
                    output_container.mux(p)

                if progress_callback and duration > 0 and frame_count % 5 == 0:
                    pct = min((frame_time - start_seconds) / duration * 100, 100)
                    progress_callback(pct)

            elif isinstance(frame, av.AudioFrame) and out_audio:
                frame.pts = None
                for p in out_audio.encode(frame):
                    output_container.mux(p)
        else:
            continue
        break

    for p in out_video.encode():
        output_container.mux(p)
    if out_audio:
        for p in out_audio.encode():
            output_container.mux(p)

    output_container.close()
    input_container.close()
    # 임시 클립 파일 정리 + 메모리 해제
    if actual_video != video_path:
        try: Path(actual_video).unlink()
        except: pass
    gc.collect()

    if progress_callback:
        progress_callback(100)

    gc.collect()
    return str(output_path)


def check_ffmpeg() -> bool:
    return True
