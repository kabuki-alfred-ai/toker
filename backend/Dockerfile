FROM node:20-alpine

# yt-dlp requis pour Epic 2 (transcription processor)
RUN apk add --no-cache python3 py3-pip ffmpeg && \
    pip3 install --break-system-packages yt-dlp

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npx prisma generate
RUN npm run build

CMD ["node", "dist/main"]
