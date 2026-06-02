# Labeloo frontend (Nuxt 4 + Konva)
FROM node:22-bookworm-slim

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && corepack enable \
    && corepack prepare pnpm@9.15.9 --activate

# Install dependencies first for better layer caching.
COPY package.json pnpm-lock.yaml .npmrc ./
RUN pnpm install --frozen-lockfile

# App source.
COPY . .

EXPOSE 3000

# Browser calls the API directly, so this must be the host-mapped backend URL.
ENV NUXT_PUBLIC_API_URL=http://localhost:8787
ENV HOST=0.0.0.0
ENV PORT=3000

# `dev` already binds --host 0.0.0.0 (see package.json).
CMD ["pnpm", "dev"]
