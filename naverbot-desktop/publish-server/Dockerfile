FROM node:20-slim

# Playwright 시스템 의존성
RUN apt-get update && apt-get install -y \
    libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 \
    libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 \
    libxrandr2 libgbm1 libasound2 libpango-1.0-0 \
    libcairo2 libxshmfence1 libx11-xcb1 libxcb1 \
    fonts-noto-cjk fonts-noto-color-emoji \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json ./
RUN npm install
RUN npx playwright install chromium

# 프로필/쿠키 저장용 볼륨
RUN mkdir -p /app/profiles
VOLUME /app/profiles

COPY . .

EXPOSE 10000
ENV PORT=10000
CMD ["node", "server.js"]
