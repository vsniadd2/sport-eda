import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { useAuth } from '../../contexts/AuthContext';
import { formatPrice } from '../../utils/formatPrice';
import { formatDateTime, formatDateTimeLong, formatDate } from '../../utils/formatDate';
import ConfirmModal from '../../components/ConfirmModal/ConfirmModal';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend,
} from 'recharts';
import styles from './Admin.module.css';

function useAnimatedNumber(ref, value, format = (v) => String(Math.round(v)), emptyText = '0') {
  const objRef = useRef({ value: 0 });
  const animRef = useRef(null);
  useEffect(() => {
    if (ref.current == null) return;
    if (value == null || value === '') {
      if (ref.current) ref.current.textContent = emptyText;
      return;
    }
    const target = Number(value);
    if (Number.isNaN(target)) {
      if (ref.current) ref.current.textContent = emptyText;
      return;
    }
    objRef.current.value = 0;
    ref.current.textContent = format(0);
    let cancelled = false;
    (async () => {
      try {
        const { animate, utils } = await import('https://esm.sh/animejs');
        if (cancelled) return;
        animRef.current = animate(objRef.current, {
          value: target,
          duration: 1400,
          ease: 'outExpo',
          modifier: utils.round(0),
          onUpdate: () => {
            if (ref.current) ref.current.textContent = format(objRef.current.value);
          },
        });
      } catch {
        if (ref.current) ref.current.textContent = format(target);
      }
    })();
    return () => {
      cancelled = true;
      if (animRef.current?.pause) animRef.current.pause();
    };
  }, [value]);
}

const API_URL = '/api';
const TOKEN_KEY = 'sport-eda-token';

function getAuthHeaders() {
  const token = localStorage.getItem(TOKEN_KEY);
  return { Authorization: `Bearer ${token}` };
}

const CHART_COLORS = ['#c45c26', '#3b82f6', '#eab308', '#22c55e', '#a84d1f', '#8b5cf6'];

