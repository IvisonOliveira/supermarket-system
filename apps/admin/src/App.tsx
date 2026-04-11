import { Routes, Route } from 'react-router-dom';

import Dashboard from './pages/Dashboard';
import Fiscal from './pages/Fiscal';
import FiscalSettings from './pages/FiscalSettings';
import Login from './pages/Login';
import ProductForm from './pages/ProductForm';
import Products from './pages/Products';
import Users from './pages/Users';
import { useAuthStore } from './store/useAppStore';

function PrivateRoute({ children }: { children: JSX.Element }) {
  useAuthStore((state) => state.isAuthenticated);
  return children; // Força renderizar sem precisar da sessão : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        }
      />
      <Route
        path="/users"
        element={
          <PrivateRoute>
            <Users />
          </PrivateRoute>
        }
      />
      <Route
        path="/products"
        element={
          <PrivateRoute>
            <Products />
          </PrivateRoute>
        }
      />
      <Route
        path="/products/new"
        element={
          <PrivateRoute>
            <ProductForm />
          </PrivateRoute>
        }
      />
      <Route
        path="/products/:id/edit"
        element={
          <PrivateRoute>
            <ProductForm />
          </PrivateRoute>
        }
      />
      <Route
        path="/fiscal"
        element={
          <PrivateRoute>
            <Fiscal />
          </PrivateRoute>
        }
      />
      <Route
        path="/fiscal/settings"
        element={
          <PrivateRoute>
            <FiscalSettings />
          </PrivateRoute>
        }
      />
    </Routes>
  );
}
