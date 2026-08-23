FROM oven/bun:1.4.0-alpine AS build

WORKDIR /app

COPY package.json bun.lock ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json
COPY contracts/http/package.json ./contracts/http/package.json
COPY contracts/realtime/package.json ./contracts/realtime/package.json
COPY packages/api-client/package.json ./packages/api-client/package.json

RUN bun ci

COPY . .

ARG NEXT_PUBLIC_REVERB_APP_KEY
ENV NEXT_PUBLIC_REVERB_APP_KEY=$NEXT_PUBLIC_REVERB_APP_KEY

RUN bun run --filter web build

FROM node:24.19.0-alpine3.24 AS runtime

RUN apk upgrade --no-cache \
    && rm -r \
        /usr/local/lib/node_modules/corepack \
        /usr/local/lib/node_modules/npm \
    && rm \
        /usr/local/bin/corepack \
        /usr/local/bin/npm \
        /usr/local/bin/npx

ENV HOST=0.0.0.0 \
    NODE_ENV=production \
    PORT=3000

WORKDIR /app

COPY --from=build --chown=node:node /app/apps/web/dist/standalone ./

USER node

EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=5s --retries=6 \
    CMD ["node", "-e", "fetch('http://127.0.0.1:3000/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]

CMD ["node", "server.js"]
