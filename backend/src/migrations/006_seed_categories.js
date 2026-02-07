export const up = async (client) => {
  const check = await client.query('SELECT COUNT(*) FROM categories');
  if (parseInt(check.rows[0].count) === 0) {
    await client.query(`
      INSERT INTO categories (name, slug) VALUES 
      ('Протеины', 'proteiny'),
      ('Л-карнитин', 'l-karnitin')
    `);
  }
};

export const down = async (client) => {
  await client.query('DELETE FROM categories');
};
