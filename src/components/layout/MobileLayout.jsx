import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Home, PlusCircle, User, Search, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function MobileLayout() {
  const location = useLocation();
  const { usuario, eAdmin } = useAuth() || {};

  // Itens de navegação compartilhados entre a barra inferior e o menu superior
  const navItems = [
    { to: '/', label: 'Início', ariaLabel: 'Ir para a página inicial', Icon: Home },
    { to: '/buscar', label: 'Buscar', ariaLabel: 'Buscar objetos', Icon: Search },
    ...(eAdmin
      ? [{ to: '/registrar-item', label: 'Cadastrar', ariaLabel: 'Cadastrar novo item', Icon: PlusCircle }]
      : []),
    { to: '/perfil', label: 'Perfil', ariaLabel: 'Ir para o perfil do usuário', Icon: User },
  ];

  const isCurrent = (path) => location.pathname === path;

  // Estilo ativo/inativo na barra inferior (mobile)
  const bottomNavStyle = (path) =>
    isCurrent(path) ? 'text-indigo-900 font-bold' : 'text-gray-500 hover:text-gray-700';

  // Estilo ativo/inativo no menu do cabeçalho (tablet / notebook)
  const topNavStyle = (path) =>
    isCurrent(path)
      ? 'bg-white/20 text-white font-bold shadow-sm'
      : 'text-indigo-100 hover:text-white hover:bg-white/10';

  const obterInicial = () => {
    const nome = usuario?.nome || usuario?.displayName || 'U';
    return nome.charAt(0).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header Superior (Fixo em todas as telas, expandido no desktop) */}
      <header className="bg-indigo-900 text-white shadow-sm sticky top-0 z-30 shrink-0">
        <div className="mx-auto w-full max-w-7xl px-4 py-3.5 md:px-8 flex justify-between items-center gap-6">
          
          {/* Identificação da Aplicação / Campus */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center font-black text-indigo-200 text-base md:text-lg group-hover:bg-white/20 transition-colors">
              U
            </div>
            <div>
              <h1 className="text-base md:text-lg font-bold tracking-tight leading-tight">
                Achados e Perdidos
              </h1>
              <p className="text-[11px] md:text-xs text-indigo-200">UEMG — Divinópolis</p>
            </div>
          </Link>

          {/* Navegação Superior + Badge do Usuário (Tablet/Desktop: md) */}
          <nav className="hidden md:flex items-center gap-2" aria-label="Navegação principal">
            {navItems.map(({ to, label, ariaLabel, Icon }) => (
              <Link
                key={to}
                to={to}
                aria-label={ariaLabel}
                aria-current={isCurrent(to) ? 'page' : undefined}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm transition-all duration-200 ${topNavStyle(to)}`}
              >
                <Icon size={18} />
                <span>{label}</span>
              </Link>
            ))}

            {/* Badge do Usuário Logado (Canto Direito) */}
            {usuario && (
              <div className="ml-3 pl-4 border-l border-indigo-800 flex items-center gap-3">
                <div className="text-right">
                  <p className="text-xs font-bold text-white max-w-[130px] truncate leading-tight">
                    {usuario.nome || usuario.displayName || 'Estudante'}
                  </p>
                  <span className="inline-flex items-center gap-1 text-[10px] text-indigo-200 font-medium">
                    {eAdmin && <ShieldCheck size={11} className="text-amber-400 shrink-0" />}
                    {eAdmin ? 'Administrador' : 'Aluno UEMG'}
                  </span>
                </div>
                
                <Link
                  to="/perfil"
                  title="Acessar Perfil"
                  className="w-9 h-9 rounded-full bg-indigo-800 border border-indigo-400/50 flex items-center justify-center text-xs font-bold text-white hover:border-white hover:scale-105 transition-all shadow-sm"
                >
                  {obterInicial()}
                </Link>
              </div>
            )}
          </nav>
        </div>
      </header>

      {/* Área Principal de Conteúdo (Com largura estendida até max-w-7xl) */}
      <main className="flex-1 w-full mx-auto max-w-7xl p-4 pb-24 md:p-8 md:pb-12">
        <Outlet />
      </main>

      {/* Rodapé Fixo Institucional (Apenas para telas grandes) */}
      <footer className="hidden md:block bg-white border-t border-gray-200 py-6 text-xs text-gray-500 mt-auto">
        <div className="max-w-7xl mx-auto px-8 flex flex-col sm:flex-row justify-between items-center gap-2">
          <p className="font-medium text-gray-600">
            Achados e Perdidos — Universidade do Estado de Minas Gerais (Campus Divinópolis)
          </p>
          <p className="text-gray-400 text-[11px]">
            Sistema desenvolvido para Trabalho de Conclusão de Curso (TCC)
          </p>
        </div>
      </footer>

      {/* Bottom Navigation (Somente no Mobile) */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-gray-100 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex justify-around items-center shadow-lg"
        aria-label="Navegação principal"
      >
        {navItems.map(({ to, label, ariaLabel, Icon }) => (
          <Link
            key={to}
            to={to}
            aria-label={ariaLabel}
            aria-current={isCurrent(to) ? 'page' : undefined}
            className={`flex flex-col items-center gap-1 min-w-[56px] transition-all active:scale-95 ${bottomNavStyle(to)}`}
          >
            <Icon size={22} />
            <span className="text-[11px] font-medium">{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}