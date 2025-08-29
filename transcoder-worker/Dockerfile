FROM oven/bun:1.2.21

RUN apt-get update && \
    apt-get install -y ffmpeg && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json ./

RUN bun install

COPY . .

CMD ["bun", "run", "src/index.ts"]
