import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query, limit, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import ItemCard from '../components/ItemCard';
import FiltroDropdown from '../components/FiltroDropdown'; // Certifique-se de que o arquivo está na pasta src/components/
import { 
  Search, 
  ShieldAlert, 
  Loader2, 
  ArrowRight, 
  Info, 
  Building2, 
  ShieldCheck, 
  Tag, 
  MapPin 
} from 'lucide-react';

// Listas de opções completas
const LISTA_CATEGORIAS = [
  { id: 'todas', nome: 'Todas as Categorias' },
  { id: 'chaves', nome: 'Chaves' },
  { id: 'documentos', nome: 'Documentos e Cartões' },
  { id: 'eletronicos', nome: 'Eletrônicos' },
  { id: 'material', nome: 'Material Acadêmico' },
  { id: 'mochilas', nome: 'Mochilas e Bolsas' },
  { id: 'pertences', nome: 'Pertences Pessoais' },
  { id: 'vestuario', nome: 'Vestuário' },
];

const LISTA_LOCAIS = [
  { id: 'todos', nome: 'Todos os Locais' },
  { id: 'biblioteca', nome: 'Biblioteca' },
  { id: 'bloco-1', nome: 'Bloco 1' },
  { id: 'bloco-2', nome: 'Bloco 2' },
  { id: 'bloco-3', nome: 'Bloco 3' },
  { id: 'bloco-4', nome: 'Bloco 4' },
  { id: 'bloco-5', nome: 'Bloco 5' },
  { id: 'bloco-6', nome: 'Bloco 6' },
  { id: 'bloco-7', nome: 'Bloco 7' },
  { id: 'bloco-8', nome: 'Bloco 8' },
  { id: 'bloco-9', nome: 'Bloco 9' },
  { id: 'bloco-10', nome: 'Bloco 10' },
  { id: 'estacionamento', nome: 'Estacionamento' },
  { id: 'lanchonete', nome: 'Lanchonete' },
  { id: 'outro', nome: 'Outro' },
  { id: 'quadra', nome: 'Quadra' },
  { id: 'salao', nome: 'Salão' },
];

