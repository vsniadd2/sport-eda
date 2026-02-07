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

### 1. PostgreSQL (Docker)

```bash
docker-compose up -d
```

### 2. Backend

```bash
cd backend
npm install
npm run dev
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Откройте http://localhost:5173

## Структура

- **frontend** — React (Vite), хедер, авторизация/регистрация
- **backend** — Node.js (Express), JWT-авторизация
- **PostgreSQL** — users, хэши паролей

## Хедер

Главная | О магазине | Оплата | Доставка | Карта сайта | Авторизация
