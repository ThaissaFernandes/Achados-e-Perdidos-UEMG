import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search,
  MapPin,
  Tag,
  X,
  FilterX,
  CheckCircle2,
  Clock,
  Package,
  PackageCheck,
  AlertCircle,
  ArrowUpDown,
  RotateCcw,
} from 'lucide-react';
import ItemCard from '../components/ItemCard';
import FiltroDropdown from '../components/FiltroDropdown';
import { listarItens } from '../services/itemService';
import { listarCategorias } from '../services/categoriaService';
import { listarLocaisAtivos } from '../services/localService';
import { normalizar } from '../utils/texto';
import { obterChaveStatus } from '../utils/status';
import { formatarDataCurta } from '../utils/data';

const TAMANHO_PAGINA = 12;

const OPCOES_STATUS = [
  { id: 'todos', label: 'Todos', icon: Package },
  { id: 'disponivel', label: 'Disponíveis', icon: CheckCircle2 },
  { id: 'analise', label: 'Em análise', icon: Clock },
  { id: 'devolvido', label: 'Devolvidos', icon: PackageCheck },
];

const nomeDe = (obj) => obj.name || obj.nome || obj.title || '';

export default function Buscar() {
  // Os filtros ficam na URL (ex.: /buscar?q=chave&status=disponivel). Assim, ao abrir um item e voltar,
  // a pessoa encontra a busca como deixou (Nielsen 3 e 6), e o link da busca pode ser compartilhado.
  const [params, setParams] = useSearchParams();
  const [visiveis, setVisiveis] = useState(TAMANHO_PAGINA);
  const searchTerm = params.get('q') || '';
  const filterStatus = params.get('status') || 'todos';
  const categoriaSelecionada = params.get('cat') || '';
  const localSelecionado = params.get('local') || '';
  const ordenacao = params.get('ord') || 'recentes'; // 'recentes' | 'antigos' | 'az'

  const atualizarParam = useCallback(
    (chave, valor, padrao = '') => {
      setParams(
        (atual) => {
          const novo = new URLSearchParams(atual);
          if (!valor || valor === padrao) novo.delete(chave);
          else novo.set(chave, valor);
          return novo;
        },
        { replace: true }
      );
      setVisiveis(TAMANHO_PAGINA);
    },
    [setParams]
  );

  const [items, setItems] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [locais, setLocais] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);

  // Carrega e ordena dados iniciais do Firestore
  const carregarDados = useCallback(async () => {
    setLoading(true);
    setErro(false);
    try {
      const [dadosItens, dadosCategorias, dadosLocais] = await Promise.all([
        listarItens(),
        listarCategorias(),
        listarLocaisAtivos(),
      ]);

      const porNome = (a, b) => nomeDe(a).localeCompare(nomeDe(b), 'pt-BR', { numeric: true });

      setItems(dadosItens || []);
      setCategorias([...(dadosCategorias || [])].sort(porNome));
      setLocais([...(dadosLocais || [])].sort(porNome));
    } catch (error) {
      console.error('Erro ao carregar dados do Firestore:', error);
      setErro(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregarDados();
  }, [carregarDados]);

  const opcoesCategorias = useMemo(
    () => [{ id: '', nome: 'Todas as categorias' }, ...categorias.map((cat) => ({ id: nomeDe(cat), nome: nomeDe(cat) }))],
    [categorias]
  );

  const opcoesLocais = useMemo(
    () => [{ id: '', nome: 'Todos os locais' }, ...locais.map((loc) => ({ id: nomeDe(loc), nome: nomeDe(loc) }))],
    [locais]
  );

  // Resgata o nome amigável da Categoria
  const obterNomeCategoria = (valorCategoria) => {
    if (!valorCategoria) return 'Geral';
    const cat = categorias.find((c) => c.id === valorCategoria || nomeDe(c) === valorCategoria);
    return cat ? nomeDe(cat) : valorCategoria;
  };

  const temFiltroAtivo = Boolean(searchTerm || filterStatus !== 'todos' || categoriaSelecionada || localSelecionado);

  const limparFiltros = () => {
    setParams({}, { replace: true });
    setVisiveis(TAMANHO_PAGINA);
  };

  // Filtragem e ordenação (a busca por texto ignora acentos e maiúsculas: "eletronico" acha "Eletrônico")
  const filteredAndSortedItems = useMemo(() => {
    const busca = normalizar(searchTerm);
    const catFiltro = normalizar(categoriaSelecionada);
    const catObj = categorias.find((c) => nomeDe(c) === categoriaSelecionada);
    const idCatSelecionada = catObj ? normalizar(catObj.id) : '';
    const localFiltro = normalizar(localSelecionado);

    const filtrados = items.filter((item) => {
      const titulo = normalizar(item.titulo || item.title);
      const descricao = normalizar(item.descricao);
      const matchesSearch = !busca || titulo.includes(busca) || descricao.includes(busca);

      const matchesStatus = filterStatus === 'todos' || obterChaveStatus(item.status) === filterStatus;

      const catItem = normalizar(item.categoriaId || item.categoria);
      const matchesCategoria = !categoriaSelecionada || catItem === catFiltro || (idCatSelecionada && catItem === idCatSelecionada);

      const localItem = normalizar(item.localEncontrado || item.local || item.location);
      const matchesLocal = !localSelecionado || localItem === localFiltro || localItem.includes(localFiltro);

      return matchesSearch && matchesStatus && matchesCategoria && matchesLocal;
    });

    return filtrados.sort((a, b) => {
      if (ordenacao === 'az') {
        return (a.titulo || a.title || '').localeCompare(b.titulo || b.title || '', 'pt-BR');
      }
      const secA = a.dataCadastro?.seconds || a.dataEncontrado?.seconds || 0;
      const secB = b.dataCadastro?.seconds || b.dataEncontrado?.seconds || 0;
      return ordenacao === 'antigos' ? secA - secB : secB - secA;
    });
  }, [items, searchTerm, filterStatus, categoriaSelecionada, localSelecionado, ordenacao, categorias]);

  const itensVisiveis = filteredAndSortedItems.slice(0, visiveis);
  const restantes = filteredAndSortedItems.length - itensVisiveis.length;

  const textoContagem = loading
    ? 'Carregando itens...'
    : `${filteredAndSortedItems.length} ${filteredAndSortedItems.length === 1 ? 'pertence encontrado' : 'pertences encontrados'}`;

  return (
    <div className="space-y-5 pb-24 sm:pb-8">
      {/* Título da Seção + Ação de Limpar Filtros */}
      <div className="flex justify-between items-start gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Catálogo de busca</h1>
          <p className="text-sm text-gray-600 mt-0.5">Filtre por palavra, categoria, local ou situação do pertence.</p>
        </div>

        {temFiltroAtivo && (
          <button
            onClick={limparFiltros}
            aria-label="Limpar todos os filtros ativos"
            className="text-sm text-rose-700 hover:text-rose-800 font-semibold flex items-center gap-1.5 bg-rose-50 px-3 min-h-11 rounded-xl border border-rose-100 transition shadow-xs cursor-pointer active:scale-95 shrink-0"
          >
            <FilterX size={16} aria-hidden="true" /> Limpar filtros
          </button>
        )}
      </div>

      {/* Filtros */}
      <div role="search" className="bg-white p-4 rounded-3xl border border-gray-100 shadow-xs space-y-4">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={18} aria-hidden="true" />
          <input
            type="search"
            aria-label="Buscar pertence por palavra-chave"
            placeholder="Buscar pertence (ex.: chave, caderno)..."
            value={searchTerm}
            onChange={(e) => atualizarParam('q', e.target.value)}
            className="w-full min-h-12 pl-10 pr-12 py-3 bg-gray-50/80 border border-gray-200 rounded-2xl text-sm outline-hidden focus:bg-white focus:border-indigo-900 focus:ring-2 focus:ring-indigo-900/10 transition-all [&::-webkit-search-cancel-button]:hidden"
          />
          {searchTerm && (
            <button
              onClick={() => atualizarParam('q', '')}
              aria-label="Limpar pesquisa"
              className="absolute right-1 top-1/2 -translate-y-1/2 p-3 text-gray-500 hover:text-gray-700 cursor-pointer"
            >
              <X size={18} aria-hidden="true" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative z-30">
          <FiltroDropdown
            label="Categoria"
            icone={Tag}
            opcoes={opcoesCategorias}
            selecionado={categoriaSelecionada}
            onSelect={(v) => atualizarParam('cat', v)}
          />
          <FiltroDropdown
            label="Local encontrado"
            icone={MapPin}
            opcoes={opcoesLocais}
            selecionado={localSelecionado}
            onSelect={(v) => atualizarParam('local', v)}
          />
        </div>

        {/* Filtros de Status */}
        <div className="pt-2 border-t border-gray-100 space-y-2">
          <span id="rotulo-status" className="text-xs font-semibold text-gray-700 uppercase tracking-wider block">
            Situação do pertence
          </span>
          <div role="group" aria-labelledby="rotulo-status" className="flex gap-2 overflow-x-auto pb-1 no-scrollbar snap-x">
            {OPCOES_STATUS.map((st) => {
              const IconeSt = st.icon;
              const ativo = filterStatus === st.id;

              return (
                <button
                  key={st.id}
                  type="button"
                  aria-pressed={ativo}
                  onClick={() => atualizarParam('status', st.id, 'todos')}
                  className={`snap-start shrink-0 min-h-11 px-4 rounded-xl text-sm font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    ativo ? 'bg-indigo-900 text-white shadow-xs' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <IconeSt size={16} aria-hidden="true" />
                  <span>{st.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Resultados, contagem e ordenação */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between px-1 gap-3">
          <p className="text-sm font-bold text-gray-800" role="status" aria-live="polite">
            {textoContagem}
          </p>

          <div className="flex items-center gap-1.5 text-sm text-gray-600">
            <ArrowUpDown size={16} className="text-gray-500" aria-hidden="true" />
            <label htmlFor="ordenacao" className="sr-only">
              Ordenar resultados
            </label>
            <select
              id="ordenacao"
              value={ordenacao}
              onChange={(e) => atualizarParam('ord', e.target.value, 'recentes')}
              className="bg-transparent font-medium text-gray-800 outline-hidden cursor-pointer hover:text-indigo-900 min-h-11"
            >
              <option value="recentes">Mais recentes</option>
              <option value="antigos">Mais antigos</option>
              <option value="az">Nome (A-Z)</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 md:gap-4" aria-hidden="true">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="bg-white border border-gray-100 rounded-3xl p-4 space-y-3 animate-pulse">
                <div className="w-full h-24 bg-gray-100 rounded-2xl" />
                <div className="h-4 bg-gray-100 rounded-md w-3/4" />
                <div className="h-3 bg-gray-100 rounded-md w-1/2" />
              </div>
            ))}
          </div>
        ) : erro ? (
          <div className="bg-rose-50 border border-rose-100 text-rose-800 rounded-3xl p-8 text-center space-y-3" role="alert">
            <AlertCircle className="w-8 h-8 mx-auto text-rose-500" aria-hidden="true" />
            <div>
              <p className="font-bold">Falha ao carregar o catálogo de pertences.</p>
              <p className="text-sm text-rose-700 mt-1">Verifique a conexão de rede e tente novamente.</p>
            </div>
            <button
              onClick={carregarDados}
              className="inline-flex items-center gap-1.5 px-4 min-h-11 bg-rose-600 text-white rounded-xl text-sm font-bold shadow-xs hover:bg-rose-700 transition cursor-pointer"
            >
              <RotateCcw size={16} aria-hidden="true" /> Tentar novamente
            </button>
          </div>
        ) : filteredAndSortedItems.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 md:gap-4">
              {itensVisiveis.map((item) => (
                <ItemCard
                  key={item.id}
                  id={item.id}
                  title={item.titulo || item.title}
                  category={obterNomeCategoria(item.categoriaId || item.categoria)}
                  location={item.localEncontrado || item.local || item.location}
                  date={formatarDataCurta(item)}
                  status={item.status || 'disponível'}
                  imageUrl={item.fotoUrl || item.imageUrl}
                />
              ))}
            </div>

            {restantes > 0 && (
              <div className="flex flex-col items-center gap-1 pt-2">
                <button
                  onClick={() => setVisiveis((v) => v + TAMANHO_PAGINA)}
                  className="rounded-2xl border border-amber-500 bg-amber-700 px-6 py-4 text-base font-semibold text-white hover:bg-amber-600 transition">
                  Mostrar mais ({restantes} {restantes === 1 ? 'restante' : 'restantes'})
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12 bg-white rounded-3xl border border-gray-100 text-gray-600 text-sm shadow-xs space-y-3 px-4">
            <p className="font-semibold text-gray-800">Nenhum pertence encontrado com esses filtros.</p>
            <p>Tente buscar por uma palavra mais curta ou remover algum filtro.</p>
            {temFiltroAtivo && (
              <button
                onClick={limparFiltros}
                className="mt-1 inline-flex items-center gap-1.5 px-4 min-h-11 bg-indigo-50 text-indigo-900 rounded-xl font-bold text-sm hover:bg-indigo-100 transition cursor-pointer"
              >
                <FilterX size={16} aria-hidden="true" /> Redefinir filtros
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
