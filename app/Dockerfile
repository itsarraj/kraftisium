# Expo static web export (same codebase as native app), served by nginx.
# Native Android/iOS builds are not containerized here.
FROM node:22-bookworm-slim AS build
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends git \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY app.config.js babel.config.js metro.config.js tailwind.config.js tsconfig.json eslint.config.js ./
COPY expo-env.d.ts nativewind-env.d.ts global.css ./
COPY app ./app
COPY assets ./assets
COPY constants ./constants
COPY components ./components
COPY contexts ./contexts
COPY hooks ./hooks
COPY lib ./lib
COPY scripts ./scripts
COPY services ./services
COPY types ./types
COPY utils ./utils

ARG EXPO_PUBLIC_BFF_API_URL=http://localhost:8000
ARG EXPO_PUBLIC_BFF_API_VERSION=v1

ENV EXPO_PUBLIC_BFF_API_URL=$EXPO_PUBLIC_BFF_API_URL \
    EXPO_PUBLIC_BFF_API_VERSION=$EXPO_PUBLIC_BFF_API_VERSION

ENV CI=1
RUN npx expo export --platform web

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
