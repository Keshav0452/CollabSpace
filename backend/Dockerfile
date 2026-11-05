FROM node:22-bookworm-slim AS build

WORKDIR /app
COPY package*.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build && npm prune --omit=dev

FROM node:22-bookworm-slim

WORKDIR /app
ENV NODE_ENV=production

# Only what is needed at runtime: production dependencies, compiled code and migrations.
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node package*.json migrations.config.mjs ./
COPY --chown=node:node migrations ./migrations

# Do not run as root.
USER node

EXPOSE 3000
CMD ["sh", "-c", "npm run migrate:up && npm start"]
