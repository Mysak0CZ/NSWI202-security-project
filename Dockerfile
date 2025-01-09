FROM docker.io/node:22-alpine AS builder

RUN corepack enable
WORKDIR /app
ENV CI=true

# Fetch dependencies
COPY package.json pnpm-lock.yaml ./
RUN pnpm fetch

# Copy sources
COPY . ./

# Build
RUN pnpm install -r --offline --frozen-lockfile
RUN pnpm -r --filter mysak-security-project-server run build

# Shrinkwrap for deployment
RUN pnpm deploy --filter=mysak-security-project-server --prod /app/deploy

# Directory production image
FROM docker.io/node:22-alpine AS server

WORKDIR /app

COPY --from=builder /app/deploy /app

CMD ["node", "--enable-source-maps", "out/main.js"]
