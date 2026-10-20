import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Componente de Rota Protegida
 * @param {boolean} requireAdmin Se true, exige o perfil de Administrador para acessar.
 */
export default function ProtectedRoute({ requireAdmin = false }) {
  // Desestrutura eAdmin diretamente do AuthContext
  const { usuario, loading, eAdmin } = useAuth();

  // 1. Enquanto verifica o estado de autenticação no Firebase
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-indigo-900 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-2 text-xs text-gray-500">Verificando permissões...</p>
      </div>
    );
  }

  // 2. Se o usuário não estiver autenticado, redireciona para a página de login
  if (!usuario) {
    return <Navigate to="/login" replace />;
  }

  // 3. Validação de administrador usando a flag eAdmin unificada do AuthContext
  if (requireAdmin && !eAdmin) {
    return (
      <div className="p-4 max-w-lg mx-auto my-8">
        <div className="bg-red-50 text-red-700 p-5 rounded-2xl border border-red-200 text-xs md:text-sm text-center space-y-2 shadow-xs">
          <p className="font-bold text-base">Acesso Restrito</p>
          <p className="leading-relaxed">
            Sua conta não possui permissões administrativas para acessar esta área do sistema.
          </p>
        </div>
      </div>
    );
  }

  // 4. Se passou em todas as verificações, renderiza a rota filha
  return <Outlet />;
}