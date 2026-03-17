FROM node:20-alpine

# Deno runtime (required by yt-dlp-ejs for YouTube JS challenges)
RUN apk add --no-cache curl && \
    curl -fsSL https://deno.land/install.sh | DENO_INSTALL=/usr/local sh
ENV DENO_DIR=/tmp/deno

# yt-dlp (LATEST MASTER BRANCH) + ffmpeg + Python deps for find_sources.py
RUN apk add --no-cache python3 py3-pip ffmpeg opencv-dev py3-numpy py3-opencv && \
    pip3 install --break-system-packages -U \
      https://github.com/yt-dlp/yt-dlp/archive/master.tar.gz \
      requests

RUN apk add --no-cache chromium
ENV CHROME_EXECUTABLE_PATH=/usr/bin/chromium-browser

ENV NODE_ENV=production

WORKDIR /app
COPY backend/package.json ./
RUN npm install --include=dev
COPY backend/ ./
RUN npx prisma generate
RUN npm run build

# Build Remotion bundle
COPY remotion-compositions/ /app/remotion-compositions/
WORKDIR /app/remotion-compositions
RUN npm install
RUN npm run build
WORKDIR /app
ENV REMOTION_BUNDLE_PATH=/app/remotion-compositions/build

CMD ["node", "dist/src/main"]
