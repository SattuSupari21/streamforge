FROM oven/bun:1.2.21

WORKDIR /app

COPY . .

RUN bun install

EXPOSE 3000

CMD ["bun", "run", "src/server.ts"]
