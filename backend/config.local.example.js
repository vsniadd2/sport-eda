// Скопируйте в config.local.js и подставьте свои значения.
// config.local.js не коммитится в git.

module.exports = {
  port: 5000,
  // timezone: 'Europe/Minsk',
  // db: {
  //   host: 'localhost',
  //   port: 5432,
  //   database: 'sport_eda',
  //   user: 'postgres',
  //   password: 'postgres',
  // },
  jwt: {
    secret: 'ваш-уникальный-секрет-для-jwt',
    // expiresIn: '7d',
  },
  frontendUrl: 'http://localhost:5173',
  // nodeEnv: 'development',
  // mail: {
  //   host: 'localhost',
  //   port: 587,
  //   secure: false,
  //   user: '',
  //   pass: '',
  //   from: 'noreply@sport-eda.local',
  // },
};
