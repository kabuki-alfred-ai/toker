FROM node:20-alpine

# Deno runtime (required by yt-dlp-ejs for YouTube JS challenges)
RUN apk add --no-cache curl && \
    curl -fsSL https://deno.land/install.sh | DENO_INSTALL=/usr/local sh
ENV DENO_DIR=/tmp/deno

# yt-dlp (LATEST MASTER BRANCH) + ffmpeg
RUN apk add --no-cache python3 py3-pip ffmpeg && \
    pip3 install --break-system-packages -U \
      https://github.com/yt-dlp/yt-dlp/archive/master.tar.gz

ENV NODE_ENV=production

WORKDIR /app
COPY backend/package.json ./
RUN npm install
COPY backend/ ./
RUN npx prisma generate
RUN npm run build

CMD ["node", "dist/src/main"]
