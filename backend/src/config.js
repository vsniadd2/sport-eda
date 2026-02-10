export const config = {
  port: 5000,
  timezone: process.env.TZ || 'Europe/Minsk',
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
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  mail: {
    host: process.env.SMTP_HOST || 'localhost',
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.MAIL_FROM || 'noreply@sport-eda.local',
  },
};
