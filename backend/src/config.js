import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Локально по умолчанию 5001, чтобы не конфликтовать с Docker (app на 5000)
const defaults = {
  port: 5001,
  timezone: 'Europe/Minsk',
  db: {
    host: 'localhost',
    port: 5432,
    database: 'sport_eda',
    user: 'postgres',
    password: 'postgres',
  },
  jwt: {
    secret: 'sport-eda-jwt-secret-key-change-in-production',
    expiresIn: '7d',
  },
  frontendUrl: 'http://localhost:5173',
  nodeEnv: 'development',
  mail: {
    host: 'localhost',
    port: 587,
    secure: false,
    user: '',
    pass: '',
    from: 'noreply@sport-eda.local',
  },
};

let local = {};
try {
  local = require('../config.local.js');
} catch {
  // config.local.js не задан — работаем на дефолтах
}

function merge(target, source) {
  const out = { ...target };
  for (const key of Object.keys(source)) {
    if (source[key] != null && typeof source[key] === 'object' && !Array.isArray(source[key]) && typeof source[key] === typeof target[key]) {
      out[key] = merge(target[key] || {}, source[key]);
    } else if (source[key] !== undefined) {
      out[key] = source[key];
    }
  }
  return out;
}

let config = merge(defaults, local);

// Рантайм-переопределения только для БД и порта (Docker: PGHOST=postgres и т.д.; не храним секреты в .env)
const envOverrides = {};
if (process.env.PGHOST != null) (envOverrides.db = { ...config.db, host: process.env.PGHOST });
if (process.env.PGPORT != null) (envOverrides.db = { ...(envOverrides.db || config.db), port: Number(process.env.PGPORT) });
if (process.env.PGDATABASE != null) (envOverrides.db = { ...(envOverrides.db || config.db), database: process.env.PGDATABASE });
if (process.env.PGUSER != null) (envOverrides.db = { ...(envOverrides.db || config.db), user: process.env.PGUSER });
if (process.env.PGPASSWORD != null) (envOverrides.db = { ...(envOverrides.db || config.db), password: process.env.PGPASSWORD });
if (process.env.PORT != null) envOverrides.port = Number(process.env.PORT);

config = merge(config, envOverrides);
export { config };
