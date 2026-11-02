FROM oven/bun:1 AS deps
WORKDIR /app

COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile

FROM oven/bun:1 AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
RUN bun run build

FROM oven/bun:1 AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV NEXT_TELEMETRY_DISABLED=1


RUN mkdir .next
RUN chown bun:bun .next

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.ts ./next.config.ts

USER bun 

EXPOSE 3000

CMD ["bun" , "run" , "start"]



