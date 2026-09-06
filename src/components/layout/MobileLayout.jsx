import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Home, PlusCircle, User, Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function MobileLayout() {
  const location = useLocation();
  const { eAdmin } = useAuth(); // Hook para validar perfil de administrador

  // Helper para aplicar estilo ativo/inativo nos botões de navegação
  const isActive = (path) =>
    location.pathname === path
      ? 'text-indigo-900 font-bold'
      : 'text-gray-500 hover:text-gray-700';

  return (
    <div className="min-h-screen bg-gray-200 flex justify-center items-center p-0 sm:p-4">
      {/* Moldura Smartphone */}
      <div className="w-full max-w-md bg-white min-h-[100svh] sm:min-h-[844px] sm:max-h-[844px] sm:rounded-[36px] shadow-2xl flex flex-col overflow-hidden border border-gray-300 relative">
        
        {/* Header */}
        <header className="bg-indigo-900 text-white p-4 shadow-md flex justify-between items-center shrink-0">
          <div>
            <h1 className="text-lg font-bold tracking-tight">Achados e Perdidos UEMG</h1>
            <p className="text-xs text-indigo-200">UEMG — Divinópolis</p>
          </div>
        </header>

        {/* Área de Conteúdo Dinâmico */}
        <main className="flex-1 overflow-y-auto p-4 bg-gray-50 scroll-smooth">
          <Outlet />
        </main>

        {/* Bottom Navigation */}
        <nav className="bg-white border-t border-gray-100 px-8 py-3 flex justify-around items-center shrink-0 shadow-lg rounded-b-[36px]">
          
          {/* Início */}
          <Link
            to="/"
            aria-label="Ir para a página inicial"
            className={`flex flex-col items-center gap-1 min-w-[56px] transition-all active:scale-95 ${isActive('/')}`}
          >
            <Home size={22} />
            <span className="text-[11px] font-medium">Início</span>
          </Link>

          {/* Buscar */}
          <Link
            to="/buscar"
            aria-label="Buscar objetos"
            className={`flex flex-col items-center gap-1 min-w-[56px] transition-all active:scale-95 ${isActive('/buscar')}`}
          >
            <Search size={22} />
            <span className="text-[11px] font-medium">Buscar</span>
          </Link>

          {/* Cadastrar (Exclusivo para Administrador) */}
          {eAdmin && (
            <Link
              to="/registrar-item"
              aria-label="Cadastrar novo item"
              className={`flex flex-col items-center gap-1 min-w-[56px] transition-all active:scale-95 ${
                location.pathname === '/registrar-item' ? 'text-amber-700 font-bold' : 'text-amber-600'
              }`}
            >
              <PlusCircle size={22} className="text-amber-600" />
              <span className="text-[11px] font-medium">Cadastrar</span>
            </Link>
          )}

          {/* Perfil */}
          <Link
            to="/perfil"
            aria-label="Ir para o perfil do usuário"
            className={`flex flex-col items-center gap-1 min-w-[56px] transition-all active:scale-95 ${isActive('/perfil')}`}
          >
            <User size={22} />
            <span className="text-[11px] font-medium">Perfil</span>
          </Link>

        </nav>

      </div>
    </div>
  );
}