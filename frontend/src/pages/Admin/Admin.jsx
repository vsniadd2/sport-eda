import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams, Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { formatPrice } from '../../utils/formatPrice';
import { formatDateTime, formatDateTimeLong, formatDate } from '../../utils/formatDate';
import ConfirmModal from '../../components/ConfirmModal/ConfirmModal';
import Loader from '../../components/Loader/Loader';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, Legend,
} from 'recharts';
import styles from './Admin.module.css';

const API_URL = '/api';
const TOKEN_KEY = 'sport-eda-token';

function getAuthHeaders() {
  const token = localStorage.getItem(TOKEN_KEY);
  return { Authorization: `Bearer ${token}` };
}

function getFeedbackAuthorLabel(t) {
  return (t.user_id && (t.username || t.email)) ? `${t.username || t.email} (ID ${t.user_id})` : 'Аноним';
}

const CHART_COLORS = ['#c45c26', '#3b82f6', '#eab308', '#22c55e', '#a84d1f', '#8b5cf6'];

const VISITS_DAY_WINDOW = 7;

/** Максимальный размер одного изображения по проекту: 5 МБ */
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const ADMIN_TABS = ['users', 'orders', 'callbacks', 'feedback', 'reviews', 'catalog', 'visits', 'banners', 'brands', 'stats'];

function buildVisitsChartForDay(selectedVisitDate, visitsByDay) {
  if (!selectedVisitDate || !visitsByDay.length) return [];
  const center = new Date(selectedVisitDate + 'T12:00:00');
  const map = new Map(visitsByDay.map((r) => [r.date, Number(r.count)]));
  const out = [];
  for (let i = -Math.floor(VISITS_DAY_WINDOW / 2); i <= Math.ceil(VISITS_DAY_WINDOW / 2) - 1; i++) {
    const d = new Date(center);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().slice(0, 10);
    out.push({ date: dateStr, count: map.get(dateStr) ?? 0 });
  }
  return out;
}

