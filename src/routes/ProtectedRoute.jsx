
import {
  Navigate,
  Outlet,
  Link,
  useLocation,
} from 'react-router-dom';

import { PageSkeleton } from '../components/skeletons';
import { useAuth } from '../hooks/useAuth';

/**
 * Componente de Rota Protegida
 *
 * @param {boolean} requireAdmin
 * Se true, exige autorização administrativa.
 */
export default function ProtectedRoute({
  requireAdmin = false,
}) {
  const { usuario, loading, eAdmin } = useAuth();
  const location = useLocation();

  // 1. Aguarda a verificação da autenticação.
  if (loading) {
    return <PageSkeleton mensagem="Verificando acesso..." />;
  }

  // 2. Usuário não autenticado.
  if (!usuario) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location.pathname + location.search,
        }}
      />
    );
  }

  // 3. Usuário com cadastro incompleto.
  if (usuario.perfilIncompleto) {
    return (
      <Navigate
        to="/completar-cadastro"
        replace
        state={{
          from: location.pathname + location.search,
        }}
      />
    );
  }

  // 4. Verifica a autorização administrativa.
  if (requireAdmin && !eAdmin) {
    return (
      <div className="p-4 max-w-lg mx-auto my-8">
        <div
          className="bg-red-50 text-red-800 p-5 rounded-2xl border border-red-200 text-sm text-center space-y-3 shadow-xs"
          role="alert"
        >
          <p className="font-bold text-base">
            Acesso restrito
          </p>

          <p className="leading-relaxed">
            Esta área é exclusiva da administração
            do campus. Sua conta não tem essa permissão.
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
