FROM oven/bun:1
 
# yt-dlp shells out to ffmpeg for merging separate video+audio streams and
# for embedding thumbnails/metadata into audio-only downloads. curl is only
# needed to pull the yt-dlp binary at build time.

RUN apt-get update && apt-get install -y --no-install-recommends \
      nodejs \
      npm \
      ffmpeg \
      curl \
      ca-certificates \
      python3 \
      python3-pip \
    && pip3 install --no-cache-dir --break-system-packages "yt-dlp[default]" \
    && rm -rf /var/lib/apt/lists/*

# Standalone yt-dlp binary — no python runtime needed.

RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \
      -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp

RUN yt-dlp --version
RUN node --version

WORKDIR /app

# Install deps first so this layer is cached unless package.json/bun.lock change
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

COPY . .

# Non-root runtime user
RUN groupadd --system app && useradd --system --gid app app \
    && mkdir -p /tmp/yt-downloads \
    && chown -R app:app /app /tmp/yt-downloads
USER app

ENV NODE_ENV=production
ENV PORT=5000
EXPOSE 5000

CMD ["bun", "index.js"]