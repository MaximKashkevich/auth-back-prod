# --- Этап 1: Установка зависимостей ---
FROM node:22.14.0-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Копируем только файлы для установки пакетов
COPY package.json package-lock.json ./
COPY prisma ./prisma/

# Устанавливаем зависимости (npm ci быстрее и надежнее для CI/CD)
RUN npm ci

# Генерируем Prisma Client (он ляжет в node_modules/.prisma)
RUN npx prisma generate

# --- Этап 2: Сборка приложения ---
FROM node:22.14.0-alpine AS build
WORKDIR /app

# Копируем зависимости из первого этапа
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Компилируем TypeScript в JavaScript
RUN npm run build

# --- Этап 3: Финальный продакшн-образ ---
FROM node:22.14.0-alpine AS production
WORKDIR /app

ENV NODE_ENV=production

# Создаем пользователя для безопасности
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

# Копируем только те артефакты, которые нужны для запуска
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

# Если приложению нужны файлы схемы в рантайме (например, для миграций)
COPY --from=build /app/prisma ./prisma

USER nestjs

EXPOSE 3000

CMD ["node", "dist/main.js"]