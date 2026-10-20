import { useState, useEffect } from 'react';
import { Search, Loader2, MapPin, Tag, X, FilterX, CheckCircle2, Clock, Package } from 'lucide-react';
import ItemCard from '../components/ItemCard';
import FiltroDropdown from '../components/FiltroDropdown';
import { listarItens } from '../services/itemService';
import { listarCategorias } from '../services/categoriaService';
import { listarLocaisAtivos } from '../services/localService';

export default function Buscar() {
  const [items, setItems] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [locais, setLocais] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estados dos Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [categoriaSelecionada, setCategoriaSelecionada] = useState('');
  const [localSelecionado, setLocalSelecionado] = useState('');

  // Carrega e ordena itens, categorias e locais do Firestore
  useEffect(() => {
    async function carregarDados() {
      try {
        const [dadosItens, dadosCategorias, dadosLocais] = await Promise.all([
          listarItens(),
          listarCategorias(),
          listarLocaisAtivos()
        ]);

        setItems(dadosItens || []);

        // Ordenação Alfabética das Categorias
        const catOrdenadas = (dadosCategorias || []).sort((a, b) => {
          const nomeA = a.name || a.nome || a.title || '';
          const nomeB = b.name || b.nome || b.title || '';
          return nomeA.localeCompare(nomeB, 'pt-BR', { numeric: true });
        });

        // Ordenação Alfabética/Numérica dos Locais
        const locOrdenados = (dadosLocais || []).sort((a, b) => {
          const nomeA = a.name || a.nome || a.title || '';
          const nomeB = b.name || b.nome || b.title || '';
          return nomeA.localeCompare(nomeB, 'pt-BR', { numeric: true });
        });

        setCategorias(catOrdenadas);
        setLocais(locOrdenados);
      } catch (error) {
        console.error("Erro ao carregar dados do Firestore:", error);
      } finally {
        setLoading(false);
      }
    }
    carregarDados();
  }, []);

  // Formatação para as opções aceitas pelo FiltroDropdown
  const opcoesCategorias = [
    { id: '', nome: 'Todas as Categorias' },
    ...categorias.map((cat) => {
      const nomeCat = cat.name || cat.nome || cat.title;
      return { id: nomeCat, nome: nomeCat };
    })
  ];

  const opcoesLocais = [
    { id: '', nome: 'Todos os Locais' },
    ...locais.map((loc) => {
      const nomeLoc = loc.name || loc.nome || loc.title;
      return { id: nomeLoc, nome: nomeLoc };
    })
  ];

  // Formata o Timestamp do Firestore para texto curto
  const formatarData = (item) => {
    const data = item.dataEncontrado || item.dataCadastro || item.data || item.dataRegistro;
    if (data?.seconds) {
      return new Date(data.seconds * 1000).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short'
      }).replace('.', '');
    }
    if (typeof data === 'string') return data;
    return 'Recente';
  };

  // Garante a exibição do NOME da categoria no card
  const obterNomeCategoria = (valorCategoria) => {
    if (!valorCategoria) return 'Geral';
    const catEncontrada = categorias.find(c => c.id === valorCategoria || (c.name || c.nome || c.title) === valorCategoria);
    return catEncontrada ? (catEncontrada.name || catEncontrada.nome || catEncontrada.title) : valorCategoria;
  };

  // Verifica se há algum filtro ativo
  const temFiltroAtivo = searchTerm || filterStatus !== 'todos' || categoriaSelecionada || localSelecionado;

  const limparFiltros = () => {
    setSearchTerm('');
    setFilterStatus('todos');
    setCategoriaSelecionada('');
    setLocalSelecionado('');
  };

  // Lógica de filtragem resiliente
  const filteredItems = items.filter(item => {
    const titulo = (item.titulo || item.title || '').toLowerCase();
    const descricao = (item.descricao || '').toLowerCase();
    const busca = searchTerm.toLowerCase().trim();
    const matchesSearch = !busca || titulo.includes(busca) || descricao.includes(busca);

    const statusItem = (item.status || 'disponível').toLowerCase();
    const matchesStatus = filterStatus === 'todos' || statusItem === filterStatus.toLowerCase();

    const catItem = String(item.categoriaId || item.categoria || '').toLowerCase().trim();
    const catObj = categorias.find(c => (c.name || c.nome || c.title) === categoriaSelecionada);
    const idCatSelecionada = catObj ? String(catObj.id).toLowerCase().trim() : '';
    const catFiltro = categoriaSelecionada.toLowerCase().trim();

    const matchesCategoria = !categoriaSelecionada || 
      catItem === catFiltro || 
      (idCatSelecionada && catItem === idCatSelecionada);

    const localItem = String(item.localEncontrado || item.local || item.location || '').toLowerCase().trim();
    const localFiltro = localSelecionado.toLowerCase().trim();
    const matchesLocal = !localSelecionado || localItem === localFiltro || localItem.includes(localFiltro);

    return matchesSearch && matchesStatus && matchesCategoria && matchesLocal;
  });

  return (
    <div className="space-y-5 pb-8">
      
      {/* Título da Seção + Botão de Limpar Filtros */}
      <div className="flex justify-between items-start gap-4">
        <div>
          <h2 className="text-base md:text-xl font-bold text-gray-900">Catálogo de Busca</h2>
          <p className="text-xs md:text-sm text-gray-500 mt-0.5">Filtre por termos, locais ou status dos pertences.</p>
        </div>

        {temFiltroAtivo && (
          <button
            onClick={limparFiltros}
            className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1.5 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-100 transition shadow-xs cursor-pointer"
          >
            <FilterX size={14} /> Limpar Filtros
          </button>
        )}
      </div>

      {/* Container de Filtros Principal */}
      <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-xs space-y-4">
        
        {/* Pesquisa por Texto */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Buscar pertence (ex: chave, caderno)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-10 py-3 bg-gray-50/80 border border-gray-200 rounded-2xl text-xs md:text-sm outline-none focus:bg-white focus:border-indigo-900 focus:ring-2 focus:ring-indigo-900/10 transition-all"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Dropdowns Customizados (Categoria e Local do Firestore) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative z-30">
          <FiltroDropdown
            label="Categoria"
            icone={Tag}
            opcoes={opcoesCategorias}
            selecionado={categoriaSelecionada}
            onSelect={setCategoriaSelecionada}
          />

          <FiltroDropdown
            label="Local Encontrado"
            icone={MapPin}
            opcoes={opcoesLocais}
            selecionado={localSelecionado}
            onSelect={setLocalSelecionado}
          />
        </div>

        {/* Filtros de Status */}
        <div className="pt-2 border-t border-gray-100 space-y-2">
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block">
            Status do Pertence
          </span>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none snap-x">
            {[
              { id: 'todos', label: 'Todos', icon: Package, color: 'indigo' },
              { id: 'disponível', label: 'Disponíveis', icon: CheckCircle2, color: 'emerald' },
              { id: 'em análise', label: 'Em Análise', icon: Clock, color: 'amber' },
              { id: 'devolvido', label: 'Devolvidos', icon: X, color: 'rose' },
            ].map((st) => {
              const IconeSt = st.icon;
              const ativo = filterStatus === st.id;
              
              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setFilterStatus(st.id)}
                  className={`snap-start shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    ativo
                      ? 'bg-indigo-900 text-white shadow-xs'
                      : 'bg-gray-100/80 text-gray-600 hover:bg-gray-200/60'
                  }`}
                >
                  <IconeSt size={14} />
                  <span>{st.label}</span>
                </button>
              );
            })}
          </div>
        </div>

      </div>

      {/* Resultados e Contagem */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold text-gray-700">
            {loading ? 'Buscando...' : `${filteredItems.length} pertences encontrados`}
          </span>
        </div>

        {/* Exibição dos Resultados em Grid Adaptável */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-900 mb-2" />
            <p className="text-xs">Carregando catálogo...</p>
          </div>
        ) : filteredItems.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 md:gap-4">
            {filteredItems.map(item => (
              <ItemCard 
                key={item.id} 
                id={item.id}
                title={item.titulo || item.title}
                category={obterNomeCategoria(item.categoriaId || item.categoria)}
                location={item.localEncontrado || item.local || item.location}
                date={formatarData(item)}
                status={item.status || 'Disponível'}
                imageUrl={item.fotoUrl || item.imageUrl}
              />
            ))}
          </div>
        ) : (
          <div className="col-span-full text-center py-12 bg-white rounded-3xl border border-gray-100 text-gray-400 text-xs md:text-sm shadow-xs space-y-3">
            <p className="font-semibold text-gray-600">Nenhum pertence encontrado com os filtros aplicados.</p>
            {temFiltroAtivo && (
              <button
                onClick={limparFiltros}
                className="mt-1 inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-50 text-indigo-900 rounded-xl font-bold text-xs hover:bg-indigo-100 transition cursor-pointer"
              >
                <FilterX size={14} /> Redefinir Filtros
              </button>
            )}
          </div>
        )}
      </div>

    </div>
  );
}