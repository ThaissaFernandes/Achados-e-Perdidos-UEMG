import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastProvider';
import ProtectedRoute from './routes/ProtectedRoute';
import MobileLayout from './components/layout/MobileLayout';

// Cada página é carregada quando sua rota é acessada.
const Home = lazy(() => import('./pages/Home'));
const Buscar = lazy(() => import('./pages/Buscar'));
const RegistrarItem = lazy(() => import('./pages/RegistrarItem'));
const EditarItem = lazy(() => import('./pages/EditarItem'));
const Profile = lazy(() => import('./pages/Profile'));
const ItemDetails = lazy(() => import('./pages/ItemDetails'));
const Login = lazy(() => import('./pages/Login'));
const CompletarCadastro = lazy(() => import('./pages/CompletarCadastro'));
const Cadastro = lazy(() => import('./pages/Cadastro'));
const GerenciarUsuarios = lazy(() => import('./pages/GerenciarUsuarios'));
const Pedidos = lazy(() => import('./pages/Pedidos'));

function CarregandoPagina() {
  return (
    <div className="page-loading" role="status" aria-live="polite" aria-atomic="true">
      <span className="page-loading-spinner" aria-hidden="true" />
      <span>Carregando página…</span>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <Suspense fallback={<CarregandoPagina />}>
              <Routes>
                {/* Páginas de autenticação sem o layout principal */}
                <Route path="/login" element={<Login />} />
                <Route path="/completar-cadastro" element={<CompletarCadastro />} />
                <Route path="/cadastro" element={<Cadastro />} />

                {/* Catálogo público e rotas autenticadas */}
                <Route path="/" element={<MobileLayout />}>
                  <Route index element={<Home />} />
                  <Route path="buscar" element={<Buscar />} />
                  <Route path="item/:id" element={<ItemDetails />} />

                  <Route element={<ProtectedRoute />}>
                    <Route path="perfil" element={<Profile />} />
                  </Route>

                  <Route element={<ProtectedRoute requireAdmin={true} />}>
                    <Route path="registrar-item" element={<RegistrarItem />} />
                    <Route path="editar-item/:id" element={<EditarItem />} />
                    <Route path="gerenciar-usuarios" element={<GerenciarUsuarios />} />
                    <Route path="pedidos" element={<Pedidos />} />
                  </Route>
                </Route>
              </Routes>
            </Suspense>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
