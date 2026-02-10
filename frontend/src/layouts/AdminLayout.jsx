import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Loader from '../components/Loader/Loader';
import styles from './AdminLayout.module.css';

export default function AdminLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className={styles.wrapper}>
        <Loader wrap />
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
