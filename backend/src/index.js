import path from 'path';
import { existsSync } from 'fs';
import { pathToFileURL } from 'url';
import { fileURLToPath } from 'url';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import { config } from './config.js';
import { initDb } from './db.js';
import authRoutes from './routes/auth.js';
import productsRoutes from './routes/products.js';
import ordersRoutes from './routes/orders.js';
import homeRoutes from './routes/home.js';
import reviewsRoutes from './routes/reviews.js';
import adminRoutes from './routes/admin.js';
import callbackRequestsRoutes from './routes/callbackRequests.js';
import favoritesRoutes from './routes/favorites.js';
import feedbackRoutes from './routes/feedback.js';
import visitRoutes from './routes/visits.js';
import { getIO } from './socket.js';
import { getCatalogProducts } from './routes/products.js';
import cookieParser from 'cookie-parser';

// Режим «только заполнение БД»: не запускаем сервер, только скрипт seed-mock
if (process.argv.includes('seed-mock')) {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const seedPath = path.join(__dirname, '..', 'scripts', 'seed-mock.js');
  import(pathToFileURL(seedPath).href)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
} else {
  if (config.nodeEnv === 'production' && config.jwt.secret === 'sport-eda-jwt-secret-key-change-in-production') {
    console.warn('Предупреждение: в продакшене задайте свой jwt.secret в backend/config.local.js');
  }
  const app = express();
  const httpServer = createServer(app);
  const corsOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    `http://localhost:${config.port}`,
    config.frontendUrl,
  ].filter(Boolean);
  const io = new Server(httpServer, {
    cors: { origin: corsOrigins },
  });

  app.use(cors({ origin: corsOrigins, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());

  io.on('connection', (socket) => {
    const token = socket.handshake.auth?.token;
    if (token) {
      try {
        const payload = jwt.verify(token, config.jwt.secret);
        if (payload.role === 'admin') {
          socket.join('admin');
        } else if (payload.userId != null) {
          socket.join(`user:${payload.userId}`);
        }
      } catch {}
    }

    socket.on('catalog:query', async (params) => {
      try {
        const payload = params && typeof params === 'object' ? params : {};
        const products = await getCatalogProducts({
          category: payload.category || undefined,
          search: payload.search || undefined,
          price_min: payload.price_min != null ? payload.price_min : undefined,
          price_max: payload.price_max != null ? payload.price_max : undefined,
        });
        socket.emit('catalog:results', { products });
      } catch (err) {
        console.error('catalog:query', err);
        socket.emit('catalog:results', { products: [], error: true });
      }
    });
  });

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Sport EDA Backend работает!' });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/home', homeRoutes);
  app.use('/api/products', productsRoutes);
  app.use('/api/orders', ordersRoutes);
  app.use('/api/reviews', reviewsRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/callback-requests', callbackRequestsRoutes);
  app.use('/api/favorites', favoritesRoutes);
  app.use('/api/feedback', feedbackRoutes);
  app.use('/api/visit', visitRoutes);

  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const publicDir = path.join(__dirname, '..', 'public');
  if (existsSync(publicDir)) {
    app.use(express.static(publicDir));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) return next();
      res.sendFile(path.join(publicDir, 'index.html'));
    });
  }

  getIO().setInstance(io);

  initDb().then(() => {
    httpServer.listen(config.port, () => {
      console.log(`🚀 Сервер запущен на http://localhost:${config.port}`);
    });
  }).catch((err) => {
    console.error('Ошибка подключения к БД:', err.message);
    console.log('Запуск без БД. Поднимите PostgreSQL (docker-compose up -d)');
  });
}
