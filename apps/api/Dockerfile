FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /workspace
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/api/package.json apps/api/package.json
COPY packages/api-client/package.json packages/api-client/package.json
COPY packages/database/package.json packages/database/package.json
RUN pnpm install --no-frozen-lockfile

FROM base AS build
COPY tsconfig.base.json ./
COPY apps/api ./apps/api
COPY packages/api-client ./packages/api-client
COPY packages/database ./packages/database
RUN pnpm --filter @forsee/database generate
RUN pnpm --filter @forsee/api build

FROM build AS runtime-deps
RUN pnpm deploy --filter @forsee/api --prod --legacy /prod/api

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /workspace/apps/api/dist ./dist
COPY --from=runtime-deps /prod/api/package.json ./package.json
COPY --from=runtime-deps /prod/api/node_modules ./node_modules
COPY --from=build /workspace/packages/database/prisma ./prisma
COPY --from=build /workspace/packages/database/seeds ./seeds
RUN ./node_modules/.bin/prisma generate --schema=./prisma/schema.prisma
EXPOSE 3000
CMD ["node", "dist/main.js"]
