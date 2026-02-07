export const config = {
  port: 5000,
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
};
