export const up = async (client) => {
  const check = await client.query('SELECT COUNT(*) FROM products');
  if (parseInt(check.rows[0].count) === 0) {
    await client.query(`
      INSERT INTO products (category_id, name, description, weight, price, image_url) VALUES
      (1, 'Протеин 100% Pure Whey Biotech USA', 'Сывороточный протеин', '2270 г', 314.50, '/placeholder-product.png'),
      (1, 'Протеин 100% Whey Ultimate Nutrition', 'Сывороточный протеин', '907 г', 147.00, '/placeholder-product.png'),
      (1, 'Протеин SUPER WHEY BigBang', 'Сывороточный протеин', '900 г', 67.00, '/placeholder-product.png'),
      (1, 'Протеин ISO WHEY PROZERO Nutrend', 'Изолят сывороточного протеина', '2250 г', 485.00, '/placeholder-product.png'),
      (2, 'Л-карнитин L-Carnitine 500 mg Fuel-Up', 'Вегетарианские капсулы', '60 вег.капс.', 38.00, '/placeholder-product.png'),
      (2, 'Л-карнитин L-Carnitine 500 mg Fuel-Up', 'Вегетарианские капсулы', '180 вег.капс.', 96.50, '/placeholder-product.png'),
      (2, 'Л-карнитин Acetyl L-Carnitine 500 mg NOW', 'Капсулы', '100 капсул', 105.00, '/placeholder-product.png'),
      (2, 'Л-карнитин Acetyl L-Carnitine 500 mg NOW', 'Капсулы', '50 капсул', 65.00, '/placeholder-product.png'),
      (2, 'Ацетил L-Карнитин Naturalsupp', 'Капсулы', '60 капс.', 45.00, '/placeholder-product.png'),
      (2, 'Напиток «L-Карнитин» BOMBBAR', 'Жидкий L-карнитин', '500 мл', 3.90, '/placeholder-product.png')
    `);
  }
};

export const down = async (client) => {
  await client.query('DELETE FROM products');
};
