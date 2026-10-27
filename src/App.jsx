
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastProvider';
import ProtectedRoute from './routes/ProtectedRoute';
import MobileLayout from './components/layout/MobileLayout';

// =====================================================
// CARREGAMENTO SOB DEMANDA DAS PÁGINAS
// =====================================================

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

// =====================================================
// TELA DE CARREGAMENTO
// =====================================================

function CarregandoPagina() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="fixed inset-0 z-[9999] flex min-h-screen w-full items-center justify-center bg-[#101c23] px-6 text-white"
      style={{
        minHeight: '100dvh',
      }}
    >
      <div className="flex w-full max-w-sm flex-col items-center text-center">

        {/* LOGO */}

        <div className="mb-6 flex h-[88px] w-[88px] items-center justify-center rounded-3xl border border-[#40505a] bg-[#21313a] p-4 shadow-lg">
          <img
            src="/logo.png"
            alt=""
            width="58"
            height="58"
            className="h-full w-full object-contain"
          />
        </div>

        {/* NOME DO SISTEMA */}

        <h1 className="text-[25px] font-bold tracking-tight text-white">
          Achados e Perdidos
        </h1>

        <p className="mt-2 text-[13px] font-medium text-[#e9b39f]">
          UEMG • Campus Divinópolis
        </p>

        {/* SEPARADOR */}

        <div
          className="my-7 h-[2px] w-14 rounded-full bg-[#a86e5b]"
          aria-hidden="true"
        />

        {/* INDICADOR */}

        <div className="flex items-center justify-center gap-3 text-[13px] text-[#b3c2ca]">
          <span
            className="h-[19px] w-[19px] shrink-0 animate-spin rounded-full border-2 border-[#40545e] border-t-[#e9b39f] motion-reduce:animate-none"
            aria-hidden="true"
          />

          <span>Preparando o sistema...</span>
        </div>

        {/* RODAPÉ */}

        <p className="mt-11 text-[11px] text-[#71858e]">
          Universidade do Estado de Minas Gerais
        </p>
      </div>
    </div>
  );
}

// =====================================================
// APLICAÇÃO
// =====================================================

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>

            <Suspense fallback={<CarregandoPagina />}>

              <Routes>

                {/* PÁGINAS DE AUTENTICAÇÃO */}

                <Route
                  path="/login"
                  element={<Login />}
                />

                <Route
                  path="/completar-cadastro"
                  element={<CompletarCadastro />}
                />

                <Route
                  path="/cadastro"
                  element={<Cadastro />}
                />

                {/* CATÁLOGO E ÁREA PRINCIPAL */}

                <Route
                  path="/"
                  element={<MobileLayout />}
                >

                  <Route
                    index
                    element={<Home />}
                  />

                  <Route
                    path="buscar"
                    element={<Buscar />}
                  />

                  <Route
                    path="item/:id"
                    element={<ItemDetails />}
                  />

                  {/* ROTAS AUTENTICADAS */}

                  <Route element={<ProtectedRoute />}>
                    <Route
                      path="perfil"
                      element={<Profile />}
                    />
                  </Route>

                  {/* ROTAS ADMINISTRATIVAS */}

                  <Route
                    element={
                      <ProtectedRoute requireAdmin={true} />
                    }
                  >

                    <Route
                      path="registrar-item"
                      element={<RegistrarItem />}
                    />

                    <Route
                      path="editar-item/:id"
                      element={<EditarItem />}
                    />

                    <Route
                      path="gerenciar-usuarios"
                      element={<GerenciarUsuarios />}
                    />

                    <Route
                      path="pedidos"
                      element={<Pedidos />}
                    />

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
