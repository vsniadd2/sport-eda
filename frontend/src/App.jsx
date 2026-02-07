import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import { FavoritesProvider } from './contexts/FavoritesContext';
import { NotificationProvider } from './contexts/NotificationContext';
import MainLayout from './layouts/MainLayout';
import AdminLayout from './layouts/AdminLayout';
import Home from './pages/Home/Home';
import Login from './pages/Login/Login';
import Register from './pages/Register/Register';
import Info from './pages/Info/Info';
import About from './pages/About/About';
import Catalog from './pages/Catalog/Catalog';
import Admin from './pages/Admin/Admin';
import ProductDetail from './pages/ProductDetail/ProductDetail';
import Cart from './pages/Cart/Cart';
import Favorites from './pages/Favorites/Favorites';
import Profile from './pages/Profile/Profile';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <FavoritesProvider>
        <NotificationProvider>
        <BrowserRouter>
          <Routes>
            {/* Админ-панель — отдельная страница по URL /admin, без шапки и футера сайта */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Admin />} />
            </Route>

            {/* Основной сайт */}
            <Route element={<MainLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/about" element={<About />} />
              <Route path="/payment" element={<Info page="payment" />} />
              <Route path="/delivery" element={<Info page="delivery" />} />
              <Route path="/sitemap" element={<Info page="sitemap" />} />
              <Route path="/catalog" element={<Catalog />} />
              <Route path="/catalog/:id" element={<ProductDetail />} />
              <Route path="/product/:id" element={<ProductDetail />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/favorites" element={<Favorites />} />
              <Route path="/profile" element={<Profile />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        </NotificationProvider>
        </FavoritesProvider>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
