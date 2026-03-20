"""
api/yt-dl.py  — yt-dlp 기반 YouTube 스트림 URL 추출 (Python Vercel Function)
봇 감지 우회에 더 강한 yt-dlp 라이브러리 사용
"""
from http.server import BaseHTTPRequestHandler
import json
from urllib.parse import urlparse, parse_qs


class handler(BaseHTTPRequestHandler):

    def do_OPTIONS(self):
        self.send_response(200)
        self._cors()
        self.end_headers()

    def do_GET(self):
        query = parse_qs(urlparse(self.path).query)
        url = query.get("url", [None])[0]

        if not url:
            self._send(400, {"error": "url 파라미터 필요"})
            return

        try:
            import yt_dlp

            ydl_opts = {
                "format": "best[ext=mp4][height<=720]/best[ext=mp4]/best",
                "noplaylist": True,
                "quiet": True,
                "no_warnings": True,
                "socket_timeout": 25,
                "http_headers": {
                    "User-Agent": (
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                        "AppleWebKit/537.36 (KHTML, like Gecko) "
                        "Chrome/120.0.0.0 Safari/537.36"
                    ),
                    "Accept-Language": "ko-KR,ko;q=0.9",
                },
            }

            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)

            formats = info.get("formats", [])

            # 비디오+오디오 합본 mp4 중 최고화질
            combined = sorted(
                [f for f in formats
                 if f.get("vcodec", "none") != "none"
                 and f.get("acodec", "none") != "none"
                 and f.get("ext") == "mp4"],
                key=lambda f: f.get("height") or 0,
                reverse=True,
            )
            best = combined[0] if combined else (formats[-1] if formats else {})

            thumbs = info.get("thumbnails", [])
            thumb = (
                thumbs[-1]["url"] if thumbs
                else f"https://img.youtube.com/vi/{info.get('id', '')}/hqdefault.jpg"
            )

            quality = ""
            if best.get("height"):
                quality = f"{best['height']}p"
            elif best.get("format_note"):
                quality = best["format_note"]

            self._send(200, {
                "title":     info.get("title", ""),
                "thumbnail": thumb,
                "duration":  info.get("duration", 0),
                "id":        info.get("id", ""),
                "streamUrl": best.get("url", ""),
                "quality":   quality,
            })

        except Exception as e:
            err_msg = str(e)[:300]
            # 봇 감지 시 명확한 메시지
            if "Sign in" in err_msg or "bot" in err_msg.lower():
                err_msg = "YouTube 봇 감지로 차단됨. 영상을 직접 다운로드 후 파일 업로드를 이용해주세요."
            self._send(500, {"error": err_msg})

    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def _send(self, code, data):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self._cors()
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format, *args):
        pass  # 로그 억제
