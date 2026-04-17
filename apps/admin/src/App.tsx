import { Routes, Route, Navigate } from 'react-router-dom';

import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Fiscal from './pages/Fiscal';
import FiscalSettings from './pages/FiscalSettings';
import Login from './pages/Login';
import ProductForm from './pages/ProductForm';
import Products from './pages/Products';
import ReportABC from './pages/ReportABC';
import Stock from './pages/Stock';
import Users from './pages/Users';
import { useAuthStore } from './store/useAppStore';

function PrivateRoute({ children, title }: { children: JSX.Element; title?: string }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Layout title={title}>{children}</Layout>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<PrivateRoute title="Dashboard"><Dashboard /></PrivateRoute>} />
      <Route path="/users" element={<PrivateRoute title="Usuários"><Users /></PrivateRoute>} />
      <Route path="/products" element={<PrivateRoute title="Produtos"><Products /></PrivateRoute>} />
      <Route path="/products/new" element={<PrivateRoute title="Novo Produto"><ProductForm /></PrivateRoute>} />
      <Route path="/products/:id/edit" element={<PrivateRoute title="Editar Produto"><ProductForm /></PrivateRoute>} />
      <Route path="/fiscal" element={<PrivateRoute title="Fiscal — Emissões"><Fiscal /></PrivateRoute>} />
      <Route path="/fiscal/settings" element={<PrivateRoute title="Fiscal — Configurações"><FiscalSettings /></PrivateRoute>} />
      <Route path="/reports/abc" element={<PrivateRoute title="Relatório Curva ABC"><ReportABC /></PrivateRoute>} />
      <Route path="/stock" element={<PrivateRoute title="Controle de Estoque"><Stock /></PrivateRoute>} />
    </Routes>
  );
}