export default function Admin() {
  useAuth();
  const { notify } = useNotifications();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const tab = ADMIN_TABS.includes(tabParam) ? tabParam : 'users';
  const setTab = (id) => setSearchParams({ tab: id });
  const [catalogSubTab] = useState('categories'); // оставлено для стабильного размера deps, UI — дерево категорий
  const [catalogSearchQuery, setCatalogSearchQuery] = useState('');
  const [expandedCategoryIds, setExpandedCategoryIds] = useState([]);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [addCategoryParentId, setAddCategoryParentId] = useState(null);
  const [addProductModalCategoryId, setAddProductModalCategoryId] = useState(null);
  const [addProductToSubcategory, setAddProductToSubcategory] = useState(false);
  const [addProductSubcategoryId, setAddProductSubcategoryId] = useState(null);
  const [categoryOrderInputs, setCategoryOrderInputs] = useState({});
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
  const [archiveOrders, setArchiveOrders] = useState([]);
  const [ordersSubTab, setOrdersSubTab] = useState('active');
  const [callbacks, setCallbacks] = useState([]);
  const [archiveCallbacks, setArchiveCallbacks] = useState([]);
  const [callbacksSubTab, setCallbacksSubTab] = useState('active');
  const [callbackToggling, setCallbackToggling] = useState(null);
  const [orderPaymentToggling, setOrderPaymentToggling] = useState(null);
  const [orderProcessToggling, setOrderProcessToggling] = useState(null);
  const [feedbackTickets, setFeedbackTickets] = useState([]);
  const [selectedFeedbackId, setSelectedFeedbackId] = useState(null);
  const [feedbackReplyBody, setFeedbackReplyBody] = useState('');
  const [feedbackReplySending, setFeedbackReplySending] = useState(false);
  const [feedbackClosing, setFeedbackClosing] = useState(null);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedStatsMonth, setSelectedStatsMonth] = useState(null);
  const [statsCalendarOpen, setStatsCalendarOpen] = useState(false);
  const statsCalendarRef = useRef(null);
  const [visitsByDay, setVisitsByDay] = useState([]);
  const [visitsTodayCount, setVisitsTodayCount] = useState(0);
  const [selectedVisitDate, setSelectedVisitDate] = useState('');
  const [banners, setBanners] = useState([]);
  const [showAddBannerModal, setShowAddBannerModal] = useState(false);
  const [addBannerFile, setAddBannerFile] = useState(null);
  const [addBannerLinkUrl, setAddBannerLinkUrl] = useState('');
  const [addBannerLabel, setAddBannerLabel] = useState('');
  const [addBannerTitle, setAddBannerTitle] = useState('');
  const [addBannerSubtitle, setAddBannerSubtitle] = useState('');
  const [addBannerButtonText, setAddBannerButtonText] = useState('');
  const [bannerSaving, setBannerSaving] = useState(false);
  const [bannerDeleting, setBannerDeleting] = useState(null);
  const [brands, setBrands] = useState([]);
  const [showAddBrandModal, setShowAddBrandModal] = useState(false);
  const [addBrandName, setAddBrandName] = useState('');
  const [addBrandDescription, setAddBrandDescription] = useState('');
  const [addBrandFile, setAddBrandFile] = useState(null);
  const [brandSaving, setBrandSaving] = useState(false);
  const [brandDeleting, setBrandDeleting] = useState(null);
  const [editingBrandId, setEditingBrandId] = useState(null);
  const [editBrandName, setEditBrandName] = useState('');
  const [editBrandDescription, setEditBrandDescription] = useState('');
  const [editBrandFile, setEditBrandFile] = useState(null);
  const [adminReviews, setAdminReviews] = useState([]);
  const [reviewReplyDrafts, setReviewReplyDrafts] = useState({});
  const [reviewReplySending, setReviewReplySending] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [newOrderNotify, setNewOrderNotify] = useState(null);
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [confirmDeleteCategoryId, setConfirmDeleteCategoryId] = useState(null);
  const [confirmDeleteProductId, setConfirmDeleteProductId] = useState(null);
  const [productSaleChecked, setProductSaleChecked] = useState({});
  const [addProductIsSale, setAddProductIsSale] = useState(false);
  const [addProductSalePrice, setAddProductSalePrice] = useState('');
  const [addProductSalePercent, setAddProductSalePercent] = useState('');
  const [productSalePrice, setProductSalePrice] = useState({});
  const [productSalePercent, setProductSalePercent] = useState({});
  const [productImagePreviewUrls, setProductImagePreviewUrls] = useState({});
  const [addProductImagePreviewUrls, setAddProductImagePreviewUrls] = useState([]);
  const totalRevenue = stats?.summary != null ? Number(stats.summary.totalRevenue) : null;
  const totalOrders = stats?.summary != null ? Number(stats.summary.totalOrders) : null;
  const averageOrder = stats?.summary != null && stats.summary.totalOrders > 0 ? Number(stats.summary.averageCheck) : null;

  const salesByDayChart = useMemo(() => {
    const raw = stats?.salesByDay || [];
    if (!selectedStatsMonth) return raw;
    const year = selectedStatsMonth.year;
    const month = selectedStatsMonth.month;
    const daysInMonth = new Date(year, month, 0).getDate();
    const map = new Map(raw.map((r) => [String(r.date).slice(0, 10), { ...r, total: Number(r.total) || 0 }]));
    const result = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      result.push(map.get(dateStr) || { date: dateStr, orders_count: 0, total: 0 });
    }
    return result;
  }, [stats?.salesByDay, selectedStatsMonth]);

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

  const fetchOrders = useCallback(async (archive = false) => {
    setLoading(true);
    setError('');
    try {
      const url = archive ? `${API_URL}/admin/orders?archive=1` : `${API_URL}/admin/orders`;
      const res = await fetch(url, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Ошибка загрузки');
      const data = await res.json();
      if (archive) setArchiveOrders(data);
      else setOrders(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCallbacks = useCallback(async (archive = false) => {
    setLoading(true);
    setError('');
    try {
      const url = archive ? `${API_URL}/admin/callback-requests?archive=1` : `${API_URL}/admin/callback-requests`;
      const res = await fetch(url, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Ошибка загрузки');
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      if (archive) setArchiveCallbacks(list);
      else setCallbacks(list);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchVisits = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/admin/visits`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Ошибка загрузки');
      const data = await res.json();
      setVisitsByDay(Array.isArray(data.visitsByDay) ? data.visitsByDay : []);
      setVisitsTodayCount(Number(data.todayCount) || 0);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchBanners = useCallback(async () => {
    setError('');
    try {
      const res = await fetch(`${API_URL}/admin/banners`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Ошибка загрузки');
      const data = await res.json();
      setBanners(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  const fetchBrands = useCallback(async () => {
    setError('');
    try {
      const res = await fetch(`${API_URL}/admin/brands`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Ошибка загрузки');
      const data = await res.json();
      setBrands(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  const handleAddBanner = useCallback(async (e) => {
    e.preventDefault();
    if (!addBannerFile) {
      notify('Загрузите изображение', 'error');
      return;
    }
    if (addBannerFile.size > MAX_IMAGE_SIZE) {
      notify('Размер изображения не более 5 МБ', 'error');
      return;
    }
    setBannerSaving(true);
    try {
      const formData = new FormData();
      formData.append('image', addBannerFile);
      formData.append('link_url', addBannerLinkUrl.trim());
      const titleLines = [addBannerLabel.trim(), addBannerTitle.trim(), addBannerSubtitle.trim(), addBannerButtonText.trim()];
      formData.append('title', titleLines.join('\n'));
      formData.append('sort_order', String(banners.length));
      const res = await fetch(`${API_URL}/admin/banners`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData,
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.message || 'Ошибка сохранения');
      }
      setShowAddBannerModal(false);
      setAddBannerFile(null);
      setAddBannerLinkUrl('');
      setAddBannerLabel('');
      setAddBannerTitle('');
      setAddBannerSubtitle('');
      setAddBannerButtonText('');
      notify('Баннер добавлен');
      fetchBanners();
    } catch (err) {
      notify(err.message || 'Ошибка', 'error');
    } finally {
      setBannerSaving(false);
    }
  }, [addBannerFile, addBannerLinkUrl, addBannerLabel, addBannerTitle, addBannerSubtitle, addBannerButtonText, banners.length, notify, fetchBanners]);

  const handleDeleteBanner = useCallback(async (id) => {
    setBannerDeleting(id);
    try {
      const res = await fetch(`${API_URL}/admin/banners/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Ошибка удаления');
      notify('Баннер удалён');
      fetchBanners();
    } catch (err) {
      notify(err.message || 'Ошибка', 'error');
    } finally {
      setBannerDeleting(null);
    }
  }, [notify, fetchBanners]);

  const handleAddBrand = useCallback(async (e) => {
    e.preventDefault();
    const name = addBrandName.trim();
    if (!name) {
      notify('Введите название бренда', 'error');
      return;
    }
    if (addBrandFile && addBrandFile.size > MAX_IMAGE_SIZE) {
      notify('Размер изображения не более 5 МБ', 'error');
      return;
    }
    setBrandSaving(true);
    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('description', addBrandDescription.trim());
      if (addBrandFile) formData.append('image', addBrandFile);
      const res = await fetch(`${API_URL}/admin/brands`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData,
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.message || 'Ошибка сохранения');
      }
      setShowAddBrandModal(false);
      setAddBrandName('');
      setAddBrandDescription('');
      setAddBrandFile(null);
      notify('Бренд добавлен');
      fetchBrands();
    } catch (err) {
      notify(err.message || 'Ошибка', 'error');
    } finally {
      setBrandSaving(false);
    }
  }, [addBrandName, addBrandDescription, addBrandFile, notify, fetchBrands]);

  const handleEditBrand = useCallback(async (e) => {
    e.preventDefault();
    if (editingBrandId == null) return;
    const name = editBrandName.trim();
    if (!name) {
      notify('Введите название бренда', 'error');
      return;
    }
    if (editBrandFile && editBrandFile.size > MAX_IMAGE_SIZE) {
      notify('Размер изображения не более 5 МБ', 'error');
      return;
    }
    setBrandSaving(true);
    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('description', editBrandDescription.trim());
      if (editBrandFile) formData.append('image', editBrandFile);
      const res = await fetch(`${API_URL}/admin/brands/${editingBrandId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: formData,
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.message || 'Ошибка сохранения');
      }
      setEditingBrandId(null);
      setEditBrandName('');
      setEditBrandDescription('');
      setEditBrandFile(null);
      notify('Бренд обновлён');
      fetchBrands();
    } catch (err) {
      notify(err.message || 'Ошибка', 'error');
    } finally {
      setBrandSaving(false);
    }
  }, [editingBrandId, editBrandName, editBrandDescription, editBrandFile, notify, fetchBrands]);

  const handleDeleteBrand = useCallback(async (id) => {
    setBrandDeleting(id);
    try {
      const res = await fetch(`${API_URL}/admin/brands/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Ошибка удаления');
      notify('Бренд удалён');
      fetchBrands();
    } catch (err) {
      notify(err.message || 'Ошибка', 'error');
    } finally {
      setBrandDeleting(null);
    }
  }, [notify, fetchBrands]);

  const openEditBrandModal = useCallback((b) => {
    setEditingBrandId(b.id);
    setEditBrandName(b.name || '');
    setEditBrandDescription(b.description || '');
    setEditBrandFile(null);
  }, []);

  const handleBannerMove = useCallback(async (id, direction) => {
    const idx = banners.findIndex((b) => b.id === id);
    if (idx < 0) return;
    const newIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= banners.length) return;
    const reordered = [...banners];
    const [removed] = reordered.splice(idx, 1);
    reordered.splice(newIdx, 0, removed);
    try {
      await Promise.all(
        reordered.map((b, i) =>
          fetch(`${API_URL}/admin/banners/${b.id}`, {
            method: 'PATCH',
            headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ sort_order: i }),
          })
        )
      );
      setBanners(reordered);
      notify('Порядок обновлён');
    } catch (err) {
      notify(err.message || 'Ошибка', 'error');
    }
  }, [banners, notify]);

  const fetchAdminReviews = useCallback(async () => {
    setError('');
    try {
      const res = await fetch(`${API_URL}/admin/reviews`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Ошибка загрузки');
      const data = await res.json();
      setAdminReviews(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  const fetchFeedback = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/admin/feedback`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Ошибка загрузки');
      const data = await res.json();
      setFeedbackTickets(Array.isArray(data) ? data : []);
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
    const res = await fetch(`${API_URL}/admin/products`, { headers: getAuthHeaders() });
    const data = await res.json();
    setProducts(Array.isArray(data) ? data : []);
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
      const params = new URLSearchParams();
      if (selectedStatsMonth?.year != null && selectedStatsMonth?.month != null) {
        params.set('year', String(selectedStatsMonth.year));
        params.set('month', String(selectedStatsMonth.month));
      }
      const url = `${API_URL}/admin/stats${params.toString() ? `?${params.toString()}` : ''}`;
      const res = await fetch(url, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Ошибка загрузки');
      const data = await res.json();
      setStats(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [selectedStatsMonth]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [tab]);

  useEffect(() => {
    if (addProductModalCategoryId != null) {
      setAddProductIsSale(false);
      setAddProductSalePrice('');
      setAddProductSalePercent('');
      const subs = (categories || []).filter((c) => c.parent_id === addProductModalCategoryId).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
      setAddProductToSubcategory(false);
      setAddProductSubcategoryId(subs.length > 0 ? subs[0].id : null);
    }
  }, [addProductModalCategoryId, categories]);

  useEffect(() => {
    const t = setTimeout(() => {
      setUsersSearch(usersSearchInput.trim());
      setUsersPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [usersSearchInput]);

  useEffect(() => {
    if (tab === 'users') fetchUsers();
    if (tab === 'orders') fetchOrders(ordersSubTab === 'archive');
    if (tab === 'callbacks') {
      setLoading(true);
      setError('');
      Promise.all([
        fetch(`${API_URL}/admin/callback-requests`, { headers: getAuthHeaders() }).then((r) => r.ok ? r.json() : []),
        fetch(`${API_URL}/admin/callback-requests?archive=1`, { headers: getAuthHeaders() }).then((r) => r.ok ? r.json() : []),
      ]).then(([data1, data2]) => {
        setCallbacks(Array.isArray(data1) ? data1 : []);
        setArchiveCallbacks(Array.isArray(data2) ? data2 : []);
      }).catch((e) => setError(e.message)).finally(() => setLoading(false));
    }
    if (tab === 'feedback') fetchFeedback();
    if (tab === 'catalog') {
      fetchCategories();
      fetchProducts();
    }
    if (tab === 'reviews') fetchAdminReviews();
    if (tab === 'visits') fetchVisits();
    if (tab === 'banners') {
      setError('');
      fetch(`${API_URL}/admin/banners`, { headers: getAuthHeaders() })
        .then((res) => (res.ok ? res.json() : Promise.reject(new Error('Ошибка загрузки'))))
        .then((data) => setBanners(Array.isArray(data) ? data : []))
        .catch((e) => setError(e.message));
    }
    if (tab === 'brands') fetchBrands();
  }, [tab, ordersSubTab, catalogSubTab, fetchUsers, fetchOrders, fetchFeedback, fetchAdminReviews, fetchVisits, fetchCategories, fetchProducts, fetchBrands]);

  useEffect(() => {
    if (tab === 'stats') fetchStats();
  }, [tab, selectedStatsMonth, fetchStats]);

  useEffect(() => {
    if (!statsCalendarOpen) return;
    const handleClickOutside = (e) => {
      if (statsCalendarRef.current && !statsCalendarRef.current.contains(e.target)) {
        setStatsCalendarOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [statsCalendarOpen]);

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
      fetchStats();
    });
    socket.on('catalogChanged', () => {
      fetchCategories();
      fetchProducts();
    });
    socket.on('newCallback', (data) => {
      setCallbacks((prev) => [data, ...prev]);
    });
    socket.on('feedbackNewTicket', fetchFeedback);
    socket.on('feedbackNewMessage', fetchFeedback);
    return () => socket.disconnect();
  }, [fetchCategories, fetchProducts, fetchStats, fetchFeedback]);

  useEffect(() => {
    if (!newOrderNotify) return;
    const t = setTimeout(() => setNewOrderNotify(null), 4000);
    return () => clearTimeout(t);
  }, [newOrderNotify]);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key !== 'Escape') return;
      if (confirmDeleteOpen) setConfirmDeleteOpen(false);
      else if (confirmDeleteCategoryId != null) setConfirmDeleteCategoryId(null);
      else if (confirmDeleteProductId != null) setConfirmDeleteProductId(null);
      else if (userDetail) setSelectedUserId(null);
      else if (showAddCategoryModal) setShowAddCategoryModal(false);
      else if (addProductModalCategoryId != null) {
        setAddProductImagePreviewUrls((prev) => { prev.forEach((u) => URL.revokeObjectURL(u)); return []; });
        setAddProductModalCategoryId(null);
      }
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [confirmDeleteOpen, confirmDeleteCategoryId, confirmDeleteProductId, userDetail, showAddCategoryModal, addProductModalCategoryId]);

  const slugFromName = (name) => name.trim().toLowerCase().replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'category';

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    const form = e.target;
    const name = form.name.value.trim();
    const slug = slugFromName(name);
    const parentIdVal = form.parent_id?.value?.trim();
    const parent_id = parentIdVal && !Number.isNaN(parseInt(parentIdVal, 10)) ? parseInt(parentIdVal, 10) : null;
    if (!name) return;
    setError('');
    try {
      const res = await fetch(`${API_URL}/admin/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ name, slug, parent_id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Ошибка');
      form.reset();
      setShowAddCategoryModal(false);
      fetchCategories();
      notify('Категория добавлена', 'success');
    } catch (e) {
      setError(e.message);
      notify(e.message, 'error');
    }
  };

  const handleUpdateCategory = async (e, id) => {
    e.preventDefault();
    const form = e.target;
    const name = form.name.value.trim();
    const slug = slugFromName(name);
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
      notify('Категория сохранена', 'success');
    } catch (e) {
      setError(e.message);
      notify(e.message, 'error');
    }
  };

  const handleCategorySortOrderChange = async (id, sortOrder) => {
    setError('');
    try {
      const res = await fetch(`${API_URL}/admin/categories/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ sort_order: sortOrder }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Ошибка');
      setCategoryOrderInputs((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      fetchCategories();
      notify('Порядок сохранён', 'success');
    } catch (e) {
      setError(e.message);
      notify(e.message, 'error');
    }
  };

  const handleCategoryImageUpload = async (categoryId, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_IMAGE_SIZE) {
      notify('Размер изображения не более 5 МБ', 'error');
      e.target.value = '';
      return;
    }
    const formData = new FormData();
    formData.append('image', file);
    try {
      const res = await fetch(`${API_URL}/admin/categories/${categoryId}/image`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Ошибка');
      fetchCategories();
      notify('Изображение категории загружено', 'success');
    } catch (err) {
      notify(err.message, 'error');
    }
    e.target.value = '';
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
      notify('Категория удалена', 'success');
    } catch (e) {
      setError(e.message);
      notify(e.message, 'error');
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
      notify('Товар удалён', 'success');
    } catch (e) {
      setError(e.message);
      notify(e.message, 'error');
    }
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    const form = e.target;
    const subs = (categories || []).filter((c) => c.parent_id === addProductModalCategoryId);
    const useSub = subs.length > 0 && addProductToSubcategory && addProductSubcategoryId;
    const category_id = useSub ? addProductSubcategoryId : addProductModalCategoryId;
    const name = form.name.value.trim();
    const price = parseFloat(form.price.value);
    const description = form.description?.value?.trim() || null;
    const short_description = form.short_description?.value?.trim() || null;
    const weight = form.weight.value.trim() || null;
    if (!category_id || !name || isNaN(price)) return;
    setError('');
    try {
      const body = new FormData();
      body.append('category_id', category_id);
      body.append('name', name);
      body.append('price', price);
      if (description) body.append('description', description);
      if (short_description) body.append('short_description', short_description);
      if (weight) body.append('weight', weight);
      const manufacturerVal = form.manufacturer?.value?.trim();
      if (manufacturerVal !== undefined && manufacturerVal !== '') body.append('manufacturer', manufacturerVal);
      body.append('is_sale', form.is_sale?.checked ? 'true' : 'false');
      body.append('is_hit', form.is_hit?.checked ? 'true' : 'false');
      body.append('is_recommended', form.is_recommended?.checked ? 'true' : 'false');
      body.append('in_stock', form.in_stock?.checked !== false ? 'true' : 'false');
      const qty = form.quantity?.value?.trim() !== '' && !Number.isNaN(parseInt(form.quantity.value, 10)) ? Math.max(0, parseInt(form.quantity.value, 10)) : 0;
      body.append('quantity', String(qty));
      const salePriceVal = addProductIsSale ? (addProductSalePrice || form.sale_price?.value?.trim()) : '';
      if (salePriceVal && !Number.isNaN(parseFloat(salePriceVal))) body.append('sale_price', salePriceVal);
      const imageInput = form.images;
      if (imageInput?.files?.length) {
        for (let i = 0; i < Math.min(10, imageInput.files.length); i++) {
          body.append('images', imageInput.files[i]);
        }
      }
      const res = await fetch(`${API_URL}/admin/products`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Ошибка');
      setAddProductImagePreviewUrls((prev) => {
        prev.forEach((u) => URL.revokeObjectURL(u));
        return [];
      });
      form.reset();
      setAddProductModalCategoryId(null);
      fetchProducts();
      notify('Товар добавлен', 'success');
    } catch (e) {
      setError(e.message);
      notify(e.message, 'error');
    }
  };

  const getProductPageSettingsFromForm = (form) => {
    const short_description = form.short_description?.value?.trim() || '';
    const trust1 = form.trust_badge_1?.value?.trim() || '';
    const trust2 = form.trust_badge_2?.value?.trim() || '';
    const trust3 = form.trust_badge_3?.value?.trim() || '';
    const trust_badges = [trust1, trust2, trust3].filter(Boolean);
    const how_to_use_intro = form.how_to_use_intro?.value?.trim() || '';
    const how_to_use_step1 = form.how_to_use_step1?.value?.trim() || '';
    const how_to_use_step2 = form.how_to_use_step2?.value?.trim() || '';
    const how_to_use_step3 = form.how_to_use_step3?.value?.trim() || '';
    const show_how_to_use = form.show_how_to_use?.checked !== false;
    const show_related = form.show_related?.checked !== false;
    return { short_description, trust_badges, how_to_use_intro, how_to_use_step1, how_to_use_step2, how_to_use_step3, show_how_to_use, show_related };
  };

  const handleUpdateProduct = async (e, id) => {
    e.preventDefault();
    const form = e.target;
    const name = form.name.value.trim();
    const price = parseFloat(form.price.value);
    const description = form.description.value.trim() || null;
    const weight = form.weight.value.trim() || null;
    const category_id = form.category_id ? parseInt(form.category_id.value) : undefined;
    const imageFiles = form.images?.files;
    const hasNewImages = imageFiles?.length > 0;
    const is_sale = form.is_sale?.checked ?? false;
    const is_hit = form.is_hit?.checked ?? false;
    const is_recommended = form.is_recommended?.checked ?? false;
    const pageSettings = getProductPageSettingsFromForm(form);
    setError('');
    try {
      let data;
      if (hasNewImages) {
        const body = new FormData();
        body.append('name', name);
        body.append('price', price);
        body.append('description', description ?? '');
        if (weight) body.append('weight', weight);
        if (category_id) body.append('category_id', category_id);
        const manufacturerVal = form.manufacturer?.value?.trim();
        if (manufacturerVal !== undefined) body.append('manufacturer', manufacturerVal || '');
        body.append('is_sale', is_sale ? 'true' : 'false');
        body.append('is_hit', is_hit ? 'true' : 'false');
        body.append('is_recommended', is_recommended ? 'true' : 'false');
        body.append('in_stock', form.in_stock?.checked !== false ? 'true' : 'false');
        const qtyVal = form.quantity?.value?.trim();
        const qty = qtyVal !== '' && !Number.isNaN(parseInt(qtyVal, 10)) ? Math.max(0, parseInt(qtyVal, 10)) : undefined;
        if (qty !== undefined) body.append('quantity', String(qty));
        const salePriceVal = (productSalePrice[id] ?? form.sale_price?.value?.trim()) || '';
        body.append('sale_price', (is_sale && salePriceVal && !Number.isNaN(parseFloat(salePriceVal))) ? salePriceVal : '');
        body.append('short_description', pageSettings.short_description ?? '');
        body.append('trust_badges', JSON.stringify(pageSettings.trust_badges));
        body.append('how_to_use_intro', pageSettings.how_to_use_intro);
        body.append('how_to_use_step1', pageSettings.how_to_use_step1);
        body.append('how_to_use_step2', pageSettings.how_to_use_step2);
        body.append('how_to_use_step3', pageSettings.how_to_use_step3);
        body.append('show_how_to_use', pageSettings.show_how_to_use ? 'true' : 'false');
        body.append('show_related', pageSettings.show_related ? 'true' : 'false');
        for (let i = 0; i < Math.min(10, imageFiles.length); i++) {
          body.append('images', imageFiles[i]);
        }
        const res = await fetch(`${API_URL}/admin/products/${id}`, {
          method: 'PATCH',
          headers: getAuthHeaders(),
          body,
        });
        data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Ошибка');
      } else {
        const salePriceRaw = (productSalePrice[id] ?? form.sale_price?.value?.trim()) || '';
        const sale_price = salePriceRaw !== '' && !Number.isNaN(parseFloat(salePriceRaw)) ? parseFloat(salePriceRaw) : null;
        const payload = { name, description, weight, price, sale_price, is_sale, is_hit, is_recommended, ...pageSettings };
        if (form.in_stock !== undefined) payload.in_stock = form.in_stock.checked;
        if (category_id) payload.category_id = category_id;
        const qtyVal = form.quantity?.value?.trim();
        if (qtyVal !== '' && !Number.isNaN(parseInt(qtyVal, 10))) payload.quantity = Math.max(0, parseInt(qtyVal, 10));
        const manufacturerVal = form.manufacturer?.value?.trim();
        if (manufacturerVal !== undefined) payload.manufacturer = manufacturerVal === '' ? null : manufacturerVal;
        const res = await fetch(`${API_URL}/admin/products/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify(payload),
        });
        data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Ошибка');
      }
      if (data && (data.has_image !== undefined || data.image_count !== undefined)) {
        setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, has_image: data.has_image, image_count: data.image_count } : p)));
      }
      setProductImagePreviewUrls((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      fetchProducts();
      notify('Товар сохранён', 'success');
    } catch (e) {
      setError(e.message);
      notify(e.message, 'error');
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
      notify('Данные пользователя сохранены', 'success');
    } catch (e) {
      setError(e.message);
      notify(e.message, 'error');
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
      notify('Пользователь удалён', 'success');
    } catch (e) {
      setError(e.message);
      notify(e.message, 'error');
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
      const archiveRes = await fetch(`${API_URL}/admin/callback-requests?archive=1`, { headers: getAuthHeaders() });
      const archiveData = await archiveRes.json();
      setArchiveCallbacks(Array.isArray(archiveData) ? archiveData : []);
      notify('Заявка отмечена как обработанная', 'success');
    } catch (e) {
      setError(e.message);
      notify(e.message, 'error');
    } finally {
      setCallbackToggling(null);
    }
  };

  const handleOrderPaymentToggle = async (orderId, currentlyPaid) => {
    setOrderPaymentToggling(orderId);
    setError('');
    try {
      const res = await fetch(`${API_URL}/admin/orders/${orderId}/payment`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ paid: !currentlyPaid }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Ошибка');
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, payment_status: data.payment_status, paid_at: data.paid_at } : o)));
      notify(currentlyPaid ? 'Отметка об оплате снята' : 'Заказ помечен как оплаченный', 'success');
      fetchOrders(false);
      fetchOrders(true);
    } catch (e) {
      setError(e.message);
      notify(e.message, 'error');
    } finally {
      setOrderPaymentToggling(null);
    }
  };

  const handleOrderProcessToggle = async (orderId, currentlyProcessed) => {
    setOrderProcessToggling(orderId);
    setError('');
    try {
      const res = await fetch(`${API_URL}/admin/orders/${orderId}/process`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ processed: !currentlyProcessed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Ошибка');
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, processed_at: data.processed_at } : o)));
      notify(currentlyProcessed ? 'Отметка «Обработка» снята' : 'Заказ отмечен как обработанный', 'success');
    } catch (e) {
      setError(e.message);
      notify(e.message, 'error');
    } finally {
      setOrderProcessToggling(null);
    }
  };

  const handleFeedbackReply = async (ticketId) => {
    const bodyTrim = feedbackReplyBody.trim();
    if (!bodyTrim) return;
    setFeedbackReplySending(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/admin/feedback/${ticketId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ body: bodyTrim }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Ошибка');
      setFeedbackReplyBody('');
      setFeedbackTickets((prev) => prev.map((t) => (t.id === ticketId ? { ...t, messages: [...(t.messages || []), data] } : t)));
      notify('Ответ отправлен', 'success');
    } catch (e) {
      setError(e.message);
      notify(e.message, 'error');
    } finally {
      setFeedbackReplySending(false);
    }
  };

  const handleFeedbackClose = async (ticketId) => {
    setFeedbackClosing(ticketId);
    setError('');
    try {
      const res = await fetch(`${API_URL}/admin/feedback/${ticketId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!res.ok && res.status !== 204) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Ошибка');
      }
      setFeedbackTickets((prev) => prev.filter((t) => t.id !== ticketId));
      if (selectedFeedbackId === ticketId) setSelectedFeedbackId(null);
      notify('Тикет закрыт и удалён', 'success');
    } catch (e) {
      setError(e.message);
      notify(e.message, 'error');
    } finally {
      setFeedbackClosing(null);
    }
  };

  const handleReviewReply = async (reviewId) => {
    const draft = reviewReplyDrafts[reviewId];
    const text = typeof draft === 'string' ? draft.trim() : '';
    setReviewReplySending(reviewId);
    setError('');
    try {
      const res = await fetch(`${API_URL}/admin/reviews/${reviewId}/reply`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ reply: text || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Ошибка');
      setAdminReviews((prev) => prev.map((r) => (r.id === reviewId ? { ...r, admin_reply: data.admin_reply, admin_replied_at: data.admin_replied_at } : r)));
      setReviewReplyDrafts((prev) => ({ ...prev, [reviewId]: '' }));
      notify('Ответ на отзыв сохранён', 'success');
    } catch (e) {
      setError(e.message);
      notify(e.message, 'error');
    } finally {
      setReviewReplySending(null);
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

  const catalogSearchLower = catalogSearchQuery.trim().toLowerCase();
  const filteredCatalog = useMemo(() => {
    if (!catalogSearchLower) {
      return {
        categories: categories,
        productsByCategory,
      };
    }
    const filteredCats = categories.filter((c) => {
      const catMatch = c.name.toLowerCase().includes(catalogSearchLower);
      const productsInCat = productsByCategory[c.id] || [];
      const hasMatchingProduct = productsInCat.some((p) => p.name.toLowerCase().includes(catalogSearchLower));
      return catMatch || hasMatchingProduct;
    });
    const filteredByCat = {};
    filteredCats.forEach((c) => {
      const productsInCat = productsByCategory[c.id] || [];
      filteredByCat[c.id] = productsInCat.filter((p) => p.name.toLowerCase().includes(catalogSearchLower));
    });
    return { categories: filteredCats, productsByCategory: filteredByCat };
  }, [categories, productsByCategory, catalogSearchLower]);

  const catalogTreeRoots = useMemo(() => {
    return filteredCatalog.categories
      .filter((c) => !c.parent_id)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  }, [filteredCatalog]);

  const catalogDisplayList = useMemo(() => {
    const list = [];
    const cats = filteredCatalog.categories;
    const getSubs = (pid) => cats.filter((c) => c.parent_id === pid).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    catalogTreeRoots.forEach((root) => {
      list.push({ category: root, level: 0 });
      getSubs(root.id).forEach((sub) => list.push({ category: sub, level: 1 }));
    });
    return list;
  }, [filteredCatalog, catalogTreeRoots]);

  const toggleCategoryExpand = (id) => {
    setExpandedCategoryIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleProductImageInputChange = (productId, e) => {
    const files = Array.from(e.target.files || []);
    const tooBig = files.find((f) => f.size > MAX_IMAGE_SIZE);
    if (tooBig) {
      notify('Каждое изображение — не более 5 МБ', 'error');
      e.target.value = '';
      return;
    }
    setProductImagePreviewUrls((prev) => {
      const old = prev[productId] || [];
      old.forEach((url) => URL.revokeObjectURL(url));
      if (!files.length) {
        const next = { ...prev };
        delete next[productId];
        return next;
      }
      const urls = [];
      for (let i = 0; i < Math.min(10, files.length); i++) {
        urls.push(URL.createObjectURL(files[i]));
      }
      return { ...prev, [productId]: urls };
    });
  };

  const handleAddProductImageInputChange = (e) => {
    const files = Array.from(e.target.files || []);
    const tooBig = files.find((f) => f.size > MAX_IMAGE_SIZE);
    if (tooBig) {
      notify('Каждое изображение — не более 5 МБ', 'error');
      e.target.value = '';
      return;
    }
    setAddProductImagePreviewUrls((prev) => {
      prev.forEach((url) => URL.revokeObjectURL(url));
      if (!files.length) return [];
      const urls = [];
      for (let i = 0; i < Math.min(10, files.length); i++) {
        urls.push(URL.createObjectURL(files[i]));
      }
      return urls;
    });
  };

  const previewUrlsRef = useRef({ product: {}, add: [] });
  previewUrlsRef.current.product = productImagePreviewUrls;
  previewUrlsRef.current.add = addProductImagePreviewUrls;
  useEffect(() => {
    return () => {
      Object.values(previewUrlsRef.current.product).flat().forEach((url) => URL.revokeObjectURL(url));
      previewUrlsRef.current.add.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const mainTabs = [
    { id: 'users', label: 'Клиенты' },
    { id: 'orders', label: 'Заказы' },
    { id: 'callbacks', label: 'Заявки на звонок' },
    { id: 'feedback', label: 'Обратная связь' },
    { id: 'reviews', label: 'Отзывы' },
    { id: 'catalog', label: 'Каталог' },
    { id: 'visits', label: 'Посещения' },
    { id: 'banners', label: 'Визуал главная' },
    { id: 'brands', label: 'Бренды' },
    { id: 'stats', label: 'Статистика' },
  ];

  return (
    <main className={styles.main}>
      <div className={styles.dashboard}>
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
                <Loader wrap />
              ) : (
                <>
                  <div className={styles.tableWrap}>
                    <table className={styles.clientsTable}>
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Имя</th>
                          <th>Фамилия</th>
                          <th>Отчество</th>
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
                            <td>{u.id}</td>
                            <td>{u.first_name || u.username || (u.email ? u.email.split('@')[0] : '—')}</td>
                            <td>{u.last_name || '—'}</td>
                            <td>{u.patronymic || '—'}</td>
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
              {userDetail && createPortal(
                <div className={styles.userDetailOverlay} onClick={() => setSelectedUserId(null)}>
                  <div className={styles.userDetailModal} onClick={(e) => e.stopPropagation()}>
                    <div className={styles.userDetailHeader}>
                      <h3>Клиент #{userDetail.id}</h3>
                      <button type="button" className={styles.closeBtn} onClick={() => setSelectedUserId(null)} aria-label="Закрыть">×</button>
                    </div>
                    <p className={styles.userDetailMeta}>Зарегистрирован: {formatDateTimeLong(userDetail.created_at) || '—'}</p>
                    <form onSubmit={handleSaveUser} className={styles.form + ' ' + styles.userDetailForm}>
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
                </div>,
                document.body
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
              <div className={styles.ordersHeader}>
                <h2>Заказы</h2>
                <div className={styles.ordersSubTabs}>
                  <button
                    type="button"
                    className={ordersSubTab === 'active' ? styles.ordersSubTabActive : ''}
                    onClick={() => setOrdersSubTab('active')}
                  >
                    Заказы
                  </button>
                  <button
                    type="button"
                    className={ordersSubTab === 'archive' ? styles.ordersSubTabActive : ''}
                    onClick={() => setOrdersSubTab('archive')}
                  >
                    Архив
                  </button>
                </div>
              </div>
              {loading ? (
                <Loader wrap />
              ) : (
                <div className={styles.ordersList}>
                  {(ordersSubTab === 'archive' ? archiveOrders : orders).length === 0 ? (
                    <p>{ordersSubTab === 'archive' ? 'В архиве пока нет заказов' : 'Заказов пока нет'}</p>
                  ) : (
                    (ordersSubTab === 'archive' ? archiveOrders : orders).map((o) => (
                      <details key={o.id} className={styles.orderCard}>
                        <summary>
                          Заказ #{o.id} — {o.username || o.email || 'Пользователь'} — {formatPrice(o.total)} — {formatDateTime(o.created_at)}
                          {o.payment_method === 'on_delivery' && <span className={styles.orderBadge}>при получении</span>}
                          {o.payment_method === 'card' && (o.payment_status === 'paid' ? <span className={styles.orderBadgePaid}>оплачен</span> : <span className={styles.orderBadgePending}>ожидается оплата</span>)}
                        </summary>
                        <div className={styles.orderDetails}>
                          {o.address && <p><strong>Комментарий / контакт:</strong> {o.address}</p>}
                          {o.phone && <p><strong>Телефон:</strong> {o.phone}</p>}
                          <p><strong>Способ оплаты:</strong> {o.payment_method === 'card' ? 'Оплата картой' : 'Оплата при получении'}</p>
                          <p>
                            <strong>Оплата:</strong>{' '}
                            {ordersSubTab !== 'archive' ? (
                              <label className={styles.checkLabel}>
                                <input
                                  type="checkbox"
                                  checked={o.payment_status === 'paid'}
                                  disabled={orderPaymentToggling === o.id}
                                  onChange={() => handleOrderPaymentToggle(o.id, o.payment_status === 'paid')}
                                />
                                <span>Оплачен</span>
                              </label>
                            ) : (
                              (o.payment_status === 'paid' ? 'Оплачен' : 'Ожидается')
                            )}
                          </p>
                          <p>
                            <strong>Обработка заказа:</strong>{' '}
                            {ordersSubTab !== 'archive' ? (
                              <label className={styles.checkLabel}>
                                <input
                                  type="checkbox"
                                  checked={!!o.processed_at}
                                  disabled={orderProcessToggling === o.id}
                                  onChange={() => handleOrderProcessToggle(o.id, !!o.processed_at)}
                                />
                                <span>Обработан (готов к выдаче)</span>
                                {o.processed_at && <span className={styles.orderDetailMeta}> {formatDateTime(o.processed_at)}</span>}
                              </label>
                            ) : (
                              o.processed_at ? `Обработан ${formatDateTime(o.processed_at)}` : '—'
                            )}
                          </p>
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
              <p className={styles.cardHint}>Отметьте галочкой, что звонок совершён — заявка попадёт в архив. Обработанные заявки не удаляются.</p>
              <div className={styles.ordersSubTabs}>
                <button type="button" className={callbacksSubTab === 'active' ? styles.ordersSubTabActive : ''} onClick={() => setCallbacksSubTab('active')}>Активные</button>
                <button type="button" className={callbacksSubTab === 'archive' ? styles.ordersSubTabActive : ''} onClick={() => setCallbacksSubTab('archive')}>Архив</button>
              </div>
              {loading ? (
                <Loader wrap />
              ) : (callbacksSubTab === 'archive' ? archiveCallbacks : callbacks).length === 0 ? (
                <p>{callbacksSubTab === 'archive' ? 'В архиве пока нет заявок' : 'Заявок пока нет'}</p>
              ) : callbacksSubTab === 'archive' ? (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Имя</th>
                      <th>Телефон</th>
                      <th>Дата заявки</th>
                      <th>Обработан</th>
                    </tr>
                  </thead>
                  <tbody>
                    {archiveCallbacks.map((c) => (
                      <tr key={c.id}>
                        <td>{c.id}</td>
                        <td>{c.name || '—'}</td>
                        <td><a href={`tel:${c.phone}`} className={styles.phoneLink}>{c.phone}</a></td>
                        <td>{formatDateTime(c.created_at) || '—'}</td>
                        <td>{formatDateTime(c.completed_at) || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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

          {tab === 'feedback' && (
            <div className={styles.card + ' ' + styles.cardFullWidth}>
              <h2>Обратная связь</h2>
              <p className={styles.cardHint}>Тикеты от пользователей. Ответьте на обращение — пользователь увидит ответ в разделе «Обратная связь» в личном кабинете. Закрытие тикета удаляет его.</p>
              {loading ? (
                <Loader wrap />
              ) : feedbackTickets.length === 0 ? (
                <p>Обращений пока нет.</p>
              ) : (
                <div className={styles.ordersList}>
                  {feedbackTickets.map((t) => (
                    <details key={t.id} className={styles.orderCard} open={selectedFeedbackId === t.id}>
                      <summary onClick={(e) => { e.preventDefault(); setSelectedFeedbackId(selectedFeedbackId === t.id ? null : t.id); setFeedbackReplyBody(''); }}>
                        Тикет #{t.id} — {getFeedbackAuthorLabel(t)} — {formatDateTime(t.created_at)}
                        {t.messages?.[0]?.body && (
                          <span className={styles.orderDetailMeta}> — {t.messages[0].body.length > 50 ? t.messages[0].body.slice(0, 50) + '…' : t.messages[0].body}</span>
                        )}
                      </summary>
                      <div className={styles.orderDetails}>
                        <p><strong>Пользователь:</strong> {getFeedbackAuthorLabel(t)}</p>
                        <p><strong>Переписка:</strong></p>
                        <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0 16px' }}>
                          {t.messages?.map((msg) => (
                            <li key={msg.id} style={{ marginBottom: 12, padding: '10px 12px', background: msg.author === 'admin' ? '#f1f5f9' : '#fff7ed', borderRadius: 8 }}>
                              <span style={{ fontSize: 12, color: '#64748b' }}>{msg.author === 'user' ? getFeedbackAuthorLabel(t) : 'Поддержка'} · {formatDateTime(msg.created_at)}</span>
                              <div style={{ marginTop: 4 }}>{msg.body}</div>
                            </li>
                          ))}
                        </ul>
                        <div style={{ marginTop: 16 }}>
                          <textarea
                            placeholder="Введите ответ..."
                            value={selectedFeedbackId === t.id ? feedbackReplyBody : ''}
                            onFocus={() => setSelectedFeedbackId(t.id)}
                            onChange={(e) => setFeedbackReplyBody(e.target.value)}
                            style={{ width: '100%', minHeight: 80, padding: 10, borderRadius: 8, marginBottom: 8, fontFamily: 'inherit' }}
                          />
                          <div className={styles.feedbackActions}>
                            <button
                              type="button"
                              className={styles.feedbackReplyBtn}
                              disabled={feedbackReplySending || !feedbackReplyBody.trim()}
                              onClick={() => handleFeedbackReply(t.id)}
                            >
                              {feedbackReplySending ? 'Отправка...' : 'Ответить'}
                            </button>
                            <button
                              type="button"
                              className={styles.feedbackCloseBtn}
                              disabled={feedbackClosing === t.id}
                              onClick={() => handleFeedbackClose(t.id)}
                            >
                              {feedbackClosing === t.id ? '...' : 'Закрыть тикет'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </details>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'reviews' && (
            <div className={styles.card + ' ' + styles.cardFullWidth}>
              <h2>Отзывы о товарах</h2>
              <p className={styles.cardHint}>Ответьте на отзыв — пользователь увидит ответ на странице товара.</p>
              {adminReviews.length === 0 ? (
                <p>Отзывов пока нет.</p>
              ) : (
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Товар</th>
                        <th>Пользователь</th>
                        <th>Оценка</th>
                        <th>Текст</th>
                        <th>Ответ</th>
                        <th>Действие</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminReviews.map((r) => (
                        <tr key={r.id}>
                          <td>
                            <Link to={`/product/${r.product_id}`} target="_blank" rel="noopener noreferrer" className={styles.reviewProductLink}>
                              {r.product_name || `#${r.product_id}`}
                            </Link>
                          </td>
                          <td>{r.username || `ID ${r.user_id}`}</td>
                          <td>{'★'.repeat(r.rating)}{'☆'.repeat(5 - (r.rating || 0))}</td>
                          <td className={styles.reviewTextCell}>{r.text || '—'}</td>
                          <td className={styles.reviewTextCell}>{r.admin_reply ? r.admin_reply.slice(0, 80) + (r.admin_reply.length > 80 ? '…' : '') : '—'}</td>
                          <td>
                            <div className={styles.reviewReplyRow}>
                              <textarea
                                placeholder="Ответ магазина..."
                                value={reviewReplyDrafts[r.id] ?? r.admin_reply ?? ''}
                                onChange={(e) => setReviewReplyDrafts((prev) => ({ ...prev, [r.id]: e.target.value }))}
                                className={styles.reviewReplyInput}
                                rows={2}
                                onInput={(e) => { const t = e.target; t.style.height = 'auto'; t.style.height = `${t.scrollHeight}px`; }}
                                onFocus={(e) => { const t = e.target; t.style.height = 'auto'; t.style.height = `${t.scrollHeight}px`; }}
                              />
                              <button
                                type="button"
                                className={styles.btnSmall}
                                disabled={reviewReplySending === r.id}
                                onClick={() => handleReviewReply(r.id)}
                              >
                                {reviewReplySending === r.id ? 'Сохранение...' : 'Сохранить'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {tab === 'visits' && (
            <div className={styles.card + ' ' + styles.cardFullWidth}>
              <h2>Посещения по дням</h2>
              <p className={styles.cardHint}>Уникальные посетители по IP в день. За последние 30 дней.</p>
              {loading ? (
                <Loader wrap />
              ) : (
                <>
                  {(() => {
                    const selectedRow = selectedVisitDate ? visitsByDay.find((r) => r.date === selectedVisitDate || (r.date && r.date.slice(0, 10) === selectedVisitDate)) : null;
                    const selectedCount = selectedRow ? Number(selectedRow.count) : null;
                    const visitsChartForDay = buildVisitsChartForDay(selectedVisitDate, visitsByDay);
                    return (
                      <>
                        <p className={styles.visitsSummary}>
                          <strong>Уникальные посетители по IP за сегодня:</strong> {visitsTodayCount}
                        </p>
                        <div className={styles.visitsDateRow}>
                          <label className={styles.visitsDateLabel}>
                            Посмотреть за день:
                            <DatePicker
                              selected={selectedVisitDate ? new Date(selectedVisitDate + 'T12:00:00') : null}
                              onChange={(date) => setSelectedVisitDate(date ? date.toISOString().slice(0, 10) : '')}
                              dateFormat="dd.MM.yyyy"
                              placeholderText="Выберите дату"
                              className={styles.visitsDateInput}
                              wrapperClassName={styles.visitsDatePickerWrap}
                            />
                          </label>
                          {selectedVisitDate && (
                            <span className={styles.visitsDateResult}>
                              Уникальные посетители по IP за {formatDate(selectedVisitDate)}: {selectedCount !== null ? selectedCount : 'Нет данных за выбранный день'}
                            </span>
                          )}
                        </div>
                        {visitsByDay.length === 0 ? (
                          <p>Нет данных</p>
                        ) : (
                          <>
                            <div className={styles.chartBlock}>
                              <h3 className={styles.visitsChartTitle}>Посещения за последние 30 дней</h3>
                              <div className={styles.chartWrap}>
                                <ResponsiveContainer width="100%" height={300}>
                                  <AreaChart data={visitsByDay} margin={{ top: 16, right: 24, left: 56, bottom: 24 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                    <XAxis dataKey="date" tick={{ fontSize: 12 }} tickFormatter={(v) => (v ? formatDate(v, { day: '2-digit', month: '2-digit' }) : '')} />
                                    <YAxis tick={{ fontSize: 12 }} width={52} />
                                    <Tooltip
                                      contentStyle={{ borderRadius: 8, border: '1px solid var(--color-light-gray)' }}
                                      formatter={(v) => [v, 'Уник. посетителей (IP)']}
                                      labelFormatter={(v) => (v ? formatDate(v) : '')}
                                    />
                                    <Area type="monotone" dataKey="count" stroke="var(--color-primary)" strokeWidth={2} fill="var(--color-primary)" fillOpacity={0.25} dot={{ r: 4 }} name="Уник. посетителей (IP)" />
                                  </AreaChart>
                                </ResponsiveContainer>
                              </div>
                            </div>
                            {selectedVisitDate && visitsChartForDay.length > 0 && (
                              <div className={styles.chartBlock}>
                                <h3 className={styles.visitsChartTitle}>
                                  График за выбранный день: {formatDate(selectedVisitDate)} (неделя вокруг даты)
                                </h3>
                                <div className={styles.chartWrap}>
                                  <ResponsiveContainer width="100%" height={260}>
                                    <BarChart data={visitsChartForDay} margin={{ top: 16, right: 24, left: 56, bottom: 24 }}>
                                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                      <XAxis dataKey="date" tick={{ fontSize: 12 }} tickFormatter={(v) => (v ? formatDate(v, { day: '2-digit', month: '2-digit' }) : '')} />
                                      <YAxis tick={{ fontSize: 12 }} width={52} />
                                      <Tooltip
                                        contentStyle={{ borderRadius: 8, border: '1px solid var(--color-light-gray)' }}
                                        formatter={(v) => [v, 'Уник. посетителей (IP)']}
                                        labelFormatter={(v) => (v ? formatDate(v) : '')}
                                      />
                                      <Bar dataKey="count" fill="var(--color-primary)" radius={[4, 4, 0, 0]} name="Уник. посетителей (IP)" />
                                    </BarChart>
                                  </ResponsiveContainer>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </>
                    );
                  })()}
                </>
              )}
            </div>
          )}

          {tab === 'banners' && (
            <div className={styles.card + ' ' + styles.cardFullWidth}>
              <h2>Баннеры главной страницы</h2>
              <p className={styles.cardHint}>Изображения в карусели на главной. Порядок можно менять стрелками. Ссылка и подпись — по желанию.</p>
              <div className={styles.bannersHeader}>
                <button
                  type="button"
                  className={styles.addCategoryBtn}
                  onClick={() => setShowAddBannerModal(true)}
                >
                  + Добавить баннер
                </button>
              </div>
              {banners.length === 0 ? (
                <p className={styles.emptyHint}>Баннеров пока нет. Добавьте первый — на главной появится карусель.</p>
              ) : (
                <ul className={styles.bannersList}>
                  {banners.map((b, index) => (
                    <li key={b.id} className={styles.bannerRow}>
                      <div className={styles.bannerPreview}>
                        {b.has_image ? (
                          <img src={`/api/home/banners/${b.id}/image`} alt={b.title || ''} />
                        ) : (
                          <span className={styles.bannerNoImage}>Нет изображения</span>
                        )}
                      </div>
                      <div className={styles.bannerMeta}>
                        <span className={styles.bannerOrder}>#{index + 1}</span>
                        {b.title && <span className={styles.bannerTitle}>{b.title}</span>}
                        {b.link_url && <a href={b.link_url} target="_blank" rel="noopener noreferrer" className={styles.bannerLink}>{b.link_url}</a>}
                      </div>
                      <div className={styles.bannerActions}>
                        <button
                          type="button"
                          className={styles.bannerMoveBtn}
                          disabled={index === 0}
                          onClick={() => handleBannerMove(b.id, 'up')}
                          aria-label="Вверх"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className={styles.bannerMoveBtn}
                          disabled={index === banners.length - 1}
                          onClick={() => handleBannerMove(b.id, 'down')}
                          aria-label="Вниз"
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          className={styles.btnDanger}
                          disabled={bannerDeleting === b.id}
                          onClick={() => handleDeleteBanner(b.id)}
                        >
                          {bannerDeleting === b.id ? '…' : 'Удалить'}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {showAddBannerModal && createPortal(
                <div
                className={styles.modalOverlay}
                onMouseDown={(e) => {
                  if (e.target !== e.currentTarget) return;
                  if (!bannerSaving) setShowAddBannerModal(false);
                }}
              >
                  <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
                    <div className={styles.modalHeader}>
                      <h3>Добавить баннер</h3>
                      <button type="button" className={styles.closeBtn} onClick={() => !bannerSaving && setShowAddBannerModal(false)} aria-label="Закрыть">×</button>
                    </div>
                    <form onSubmit={handleAddBanner} className={styles.form + ' ' + styles.modalForm}>
                      <label className={styles.label}>
                        Изображение (обязательно, до 5 МБ)
                        <span className={styles.labelHint}>Рекомендуемый размер: 1920×520 px</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => setAddBannerFile(e.target.files?.[0] || null)}
                          required
                        />
                      </label>
                      <label className={styles.label}>
                        Метка (необязательно)
                        <input
                          type="text"
                          placeholder="Напр. КАТАЛОГ ТОВАРОВ"
                          value={addBannerLabel}
                          onChange={(e) => setAddBannerLabel(e.target.value)}
                        />
                      </label>
                      <label className={styles.label}>
                        Заголовок (необязательно)
                        <input
                          type="text"
                          placeholder="Заголовок баннера"
                          value={addBannerTitle}
                          onChange={(e) => setAddBannerTitle(e.target.value)}
                        />
                      </label>
                      <label className={styles.label}>
                        Описание / подзаголовок (необязательно)
                        <input
                          type="text"
                          placeholder="Описание"
                          value={addBannerSubtitle}
                          onChange={(e) => setAddBannerSubtitle(e.target.value)}
                        />
                      </label>
                      <label className={styles.label}>
                        Текст кнопки (необязательно)
                        <input
                          type="text"
                          placeholder="Напр. В каталог"
                          value={addBannerButtonText}
                          onChange={(e) => setAddBannerButtonText(e.target.value)}
                        />
                      </label>
                      <label className={styles.label}>
                        Ссылка (куда ведёт баннер)
                        <input
                          type="url"
                          placeholder="https://..."
                          value={addBannerLinkUrl}
                          onChange={(e) => setAddBannerLinkUrl(e.target.value)}
                        />
                      </label>
                      <div className={styles.formRowActions}>
                        <button type="submit" disabled={bannerSaving}>{bannerSaving ? 'Сохранение…' : 'Добавить'}</button>
                        <button type="button" className={styles.btnSmallSecondary} onClick={() => !bannerSaving && setShowAddBannerModal(false)}>Отмена</button>
                      </div>
                    </form>
                  </div>
                </div>,
                document.body
              )}
            </div>
          )}

          {tab === 'brands' && (
            <div className={styles.card + ' ' + styles.cardFullWidth}>
              <h2>Бренды</h2>
              <p className={styles.cardHint}>Карточки брендов отображаются на странице «Бренды» (О магазине). Можно добавить изображение и текст.</p>
              <div className={styles.bannersHeader}>
                <button
                  type="button"
                  className={styles.addCategoryBtn}
                  onClick={() => setShowAddBrandModal(true)}
                >
                  + Добавить бренд
                </button>
              </div>
              {brands.length === 0 ? (
                <p className={styles.emptyHint}>Брендов пока нет. Добавьте первый.</p>
              ) : (
                <ul className={styles.bannersList}>
                  {brands.map((b) => (
                    <li key={b.id} className={styles.bannerRow}>
                      <div className={styles.bannerPreview}>
                        {b.has_image ? (
                          <img src={`/api/home/brands/${b.id}/image`} alt={b.name || ''} />
                        ) : (
                          <span className={styles.bannerNoImage}>Нет изображения</span>
                        )}
                      </div>
                      <div className={styles.bannerMeta}>
                        <span className={styles.bannerTitle}>{b.name}</span>
                        {b.description && <span className={styles.bannerLink}>{b.description.slice(0, 80)}{b.description.length > 80 ? '…' : ''}</span>}
                      </div>
                      <div className={styles.bannerActions}>
                        <button
                          type="button"
                          className={styles.editBtn}
                          onClick={() => openEditBrandModal(b)}
                        >
                          Изменить
                        </button>
                        <button
                          type="button"
                          className={styles.btnDanger}
                          disabled={brandDeleting === b.id}
                          onClick={() => handleDeleteBrand(b.id)}
                        >
                          {brandDeleting === b.id ? '…' : 'Удалить'}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {showAddBrandModal && createPortal(
                <div
                  className={styles.modalOverlay}
                  onMouseDown={(e) => {
                    if (e.target !== e.currentTarget) return;
                    if (!brandSaving) setShowAddBrandModal(false);
                  }}
                >
                  <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
                    <div className={styles.modalHeader}>
                      <h3>Добавить бренд</h3>
                      <button type="button" className={styles.closeBtn} onClick={() => !brandSaving && setShowAddBrandModal(false)} aria-label="Закрыть">×</button>
                    </div>
                    <form onSubmit={handleAddBrand} className={styles.form + ' ' + styles.modalForm}>
                      <label className={styles.label}>
                        Название
                        <input
                          type="text"
                          value={addBrandName}
                          onChange={(e) => setAddBrandName(e.target.value)}
                          placeholder="Название бренда"
                          required
                        />
                      </label>
                      <label className={styles.label}>
                        Текст (описание)
                        <textarea
                          value={addBrandDescription}
                          onChange={(e) => setAddBrandDescription(e.target.value)}
                          placeholder="Краткое описание или текст о бренде"
                          rows={3}
                        />
                      </label>
                      <label className={styles.label}>
                        Изображение (необязательно, до 5 МБ)
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => setAddBrandFile(e.target.files?.[0] || null)}
                        />
                      </label>
                      <div className={styles.formRowActions}>
                        <button type="submit" disabled={brandSaving}>{brandSaving ? 'Сохранение…' : 'Добавить'}</button>
                        <button type="button" className={styles.btnSmallSecondary} onClick={() => !brandSaving && setShowAddBrandModal(false)}>Отмена</button>
                      </div>
                    </form>
                  </div>
                </div>,
                document.body
              )}

              {editingBrandId != null && createPortal(
                <div
                  className={styles.modalOverlay}
                  onMouseDown={(e) => {
                    if (e.target !== e.currentTarget) return;
                    if (!brandSaving) setEditingBrandId(null);
                  }}
                >
                  <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
                    <div className={styles.modalHeader}>
                      <h3>Редактировать бренд</h3>
                      <button type="button" className={styles.closeBtn} onClick={() => !brandSaving && setEditingBrandId(null)} aria-label="Закрыть">×</button>
                    </div>
                    <form onSubmit={handleEditBrand} className={styles.form + ' ' + styles.modalForm}>
                      <label className={styles.label}>
                        Название
                        <input
                          type="text"
                          value={editBrandName}
                          onChange={(e) => setEditBrandName(e.target.value)}
                          placeholder="Название бренда"
                          required
                        />
                      </label>
                      <label className={styles.label}>
                        Текст (описание)
                        <textarea
                          value={editBrandDescription}
                          onChange={(e) => setEditBrandDescription(e.target.value)}
                          placeholder="Краткое описание"
                          rows={3}
                        />
                      </label>
                      <label className={styles.label}>
                        Новое изображение (необязательно, до 5 МБ)
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => setEditBrandFile(e.target.files?.[0] || null)}
                        />
                      </label>
                      <div className={styles.formRowActions}>
                        <button type="submit" disabled={brandSaving}>{brandSaving ? 'Сохранение…' : 'Сохранить'}</button>
                        <button type="button" className={styles.btnSmallSecondary} onClick={() => !brandSaving && setEditingBrandId(null)}>Отмена</button>
                      </div>
                    </form>
                  </div>
                </div>,
                document.body
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
              <div className={styles.catalogSearchWrap}>
                <input
                  type="search"
                  className={styles.catalogSearchInput}
                  placeholder="Поиск по категориям и товарам..."
                  value={catalogSearchQuery}
                  onChange={(e) => setCatalogSearchQuery(e.target.value)}
                  aria-label="Поиск по категориям и товарам"
                />
              </div>

              {showAddCategoryModal && (
                <div
                className={styles.modalOverlay}
                onMouseDown={(e) => {
                  if (e.target !== e.currentTarget) return;
                  setShowAddCategoryModal(false);
                }}
              >
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
                        Родительская категория (опционально)
                        <select name="parent_id" className={styles.select}>
                          <option value="">— Без родителя —</option>
                          {(categories || []).filter((c) => !c.parent_id).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)).map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
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
                {catalogDisplayList.map(({ category: c, level }) => {
                  const isExpanded = expandedCategoryIds.includes(c.id);
                  const categoryProducts = filteredCatalog.productsByCategory[c.id] || [];
                  const rowAndContent = (
                    <>
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
                            <button type="submit" className={styles.btnSmall}>Сохранить</button>
                            <button type="button" className={styles.btnSmallSecondary} onClick={() => setEditingCategoryId(null)}>Отмена</button>
                          </form>
                        ) : (
                          <>
                            {c.has_image && (
                              <img src={`/api/products/categories/${c.id}/image`} alt="" className={styles.categoryThumb} />
                            )}
                            <span className={styles.catalogCategoryName}>{c.name}</span>
                            <div className={styles.rowActions} onClick={(e) => e.stopPropagation()}>
                              <label className={styles.catalogOrderLabel}>
                                Порядок
                                <input
                                  type="number"
                                  min="0"
                                  className={styles.catalogOrderInput}
                                  data-category-id={c.id}
                                  value={categoryOrderInputs[c.id] !== undefined ? String(categoryOrderInputs[c.id]) : String(c.sort_order ?? 0)}
                                  onChange={(e) => {
                                    const raw = e.target.value;
                                    const catId = parseInt(e.target.dataset.categoryId, 10);
                                    if (raw === '') {
                                      setCategoryOrderInputs((prev) => { const n = { ...prev }; delete n[catId]; return n; });
                                      return;
                                    }
                                    const v = parseInt(raw, 10);
                                    if (!Number.isNaN(v) && v >= 0 && !Number.isNaN(catId)) setCategoryOrderInputs((prev) => ({ ...prev, [catId]: v }));
                                  }}
                                  onBlur={(e) => {
                                    const catId = parseInt(e.target.dataset.categoryId, 10);
                                    const v = parseInt(e.target.value, 10);
                                    if (!Number.isNaN(catId) && !Number.isNaN(v) && v >= 0) handleCategorySortOrderChange(catId, v);
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  aria-label="Порядок категории (0 — первый)"
                                />
                              </label>
                              <label className={styles.btnImageUpload}>
                                {c.has_image ? 'Изменить фото' : 'Добавить фото'}
                                <input type="file" accept="image/*" onChange={(e) => handleCategoryImageUpload(c.id, e)} hidden />
                              </label>
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
                                  <span>{p.name} — {p.is_sale && p.sale_price != null ? <><span className={styles.priceOld}>{formatPrice(p.price)}</span> {formatPrice(p.sale_price)}</> : formatPrice(p.price)}</span>
                                  <div className={styles.rowActions} onClick={(e) => e.preventDefault()}>
                                    <Link to={`/product/${p.id}`} target="_blank" rel="noopener noreferrer" className={styles.btnSmallSecondary} onClick={(e) => e.stopPropagation()}>Перейти на товар</Link>
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
                                  <label className={styles.label}>Бренд <input name="manufacturer" defaultValue={p.manufacturer ?? ''} placeholder="Например: Optimum Nutrition" /></label>
                                  <label className={styles.label}>Название <input name="name" defaultValue={p.name} required /></label>
                                  <label className={styles.label}>Цена <input name="price" type="number" step="0.01" defaultValue={p.price} required /></label>
                                  <label className={styles.label}>Вес (например 150 гр) <input name="weight" defaultValue={p.weight || ''} placeholder="150 гр" /></label>
                                  <label className={styles.label}>Краткое описание товара <textarea name="short_description" defaultValue={p.short_description || ''} placeholder="Краткое содержание под названием на странице товара" rows={2} className={styles.textareaAutoResize} onInput={(e) => { const t = e.target; t.style.height = 'auto'; t.style.height = `${t.scrollHeight}px`; }} onFocus={(e) => { const t = e.target; t.style.height = 'auto'; t.style.height = `${t.scrollHeight}px`; }} /></label>
                                  <label className={styles.label}>Подробное описание товара <textarea name="description" defaultValue={p.description || ''} placeholder="Полное описание для карточки и блока под фотками" rows={4} className={styles.textareaAutoResize} onInput={(e) => { const t = e.target; t.style.height = 'auto'; t.style.height = `${t.scrollHeight}px`; }} onFocus={(e) => { const t = e.target; t.style.height = 'auto'; t.style.height = `${t.scrollHeight}px`; }} /></label>
                                  {(p.image_count ?? (p.has_image ? 1 : 0)) > 0 && (
                                    <div className={styles.productImagesRow}>
                                      <span className={styles.label}>Текущие фото:</span>
                                      <div className={styles.productThumbs}>
                                        {Array.from({ length: p.image_count ?? (p.has_image ? 1 : 0) }).map((_, i) => (
                                          <img key={i} src={`${API_URL}/products/${p.id}/images/${i}`} alt="" className={styles.productThumb} />
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  <label className={styles.fileInputButton}>
                                    <input name="images" type="file" accept="image/jpeg,image/png,image/webp" className={styles.fileInputHidden} multiple onChange={(e) => handleProductImageInputChange(p.id, e)} />
                                    Выбрать фото (до 10, заменят текущие)
                                  </label>
                                  {(productImagePreviewUrls[p.id]?.length ?? 0) > 0 && (
                                    <div className={styles.productImagesRow}>
                                      <span className={styles.label}>Будут загружены:</span>
                                      <div className={styles.productThumbs}>
                                        {productImagePreviewUrls[p.id].map((url, i) => (
                                          <img key={i} src={url} alt="" className={styles.productThumb} />
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  <div className={styles.checkboxGroup + ' ' + styles.checkboxGroupColumn}>
                                    <label className={styles.checkLabel}>
                                      <input
                                        type="checkbox"
                                        name="is_sale"
                                        checked={(productSaleChecked[p.id] !== undefined ? productSaleChecked[p.id] : !!p.is_sale)}
                                        onChange={(e) => setProductSaleChecked((prev) => ({ ...prev, [p.id]: e.target.checked }))}
                                      />
                                      <span>Акция</span>
                                    </label>
                                    {(productSaleChecked[p.id] !== undefined ? productSaleChecked[p.id] : !!p.is_sale) && (
                                      <>
                                        <label className={styles.label}>
                                          Цена по акции
                                          <input
                                            name="sale_price"
                                            type="number"
                                            step="0.01"
                                            placeholder="Цена по акции"
                                            value={productSalePrice[p.id] ?? (p.sale_price != null ? String(p.sale_price) : '')}
                                            onChange={(e) => {
                                              const v = e.target.value;
                                              setProductSalePrice((prev) => ({ ...prev, [p.id]: v }));
                                              const base = parseFloat(e.target.form?.price?.value);
                                              if (!Number.isNaN(base) && v) {
                                                const sale = parseFloat(v);
                                                if (!Number.isNaN(sale)) setProductSalePercent((prev) => ({ ...prev, [p.id]: String(Math.round((1 - sale / base) * 100)) }));
                                              } else setProductSalePercent((prev) => ({ ...prev, [p.id]: '' }));
                                            }}
                                          />
                                        </label>
                                        <label className={styles.label}>
                                          Процент скидки
                                          <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            step="1"
                                            placeholder="%"
                                            value={productSalePercent[p.id] ?? (p.price && p.sale_price != null ? Math.round((1 - p.sale_price / p.price) * 100) : '')}
                                            onChange={(e) => {
                                              const v = e.target.value;
                                              setProductSalePercent((prev) => ({ ...prev, [p.id]: v }));
                                              const base = parseFloat(e.target.form?.price?.value);
                                              if (!Number.isNaN(base) && v) {
                                                const pct = parseFloat(v);
                                                if (!Number.isNaN(pct)) setProductSalePrice((prev) => ({ ...prev, [p.id]: (base * (1 - pct / 100)).toFixed(2) }));
                                              } else setProductSalePrice((prev) => ({ ...prev, [p.id]: '' }));
                                            }}
                                          />
                                        </label>
                                      </>
                                    )}
                                    <label className={styles.checkLabel}>
                                      <input type="checkbox" name="is_hit" defaultChecked={!!p.is_hit} />
                                      <span>Хит</span>
                                    </label>
                                    <label className={styles.checkLabel}>
                                      <input type="checkbox" name="is_recommended" defaultChecked={!!p.is_recommended} />
                                      <span>Советуем</span>
                                    </label>
                                    <label className={styles.checkLabel}>
                                      <input type="checkbox" name="in_stock" defaultChecked={p.in_stock !== false} />
                                      <span>В наличии</span>
                                    </label>
                                    <label className={styles.label}>
                                      Количество (шт)
                                      <input name="quantity" type="number" min="0" defaultValue={p.quantity ?? 0} placeholder="0" />
                                    </label>
                                  </div>
                                  <details className={styles.pageSettingsDetails}>
                                    <summary className={styles.pageSettingsSummary}>Настройка страницы товара</summary>
                                    <div className={styles.pageSettingsFields}>
                                      <div className={styles.label}>Бейджи доверия (до 3, по одному в строке)</div>
                                      <label className={styles.label}>
                                        Бейдж 1
                                        <input name="trust_badge_1" defaultValue={Array.isArray(p.trust_badges) ? (p.trust_badges[0] || '') : ''} placeholder="Например: Лабораторно проверено" />
                                      </label>
                                      <label className={styles.label}>
                                        Бейдж 2
                                        <input name="trust_badge_2" defaultValue={Array.isArray(p.trust_badges) ? (p.trust_badges[1] || '') : ''} placeholder="Например: Гарантия качества" />
                                      </label>
                                      <label className={styles.label}>
                                        Бейдж 3
                                        <input name="trust_badge_3" defaultValue={Array.isArray(p.trust_badges) ? (p.trust_badges[2] || '') : ''} placeholder="Например: 100% Оригинал" />
                                      </label>
                                      <label className={styles.checkLabel}>
                                        <input type="checkbox" name="show_how_to_use" defaultChecked={p.show_how_to_use !== false} />
                                        <span>Показывать блок «Как использовать»</span>
                                      </label>
                                      <label className={styles.label}>
                                        Текст над шагами (Как использовать)
                                        <input name="how_to_use_intro" defaultValue={p.how_to_use_intro || ''} placeholder="Например: Для лучшего результата следуйте рекомендациям." />
                                      </label>
                                      <label className={styles.label}>
                                        Шаг 1
                                        <input name="how_to_use_step1" defaultValue={p.how_to_use_step1 || ''} placeholder="Текст первого шага" />
                                      </label>
                                      <label className={styles.label}>
                                        Шаг 2
                                        <input name="how_to_use_step2" defaultValue={p.how_to_use_step2 || ''} placeholder="Текст второго шага" />
                                      </label>
                                      <label className={styles.label}>
                                        Шаг 3
                                        <input name="how_to_use_step3" defaultValue={p.how_to_use_step3 || ''} placeholder="Текст третьего шага" />
                                      </label>
                                      <label className={styles.checkLabel}>
                                        <input type="checkbox" name="show_related" defaultChecked={p.show_related !== false} />
                                        <span>Показывать блок «Рекомендуемые товары»</span>
                                      </label>
                                    </div>
                                  </details>
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
                    </>
                  );
                  return (
                    <div key={c.id} className={styles.catalogCategoryBlock + (level === 1 ? ' ' + styles.catalogSubcategoryBlock : '')}>
                      {rowAndContent}
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
                  <div
                    className={styles.modalOverlay}
                    onMouseDown={(e) => {
                      if (e.target !== e.currentTarget) return;
                      setAddProductImagePreviewUrls((prev) => {
                        prev.forEach((u) => URL.revokeObjectURL(u));
                        return [];
                      });
                      setAddProductModalCategoryId(null);
                    }}
                  >
                    <div className={styles.modalBox + ' ' + styles.modalBoxWide} onClick={(e) => e.stopPropagation()}>
                      <div className={styles.modalHeader}>
                        <h3>Добавить товар{cat ? ` в «${cat.name}»` : ''}</h3>
                        <button type="button" className={styles.closeBtn} onClick={() => { setAddProductImagePreviewUrls((prev) => { prev.forEach((u) => URL.revokeObjectURL(u)); return []; }); setAddProductModalCategoryId(null); }} aria-label="Закрыть">×</button>
                      </div>
                      <form onSubmit={handleCreateProduct} className={styles.form + ' ' + styles.modalForm}>
                        <input name="category_id" type="hidden" value={addProductToSubcategory && addProductSubcategoryId ? addProductSubcategoryId : addProductModalCategoryId} readOnly />
                        {(() => {
                          const subs = (categories || []).filter((c) => c.parent_id === addProductModalCategoryId).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
                          if (subs.length === 0) return null;
                          return (
                            <div className={styles.checkboxGroup + ' ' + styles.checkboxGroupColumn}>
                              <label className={styles.checkLabel}>
                                <input type="checkbox" checked={addProductToSubcategory} onChange={(e) => setAddProductToSubcategory(e.target.checked)} />
                                <span>Добавить в подкатегорию</span>
                              </label>
                              {addProductToSubcategory && (
                                <label className={styles.label}>
                                  Подкатегория
                                  <select className={styles.select} value={addProductSubcategoryId ?? ''} onChange={(e) => setAddProductSubcategoryId(e.target.value ? parseInt(e.target.value, 10) : null)}>
                                    {subs.map((s) => (
                                      <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                  </select>
                                </label>
                              )}
                            </div>
                          );
                        })()}
                        <label className={styles.label}>
                          Название товара
                          <input name="name" placeholder="Название товара" required />
                        </label>
                        <label className={styles.label}>
                          Цена
                          <input name="price" type="number" step="0.01" placeholder="0" required />
                        </label>
                        <label className={styles.label}>
                          Вес (опционально, например 150 гр)
                          <input name="weight" placeholder="Например: 150 гр" />
                        </label>
                        <label className={styles.label}>
                          Бренд (опционально)
                          <input name="manufacturer" placeholder="Например: Optimum Nutrition" />
                        </label>
                        <label className={styles.label}>
                          Краткое описание (краткое содержание под названием на странице товара)
                          <textarea
                            name="short_description"
                            placeholder="Необязательно. Если пусто — на странице товара показывается начало подробного описания."
                            rows={2}
                            className={styles.textareaAutoResize}
                            onInput={(e) => { const t = e.target; t.style.height = 'auto'; t.style.height = `${t.scrollHeight}px`; }}
                            onFocus={(e) => { const t = e.target; t.style.height = 'auto'; t.style.height = `${t.scrollHeight}px`; }}
                          />
                        </label>
                        <label className={styles.label}>
                          Подробное описание (текст в блоке под фотографиями на странице товара)
                          <textarea
                            name="description"
                            placeholder="Полное описание товара для блока под галереей и деталей."
                            rows={4}
                            className={styles.textareaAutoResize}
                            onInput={(e) => { const t = e.target; t.style.height = 'auto'; t.style.height = `${t.scrollHeight}px`; }}
                            onFocus={(e) => { const t = e.target; t.style.height = 'auto'; t.style.height = `${t.scrollHeight}px`; }}
                          />
                        </label>
                        <label className={styles.fileInputButton}>
                          <input name="images" type="file" accept="image/jpeg,image/png,image/webp" className={styles.fileInputHidden} id="add-product-image" multiple onChange={handleAddProductImageInputChange} />
                          Выбрать фото (до 10)
                        </label>
                        {addProductImagePreviewUrls.length > 0 && (
                          <div className={styles.productImagesRow}>
                            <span className={styles.label}>Будут загружены:</span>
                            <div className={styles.productThumbs}>
                              {addProductImagePreviewUrls.map((url, i) => (
                                <img key={i} src={url} alt="" className={styles.productThumb} />
                              ))}
                            </div>
                          </div>
                        )}
                        <div className={styles.checkboxGroup + ' ' + styles.checkboxGroupColumn}>
                          <label className={styles.checkLabel}>
                            <input
                              type="checkbox"
                              name="is_sale"
                              checked={addProductIsSale}
                              onChange={(e) => setAddProductIsSale(e.target.checked)}
                            />
                            <span>Акция</span>
                          </label>
                          {addProductIsSale && (
                            <>
                              <label className={styles.label}>
                                Цена по акции
                                <input
                                  name="sale_price"
                                  type="number"
                                  step="0.01"
                                  placeholder="Цена по акции"
                                  required={addProductIsSale}
                                  value={addProductSalePrice}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    setAddProductSalePrice(v);
                                    const form = e.target.form;
                                    const base = parseFloat(form?.price?.value);
                                    if (!Number.isNaN(base) && v) {
                                      const sale = parseFloat(v);
                                      if (!Number.isNaN(sale)) setAddProductSalePercent(String(Math.round((1 - sale / base) * 100)));
                                    } else setAddProductSalePercent('');
                                  }}
                                />
                              </label>
                              <label className={styles.label}>
                                Процент скидки
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="1"
                                  placeholder="%"
                                  value={addProductSalePercent}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    setAddProductSalePercent(v);
                                    const form = e.target.form;
                                    const base = parseFloat(form?.price?.value);
                                    if (!Number.isNaN(base) && v) {
                                      const pct = parseFloat(v);
                                      if (!Number.isNaN(pct)) setAddProductSalePrice((base * (1 - pct / 100)).toFixed(2));
                                    } else setAddProductSalePrice('');
                                  }}
                                />
                              </label>
                            </>
                          )}
                          <label className={styles.checkLabel}>
                            <input type="checkbox" name="is_hit" />
                            <span>Хит</span>
                          </label>
                          <label className={styles.checkLabel}>
                            <input type="checkbox" name="is_recommended" />
                            <span>Советуем</span>
                          </label>
                          <label className={styles.checkLabel}>
                            <input type="checkbox" name="in_stock" defaultChecked />
                            <span>В наличии</span>
                          </label>
                          <label className={styles.label}>
                            Количество (шт)
                            <input name="quantity" type="number" min="0" defaultValue="0" placeholder="0" />
                          </label>
                        </div>
                        <div className={styles.formRowActions}>
                          <button type="submit" className={styles.addProductBtn}>Добавить товар</button>
                          <button type="button" className={styles.btnSmallSecondary} onClick={() => { setAddProductImagePreviewUrls((prev) => { prev.forEach((u) => URL.revokeObjectURL(u)); return []; }); setAddProductModalCategoryId(null); }}>Отмена</button>
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
              <div className={styles.statsMonthPicker} ref={statsCalendarRef}>
                <span className={styles.statsMonthPickerLabel}>Период:</span>
                <button
                  type="button"
                  className={styles.statsCalendarTrigger}
                  onClick={() => setStatsCalendarOpen((v) => !v)}
                  aria-expanded={statsCalendarOpen}
                  aria-haspopup="true"
                >
                  <span className={styles.statsCalendarTriggerText}>
                    {selectedStatsMonth
                      ? `${['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'][selectedStatsMonth.month - 1]} ${selectedStatsMonth.year}`
                      : 'Последние 30 дней'}
                  </span>
                  <svg className={styles.statsCalendarTriggerIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
                  </svg>
                </button>
                {statsCalendarOpen && (
                  <div className={styles.statsMonthDropdown}>
                    <button
                      type="button"
                      className={styles.statsMonthOption + (selectedStatsMonth == null ? ' ' + styles.statsMonthOptionActive : '')}
                      onClick={() => { setSelectedStatsMonth(null); setStatsCalendarOpen(false); }}
                    >
                      Последние 30 дней
                    </button>
                    <div className={styles.statsMonthCalendar}>
                      {[new Date().getFullYear(), new Date().getFullYear() - 1, new Date().getFullYear() - 2].map((y) => (
                        <div key={y} className={styles.statsMonthYearRow}>
                          <span className={styles.statsMonthYearLabel}>{y}</span>
                          <div className={styles.statsMonthGrid}>
                            {[
                              'Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн',
                              'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек',
                            ].map((label, i) => {
                              const m = i + 1;
                              const isActive = selectedStatsMonth?.year === y && selectedStatsMonth?.month === m;
                              return (
                                <button
                                  key={m}
                                  type="button"
                                  className={styles.statsMonthCell + (isActive ? ' ' + styles.statsMonthCellActive : '')}
                                  onClick={() => { setSelectedStatsMonth({ year: y, month: m }); setStatsCalendarOpen(false); }}
                                >
                                  {label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {loading ? (
                <Loader wrap />
              ) : stats ? (
                <>
                  <p className={styles.cardHint}>
                    {selectedStatsMonth
                      ? `За ${['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'][selectedStatsMonth.month - 1]} ${selectedStatsMonth.year}`
                      : 'За последние 30 дней.'}
                  </p>
                  <div className={styles.statsSummaryCharts}>
                    <div className={styles.statChartCard}>
                      <h3 className={styles.statChartTitle}>
                        {selectedStatsMonth ? 'Выручка за месяц' : 'Выручка за 30 дней'}
                      </h3>
                      <div className={styles.statSummaryValue}>{formatPrice(totalRevenue ?? 0)}</div>
                    </div>
                    <div className={styles.statChartCard}>
                      <h3 className={styles.statChartTitle}>Заказов</h3>
                      <div className={styles.statSummaryValue}>{totalOrders ?? 0}</div>
                    </div>
                    <div className={styles.statChartCard}>
                      <h3 className={styles.statChartTitle}>Средний чек</h3>
                      <div className={styles.statSummaryValue}>{formatPrice(averageOrder ?? 0)}</div>
                    </div>
                  </div>
                <div className={styles.statsCharts}>
                  <div className={styles.chartBlock}>
                    <h3 className={styles.chartTitle}>Продажи по дням</h3>
                    <div className={styles.chartWrap}>
                      <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={salesByDayChart} margin={{ top: 16, right: 24, left: 56, bottom: 24 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey="date" tick={{ fontSize: 12 }} tickFormatter={(v) => (v ? formatDate(v, { day: '2-digit', month: '2-digit' }) : '')} />
                          <YAxis tick={{ fontSize: 12 }} width={52} tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))} />
                          <Tooltip
                            contentStyle={{ borderRadius: 8, border: '1px solid var(--color-light-gray)' }}
                            formatter={(v) => [formatPrice(Number(v)), 'Сумма']}
                            labelFormatter={(v) => (v ? formatDate(v) : '')}
                          />
                          <Area type="monotone" dataKey="total" stroke="var(--color-primary)" strokeWidth={2} fill="var(--color-primary)" fillOpacity={0.25} dot={{ r: 4 }} name="Сумма" />
                        </AreaChart>
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
                            formatter={(value, name) => [Number(value).toFixed(0) + ' BYN', name]}
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
                      <ResponsiveContainer width="100%" height={380}>
                        <BarChart data={(stats.byProduct || []).slice(0, 10)} layout="vertical" margin={{ top: 8, right: 56, left: 8, bottom: 8 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)} />
                          <YAxis type="category" dataKey="name" width={200} tick={{ fontSize: 12 }} tickFormatter={(name) => (name && name.length > 28 ? name.slice(0, 27) + '…' : name)} />
                          <Tooltip
                            contentStyle={{ borderRadius: 8, border: '1px solid var(--color-light-gray)' }}
                            formatter={(v) => [formatPrice(Number(v)), 'Выручка']}
                            labelFormatter={(label) => label ?? ''}
                          />
                          <Bar dataKey="total" fill="var(--color-primary)" fillOpacity={1} name="Выручка" radius={[0, 4, 4, 0]} label={{ position: 'right', formatter: (v) => formatPrice(v), fontSize: 11 }} />
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
