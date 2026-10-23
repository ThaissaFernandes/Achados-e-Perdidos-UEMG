import { Navigate, Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Componente de Rota Protegida
 * @param {boolean} requireAdmin Se true, exige o perfil de Administrador para acessar.
 */
export default function ProtectedRoute({ requireAdmin = false }) {
  const { usuario, loading, eAdmin } = useAuth();
  const location = useLocation();

  // 1. Enquanto verifica o estado de autenticação no Firebase
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64" role="status">
        <div className="w-8 h-8 border-4 border-indigo-900 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-2 text-xs text-gray-600">Verificando permissões...</p>
      </div>
    );
  }

  // 2. Não autenticado: vai para o login guardando de onde veio,
  //    para voltar à tela desejada depois de entrar (Nielsen 3 - Controle e liberdade).
  if (!usuario) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }

  // 3. Validação de administrador
  if (requireAdmin && !eAdmin) {
    return (
      <div className="p-4 max-w-lg mx-auto my-8">
        <div className="bg-red-50 text-red-800 p-5 rounded-2xl border border-red-200 text-sm text-center space-y-3 shadow-xs" role="alert">
          <p className="font-bold text-base">Acesso restrito</p>
          <p className="leading-relaxed">
            Esta área é exclusiva da administração do campus. Sua conta não tem essa permissão.
          </p>
          <Link
            to="/"
            className="inline-flex items-center justify-center min-h-11 px-5 rounded-xl bg-indigo-900 text-white font-semibold hover:bg-indigo-800 transition"
          >
            Voltar ao início
          </Link>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
