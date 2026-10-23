import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastProvider';
import ProtectedRoute from './routes/ProtectedRoute';

import MobileLayout from './components/layout/MobileLayout';

import Home from './pages/Home';
import Buscar from './pages/Buscar';
import RegistrarItem from './pages/RegistrarItem';
import EditarItem from './pages/EditarItem';
import Profile from './pages/Profile';
import ItemDetails from './pages/ItemDetails';
import Login from './pages/Login';
import Cadastro from './pages/Cadastro';
import GerenciarUsuarios from './pages/GerenciarUsuarios';
import Pedidos from './pages/Pedidos';

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            {/* Rotas de Autenticação (Sem o layout do MobileLayout) */}
            <Route path="/login" element={<Login />} />
            <Route path="/cadastro" element={<Cadastro />} />

            {/* Layout Principal (Com Header, Navegação Superior e Rodapé/BottomNav) */}
            <Route path="/" element={<MobileLayout />}>
              {/* Rotas Públicas: consultar o catálogo e ver os detalhes não exige login.
                  O login só é pedido na hora de reivindicar um item. */}
              <Route index element={<Home />} />
              <Route path="buscar" element={<Buscar />} />
              <Route path="item/:id" element={<ItemDetails />} />

              {/* Rotas Protegidas - Usuários Logados */}
              <Route element={<ProtectedRoute />}>
                <Route path="perfil" element={<Profile />} />
              </Route>

              {/* Rotas Protegidas - Apenas Administrador */}
              <Route element={<ProtectedRoute requireAdmin={true} />}>
                <Route path="registrar-item" element={<RegistrarItem />} />
                <Route path="editar-item/:id" element={<EditarItem />} />
                <Route path="gerenciar-usuarios" element={<GerenciarUsuarios />} />
                <Route path="pedidos" element={<Pedidos />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
