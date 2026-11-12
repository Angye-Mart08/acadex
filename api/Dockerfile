FROM node:24-alpine AS dependencies
WORKDIR /app/api
COPY api/package.json api/package-lock.json ./
RUN npm ci

FROM node:24-alpine AS runtime
WORKDIR /app/api
COPY --from=dependencies /app/api/node_modules ./node_modules
COPY api/package.json ./
COPY api/src ./src
COPY database/gestion_monitorias_tutorias.sql /app/database/gestion_monitorias_tutorias.sql
COPY database/migrations /app/database/migrations
USER node
EXPOSE 3000
CMD ["node", "--import", "tsx", "src/server.ts"]
