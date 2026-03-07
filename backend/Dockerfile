FROM node:20-alpine

# yt-dlp (LATEST MASTER BRANCH) + ffmpeg + runtime deps
RUN apk add --no-cache python3 py3-pip ffmpeg && \
    pip3 install --break-system-packages -U https://github.com/yt-dlp/yt-dlp/archive/master.tar.gz

WORKDIR /app
COPY backend/package.json ./
RUN npm install
COPY backend/ ./
RUN npx prisma generate
RUN npm run build

CMD ["node", "dist/src/main"]
