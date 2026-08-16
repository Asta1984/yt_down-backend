FROM node:22-bookworm-slim

ENV NODE_ENV=production \
    PORT=3000 \
    REDIS_HOST=redis \
    REDIS_PORT=6379

RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg python3 python3-pip ca-certificates \
    && pip3 install --no-cache-dir --break-system-packages yt-dlp \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .
RUN mkdir -p /tmp/yt-downloads && chown -R node:node /app /tmp/yt-downloads

USER node
EXPOSE 3000

CMD ["npm", "start"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3000)).then(r => process.exit(r.ok || r.status < 500 ? 0 : 1)).catch(() => process.exit(1))"

VOLUME ["/tmp/yt-downloads"]

