import bcrypt from 'bcryptjs';

export const up = async (client) => {
  const check = await client.query(
    "SELECT id FROM users WHERE email = 'admin@gmail.com'"
  );
  if (check.rows.length === 0) {
    const hash = await bcrypt.hash('1', 10);
    await client.query(
      "INSERT INTO users (email, password_hash, role) VALUES ('admin@gmail.com', $1, 'admin')",
      [hash]
    );
    console.log('Admin пользователь создан: admin@gmail.com / 1');
  }
};

export const down = async (client) => {
  await client.query("DELETE FROM users WHERE email = 'admin@gmail.com'");
};
