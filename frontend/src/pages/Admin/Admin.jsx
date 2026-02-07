import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { useAuth } from '../../contexts/AuthContext';
import { formatPrice } from '../../utils/formatPrice';
import styles from './Admin.module.css';

const API_URL = '/api';
const TOKEN_KEY = 'sport-eda-token';

function getAuthHeaders() {
  const token = localStorage.getItem(TOKEN_KEY);
  return { Authorization: `Bearer ${token}` };
}

export default function Admin() {
  const { user, logout, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersPage, setUsersPage] = useState(1);
  const [usersSearch, setUsersSearch] = useState('');
  const [usersSearchInput, setUsersSearchInput] = useState('');
  const [orders, setOrders] = useState([]);
  const [callbacks, setCallbacks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [newOrderNotify, setNewOrderNotify] = useState(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: usersPage, limit: 20 });
      if (usersSearch) params.set('search', usersSearch);
      const res = await fetch(`${API_URL}/admin/users?${params}`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Ошибка загрузки');
      const data = await res.json();
      setUsers(data.users);
      setUsersTotal(data.total);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [usersPage, usersSearch]);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/admin/orders`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Ошибка загрузки');
      const data = await res.json();
      setOrders(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCallbacks = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/admin/callback-requests`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Ошибка загрузки');
      const data = await res.json();
      setCallbacks(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    const res = await fetch(`${API_URL}/products/categories`);
    const data = await res.json();
    setCategories(data);
  }, []);

  const fetchProducts = useCallback(async () => {
    const res = await fetch(`${API_URL}/products`);
    const data = await res.json();
    setProducts(data);
  }, []);

  useEffect(() => {
    if (tab === 'users') fetchUsers();
    if (tab === 'orders') fetchOrders();
    if (tab === 'callbacks') fetchCallbacks();
    if (tab === 'categories') fetchCategories();
    if (tab === 'products') fetchProducts();
  }, [tab, fetchUsers, fetchOrders, fetchCallbacks, fetchCategories, fetchProducts]);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    const socket = io(window.location.origin, { auth: { token } });
    socket.on('newOrder', async (order) => {
      setNewOrderNotify(order);
      try {
        const res = await fetch(`${API_URL}/admin/orders`, { headers: getAuthHeaders() });
        if (res.ok) {
          const data = await res.json();
          setOrders(data);
        } else {
          setOrders((prev) => [{ ...order, items: [] }, ...prev]);
        }
      } catch {
        setOrders((prev) => [{ ...order, items: [] }, ...prev]);
      }
    });
    return () => socket.disconnect();
  }, []);

  useEffect(() => {
    if (!newOrderNotify) return;
    const t = setTimeout(() => setNewOrderNotify(null), 4000);
    return () => clearTimeout(t);
  }, [newOrderNotify]);

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    const form = e.target;
    const name = form.name.value.trim();
    const slug = (form.slug.value.trim() || name.toLowerCase().replace(/\s+/g, '-'));
    if (!name) return;
    setError('');
    try {
      const res = await fetch(`${API_URL}/admin/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ name, slug }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Ошибка');
      form.reset();
      fetchCategories();
    } catch (e) {
      setError(e.message);
    }
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    const form = e.target;
    const category_id = parseInt(form.category_id.value);
    const name = form.name.value.trim();
    const price = parseFloat(form.price.value);
    const description = form.description.value.trim() || null;
    const weight = form.weight.value.trim() || null;
    const imageFile = form.image?.files?.[0];
    if (!category_id || !name || isNaN(price)) return;
    setError('');
    try {
      const body = new FormData();
      body.append('category_id', category_id);
      body.append('name', name);
      body.append('price', price);
      if (description) body.append('description', description);
      if (weight) body.append('weight', weight);
      if (imageFile) body.append('image', imageFile);
      const res = await fetch(`${API_URL}/admin/products`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Ошибка');
      form.reset();
      fetchProducts();
    } catch (e) {
      setError(e.message);
    }
  };

  const handleUpdateProduct = async (e, id) => {
    e.preventDefault();
    const form = e.target;
    const name = form.name.value.trim();
    const price = parseFloat(form.price.value);
    const description = form.description.value.trim() || null;
    const weight = form.weight.value.trim() || null;
    const imageFile = form.image?.files?.[0];
    setError('');
    try {
      if (imageFile) {
        const body = new FormData();
        body.append('name', name);
        body.append('price', price);
        if (description) body.append('description', description);
        if (weight) body.append('weight', weight);
        body.append('image', imageFile);
        const res = await fetch(`${API_URL}/admin/products/${id}`, {
          method: 'PATCH',
          headers: getAuthHeaders(),
          body,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Ошибка');
      } else {
        const image_url = form.image_url?.value?.trim() || null;
        const res = await fetch(`${API_URL}/admin/products/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify({ name, description, weight, price, image_url }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Ошибка');
      }
      fetchProducts();
    } catch (e) {
      setError(e.message);
    }
  };

  const handleUsersSearch = (e) => {
    e.preventDefault();
    setUsersSearch(usersSearchInput.trim());
    setUsersPage(1);
  };

  const tabs = [
    { id: 'users', label: 'Пользователи' },
    { id: 'orders', label: 'Заказы' },
    { id: 'callbacks', label: 'Заявки на звонок' },
    { id: 'categories', label: 'Категории' },
    { id: 'products', label: 'Товары' },
  ];

  return (
    <main className={styles.main}>
      <div className={styles.dashboard}>
        <div className={styles.header}>
          <span className={styles.logo}>APanel</span>
          <div className={styles.headerRight}>
            <Link to="/" className={styles.backLink}>На сайт</Link>
            <button type="button" onClick={() => { logout(); navigate('/'); }} className={styles.logoutBtn}>
              Выйти
            </button>
          </div>
        </div>

        {newOrderNotify && (
          <div className={styles.notify}>
            Новый заказ #{newOrderNotify.id} на {formatPrice(newOrderNotify.total)}
          </div>
        )}

        <nav className={styles.tabs}>
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              className={tab === t.id ? styles.tabActive : styles.tab}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.content}>
          {tab === 'users' && (
            <div className={styles.card}>
              <h2>Пользователи</h2>
              <form onSubmit={handleUsersSearch} className={styles.searchForm}>
                <input
                  type="search"
                  className={styles.searchInput}
                  placeholder="Поиск по email, имени или ID..."
                  value={usersSearchInput}
                  onChange={(e) => setUsersSearchInput(e.target.value)}
                />
                <button type="submit" className={styles.searchBtn}>Найти</button>
                {usersSearch && (
                  <button
                    type="button"
                    className={styles.searchClear}
                    onClick={() => { setUsersSearch(''); setUsersSearchInput(''); setUsersPage(1); }}
                  >
                    Сбросить
                  </button>
                )}
              </form>
              {loading ? (
                <p>Загрузка...</p>
              ) : (
                <>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Email</th>
                        <th>Username</th>
                        <th>Роль</th>
                        <th>Дата</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={u.id}>
                          <td>{u.id}</td>
                          <td>{u.email}</td>
                          <td>{u.username || '-'}</td>
                          <td>{u.role}</td>
                          <td>{u.created_at ? new Date(u.created_at).toLocaleDateString() : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className={styles.pagination}>
                    <button
                      type="button"
                      disabled={usersPage <= 1}
                      onClick={() => setUsersPage((p) => Math.max(1, p - 1))}
                    >
                      Назад
                    </button>
                    <span>Стр. {usersPage} из {Math.ceil(usersTotal / 20) || 1}</span>
                    <button
                      type="button"
                      disabled={usersPage >= Math.ceil(usersTotal / 20)}
                      onClick={() => setUsersPage((p) => p + 1)}
                    >
                      Далее
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {tab === 'orders' && (
            <div className={styles.card}>
              <h2>Заказы</h2>
              {loading ? (
                <p>Загрузка...</p>
              ) : (
                <div className={styles.ordersList}>
                  {orders.length === 0 ? (
                    <p>Заказов пока нет</p>
                  ) : (
                    orders.map((o) => (
                      <details key={o.id} className={styles.orderCard}>
                        <summary>
                          Заказ #{o.id} — {o.username || o.email || 'Пользователь'} — {formatPrice(o.total)} — {new Date(o.created_at).toLocaleString()}
                        </summary>
                        <div className={styles.orderDetails}>
                          {o.address && <p><strong>Адрес:</strong> {o.address}</p>}
                          {o.phone && <p><strong>Телефон:</strong> {o.phone}</p>}
                          <p><strong>Товары:</strong></p>
                          <ul>
                            {o.items?.map((it) => (
                              <li key={it.id}>{it.name} x {it.quantity} = {formatPrice(it.price * it.quantity)}</li>
                            ))}
                          </ul>
                        </div>
                      </details>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {tab === 'callbacks' && (
            <div className={styles.card}>
              <h2>Заявки на звонок</h2>
              {loading ? (
                <p>Загрузка...</p>
              ) : callbacks.length === 0 ? (
                <p>Заявок пока нет</p>
              ) : (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Имя</th>
                      <th>Телефон</th>
                      <th>Дата и время</th>
                    </tr>
                  </thead>
                  <tbody>
                    {callbacks.map((c) => (
                      <tr key={c.id}>
                        <td>{c.id}</td>
                        <td>{c.name || '—'}</td>
                        <td><a href={`tel:${c.phone}`}>{c.phone}</a></td>
                        <td>{c.created_at ? new Date(c.created_at).toLocaleString('ru-RU') : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {tab === 'categories' && (
            <div className={styles.card}>
              <h2>Добавить категорию</h2>
              <form onSubmit={handleCreateCategory} className={styles.form}>
                <input name="name" placeholder="Название" required />
                <input name="slug" placeholder="Slug (опционально)" />
                <button type="submit">Добавить</button>
              </form>
              <h3 className={styles.subtitle}>Существующие категории</h3>
              <ul className={styles.list}>
                {categories.map((c) => (
                  <li key={c.id}>{c.name} ({c.slug})</li>
                ))}
              </ul>
            </div>
          )}

          {tab === 'products' && (
            <div className={styles.card}>
              <h2>Добавить товар</h2>
              <form onSubmit={handleCreateProduct} className={styles.form}>
                <select name="category_id" required>
                  <option value="">Выберите категорию</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <input name="name" placeholder="Название" required />
                <input name="price" type="number" step="0.01" placeholder="Цена" required />
                <input name="weight" placeholder="Вес (опционально)" />
                <label className={styles.fileLabel}>
                  Картинка товара (опционально):
                  <input name="image" type="file" accept="image/jpeg,image/png,image/webp" className={styles.fileInput} />
                </label>
                <textarea name="description" placeholder="Описание" rows={2} />
                <button type="submit">Добавить</button>
              </form>
              <h3 className={styles.subtitle}>Товары</h3>
              <div className={styles.productsList}>
                {products.map((p) => (
                  <details key={p.id} className={styles.productCard}>
                    <summary>{p.name} — {formatPrice(p.price)}</summary>
                    <form onSubmit={(e) => handleUpdateProduct(e, p.id)} className={styles.form}>
                      <input name="name" defaultValue={p.name} required />
                      <input name="price" type="number" step="0.01" defaultValue={p.price} required />
                      <input name="weight" defaultValue={p.weight || ''} placeholder="Вес" />
                      <label className={styles.fileLabel}>
                        Новая картинка (опционально):
                        <input name="image" type="file" accept="image/jpeg,image/png,image/webp" className={styles.fileInput} />
                      </label>
                      <input name="image_url" defaultValue={p.image_url || ''} placeholder="Или URL изображения" />
                      <textarea name="description" defaultValue={p.description || ''} placeholder="Описание" rows={2} />
                      <button type="submit">Сохранить</button>
                    </form>
                  </details>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
