import { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import useAuthFetch from '../../hooks/useAuthFetch';
import { useNotifications } from '../../contexts/NotificationContext';
import Loader from '../../components/Loader/Loader';
import styles from './Profile.module.css';

const API_URL = '/api';

const initialEdit = { username: '', first_name: '', last_name: '', patronymic: '' };

function getInitials(profileData, displayName) {
  if (profileData?.first_name && profileData?.last_name) {
    return (profileData.first_name[0] + profileData.last_name[0]).toUpperCase().slice(0, 2);
  }
  if (profileData?.first_name) return profileData.first_name.slice(0, 2).toUpperCase();
  const name = (profileData?.username || displayName || 'U').trim();
  if (name.length >= 2) return name.slice(0, 2).toUpperCase();
  return name[0].toUpperCase();
}

const ICON_GRID = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>
);
const ICON_CART = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" /></svg>
);
const ICON_HEART = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
);
const ICON_ORDERS = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
);
const ICON_USER = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
);
const ICON_LOCK = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
);
const ICON_PENCIL = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
);

const QUICK_ACTIONS = [
  { to: '/catalog', label: 'Каталог', icon: ICON_GRID },
  { to: '/cart', label: 'Корзина', icon: ICON_CART },
  { to: '/favorites', label: 'Избранное', icon: ICON_HEART },
  { to: '/profile/orders', label: 'Мои заказы', icon: ICON_ORDERS },
];

