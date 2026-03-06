FROM node:20-alpine

# yt-dlp requis pour la transcription
RUN apk add --no-cache python3 py3-pip ffmpeg && \
    pip3 install --break-system-packages yt-dlp

WORKDIR /app
# Copy root lockfile + workspace manifests for npm ci in monorepo context
COPY package-lock.json ./
COPY package.json ./
COPY backend/package.json ./backend/
RUN npm ci --workspace=backend --include=dev
COPY backend/ ./backend/
WORKDIR /app/backend
RUN npx prisma generate
RUN npm run build

CMD ["node", "dist/main"]
