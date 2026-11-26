# Production image of the API. Needs internet only while building.
FROM node:22-alpine AS base
WORKDIR /app
# Prisma's engines link against OpenSSL.
RUN apk add --no-cache openssl

FROM base AS pnpm
RUN npm install --global pnpm@10.34.9
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY prisma ./prisma

# --- compile (with dev dependencies) ------------------------------------
FROM pnpm AS build
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm exec prisma generate \
  && pnpm run build \
  && pnpm exec tsc prisma/seed.ts --outDir seed --module commonjs \
       --target es2022 --types node --skipLibCheck --esModuleInterop

# --- runtime dependencies only ------------------------------------------
FROM pnpm AS prod-deps
RUN pnpm install --frozen-lockfile --prod \
  && node_modules/.bin/prisma generate

# --- final image ---------------------------------------------------------
FROM base
ENV NODE_ENV=production \
    PORT=3000 \
    # No update checks or telemetry: the server has no internet.
    CHECKPOINT_DISABLE=1 \
    PRISMA_HIDE_UPDATE_MESSAGE=1
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/seed ./seed
COPY package.json ./
COPY prisma ./prisma
USER node
EXPOSE 3000
# Apply pending migrations, then hand the process over to Node so that it
# receives the stop signals.
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && exec node dist/main.js"]