export default function Profile() {
  const { user, updateUser, loading: authLoading } = useAuth();
  const authFetch = useAuthFetch();
  const { notify } = useNotifications();
  const [profileData, setProfileData] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState('');
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState(initialEdit);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setProfileLoading(true);
    setProfileError('');
    authFetch(`${API_URL}/auth/me`)
      .then((r) => {
        if (!r.ok) throw new Error('Не удалось загрузить профиль');
        return r.json();
      })
      .then((data) => {
        if (!cancelled) {
          setProfileData(data);
          setEditForm({
            username: data.username || '',
            first_name: data.first_name || '',
            last_name: data.last_name || '',
            patronymic: data.patronymic || '',
          });
        }
      })
      .catch((e) => { if (!cancelled) setProfileError(e.message); })
      .finally(() => { if (!cancelled) setProfileLoading(false); });
    return () => { cancelled = true; };
  }, [user, authFetch]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaveError('');
    setSaving(true);
    try {
      const res = await authFetch(`${API_URL}/auth/me`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Ошибка сохранения');
      setProfileData(data);
      updateUser(data);
      setEditing(false);
    } catch (e) {
      setSaveError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    if (newPassword !== confirmPassword) {
      setPasswordError('Пароли не совпадают');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('Новый пароль минимум 6 символов');
      return;
    }
    setPasswordSaving(true);
    try {
      const res = await authFetch(`${API_URL}/auth/me`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Ошибка смены пароля');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      notify('Пароль успешно изменён', 'success');
    } catch (e) {
      setPasswordError(e.message);
      notify(e.message, 'error');
    } finally {
      setPasswordSaving(false);
    }
  };

  if (authLoading) {
    return (
      <main className={styles.main}>
        <div className={styles.container}>
          <Loader wrap />
        </div>
      </main>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const displayName = user?.username || user?.email?.split('@')[0] || user?.email || 'Пользователь';
  const initials = getInitials(profileData || user, displayName);

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <nav className={styles.breadcrumb}>
          <Link to="/">Главная</Link>
          <span className={styles.breadcrumbSep}> / </span>
          <span>Мой профиль</span>
        </nav>
        <h1 className={styles.pageTitle}>Мой профиль</h1>

        <div className={styles.profileHero}>
          <div className={styles.profileAvatar} aria-hidden>{initials}</div>
          <div className={styles.profileGreetingWrap}>
            <p className={styles.profileGreeting}>Добро пожаловать, {displayName}!</p>
            <p className={styles.profileGreetingSub}>Управляйте данными и заказами</p>
          </div>
        </div>

        <div className={styles.quickActionsGrid}>
          {QUICK_ACTIONS.map(({ to, label, icon }) => (
            <Link key={to} to={to} className={styles.quickActionCard}>
              <span className={styles.quickActionIcon}>{icon}</span>
              <span className={styles.quickActionLabel}>{label}</span>
            </Link>
          ))}
        </div>

        <div className={styles.profileGrid}>
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionHeaderIcon}>{ICON_USER}</span>
              <h2 className={styles.sectionTitle}>Личные данные</h2>
            </div>
            {profileError && <div className={styles.error}>{profileError}</div>}
            {profileLoading ? (
              <Loader wrap />
            ) : profileData && (
              <>
                {!editing ? (
                  <div className={styles.profileCard}>
                    <p className={styles.profileRow}><span className={styles.profileLabel}>Email:</span> {profileData.email}</p>
                    <p className={styles.profileRow}><span className={styles.profileLabel}>Имя пользователя:</span> {profileData.username || '—'}</p>
                    <p className={styles.profileRow}><span className={styles.profileLabel}>Имя:</span> {profileData.first_name || '—'}</p>
                    <p className={styles.profileRow}><span className={styles.profileLabel}>Фамилия:</span> {profileData.last_name || '—'}</p>
                    <p className={styles.profileRow}><span className={styles.profileLabel}>Отчество:</span> {profileData.patronymic || '—'}</p>
                    <button type="button" className={styles.editBtn} onClick={() => setEditing(true)}>
                      <span className={styles.editBtnIcon}>{ICON_PENCIL}</span>
                      Редактировать
                    </button>
                  </div>
                ) : (
                  <div className={styles.sectionCard}>
                  <form onSubmit={handleSaveProfile} className={styles.profileForm}>
                    <p className={styles.profileRow}><span className={styles.profileLabel}>Email:</span> {profileData.email}</p>
                    <label className={styles.profileLabelBlock}>
                      <span className={styles.profileLabel}>Имя пользователя</span>
                      <input
                        type="text"
                        value={editForm.username}
                        onChange={(e) => setEditForm((f) => ({ ...f, username: e.target.value }))}
                        className={styles.profileInput}
                      />
                    </label>
                    <label className={styles.profileLabelBlock}>
                      <span className={styles.profileLabel}>Имя</span>
                      <input
                        type="text"
                        value={editForm.first_name}
                        onChange={(e) => setEditForm((f) => ({ ...f, first_name: e.target.value }))}
                        className={styles.profileInput}
                      />
                    </label>
                    <label className={styles.profileLabelBlock}>
                      <span className={styles.profileLabel}>Фамилия</span>
                      <input
                        type="text"
                        value={editForm.last_name}
                        onChange={(e) => setEditForm((f) => ({ ...f, last_name: e.target.value }))}
                        className={styles.profileInput}
                      />
                    </label>
                    <label className={styles.profileLabelBlock}>
                      <span className={styles.profileLabel}>Отчество</span>
                      <input
                        type="text"
                        value={editForm.patronymic}
                        onChange={(e) => setEditForm((f) => ({ ...f, patronymic: e.target.value }))}
                        className={styles.profileInput}
                      />
                    </label>
                    {saveError && <div className={styles.error}>{saveError}</div>}
                    <div className={styles.profileFormActions}>
                      <button type="submit" className={styles.saveBtn} disabled={saving}>{saving ? 'Сохранение...' : 'Сохранить'}</button>
                      <button type="button" className={styles.cancelBtn} onClick={() => { setEditing(false); setSaveError(''); }} disabled={saving}>Отмена</button>
                    </div>
                  </form>
                  </div>
                )}
              </>
            )}
          </section>
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionHeaderIcon}>{ICON_LOCK}</span>
              <h2 className={styles.sectionTitle}>Смена пароля</h2>
            </div>
            <div className={styles.sectionCard}>
            <form onSubmit={handleChangePassword} className={styles.profileForm}>
              <label className={styles.profileLabelBlock}>
                <span className={styles.profileLabel}>Текущий пароль</span>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className={styles.profileInput}
                  placeholder="Введите текущий пароль"
                  required
                />
              </label>
              <label className={styles.profileLabelBlock}>
                <span className={styles.profileLabel}>Новый пароль</span>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={styles.profileInput}
                  placeholder="Минимум 6 символов"
                  required
                  minLength={6}
                />
              </label>
              <label className={styles.profileLabelBlock}>
                <span className={styles.profileLabel}>Подтверждение нового пароля</span>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={styles.profileInput}
                  placeholder="Повторите новый пароль"
                  required
                  minLength={6}
                />
              </label>
              {passwordError && <div className={styles.error}>{passwordError}</div>}
              <div className={styles.profileFormActions}>
                <button type="submit" className={styles.saveBtn} disabled={passwordSaving}>
                  {passwordSaving ? 'Сохранение...' : 'Изменить пароль'}
                </button>
              </div>
            </form>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
