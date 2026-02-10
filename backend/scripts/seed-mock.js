/**
 * Скрипт для РУЧНОГО заполнения БД мок-данными.
 * Запуск: из папки backend выполнить: npm run seed-mock
 * Все пользователи получают пароль: 123456
 */

import pg from 'pg';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const configPath = pathToFileURL(path.join(__dirname, '..', 'src', 'config.js')).href;
const { config } = await import(configPath);

const { Pool } = pg;
const pool = new Pool(config.db);
const PASSWORD = '123456';
const passwordHash = await bcrypt.hash(PASSWORD, 10);

const client = await pool.connect();

try {
  console.log('Добавление мок-данных...\n');

  // ——— Категории ———
  const categories = [
    { name: 'Протеин', slug: 'protein' },
    { name: 'Гейнеры', slug: 'gainers' },
    { name: 'Аминокислоты', slug: 'amino-acids' },
    { name: 'Витамины и минералы', slug: 'vitamins' },
    { name: 'Жиросжигатели', slug: 'fat-burners' },
    { name: 'Предтрены', slug: 'pre-workout' },
  ];

  const categoryIds = [];
  for (const c of categories) {
    const res = await client.query(
      `INSERT INTO categories (name, slug) VALUES ($1, $2)
       ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
       RETURNING id`,
      [c.name, c.slug]
    );
    categoryIds.push(res.rows[0].id);
  }
  console.log(`Категории: добавлено/обновлено ${categories.length}`);

  // ——— Пользователи (пароль у всех: 123456), около 100 ———
  const firstNames = ['Александр', 'Дмитрий', 'Максим', 'Иван', 'Артём', 'Никита', 'Михаил', 'Даниил', 'Егор', 'Андрей', 'Сергей', 'Павел', 'Алексей', 'Роман', 'Владимир', 'Марк', 'Константин', 'Тимофей', 'Илья', 'Леонид', 'Мария', 'Анна', 'Елена', 'Ольга', 'Наталья', 'Татьяна', 'Ирина', 'Екатерина', 'Светлана', 'Юлия', 'Виктория', 'Полина', 'Дарья', 'Анастасия', 'Александра', 'Ксения', 'Валерия', 'Вероника', 'Кристина', 'Алина'];
  const lastNames = ['Иванов', 'Петров', 'Сидоров', 'Козлов', 'Новиков', 'Морозов', 'Волков', 'Соколов', 'Лебедев', 'Кузнецов', 'Попов', 'Васильев', 'Михайлов', 'Фёдоров', 'Андреев', 'Смирнов', 'Козлов', 'Николаев', 'Егоров', 'Павлов', 'Семёнов', 'Голубев', 'Виноградов', 'Богданов', 'Воробьёв', 'Фролов', 'Миронов', 'Беляев', 'Тарасов', 'Белов', 'Комаров', 'Орлов', 'Киселёв', 'Макаров', 'Андреев', 'Ковалёв', 'Ильин', 'Гусев', 'Титов', 'Кузьмин'];
  const patronymics = ['Александрович', 'Дмитриевич', 'Сергеевич', 'Андреевич', 'Игоревич', 'Олегович', 'Михайлович', null, null];
  const domains = ['mail.ru', 'yandex.ru', 'gmail.com', 'bk.ru', 'inbox.ru', 'list.ru', 'rambler.ru', 'tut.by'];

  const users = [
    { email: 'admin@gmail.com', username: 'admin', role: 'admin', first_name: 'Админ', last_name: 'Сайта' },
  ];
  const usedEmails = new Set(['admin@gmail.com']);
  const usedUsernames = new Set(['admin']);
  for (let i = 1; i <= 99; i++) {
    const first = firstNames[(i * 7) % firstNames.length];
    const last = lastNames[(i * 11) % lastNames.length];
    const username = `user${i}`;
    const domain = domains[i % domains.length];
    const email = `${username}@${domain}`;
    if (usedEmails.has(email)) continue;
    usedEmails.add(email);
    usedUsernames.add(username);
    const patronymic = i % 3 === 0 ? patronymics[i % patronymics.length] : null;
    users.push({ email, username, role: 'user', first_name: first, last_name: last, patronymic });
  }

  for (const u of users) {
    await client.query(
      `INSERT INTO users (email, password_hash, username, role, first_name, last_name, patronymic)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (email) DO UPDATE SET
         password_hash = EXCLUDED.password_hash,
         username = EXCLUDED.username,
         role = EXCLUDED.role,
         first_name = EXCLUDED.first_name,
         last_name = EXCLUDED.last_name,
         patronymic = EXCLUDED.patronymic`,
      [u.email, passwordHash, u.username, u.role, u.first_name || null, u.last_name || null, u.patronymic || null]
    );
  }
  console.log(`Пользователи: добавлено/обновлено ${users.length} (пароль у всех: ${PASSWORD})`);

  // ——— Товары (около 100): базовые 20 + генерируем ещё 80 ———
  // Артикулы теперь генерируются автоматически триггером в БД (6-значные числа)
  const productTemplates = [
    // Протеин (0)
    { catIdx: 0, name: 'Whey Protein 100% Gold Standard', description: 'Сывороточный протеин премиум-класса. 24 г белка на порцию.', weight: '908 г', price: 89.99, sale_price: 74.99, is_sale: true, is_hit: true, manufacturer: 'Optimum Nutrition' },
    { catIdx: 0, name: 'Syntha-6 Edge', description: 'Многокомпонентный протеин с матрицей из 6 белков. Вкус шоколад.', weight: '907 г', price: 54.99, sale_price: null, is_sale: false, is_recommended: true, manufacturer: 'BSN' },
    { catIdx: 0, name: 'Impact Whey Protein', description: 'Чистый сывороточный протеин. Более 80% белка.', weight: '1 кг', price: 39.99, sale_price: null, is_sale: false, is_hit: true, manufacturer: 'Myprotein' },
    { catIdx: 0, name: 'Gold Standard Casein', description: 'Медленный белок для приёма перед сном.', weight: '908 г', price: 79.99, sale_price: 69.99, is_sale: true, is_recommended: true, manufacturer: 'Optimum Nutrition' },
    { catIdx: 0, name: 'ISO 100 Hydrolyzed', description: 'Гидролизат сывороточного белка. Максимальная скорость усвоения.', weight: '681 г', price: 94.99, sale_price: null, is_sale: false, is_hit: false, manufacturer: 'Dymatize' },
    // Гейнеры (1)
    { catIdx: 1, name: 'Serious Mass', description: 'Высококалорийный гейнер. 1250 ккал на порцию.', weight: '2.72 кг', price: 44.99, sale_price: null, is_sale: false, is_recommended: true, manufacturer: 'Optimum Nutrition' },
    { catIdx: 1, name: 'True-Mass', description: 'Гейнер с комплексом белков и углеводов. Клубника.', weight: '2.27 кг', price: 59.99, sale_price: 49.99, is_sale: true, is_hit: false, manufacturer: 'BSN' },
    { catIdx: 1, name: 'Weight Gainer', description: 'Классический гейнер для набора массы. Ваниль.', weight: '3 кг', price: 34.99, sale_price: null, is_sale: false, is_recommended: true, manufacturer: 'Myprotein' },
    // Аминокислоты (2)
    { catIdx: 2, name: 'BCAA 2:1:1', description: 'Разветвлённые аминокислоты. Соотношение 2:1:1. 400 мг.', weight: '400 г', price: 29.99, sale_price: 24.99, is_sale: true, is_hit: true, manufacturer: 'Optimum Nutrition' },
    { catIdx: 2, name: 'Amino Energy', description: 'Аминокислоты + энергетик. Кофеин и витамины группы B.', weight: '30 порций', price: 42.99, sale_price: null, is_sale: false, is_recommended: true, manufacturer: 'Optimum Nutrition' },
    { catIdx: 2, name: 'Super Amino 6000', description: 'Полный спектр аминокислот в таблетках. 300 таб.', weight: '300 таб', price: 24.99, sale_price: null, is_sale: false, is_hit: false, manufacturer: 'Dymatize' },
    // Витамины (3)
    { catIdx: 3, name: 'Opti-Men', description: 'Мультивитаминный комплекс для активных мужчин. 90 порций.', weight: '90 таб', price: 36.99, sale_price: 31.99, is_sale: true, is_recommended: true, manufacturer: 'Optimum Nutrition' },
    { catIdx: 3, name: 'Omega-3 Fish Oil', description: 'Рыбий жир. 1000 мг EPA и DHA на порцию.', weight: '180 капс', price: 18.99, sale_price: null, is_sale: false, is_hit: true, manufacturer: 'Myprotein' },
    { catIdx: 3, name: 'Vitamin D3', description: 'Витамин D3. 2000 МЕ на капсулу. 360 капсул.', weight: '360 капс', price: 12.99, sale_price: null, is_sale: false, is_recommended: true, manufacturer: 'Myprotein' },
    // Жиросжигатели (4)
    { catIdx: 4, name: 'Hydroxycut Hardcore', description: 'Термогеник и жиросжигатель. Кофеин и экстракты.', weight: '100 капс', price: 48.99, sale_price: 42.99, is_sale: true, is_hit: true, manufacturer: 'MuscleTech' },
    { catIdx: 4, name: 'Lipo-6 Black', description: 'Многофазный жиросжигатель. Ускорение метаболизма.', weight: '120 капс', price: 39.99, sale_price: null, is_sale: false, is_recommended: true, manufacturer: 'Nutrex' },
    // Предтрены (5)
    { catIdx: 5, name: 'C4 Original', description: 'Предтренировочный комплекс. Энергия и фокус. 30 порций.', weight: '300 г', price: 34.99, sale_price: 29.99, is_sale: true, is_hit: true, manufacturer: 'Cellucor' },
    { catIdx: 5, name: 'Pre-Workout Explosion', description: 'Кофеин, бета-аланин, цитруллин. Вкус арбуз.', weight: '250 г', price: 28.99, sale_price: null, is_sale: false, is_recommended: true, manufacturer: 'Myprotein' },
    { catIdx: 5, name: 'Pump Surge', description: 'Усиление пампа и выносливости. Без кофеина.', weight: '200 г', price: 32.99, sale_price: null, is_sale: false, is_hit: false, manufacturer: 'RSP Nutrition' },
  ];

  const catProductNames = {
    0: ['Whey Pro', 'Изолят', 'Гидролизат', 'Казеин', 'Мультипротеин', 'Сывороточный', 'Яичный белок', 'Говяжий протеин', 'Растительный протеин', 'Ночной протеин', 'Протеин 80', 'Изолят 90', 'Комплекс 5 белков', 'Молоко + сыворотка', 'Шоколадный протеин', 'Ванильный протеин', 'Клубничный протеин'],
    1: ['Mass Gainer', 'Супер Масс', 'Углеводный гейнер', 'Протеиновый гейнер', 'Калорийный гейнер', 'Масса 3000', 'Экстра Масс', 'Гейнер Премиум', 'Углеводы + белок', 'Набор массы', 'Гейнер Классик', 'Гейнер Плюс', 'Мега Масс', 'Гейнер Стандарт', 'Высококалорийный гейнер', 'Гейнер Энерджи', 'Гейнер Формула'],
    2: ['BCAA 4:1:1', 'BCAA 8:1:1', 'ЭAA комплекс', 'Глютамин', 'Цитруллин', 'Аргинин', 'Таурин', 'Бета-аланин', 'Комплекс аминокислот', 'Аминки 5000', 'Жидкие аминокислоты', 'BCAA порошок', 'Аминокислоты капсулы', 'Восстановление мышц', 'Амино Комплекс', 'BCAA Экстра', 'Аминокислоты Премиум'],
    3: ['Мультивитамины', 'Витамин C', 'Витамин B', 'Магний', 'Цинк', 'Кальций', 'Железо', 'Омега 3-6-9', 'Витамин E', 'Комплекс витаминов', 'Спортивные витамины', 'Минеральный комплекс', 'Антиоксиданты', 'Витамин K', 'Биотин', 'Фолиевая кислота', 'Витамин A'],
    4: ['Термогеник', 'Жиросжигатель', 'L-Carnitine', 'Кленбутерол аналог', 'Экстракт зелёного чая', 'Кофеин капсулы', 'Жиросжигатель комплекс', 'Ночной жиросжигатель', 'Термоджетик', 'Липотропик', 'Жиросжигатель Премиум', 'Капсаицин', 'Гарциния', 'Экстракт гуараны', 'Жиросжигатель Формула', 'Термодженик Экстра', 'Сжигатель жира'],
    5: ['Предтрен', 'Энергия + фокус', 'Памп формула', 'Без кофеина предтрен', 'Нитропамп', 'Энерджи комплекс', 'Предтрен Премиум', 'Креатин + предтрен', 'Стимулятор тренировки', 'Фокус + энергия', 'Предтрен Классик', 'Памп бустер', 'Предтрен Экстра', 'Насос формула', 'Предтрен Стандарт', 'Энерджи бустер', 'Предтрен Про'],
  };
  const manufacturers = ['Optimum Nutrition', 'Myprotein', 'BSN', 'Dymatize', 'MuscleTech', 'Nutrex', 'Cellucor', 'RSP Nutrition', 'Scitec Nutrition', 'Olimp', 'Trec Nutrition', 'BioTech USA', 'Weider', 'Universal Nutrition', 'Gaspari'];
  const weightsByCat = { 0: ['450 г', '908 г', '1 кг', '2 кг', '681 г'], 1: ['1 кг', '2.27 кг', '3 кг', '2.72 кг'], 2: ['300 г', '400 г', '250 г', '30 порций', '60 капс', '120 капс'], 3: ['90 таб', '180 капс', '360 капс', '60 капс', '120 таб'], 4: ['60 капс', '100 капс', '120 капс', '90 капс'], 5: ['200 г', '250 г', '300 г', '30 порций', '40 порций'] };

  const products = [...productTemplates];
  for (let i = 0; i < 80; i++) {
    const catIdx = i % 6;
    const names = catProductNames[catIdx];
    const name = names[i % names.length] + ' ' + (manufacturers[i % manufacturers.length]).split(' ')[0] + ' ' + (1000 + i);
    const weightArr = weightsByCat[catIdx];
    const weight = weightArr[i % weightArr.length];
    const price = Math.round((15 + (i % 80) * 0.8 + (catIdx * 5)) * 100) / 100;
    const sale = i % 5 === 0;
    const sale_price = sale ? Math.round(price * 0.85 * 100) / 100 : null;
    products.push({
      catIdx,
      name,
      description: `Описание товара: ${name}. Качество и эффективность для ваших целей.`,
      weight,
      price,
      sale_price,
      is_sale: sale,
      is_hit: i % 7 === 0,
      is_recommended: i % 4 === 0,
      // article генерируется автоматически триггером в БД
      manufacturer: manufacturers[i % manufacturers.length],
    });
  }

  for (const p of products) {
    const categoryId = categoryIds[p.catIdx];
    // article не передаём — он генерируется автоматически триггером
    await client.query(
      `INSERT INTO products (category_id, name, description, weight, price, sale_price, is_sale, is_hit, is_recommended, manufacturer, in_stock, quantity)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true, 100)`,
      [
        categoryId,
        p.name,
        p.description || null,
        p.weight || null,
        p.price,
        p.sale_price ?? null,
        !!p.is_sale,
        !!p.is_hit,
        !!p.is_recommended,
        p.manufacturer || null,
      ]
    );
  }
  console.log(`Товары: добавлено ${products.length}`);

  console.log('\nГотово. Рекомендуется запускать один раз; повторный запуск добавит дубликаты товаров.');
} catch (err) {
  console.error('Ошибка:', err.message);
  process.exit(1);
} finally {
  client.release();
  await pool.end();
}