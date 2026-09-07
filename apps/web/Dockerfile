FROM node:22-alpine AS build
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /workspace
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY apps/web/package.json apps/web/package.json
COPY packages/api-client/package.json packages/api-client/package.json
RUN pnpm install --no-frozen-lockfile
ARG VITE_API_ENABLED=true
ENV VITE_API_ENABLED=$VITE_API_ENABLED
COPY tsconfig.base.json ./
COPY apps/web ./apps/web
COPY packages/api-client ./packages/api-client
RUN pnpm --filter @forsee/web build

FROM nginx:1.29-alpine
COPY infra/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /workspace/apps/web/dist /usr/share/nginx/html
EXPOSE 80
