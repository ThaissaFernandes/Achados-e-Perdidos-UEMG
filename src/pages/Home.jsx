
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { collection, getDocs, query, limit, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../hooks/useAuth';
import ItemCard from '../components/ItemCard';
import { usePedidosPendentes } from '../hooks/usePedidosPendentes';
import { obterChaveStatus } from '../utils/status';
import { formatarDataCurta } from '../utils/data';

import {
  Search,
  ShieldAlert,
  ArrowRight,
  AlertCircle,
  RotateCcw,
  PlusCircle,
  LogIn,
  ListChecks,
  ClipboardList,
  MousePointerClick,
  Building2,
} from 'lucide-react';

const PASSOS = [
  {
    Icone: Search,
    titulo: '1. Procure',
    texto: 'Busque pelo nome, categoria ou local onde perdeu o objeto.',
  },
  {
    Icone: MousePointerClick,
    titulo: '2. Solicite',
    texto: 'Ao encontrar, entre na sua conta e toque em "Esse item é meu". O sistema gera seu código de retirada.',
  },
  {
    Icone: Building2,
    titulo: '3. Retire',
    texto: 'Vá ao setor de Achados e Perdidos (Administração do Campus) e informe seu código e sua matrícula.',
  },
];

export default function Home() {
  const { usuario, eAdmin } = useAuth();
  const navigate = useNavigate();

  const { pedidos: pedidosPendentes } = usePedidosPendentes({
    ativo: Boolean(eAdmin),
  });

  const [recentes, setRecentes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);
  const [buscaTexto, setBuscaTexto] = useState('');

  const carregarRecentes = useCallback(async () => {
    setLoading(true);
    setErro(false);

    try {
      let snap;

      try {
        snap = await getDocs(
          query(
            collection(db, 'itens'),
            orderBy('dataCadastro', 'desc'),
            limit(12)
          )
        );
      } catch (err) {
        console.error(
          'Erro ao buscar itens recentes (fallback sem orderBy):',
          err
        );

        snap = await getDocs(
          query(collection(db, 'itens'), limit(12))
        );
      }

      setRecentes(
        snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }))
      );
    } catch (e) {
      console.error('Erro no fallback de itens:', e);
      setErro(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregarRecentes();
  }, [carregarRecentes]);

  // A busca rápida direciona para o catálogo completo.
  const irParaBusca = (e) => {
    e.preventDefault();

    const termo = buscaTexto.trim();

    navigate(
      termo
        ? `/buscar?q=${encodeURIComponent(termo)}`
        : '/buscar'
    );
  };

  // Itens devolvidos não aparecem na vitrine inicial.
  const vitrine = recentes.filter(
    (item) => obterChaveStatus(item.status) !== 'devolvido'
  );

  const primeiroNome = (usuario?.nome || '')
    .trim()
    .split(' ')[0];

  return (
    <div className="space-y-5 md:space-y-6">

      {/* ============================================== */}
      {/* BANNER ADMINISTRATIVO */}
      {/* ============================================== */}

      {eAdmin && (
        <div className="rounded-2xl border border-amber-700/60 bg-[#362419] p-4 text-amber-50 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">

          <div className="flex items-start sm:items-center gap-3 min-w-0">
            <ShieldAlert
              size={22}
              className="text-amber-200 shrink-0 mt-0.5 sm:mt-0"
              aria-hidden="true"
            />

            <div className="space-y-1 min-w-0">
              <p className="text-sm md:text-base font-bold text-amber-50 leading-snug">
                Painel do Administrador ativo
              </p>

              <p className="text-xs md:text-sm text-amber-100 leading-relaxed">
                Gerencie os pertences encontrados, acompanhe
                as solicitações de retirada e mantenha os
                registros do campus atualizados.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 shrink-0">
            <Link
              to="/pedidos"
              className="inline-flex items-center justify-center gap-2 min-h-11 px-4 rounded-xl border border-amber-300 bg-[#1f2933] text-amber-50 text-sm font-bold hover:bg-[#303d49] transition"
            >
              <ClipboardList
                size={16}
                aria-hidden="true"
              />

              {pedidosPendentes.length > 0
                ? `Pedidos (${pedidosPendentes.length} pendentes)`
                : 'Pedidos de retirada'}
            </Link>

            <Link
              to="/registrar-item"
              className="inline-flex items-center justify-center gap-2 min-h-11 px-4 rounded-xl bg-amber-700 text-white text-sm font-bold hover:bg-amber-600 transition"
            >
              <PlusCircle
                size={16}
                aria-hidden="true"
              />

              Cadastrar item
            </Link>
          </div>

        </div>
      )}

      {/* ============================================== */}
      {/* BANNER PRINCIPAL COM BUSCA RÁPIDA */}
      {/* ============================================== */}

      <section
        aria-labelledby="titulo-boas-vindas"
        className="bg-gradient-to-r from-indigo-900 via-indigo-900 to-indigo-800 text-white p-5 md:p-7 rounded-2xl shadow-xs space-y-4"
      >
        <div>
          <h1
            id="titulo-boas-vindas"
            className="text-lg md:text-2xl font-bold"
          >
            {usuario
              ? `Olá, ${primeiroNome || 'Estudante'}!`
              : 'Perdeu algo no campus?'}
          </h1>

          <p className="text-sm md:text-base text-indigo-100 leading-relaxed mt-1.5">
            Procure no catálogo de pertences encontrados na
            UEMG Divinópolis. Você não precisa de conta
            para consultar.
          </p>
        </div>

        <form
          onSubmit={irParaBusca}
          role="search"
          className="flex flex-col sm:flex-row gap-2"
        >
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500"
              aria-hidden="true"
            />

            <input
              type="search"
              aria-label="Buscar pertence por palavra-chave"
              placeholder="O que você perdeu? Ex.: garrafa, caderno, chave"
              value={buscaTexto}
              onChange={(e) =>
                setBuscaTexto(e.target.value)
              }
              className="w-full min-h-12 pl-10 pr-3 rounded-xl bg-white text-gray-900 text-sm placeholder:text-gray-500 outline-none focus:ring-2 focus:ring-white/70"
            />
          </div>

          <button
            type="submit"
            className="home-search-button min-h-12 px-5 bg-white text-indigo-900 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-indigo-50 transition active:scale-[0.98]"
          >
            <Search
              size={16}
              aria-hidden="true"
            />

            Buscar
          </button>
        </form>

        {!usuario && (
          <p className="text-sm text-indigo-100">
            Já achou o seu item?{' '}

            <Link
              to="/login"
              className="inline-flex items-center gap-1 font-bold text-white underline py-2"
            >
              <LogIn
                size={14}
                aria-hidden="true"
              />

              Entre para solicitar a retirada
            </Link>
          </p>
        )}
      </section>

      {/* ============================================== */}
      {/* COMO FUNCIONA */}
      {/* ============================================== */}

      {!eAdmin && (
        <section
          aria-labelledby="titulo-como-funciona"
          className="space-y-3"
        >
          <h2
            id="titulo-como-funciona"
            className="text-sm font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2"
          >
            <ListChecks
              size={18}
              className="text-indigo-900"
              aria-hidden="true"
            />

            Como funciona
          </h2>

          <ol className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {PASSOS.map(({ Icone, titulo, texto }) => (
              <li
                key={titulo}
                className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex gap-3"
              >
                <div className="home-step-icon p-2.5 h-fit bg-indigo-50 text-indigo-900 rounded-xl shrink-0">
                  <Icone
                    size={20}
                    aria-hidden="true"
                  />
                </div>

                <div>
                  <p className="text-sm font-bold text-gray-900">
                    {titulo}
                  </p>

                  <p className="text-sm text-gray-600 leading-snug mt-0.5">
                    {texto}
                  </p>
                </div>
              </li>
            ))}
          </ol>

          <p className="home-found-notice text-sm text-gray-700 bg-blue-50/80 border border-blue-100 rounded-2xl p-3.5">
            <strong>Achou algo?</strong>{' '}
            Entregue o objeto no setor de Achados e
            Perdidos (Administração do Campus). A equipe
            faz o cadastro oficial com foto e descrição
            no sistema.
          </p>
        </section>
      )}

      {/* ============================================== */}
      {/* VITRINE DE ITENS RECENTES */}
      {/* ============================================== */}

      <section
        aria-labelledby="titulo-recentes"
        className="space-y-4 pt-2"
      >
        <div className="flex items-center justify-between gap-3 pb-1 border-b border-gray-100">
          <h2
            id="titulo-recentes"
            className="text-sm font-bold text-gray-800 uppercase tracking-wider"
          >
            Adicionados recentemente
          </h2>

          <Link
            to="/buscar"
            className="text-sm text-indigo-900 font-semibold flex items-center gap-1 hover:underline min-h-11"
          >
            Ver catálogo completo

            <ArrowRight
              size={14}
              aria-hidden="true"
            />
          </Link>
        </div>

        {loading ? (
          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4"
            role="status"
            aria-label="Carregando itens"
          >
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-white border border-gray-100 rounded-2xl p-4 space-y-3 animate-pulse"
              >
                <div className="w-full h-24 bg-gray-100 rounded-xl" />
                <div className="h-4 bg-gray-100 rounded-md w-3/4" />
                <div className="h-3 bg-gray-100 rounded-md w-1/2" />
              </div>
            ))}
          </div>
        ) : erro ? (
          <div
            className="bg-red-50 border border-red-100 text-red-800 rounded-2xl p-6 text-center text-sm space-y-3"
            role="alert"
          >
            <AlertCircle
              className="w-6 h-6 mx-auto text-red-500"
              aria-hidden="true"
            />

            <p className="font-semibold">
              Não foi possível carregar os pertences recentes.
            </p>

            <p className="text-red-700">
              Verifique sua conexão de internet e tente novamente.
            </p>

            <button
              type="button"
              onClick={carregarRecentes}
              className="inline-flex items-center gap-1.5 px-4 min-h-11 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition"
            >
              <RotateCcw
                size={16}
                aria-hidden="true"
              />

              Tentar novamente
            </button>
          </div>
        ) : vitrine.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {vitrine.map((item) => (
              <ItemCard
                key={item.id}
                id={item.id}
                title={item.titulo || item.title}
                category={
                  item.categoriaId ||
                  item.categoria ||
                  'Geral'
                }
                location={
                  item.localEncontrado ||
                  item.local ||
                  item.location
                }
                date={formatarDataCurta(item)}
                status={item.status || 'disponível'}
                imageUrl={item.fotoUrl || item.imageUrl}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-8 text-center border border-gray-100 shadow-xs space-y-2">
            <p className="text-sm text-gray-700 font-semibold">
              Nenhum pertence disponível no momento.
            </p>

            <Link
              to="/buscar"
              className="inline-flex items-center min-h-11 text-sm text-indigo-900 font-bold hover:underline"
            >
              Ver todos os itens do catálogo
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
