FROM python:3.11-slim

WORKDIR /app

# 시스템 패키지: ffmpeg + 한글 폰트 + 빌드 도구
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libffi-dev \
    ffmpeg \
    fonts-nanum \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt \
    && pip install --no-cache-dir --force-reinstall --upgrade pytubefix \
    && pip install --no-cache-dir --force-reinstall "yt-dlp[default] @ https://github.com/yt-dlp/yt-dlp-nightly-builds/releases/download/2026.03.29.233709/yt_dlp_nightly-2026.3.29.233709-py3-none-any.whl" \
    || pip install --no-cache-dir --force-reinstall --upgrade "yt-dlp[default]" \
    ; echo "yt-dlp version:" && yt-dlp --version

COPY . .

# uploads/outputs 디렉토리
RUN mkdir -p uploads outputs

EXPOSE 8000

CMD uvicorn app:app --host 0.0.0.0 --port ${PORT:-8000} --timeout-keep-alive 600