export default function Admin() {
  const { user, logout, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('users');
  const [catalogSubTab] = useState('categories'); // оставлено для стабильного размера deps, UI — дерево категорий
  const [expandedCategoryIds, setExpandedCategoryIds] = useState([]);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [addProductModalCategoryId, setAddProductModalCategoryId] = useState(null);
  const [users, setUsers] = useState([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersPage, setUsersPage] = useState(1);
  const [usersSearch, setUsersSearch] = useState('');
  const [usersSearchInput, setUsersSearchInput] = useState('');
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [userDetail, setUserDetail] = useState(null);
  const [userEdit, setUserEdit] = useState({ email: '', username: '', role: 'user', first_name: '', last_name: '', patronymic: '' });
  const [userSaving, setUserSaving] = useState(false);
  const [userDeleting, setUserDeleting] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [orders, setOrders] = useState([]);
  const [callbacks, setCallbacks] = useState([]);
  const [callbackToggling, setCallbackToggling] = useState(null);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [newOrderNotify, setNewOrderNotify] = useState(null);
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [confirmDeleteCategoryId, setConfirmDeleteCategoryId] = useState(null);
  const [confirmDeleteProductId, setConfirmDeleteProductId] = useState(null);
  const statRevenueRef = useRef(null);
  const statOrdersRef = useRef(null);
  const statAvgRef = useRef(null);

  const totalRevenue = stats?.summary != null ? Number(stats.summary.totalRevenue) : null;
  const totalOrders = stats?.summary != null ? Number(stats.summary.totalOrders) : null;
  const averageOrder = stats?.summary != null && stats.summary.totalOrders > 0 ? Number(stats.summary.averageCheck) : null;

  useAnimatedNumber(statRevenueRef, totalRevenue, (v) => formatPrice(v), '0');
  useAnimatedNumber(statOrdersRef, totalOrders, (v) => String(Math.round(v)), '0');
  useAnimatedNumber(statAvgRef, averageOrder, (v) => formatPrice(v), '—');

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

  const fetchUserDetail = useCallback(async (id) => {
    if (!id) { setUserDetail(null); setUserEdit({ email: '', username: '', role: 'user', first_name: '', last_name: '', patronymic: '' }); return; }
    setError('');
    try {
      const res = await fetch(`${API_URL}/admin/users/${id}`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Ошибка');
      setUserDetail(data);
      setUserEdit({
        email: data.email || '',
        username: data.username || '',
        role: data.role || 'user',
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        patronymic: data.patronymic || '',
      });
    } catch (e) {
      setError(e.message);
      setUserDetail(null);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/admin/stats`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Ошибка загрузки');
      const data = await res.json();
      setStats(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'users') fetchUsers();
    if (tab === 'orders') fetchOrders();
    if (tab === 'callbacks') fetchCallbacks();
    if (tab === 'catalog') {
      fetchCategories();
      fetchProducts();
    }
    if (tab === 'stats') fetchStats();
  }, [tab, catalogSubTab, fetchUsers, fetchOrders, fetchCallbacks, fetchCategories, fetchProducts, fetchStats]);

  useEffect(() => {
    fetchUserDetail(selectedUserId);
  }, [selectedUserId, fetchUserDetail]);

  useEffect(() => {
    if (userDetail) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [userDetail]);

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
      setShowAddCategoryModal(false);
      fetchCategories();
    } catch (e) {
      setError(e.message);
    }
  };

  const handleUpdateCategory = async (e, id) => {
    e.preventDefault();
    const form = e.target;
    const name = form.name.value.trim();
    const slug = (form.slug.value.trim() || name.toLowerCase().replace(/\s+/g, '-'));
    if (!name) return;
    setError('');
    try {
      const res = await fetch(`${API_URL}/admin/categories/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ name, slug }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Ошибка');
      setEditingCategoryId(null);
      fetchCategories();
    } catch (e) {
      setError(e.message);
    }
  };

  const handleDeleteCategory = async () => {
    if (!confirmDeleteCategoryId) return;
    setError('');
    try {
      const res = await fetch(`${API_URL}/admin/categories/${confirmDeleteCategoryId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = res.status !== 204 ? await res.json() : {};
      if (!res.ok) throw new Error(data.message || 'Ошибка');
      setConfirmDeleteCategoryId(null);
      fetchCategories();
    } catch (e) {
      setError(e.message);
    }
  };

  const handleDeleteProduct = async () => {
    if (!confirmDeleteProductId) return;
    setError('');
    try {
      const res = await fetch(`${API_URL}/admin/products/${confirmDeleteProductId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = res.status !== 204 ? await res.json() : {};
      if (!res.ok) throw new Error(data.message || 'Ошибка');
      setConfirmDeleteProductId(null);
      fetchProducts();
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
      body.append('is_sale', form.is_sale?.checked ? 'true' : 'false');
      body.append('is_hit', form.is_hit?.checked ? 'true' : 'false');
      body.append('is_recommended', form.is_recommended?.checked ? 'true' : 'false');
      if (imageFile) body.append('image', imageFile);
      const res = await fetch(`${API_URL}/admin/products`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Ошибка');
      form.reset();
      setAddProductModalCategoryId(null);
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
    const category_id = form.category_id ? parseInt(form.category_id.value) : undefined;
    const imageFile = form.image?.files?.[0];
    const is_sale = form.is_sale?.checked ?? false;
    const is_hit = form.is_hit?.checked ?? false;
    const is_recommended = form.is_recommended?.checked ?? false;
    setError('');
    try {
      if (imageFile) {
        const body = new FormData();
        body.append('name', name);
        body.append('price', price);
        if (description) body.append('description', description);
        if (weight) body.append('weight', weight);
        if (category_id) body.append('category_id', category_id);
        body.append('is_sale', is_sale ? 'true' : 'false');
        body.append('is_hit', is_hit ? 'true' : 'false');
        body.append('is_recommended', is_recommended ? 'true' : 'false');
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
        const payload = { name, description, weight, price, image_url, is_sale, is_hit, is_recommended };
        if (category_id) payload.category_id = category_id;
        const res = await fetch(`${API_URL}/admin/products/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify(payload),
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

  const handleSaveUser = async (e) => {
    e.preventDefault();
    if (!selectedUserId) return;
    setUserSaving(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/admin/users/${selectedUserId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(userEdit),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Ошибка');
      setUserDetail(data);
      setUserEdit({
        email: data.email || '',
        username: data.username || '',
        role: data.role || 'user',
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        patronymic: data.patronymic || '',
      });
      fetchUsers();
    } catch (e) {
      setError(e.message);
    } finally {
      setUserSaving(false);
    }
  };

  const handleDeleteUser = async () => {
    setConfirmDeleteOpen(false);
    if (!selectedUserId) return;
    setUserDeleting(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/admin/users/${selectedUserId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Ошибка');
      }
      setSelectedUserId(null);
      setUserDetail(null);
      fetchUsers();
    } catch (e) {
      setError(e.message);
    } finally {
      setUserDeleting(false);
    }
  };

  const handleCallbackMark = async (id) => {
    setCallbackToggling(id);
    setError('');
    try {
      const res = await fetch(`${API_URL}/admin/callback-requests/${id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Ошибка');
      setCallbacks((prev) => prev.filter((c) => c.id !== id));
    } catch (e) {
      setError(e.message);
    } finally {
      setCallbackToggling(null);
    }
  };

  const productsByCategory = useMemo(() => {
    const map = {};
    products.forEach((p) => {
      const cid = p.category_id;
      if (!map[cid]) map[cid] = [];
      map[cid].push(p);
    });
    return map;
  }, [products]);

  const toggleCategoryExpand = (id) => {
    setExpandedCategoryIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const mainTabs = [
    { id: 'users', label: 'Клиенты' },
    { id: 'orders', label: 'Заказы' },
    { id: 'callbacks', label: 'Заявки на звонок' },
    { id: 'catalog', label: 'Каталог' },
    { id: 'stats', label: 'Статистика' },
  ];

  return (
    <main className={styles.main}>
      <div className={styles.dashboard}>
        <div className={styles.header}>
          <span className={styles.logo}>APanel</span>
          <nav className={styles.tabs}>
            {mainTabs.map((t) => (
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

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.content}>
          {tab === 'users' && (
            <div className={styles.card + ' ' + styles.cardFullWidth}>
              <h2>Клиенты</h2>
              <form onSubmit={handleUsersSearch} className={styles.searchForm}>
                <label className={`${styles.searchLabel} ${usersSearchInput.trim() ? styles.hasValue : ''}`}>
                  <input
                    type="text"
                    placeholder="Поиск по email, имени или ID..."
                    value={usersSearchInput}
                    onChange={(e) => setUsersSearchInput(e.target.value)}
                    aria-label="Поиск клиентов"
                  />
                  <kbd className={styles.slashIcon} aria-hidden>/</kbd>
                  <span className={styles.searchIcon} aria-hidden>
                    <svg width="18" height="18" viewBox="0 0 56.966 56.966" fill="currentColor" aria-hidden><path d="M55.146 51.887 41.588 37.786A22.926 22.926 0 0 0 46.984 23c0-12.682-10.318-23-23-23s-23 10.318-23 23 10.318 23 23 23c4.761 0 9.298-1.436 13.177-4.162l13.661 14.208c.571.593 1.339.92 2.162.92.779 0 1.518-.297 2.079-.837a3.004 3.004 0 0 0 .083-4.242zM23.984 6c9.374 0 17 7.626 17 17s-7.626 17-17 17-17-7.626-17-17 7.626-17 17-17z"/></svg>
                  </span>
                </label>
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
                  <div className={styles.tableWrap}>
                    <table className={styles.clientsTable}>
                      <thead>
                        <tr>
                          <th>Имя</th>
                          <th>Фамилия</th>
                          <th>Отчество</th>
                          <th>ID</th>
                          <th>Сумма заказов</th>
                          <th>Дата</th>
                          <th className={styles.thAction}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((u) => (
                          <tr
                            key={u.id}
                            className={selectedUserId === u.id ? styles.rowSelected : ''}
                            onClick={() => setSelectedUserId(u.id)}
                          >
                            <td>{u.first_name || u.username || (u.email ? u.email.split('@')[0] : '—')}</td>
                            <td>{u.last_name || '—'}</td>
                            <td>{u.patronymic || '—'}</td>
                            <td>{u.id}</td>
                            <td>{formatPrice(u.total_spent != null ? u.total_spent : 0)}</td>
                            <td>{formatDateTime(u.created_at) || '—'}</td>
                            <td className={styles.tdAction}>
                              <button
                                type="button"
                                className={styles.editBtn}
                                onClick={(e) => { e.stopPropagation(); setSelectedUserId(u.id); }}
                                aria-label="Редактировать"
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
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
              {userDetail && (
                <div className={styles.userDetailOverlay} onClick={() => setSelectedUserId(null)}>
                  <div className={styles.userDetailModal} onClick={(e) => e.stopPropagation()}>
                    <div className={styles.userDetailHeader}>
                      <h3>Клиент #{userDetail.id}</h3>
                      <button type="button" className={styles.closeBtn} onClick={() => setSelectedUserId(null)} aria-label="Закрыть">×</button>
                    </div>
                    <p className={styles.userDetailMeta}>Зарегистрирован: {formatDateTimeLong(userDetail.created_at) || '—'}</p>
                    <form onSubmit={handleSaveUser} className={styles.form}>
                      <label className={styles.label}>
                        Имя
                        <input value={userEdit.first_name} onChange={(e) => setUserEdit((p) => ({ ...p, first_name: e.target.value }))} />
                      </label>
                      <label className={styles.label}>
                        Фамилия
                        <input value={userEdit.last_name} onChange={(e) => setUserEdit((p) => ({ ...p, last_name: e.target.value }))} />
                      </label>
                      <label className={styles.label}>
                        Отчество
                        <input value={userEdit.patronymic} onChange={(e) => setUserEdit((p) => ({ ...p, patronymic: e.target.value }))} />
                      </label>
                      <label className={styles.label}>
                        Email
                        <input type="email" value={userEdit.email} onChange={(e) => setUserEdit((p) => ({ ...p, email: e.target.value }))} />
                      </label>
                      <label className={styles.label}>
                        Имя пользователя
                        <input value={userEdit.username} onChange={(e) => setUserEdit((p) => ({ ...p, username: e.target.value }))} />
                      </label>
                      <label className={styles.label}>
                        Роль
                        <select value={userEdit.role} onChange={(e) => setUserEdit((p) => ({ ...p, role: e.target.value }))} className={styles.select}>
                          <option value="user">user</option>
                          <option value="admin">admin</option>
                        </select>
                      </label>
                      <div className={styles.userDetailActions}>
                        <button type="submit" disabled={userSaving} className={styles.btnPrimary}>{userSaving ? 'Сохранение...' : 'Сохранить'}</button>
                        <button type="button" className={styles.btnDanger} disabled={userDeleting} onClick={() => setConfirmDeleteOpen(true)}>
                          {userDeleting ? 'Удаление...' : 'Удалить'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

        <ConfirmModal
          isOpen={confirmDeleteOpen}
          title="Удалить пользователя?"
          message="Это действие нельзя отменить."
          confirmLabel="Удалить"
          cancelLabel="Отмена"
          danger
          onConfirm={handleDeleteUser}
          onCancel={() => setConfirmDeleteOpen(false)}
        />

          {tab === 'orders' && (
            <div className={styles.card + ' ' + styles.cardFullWidth}>
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
                          Заказ #{o.id} — {o.username || o.email || 'Пользователь'} — {formatPrice(o.total)} — {formatDateTime(o.created_at)}
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
            <div className={styles.card + ' ' + styles.cardFullWidth}>
              <h2>Заявки на звонок</h2>
              <p className={styles.cardHint}>Отметьте галочкой, что звонок совершён — заявка исчезнет из списка. Через 24 часа обработанные заявки удаляются из базы.</p>
              {loading ? (
                <p>Загрузка...</p>
              ) : callbacks.length === 0 ? (
                <p>Заявок пока нет</p>
              ) : (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Сделан звонок</th>
                      <th>ID</th>
                      <th>Имя</th>
                      <th>Телефон</th>
                      <th>Дата и время</th>
                    </tr>
                  </thead>
                  <tbody>
                    {callbacks.map((c) => (
                      <tr key={c.id}>
                        <td>
                          <label className={styles.checkLabel} htmlFor={`cb-callback-${c.id}`}>
                            <span className={styles.checkBox}>
                              <input
                                id={`cb-callback-${c.id}`}
                                type="checkbox"
                                checked={false}
                                onChange={() => handleCallbackMark(c.id)}
                                disabled={callbackToggling === c.id}
                              />
                              <div />
                            </span>
                            <span>{callbackToggling === c.id ? '...' : 'Отметить'}</span>
                          </label>
                        </td>
                        <td>{c.id}</td>
                        <td>{c.name || '—'}</td>
                        <td><a href={`tel:${c.phone}`} className={styles.phoneLink}>{c.phone}</a></td>
                        <td>{formatDateTime(c.created_at) || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {tab === 'catalog' && (
            <div className={styles.card + ' ' + styles.cardFullWidth}>
              <div className={styles.catalogHeader}>
                <h2 className={styles.catalogTitle}>Категории и товары</h2>
                <button
                  type="button"
                  className={styles.addCategoryBtn}
                  onClick={() => setShowAddCategoryModal(true)}
                >
                  + Добавить категорию
                </button>
              </div>
              <p className={styles.catalogHint}>
                Нажмите на категорию — откроются товары. У каждой записи есть кнопки «Изменить» и «Удалить».
              </p>

              {showAddCategoryModal && (
                <div className={styles.modalOverlay} onClick={() => setShowAddCategoryModal(false)}>
                  <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
                    <div className={styles.modalHeader}>
                      <h3>Добавить категорию</h3>
                      <button type="button" className={styles.closeBtn} onClick={() => setShowAddCategoryModal(false)} aria-label="Закрыть">×</button>
                    </div>
                    <form onSubmit={handleCreateCategory} className={styles.form + ' ' + styles.modalForm}>
                      <label className={styles.label}>
                        Название
                        <input name="name" placeholder="Название категории" required />
                      </label>
                      <label className={styles.label}>
                        Slug (опционально)
                        <input name="slug" placeholder="slug-kategorii" />
                      </label>
                      <div className={styles.formRowActions}>
                        <button type="submit">Добавить</button>
                        <button type="button" className={styles.btnSmallSecondary} onClick={() => setShowAddCategoryModal(false)}>Отмена</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              <div className={styles.catalogTree}>
                {categories.map((c) => {
                  const isExpanded = expandedCategoryIds.includes(c.id);
                  const categoryProducts = productsByCategory[c.id] || [];
                  return (
                    <div key={c.id} className={styles.catalogCategoryBlock}>
                      <div
                        className={styles.catalogCategoryRow + (isExpanded ? ' ' + styles.catalogCategoryRowExpanded : '')}
                        onClick={() => toggleCategoryExpand(c.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleCategoryExpand(c.id); } }}
                        aria-expanded={isExpanded}
                      >
                        <span className={styles.catalogExpandIcon} aria-hidden>{isExpanded ? '▼' : '▶'}</span>
                        {editingCategoryId === c.id ? (
                          <form
                            className={styles.formInline}
                            onClick={(e) => e.stopPropagation()}
                            onSubmit={(e) => { handleUpdateCategory(e, c.id); }}
                          >
                            <input name="name" defaultValue={c.name} placeholder="Название" required />
                            <input name="slug" defaultValue={c.slug} placeholder="Slug" />
                            <button type="submit" className={styles.btnSmall}>Сохранить</button>
                            <button type="button" className={styles.btnSmallSecondary} onClick={() => setEditingCategoryId(null)}>Отмена</button>
                          </form>
                        ) : (
                          <>
                            <span className={styles.catalogCategoryName}>{c.name}</span>
                            <div className={styles.rowActions} onClick={(e) => e.stopPropagation()}>
                              <button type="button" className={styles.btnEdit} onClick={() => setEditingCategoryId(c.id)}>Изменить</button>
                              <button type="button" className={styles.btnDangerSmall} onClick={() => setConfirmDeleteCategoryId(c.id)}>Удалить</button>
                            </div>
                          </>
                        )}
                      </div>

                      {isExpanded && (
                        <div className={styles.catalogProducts}>
                          {categoryProducts.length === 0 ? (
                            <div className={styles.catalogEmptyBlock}>
                              <p className={styles.catalogEmpty}>В этой категории пока нет товаров. Добавьте первый ниже.</p>
                            </div>
                          ) : (
                            <h4 className={styles.catalogProductsTitle}>Товары ({categoryProducts.length})</h4>
                          )}

                          {categoryProducts.length > 0 && (
                            categoryProducts.map((p) => (
                              <details key={p.id} className={styles.catalogProductRow}>
                                <summary className={styles.catalogProductSummary}>
                                  <span className={styles.catalogProductExpand}>▶</span>
                                  <span>{p.name} — {formatPrice(p.price)}</span>
                                  <div className={styles.rowActions} onClick={(e) => e.preventDefault()}>
                                    <button type="button" className={styles.btnEdit} onClick={(e) => { e.preventDefault(); e.stopPropagation(); const d = e.currentTarget.closest('details'); if (d) d.open = true; }}>Изменить</button>
                                    <button type="button" className={styles.btnDangerSmall} onClick={(e) => { e.preventDefault(); setConfirmDeleteProductId(p.id); }}>Удалить</button>
                                  </div>
                                </summary>
                                <form onSubmit={(e) => handleUpdateProduct(e, p.id)} className={styles.form + ' ' + styles.catalogProductForm}>
                                  <label className={styles.label}>
                                    Категория
                                    <select name="category_id" className={styles.select} defaultValue={p.category_id}>
                                      {categories.map((cat) => (
                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                      ))}
                                    </select>
                                  </label>
                                  <label className={styles.label}>Название <input name="name" defaultValue={p.name} required /></label>
                                  <label className={styles.label}>Цена <input name="price" type="number" step="0.01" defaultValue={p.price} required /></label>
                                  <label className={styles.label}>Вес <input name="weight" defaultValue={p.weight || ''} placeholder="Вес" /></label>
                                  <label className={styles.fileLabel}>
                                    Новая картинка:
                                    <input name="image" type="file" accept="image/jpeg,image/png,image/webp" className={styles.fileInput} />
                                  </label>
                                  <input name="image_url" defaultValue={p.image_url || ''} placeholder="Или URL изображения" />
                                  <textarea name="description" defaultValue={p.description || ''} placeholder="Описание" rows={2} />
                                  <div className={styles.checkboxGroup}>
                                    <label className={styles.checkLabel}>
                                      <input type="checkbox" name="is_sale" defaultChecked={!!p.is_sale} />
                                      <span>Акция</span>
                                    </label>
                                    <label className={styles.checkLabel}>
                                      <input type="checkbox" name="is_hit" defaultChecked={!!p.is_hit} />
                                      <span>Хит</span>
                                    </label>
                                    <label className={styles.checkLabel}>
                                      <input type="checkbox" name="is_recommended" defaultChecked={!!p.is_recommended} />
                                      <span>Советуем</span>
                                    </label>
                                  </div>
                                  <div className={styles.formRowActions}>
                                    <button type="submit">Сохранить</button>
                                    <button type="button" className={styles.btnDanger} onClick={() => setConfirmDeleteProductId(p.id)}>Удалить товар</button>
                                  </div>
                                </form>
                              </details>
                            ))
                          )}

                          <div className={styles.catalogAddProductSection}>
                            <button
                              type="button"
                              className={styles.addProductBtn}
                              onClick={() => setAddProductModalCategoryId(c.id)}
                            >
                              + Добавить товар
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {categories.length === 0 && !showAddCategoryModal && (
                <p className={styles.catalogEmpty}>Категорий пока нет. Нажмите «+ Добавить категорию».</p>
              )}

              {addProductModalCategoryId != null && (() => {
                const cat = categories.find((x) => x.id === addProductModalCategoryId);
                return (
                  <div className={styles.modalOverlay} onClick={() => setAddProductModalCategoryId(null)}>
                    <div className={styles.modalBox + ' ' + styles.modalBoxWide} onClick={(e) => e.stopPropagation()}>
                      <div className={styles.modalHeader}>
                        <h3>Добавить товар{cat ? ` в «${cat.name}»` : ''}</h3>
                        <button type="button" className={styles.closeBtn} onClick={() => setAddProductModalCategoryId(null)} aria-label="Закрыть">×</button>
                      </div>
                      <form onSubmit={handleCreateProduct} className={styles.form + ' ' + styles.modalForm}>
                        <input name="category_id" type="hidden" value={addProductModalCategoryId} readOnly />
                        <label className={styles.label}>
                          Название товара
                          <input name="name" placeholder="Название товара" required />
                        </label>
                        <label className={styles.label}>
                          Цена
                          <input name="price" type="number" step="0.01" placeholder="0" required />
                        </label>
                        <label className={styles.label}>
                          Вес (опционально)
                          <input name="weight" placeholder="Вес" />
                        </label>
                        <label className={styles.fileLabel}>
                          Картинка
                          <input name="image" type="file" accept="image/jpeg,image/png,image/webp" className={styles.fileInput} />
                        </label>
                        <label className={styles.label}>
                          Описание
                          <textarea name="description" placeholder="Описание" rows={3} />
                        </label>
                        <div className={styles.checkboxGroup}>
                          <label className={styles.checkLabel}>
                            <input type="checkbox" name="is_sale" />
                            <span>Акция</span>
                          </label>
                          <label className={styles.checkLabel}>
                            <input type="checkbox" name="is_hit" />
                            <span>Хит</span>
                          </label>
                          <label className={styles.checkLabel}>
                            <input type="checkbox" name="is_recommended" />
                            <span>Советуем</span>
                          </label>
                        </div>
                        <div className={styles.formRowActions}>
                          <button type="submit" className={styles.addProductBtn}>Добавить товар</button>
                          <button type="button" className={styles.btnSmallSecondary} onClick={() => setAddProductModalCategoryId(null)}>Отмена</button>
                        </div>
                      </form>
                    </div>
                  </div>
                );
              })()}

              <ConfirmModal
                isOpen={confirmDeleteCategoryId != null}
                title="Удалить категорию?"
                message="Категорию можно удалить только если в ней нет товаров."
                confirmLabel="Удалить"
                cancelLabel="Отмена"
                danger
                onConfirm={handleDeleteCategory}
                onCancel={() => setConfirmDeleteCategoryId(null)}
              />
              <ConfirmModal
                isOpen={confirmDeleteProductId != null}
                title="Удалить товар?"
                message="Товар нельзя удалить, если он есть в заказах."
                confirmLabel="Удалить"
                cancelLabel="Отмена"
                danger
                onConfirm={handleDeleteProduct}
                onCancel={() => setConfirmDeleteProductId(null)}
              />
            </div>
          )}

          {tab === 'stats' && (
            <div className={styles.card + ' ' + styles.cardFullWidth}>
              <h2>Статистика</h2>
              <p className={styles.cardHint}>За последние 30 дней.</p>
              {loading ? (
                <p>Загрузка...</p>
              ) : stats ? (
                <>
                  <div className={styles.statsSummary}>
                    <div className={styles.statCard}>
                      <span className={styles.statLabel}>Выручка за 30 дней</span>
                      <code ref={statRevenueRef} className={styles.statValue}>0</code>
                    </div>
                    <div className={styles.statCard}>
                      <span className={styles.statLabel}>Заказов</span>
                      <code ref={statOrdersRef} className={styles.statValue}>0</code>
                    </div>
                    <div className={styles.statCard}>
                      <span className={styles.statLabel}>Средний чек</span>
                      <code ref={statAvgRef} className={styles.statValue}>0</code>
                    </div>
                  </div>
                <div className={styles.statsCharts}>
                  <div className={styles.chartBlock}>
                    <h3 className={styles.chartTitle}>Продажи по дням</h3>
                    <div className={styles.chartWrap}>
                      <ResponsiveContainer width="100%" height={280}>
                        <LineChart data={stats.salesByDay || []} margin={{ top: 16, right: 16, left: 8, bottom: 8 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey="date" tick={{ fontSize: 12 }} tickFormatter={(v) => v ? formatDate(v, { day: '2-digit', month: '2-digit' }) : ''} />
                          <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${v}`} />
                          <Tooltip
                            contentStyle={{ borderRadius: 8, border: '1px solid var(--color-light-gray)' }}
                            formatter={(v) => [Number(v).toFixed(0) + ' ₽', 'Сумма']}
                            labelFormatter={(v) => v ? formatDate(v) : ''}
                          />
                          <Line type="monotone" dataKey="total" stroke="var(--color-primary)" strokeWidth={2} dot={{ r: 4 }} name="Сумма" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className={styles.chartBlock}>
                    <h3 className={styles.chartTitle}>По категориям (doughnut)</h3>
                    <div className={styles.chartWrap}>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                          <Legend layout="horizontal" verticalAlign="top" align="center" wrapperStyle={{ paddingBottom: 16 }} />
                          <Tooltip
                            contentStyle={{ borderRadius: 8, border: '1px solid var(--color-light-gray)' }}
                            formatter={(value, name) => [Number(value).toFixed(0) + ' ₽', name]}
                            itemStyle={{ padding: '4px 0' }}
                          />
                          <Pie
                            data={(stats.byCategory || []).filter((c) => Number(c.total) > 0)}
                            dataKey="total"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={1}
                          >
                            {((stats.byCategory || []).filter((c) => Number(c.total) > 0)).map((_, i) => (
                              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} stroke="#fff" strokeWidth={2} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className={styles.chartBlock}>
                    <h3 className={styles.chartTitle}>Топ товаров по выручке</h3>
                    <div className={styles.chartWrap}>
                      <ResponsiveContainer width="100%" height={320}>
                        <BarChart data={(stats.byProduct || []).slice(0, 10)} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={(v) => `${v}`} />
                          <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11 }} />
                          <Tooltip
                            contentStyle={{ borderRadius: 8, border: '1px solid var(--color-light-gray)' }}
                            formatter={(v) => [Number(v).toFixed(0) + ' ₽', 'Выручка']}
                          />
                          <Bar dataKey="total" fill="var(--color-primary)" name="Выручка" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
                </>
              ) : (
                <p>Нет данных</p>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
