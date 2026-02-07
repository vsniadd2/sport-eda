import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import styles from './AdminLayout.module.css';

export default function AdminLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.loading}>Загрузка...</div>
      </div>
    );
  }

  if (user?.role !== 'admin') {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className={styles.wrapper}>
      <Outlet />
    </div>
  );
}
