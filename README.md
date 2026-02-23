# Sport EDA — Спортивное питание и товары для спорта

Интернет-магазин спортивного питания. React + Node.js + PostgreSQL.

## Пользователи

- **user** — обычные пользователи (регистрация через /register)
- **admin** — администратор: admin@gmail.com / пароль: 1

## Миграции БД

Миграции выполняются при запуске backend или вручную:

```bash
cd backend
npm run migrate
```

Папка `backend/src/migrations/` содержит миграции. Новые миграции добавляются как `009_название.js` с функцией `up(client)`.

## Запуск

### Вариант «одна кнопка» (Docker)

Установите [Docker Desktop](https://www.docker.com/products/docker-desktop/). Скопируйте проект на ПК, откройте терминал в корне проекта и выполните:

```bash
docker compose up --build
```

Когда в логе появится что-то вроде «Server running on port 5000», откройте в браузере **http://localhost:5000**.  
Логин админа: **admin@gmail.com** / пароль: **1**.

Остановка: `Ctrl+C` или в другом терминале `docker compose down`.

Для продакшена (свой JWT, домен): создайте `backend/config.local.js` по образцу `backend/config.local.example.js` и при необходимости смонтируйте его в контейнер.

---

### Ручной запуск (разработка)

#### 1. PostgreSQL (Docker)

```bash
docker-compose up -d
```

#### 2. Backend

```bash
cd backend
npm install
npm run dev
```

#### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Откройте http://localhost:5173

### Сборка и запуск как продакшен (без Docker)

```bash
npm run build          # собрать фронтенд
# Скопируйте frontend/dist в backend/public, затем:
npm run start          # запуск бэкенда (отдаёт статику из public)
```

Или используйте Docker; для прода задайте свои настройки в `backend/config.local.js` (или смонтируйте файл в контейнер).

## Структура

- **frontend** — React (Vite), хедер, авторизация/регистрация
- **backend** — Node.js (Express), JWT-авторизация
- **PostgreSQL** — users, хэши паролей

## Хедер

Главная | О магазине | Оплата | Доставка | Карта сайта | Авторизация