export default function Home() {
  const { usuario, eAdmin } = useAuth();
  const navigate = useNavigate();
  const [recentes, setRecentes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estados dos Filtros Deslizáveis
  const [categoriaSel, setCategoriaSel] = useState('todas');
  const [localSel, setLocalSel] = useState('todos');

  // Busca os pertences recentes no Firestore
  useEffect(() => {
    async function carregarRecentes() {
      try {
        const q = query(
          collection(db, 'itens'), 
          orderBy('dataCadastro', 'desc'), 
          limit(12)
        );
        const querySnapshot = await getDocs(q);
        const lista = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setRecentes(lista);
      } catch (err) {
        console.error("Erro ao buscar itens recentes (fallback sem orderBy):", err);
        try {
          const qFallback = query(collection(db, 'itens'), limit(12));
          const snapFallback = await getDocs(qFallback);
          setRecentes(snapFallback.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) {
          console.error("Erro no fallback de itens:", e);
        }
      } finally {
        setLoading(false);
      }
    }
    carregarRecentes();
  }, []);

  const formatarData = (item) => {
    const data = item.dataEncontrado || item.dataCadastro || item.data || item.dataRegistro;
    if (data?.seconds) {
      return new Date(data.seconds * 1000).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short'
      }).replace('.', '');
    }
    return 'Recente';
  };

  // Filtragem dinâmica local dos itens carregados
  const itensFiltrados = recentes.filter((item) => {
    const cat = (item.categoriaId || item.categoria || '').toLowerCase();
    const loc = (item.localEncontrado || item.local || item.location || '').toLowerCase();

    const combinaCategoria = categoriaSel === 'todas' || cat.includes(categoriaSel.toLowerCase());
    const combinaLocal = localSel === 'todos' || loc.includes(localSel.toLowerCase());

    return combinaCategoria && combinaLocal;
  });

  return (
    <div className="space-y-5 md:space-y-6">
      
      {/* Banner de Modo Administrador */}
      {eAdmin && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3.5 rounded-2xl text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <ShieldAlert size={18} className="text-amber-700 shrink-0" />
            <div>
              <p className="font-bold">Painel do Administrador Ativo</p>
              <p className="text-[11px] text-amber-700">Acesso completo para gerenciar, editar e cadastrar pertences do campus</p>
            </div>
          </div>
          <span className="bg-amber-200/80 text-amber-900 text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider shrink-0">
            Admin
          </span>
        </div>
      )}

      {/* Banner de Boas-Vindas + Guia Rápida */}
      <div className={`grid gap-4 md:gap-6 ${!eAdmin ? 'md:grid-cols-2' : ''}`}>
        
        {/* Banner Principal */}
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-900 to-indigo-800 text-white p-5 md:p-7 rounded-2xl shadow-xs space-y-3 flex flex-col justify-between">
          <div>
            <h2 className="text-base md:text-xl font-bold">Olá, {usuario?.nome || 'Estudante'}! 👋</h2>
            <p className="text-xs md:text-sm text-indigo-100 leading-relaxed mt-1.5">
              Perdeu ou esqueceu algum pertence no campus UEMG Divinópolis? Consulte nosso catálogo atualizado em tempo real com busca por categorias e locais.
            </p>
          </div>
          <button
            onClick={() => navigate('/buscar')}
            className="mt-4 w-fit bg-white text-indigo-900 px-4 py-2.5 rounded-xl text-xs md:text-sm font-bold flex items-center gap-2 hover:bg-indigo-50 transition shadow-xs active:scale-[0.98]"
          >
            <Search size={16} /> Abrir Catálogo Completo
          </button>
        </div>

        {/* Guia Rápida (Exclusivo para Alunos) */}
        {!eAdmin && (
          <div className="bg-blue-50/80 border border-blue-100 p-5 md:p-7 rounded-2xl space-y-3 flex flex-col justify-center">
            <div className="flex items-center gap-2 text-blue-900 font-bold text-xs md:text-base">
              <Info size={18} className="text-blue-700 shrink-0" />
              <span>Achou algo perdido no campus?</span>
            </div>
            <p className="text-xs md:text-sm text-blue-800 leading-relaxed">
              Entregue o objeto no setor de Achados e Perdidos (Administração do Campus). Nossa equipe fará a catalogação oficial com foto e descrição no sistema.
            </p>
          </div>
        )}
      </div>

      {/* Cartões de Métricas / Atalhos (Desktop: md) */}
      <div className="hidden md:grid grid-cols-3 gap-4">
        <div 
          onClick={() => navigate('/buscar')}
          className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs hover:border-indigo-200 hover:shadow-md transition cursor-pointer flex items-center gap-3.5"
        >
          <div className="p-3 bg-indigo-50 text-indigo-900 rounded-xl">
            <Tag size={20} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Categorias Organizacionais</p>
            <p className="text-sm font-bold text-gray-800">Materiais, Eletrônicos e Chaves</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex items-center gap-3.5">
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl">
            <Building2 size={20} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Local de Retirada Presencial</p>
            <p className="text-sm font-bold text-gray-800">Blocos A, B e Biblioteca</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex items-center gap-3.5">
          <div className="p-3 bg-amber-50 text-amber-700 rounded-xl">
            <ShieldCheck size={20} />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Conferência Segura</p>
            <p className="text-sm font-bold text-gray-800">Apresente sua Matrícula UEMG</p>
          </div>
        </div>
      </div>

      {/* Vitrine de Itens Recentes com Filtros Integrados */}
      <div className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-gray-100">
          <h3 className="text-xs md:text-sm font-bold text-gray-800 uppercase tracking-wider">
            Adicionados Recentemente
          </h3>
          <button 
            onClick={() => navigate('/buscar')}
            className="text-xs md:text-sm text-indigo-900 font-semibold flex items-center gap-1 hover:underline self-start sm:self-auto"
          >
            Ver todos no catálogo <ArrowRight size={14} />
          </button>
        </div>

        {/* Barra de Filtros Deslizáveis */}
        <div className="flex flex-col sm:flex-row gap-3 bg-white p-3.5 rounded-2xl border border-gray-100 shadow-xs">
          <FiltroDropdown
            label="Categoria"
            icone={Tag}
            opcoes={LISTA_CATEGORIAS}
            selecionado={categoriaSel}
            onSelect={setCategoriaSel}
          />
          <FiltroDropdown
            label="Local Encontrado"
            icone={MapPin}
            opcoes={LISTA_LOCAIS}
            selecionado={localSel}
            onSelect={setLocalSel}
          />
        </div>

        {/* Lista/Grid de Itens */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <Loader2 className="w-7 h-7 animate-spin text-indigo-900 mb-2" />
            <p className="text-xs">Carregando pertences recentes...</p>
          </div>
        ) : itensFiltrados.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {itensFiltrados.map(item => (
              <ItemCard 
                key={item.id} 
                id={item.id}
                title={item.titulo || item.title}
                category={item.categoriaId || item.categoria || 'Geral'}
                location={item.localEncontrado || item.local || item.location}
                date={formatarData(item)}
                status={item.status || 'Disponível'}
                imageUrl={item.fotoUrl || item.imageUrl}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-8 text-center text-gray-400 text-xs md:text-sm border border-gray-100 shadow-xs">
            Nenhum pertence encontrado com os filtros selecionados.
          </div>
        )}
      </div>

    </div>
  );
}