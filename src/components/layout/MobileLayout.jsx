import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Home, PlusCircle, User, Search, ShieldCheck, LogIn, ClipboardList } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { usePedidosPendentes } from '../../hooks/usePedidosPendentes';

// Ícone com selo numérico (ex.: pedidos pendentes)
const IconeComSelo = ({ Icon, size, badge }) => (
  <span className="relative inline-flex">
    <Icon size={size} aria-hidden="true" />
    {badge > 0 && (
      <span
        className="absolute -top-2 -right-2.5 min-w-5 h-5 px-1 rounded-full bg-rose-600 text-white text-xs font-bold flex items-center justify-center ring-2 ring-white"
        aria-hidden="true"
      >
        {badge > 9 ? '9+' : badge}
      </span>
    )}
  </span>
);

export default function MobileLayout() {
  const location = useLocation();
  const { usuario, eAdmin } = useAuth() || {};
  const [logoErro, setLogoErro] = useState(false);

  // Notificação para a administração: contador de pedidos pendentes e aviso quando chega um pedido novo
  const { pedidos: pedidosPendentes } = usePedidosPendentes({ ativo: Boolean(eAdmin), avisarNovos: true });
  const totalPendentes = pedidosPendentes.length;

  // Itens de navegação compartilhados entre a barra inferior e o menu superior.
  // Visitantes veem "Entrar" no lugar de "Perfil" (Nielsen 1 - o sistema mostra se há sessão ativa).
  const navItems = [
    { to: '/', label: 'Início', ariaLabel: 'Ir para a página inicial', Icon: Home },
    { to: '/buscar', label: 'Buscar', ariaLabel: 'Buscar objetos', Icon: Search },
    ...(eAdmin
      ? [
          { to: '/registrar-item', label: 'Cadastrar', ariaLabel: 'Cadastrar novo item', Icon: PlusCircle },
          {
            to: '/pedidos',
            label: 'Pedidos',
            ariaLabel: totalPendentes > 0 ? `Pedidos de retirada, ${totalPendentes} aguardando conferência` : 'Pedidos de retirada',
            Icon: ClipboardList,
            badge: totalPendentes,
          },
        ]
      : []),
    usuario
      ? { to: '/perfil', label: 'Perfil', ariaLabel: 'Ir para o perfil do usuário', Icon: User }
      : { to: '/login', label: 'Entrar', ariaLabel: 'Entrar na sua conta', Icon: LogIn },
  ];

  // "/" só é atual na raiz; as demais também valem para sub-rotas (ex.: /buscar?x)
  const isCurrent = (path) => location.pathname === path;

  const bottomNavStyle = (path) =>
    isCurrent(path) ? 'text-indigo-900 font-bold' : 'text-gray-600 hover:text-gray-800';

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
      <a href="#conteudo" className="skip-link">
        Pular para o conteúdo
      </a>

      {/* Header Superior */}
      <header className="bg-indigo-900 text-white shadow-sm sticky top-0 z-30 shrink-0">
        <div className="mx-auto w-full max-w-7xl px-4 py-3.5 md:px-8 flex justify-between items-center gap-6">
          {/* Identificação da Aplicação / Campus */}
          <Link to="/" className="flex items-center gap-3 group" aria-label="Achados e Perdidos UEMG - ir para o início">
            {logoErro ? (
              <div
                className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center font-black text-indigo-200 text-lg group-hover:bg-white/20 transition-colors"
                aria-hidden="true"
              >
                U
              </div>
            ) : (
              <img
                src="/logo.png"
                alt=""
                onError={() => setLogoErro(true)}
                className="w-10 h-10 rounded-xl bg-white p-1 object-contain"
              />
            )}
            <div>
              <p className="text-base md:text-lg font-bold tracking-tight leading-tight">Achados e Perdidos</p>
              <p className="text-xs text-indigo-100">UEMG — Divinópolis</p>
            </div>
          </Link>

          {/* Navegação Superior + Badge do Usuário (Tablet/Desktop: md) */}
          <nav className="hidden md:flex items-center gap-2" aria-label="Navegação principal">
            {navItems.map(({ to, label, ariaLabel, Icon, badge }) => (
              <Link
                key={to}
                to={to}
                aria-label={ariaLabel}
                aria-current={isCurrent(to) ? 'page' : undefined}
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-sm transition-all duration-200 ${topNavStyle(to)}`}
              >
                <IconeComSelo Icon={Icon} size={18} badge={badge} />
                <span>{label}</span>
              </Link>
            ))}

            {usuario ? (
              <div className="ml-3 pl-4 border-l border-indigo-800 flex items-center gap-3">
                <div className="text-right">
                  <p className="text-xs font-bold text-white max-w-[130px] truncate leading-tight">
                    {usuario.nome || usuario.displayName || 'Estudante'}
                  </p>
                  <span className="inline-flex items-center gap-1 text-[11px] text-indigo-100 font-medium">
                    {eAdmin && <ShieldCheck size={11} className="text-amber-400 shrink-0" aria-hidden="true" />}
                    {eAdmin ? 'Administrador' : 'Aluno UEMG'}
                  </span>
                </div>

                <Link
                  to="/perfil"
                  title="Acessar Perfil"
                  aria-label="Acessar perfil"
                  className="w-10 h-10 rounded-full bg-indigo-800 border border-indigo-400/50 flex items-center justify-center text-xs font-bold text-white hover:border-white hover:scale-105 transition-all shadow-sm"
                >
                  {obterInicial()}
                </Link>
              </div>
            ) : (
              <Link
                to="/cadastro"
                className="ml-2 px-4 py-2.5 rounded-xl bg-white text-indigo-900 text-sm font-bold hover:bg-indigo-50 transition"
              >
                Criar conta
              </Link>
            )}
          </nav>
        </div>
      </header>

      {/* Área Principal de Conteúdo */}
      <main id="conteudo" tabIndex={-1} className="flex-1 w-full mx-auto max-w-7xl p-4 pb-24 md:p-8 md:pb-12 outline-none">
        <Outlet />
      </main>

      {/* Rodapé Fixo Institucional (Apenas para telas grandes) */}
      <footer className="hidden md:block bg-white border-t border-gray-200 py-6 text-xs text-gray-600 mt-auto">
        <div className="max-w-7xl mx-auto px-8 flex flex-col sm:flex-row justify-between items-center gap-2">
          <p className="font-medium text-gray-700">
            Achados e Perdidos — Universidade do Estado de Minas Gerais (Campus Divinópolis)
          </p>
          <p className="text-gray-500 text-xs">Sistema desenvolvido para Trabalho de Conclusão de Curso (TCC)</p>
        </div>
      </footer>
      {/* Bottom Navigation (Somente no Mobile) */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-gray-100 px-4 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] flex justify-around items-center shadow-lg"
        aria-label="Navegação principal"
      >
        {navItems.map(({ to, label, ariaLabel, Icon, badge }) => (
          <Link
            key={to}
            to={to}
            aria-label={ariaLabel}
            aria-current={isCurrent(to) ? 'page' : undefined}
            className={`flex flex-col items-center justify-center gap-1 min-w-16 min-h-12 px-2 rounded-xl transition-all active:scale-95 ${bottomNavStyle(to)}`}
          >
            <IconeComSelo Icon={Icon} size={22} badge={badge} />
            <span className="text-xs font-medium">{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
