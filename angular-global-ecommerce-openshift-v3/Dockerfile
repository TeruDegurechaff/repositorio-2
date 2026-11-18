# Etapa 1: compilar la aplicación Angular
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install --no-audit --no-fund
COPY . .
RUN npm run build -- --configuration=production

# Etapa 2: servidor Node (sirve Angular + API que conecta con PostgreSQL)
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=8080
COPY server/package.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY server/index.js ./
COPY --from=build /app/dist/angular-global-ecommerce/browser ./public
EXPOSE 8080
USER 1001
CMD ["node", "index.js"]
