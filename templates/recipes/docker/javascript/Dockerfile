# syntax=docker/dockerfile:1
# Multi-stage image: install production dependencies only and run as the
# unprivileged "node" user. Build: docker build -t __package__ .

FROM node:22-alpine AS deps
WORKDIR /app
__corepack__
COPY package.json __lockfile__ ./
RUN __installProd__

FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package.json ./
COPY --chown=node:node src ./src
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:3000/health || exit 1
CMD ["node", "src/server.js"]
