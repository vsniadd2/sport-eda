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
import { getIO } from './socket.js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: ['http://localhost:5173', 'http://localhost:3000'] },
});

app.use(cors());
app.use(express.json());

io.on('connection', (socket) => {
  const token = socket.handshake.auth?.token;
  if (token) {
    try {
      const payload = jwt.verify(token, config.jwt.secret);
      if (payload.role === 'admin') {
        socket.join('admin');
      }
    } catch {}
  }
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

getIO().setInstance(io);

initDb().then(() => {
  httpServer.listen(config.port, () => {
    console.log(`🚀 Сервер запущен на http://localhost:${config.port}`);
  });
}).catch((err) => {
  console.error('Ошибка подключения к БД:', err.message);
  console.log('Запуск без БД. Поднимите PostgreSQL (docker-compose up -d)');
});
