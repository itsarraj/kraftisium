# Build static site, serve with nginx
FROM node:22-bookworm-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY index.html vite.config.ts tsconfig.json tsconfig.node.json \
     postcss.config.js tailwind.config.js eslint.config.js ./
COPY public ./public
COPY src ./src
COPY scripts ./scripts

ARG VITE_BFF_API_URL=http://localhost:8000
ARG VITE_BFF_API_VERSION=v1
ARG VITE_TURNSTILE_SITE_KEY=
ARG NGINX_CONF=nginx.conf

ENV VITE_BFF_API_URL=$VITE_BFF_API_URL \
    VITE_BFF_API_VERSION=$VITE_BFF_API_VERSION \
    VITE_TURNSTILE_SITE_KEY=$VITE_TURNSTILE_SITE_KEY

RUN npm run build

FROM nginx:1.27-alpine
ARG NGINX_CONF=nginx.conf
COPY nginx.conf nginx.dev.conf /tmp/
RUN cp "/tmp/${NGINX_CONF}" /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
