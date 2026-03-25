FROM python:3.11-slim

WORKDIR /app

# 시스템 패키지: ffmpeg + 한글 폰트 + 빌드 도구
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libffi-dev \
    ffmpeg \
    fonts-nanum fonts-nanum-coding \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt && pip install --no-cache-dir --upgrade yt-dlp pytubefix

COPY . .

# uploads/outputs 디렉토리
RUN mkdir -p uploads outputs

EXPOSE 8000

CMD uvicorn app:app --host 0.0.0.0 --port ${PORT:-8000} --timeout-keep-alive 600
