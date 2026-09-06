import { useState, useEffect } from 'react';
import { Search, Loader2, MapPin, Tag } from 'lucide-react';
import ItemCard from '../components/ItemCard';
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

  // Lógica de filtragem resiliente
  const filteredItems = items.filter(item => {
    // 1. Pesquisa por Título ou Descrição
    const titulo = (item.titulo || item.title || '').toLowerCase();
    const descricao = (item.descricao || '').toLowerCase();
    const busca = searchTerm.toLowerCase().trim();
    const matchesSearch = !busca || titulo.includes(busca) || descricao.includes(busca);

    // 2. Filtro por Status
    const statusItem = (item.status || 'disponível').toLowerCase();
    const matchesStatus = filterStatus === 'todos' || statusItem === filterStatus.toLowerCase();

    // 3. Filtro por Categoria
    const catItem = String(item.categoriaId || item.categoria || '').toLowerCase().trim();
    const catObj = categorias.find(c => (c.name || c.nome || c.title) === categoriaSelecionada);
    const idCatSelecionada = catObj ? String(catObj.id).toLowerCase().trim() : '';
    const catFiltro = categoriaSelecionada.toLowerCase().trim();

    const matchesCategoria = !categoriaSelecionada || 
      catItem === catFiltro || 
      (idCatSelecionada && catItem === idCatSelecionada);

    // 4. Filtro por Local
    const localItem = String(item.localEncontrado || item.local || item.location || '').toLowerCase().trim();
    const localFiltro = localSelecionado.toLowerCase().trim();
    const matchesLocal = !localSelecionado || localItem === localFiltro || localItem.includes(localFiltro);

    return matchesSearch && matchesStatus && matchesCategoria && matchesLocal;
  });

  return (
    <div className="space-y-4 max-w-md mx-auto pb-20 p-4">
      
      {/* Título da Seção */}
      <div>
        <h2 className="text-sm font-bold text-gray-900">Catálogo de Busca</h2>
        <p className="text-[11px] text-gray-500">Filtre por termos, locais ou status dos pertences.</p>
      </div>

      {/* Pesquisa por texto */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          type="text"
          placeholder="Buscar pertence (ex: chave, caderno)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-indigo-900 shadow-sm"
        />
      </div>

      {/* Selects de Categoria e Local */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <label className="block text-[11px] font-semibold text-gray-600 mb-1 flex items-center gap-1">
            <Tag size={12} /> Categoria
          </label>
          <select
            value={categoriaSelecionada}
            onChange={(e) => setCategoriaSelecionada(e.target.value)}
            className="w-full p-2 bg-white border border-gray-200 rounded-xl text-xs outline-none focus:border-indigo-900 text-gray-700"
          >
            <option value="">Todas</option>
            {categorias.map((cat) => {
              const nomeCat = cat.name || cat.nome || cat.title;
              return (
                <option key={cat.id} value={nomeCat}>
                  {nomeCat}
                </option>
              );
            })}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-gray-600 mb-1 flex items-center gap-1">
            <MapPin size={12} /> Local
          </label>
          <select
            value={localSelecionado}
            onChange={(e) => setLocalSelecionado(e.target.value)}
            className="w-full p-2 bg-white border border-gray-200 rounded-xl text-xs outline-none focus:border-indigo-900 text-gray-700"
          >
            <option value="">Todos</option>
            {locais.map((loc) => {
              const nomeLoc = loc.name || loc.nome || loc.title;
              return (
                <option key={loc.id} value={nomeLoc}>
                  {nomeLoc}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* Filtros Rápidos de Status */}
      <div className="flex gap-2 text-xs font-medium pt-1 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setFilterStatus('todos')}
          className={`px-3 py-1.5 rounded-lg border transition-colors shrink-0 ${
            filterStatus === 'todos' 
              ? 'bg-indigo-900 text-white border-indigo-900' 
              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
          }`}
        >
          Todos
        </button>
        <button
          onClick={() => setFilterStatus('disponível')}
          className={`px-3 py-1.5 rounded-lg border transition-colors shrink-0 ${
            filterStatus === 'disponível' 
              ? 'bg-emerald-600 text-white border-emerald-600' 
              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
          }`}
        >
          Disponíveis
        </button>
        <button
          onClick={() => setFilterStatus('em análise')}
          className={`px-3 py-1.5 rounded-lg border transition-colors shrink-0 ${
            filterStatus === 'em análise' 
              ? 'bg-amber-600 text-white border-amber-600' 
              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
          }`}
        >
          Em Análise
        </button>
        <button
          onClick={() => setFilterStatus('devolvido')}
          className={`px-3 py-1.5 rounded-lg border transition-colors shrink-0 ${
            filterStatus === 'devolvido' 
              ? 'bg-rose-600 text-white border-rose-600' 
              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
          }`}
        >
          Devolvidos
        </button>
      </div>

      {/* Exibição dos Resultados */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-500">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-900 mb-2" />
          <p className="text-xs">Carregando catálogo...</p>
        </div>
      ) : (
        <div className="space-y-3 pt-1">
          {filteredItems.length > 0 ? (
            filteredItems.map(item => (
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
            ))
          ) : (
            <div className="text-center py-8 bg-white rounded-2xl border border-gray-100 text-gray-500 text-xs shadow-sm">
              Nenhum pertence encontrado com os filtros aplicados.
            </div>
          )}
        </div>
      )}
    </div>
  );
}