import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, query, limit, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import ItemCard from '../components/ItemCard';
import { Search, ShieldAlert, Loader2, ArrowRight, Info } from 'lucide-react';

export default function Home() {
  const { usuario, eAdmin } = useAuth();
  const navigate = useNavigate();
  const [recentes, setRecentes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Busca apenas os itens mais recentes para a vitrine
  useEffect(() => {
    async function carregarRecentes() {
      try {
        const q = query(collection(db, 'itens'), limit(4));
        const querySnapshot = await getDocs(q);
        const lista = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setRecentes(lista);
      } catch (err) {
        console.error("Erro ao buscar itens recentes:", err);
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

  return (
    <div className="space-y-4 max-w-md mx-auto pb-20">
      
      {/* Banner de Modo Administrador */}
      {eAdmin && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3 rounded-2xl text-xs flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <ShieldAlert size={18} className="text-amber-700 shrink-0" />
            <div>
              <p className="font-bold">Modo Administrador</p>
              <p className="text-[10px] text-amber-700">Visualizando visão estendida do campus</p>
            </div>
          </div>
          <span className="bg-amber-200 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase">
            Admin
          </span>
        </div>
      )}

      {/* Banner de Boas-Vindas / Acolhimento */}
      <div className="bg-gradient-to-r from-indigo-900 to-indigo-800 text-white p-5 rounded-2xl shadow-sm space-y-2">
        <h2 className="text-sm font-bold">Olá, {usuario?.nome || 'Estudante'}! 👋</h2>
        <p className="text-[11px] text-indigo-100 leading-relaxed">
          Perdeu ou esqueceu algum pertence no campus UEMG Divinópolis? Acesse o catálogo completo para filtrar por categorias e locais.
        </p>
        <button
          onClick={() => navigate('/buscar')}
          className="mt-1 bg-white text-indigo-900 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-indigo-50 transition shadow-sm"
        >
          <Search size={14} /> Abrir Catálogo de Busca
        </button>
      </div>

      {/* Guia Rápida (caso não seja admin) */}
      {!eAdmin && (
        <div className="bg-blue-50 border border-blue-100 p-3.5 rounded-2xl space-y-1">
          <div className="flex items-center gap-1.5 text-blue-900 font-bold text-xs">
            <Info size={15} className="text-blue-700" />
            Achou algo perdido?
          </div>
          <p className="text-[11px] text-blue-800 leading-relaxed">
            Entregue o objeto diretamente na Administração do Campus para que a equipe realize o cadastro oficial.
          </p>
        </div>
      )}

      {/* Seção de Itens Recentes (Vitrine) */}
      <div className="space-y-3 pt-1">
        <div className="flex justify-between items-center">
          <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">Adicionados Recentemente</h3>
          <button 
            onClick={() => navigate('/buscar')}
            className="text-[11px] text-indigo-900 font-semibold flex items-center gap-0.5 hover:underline"
          >
            Ver todos <ArrowRight size={12} />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-900" />
          </div>
        ) : recentes.length > 0 ? (
          <div className="space-y-3">
            {recentes.map(item => (
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
          <div className="bg-white rounded-2xl p-6 text-center text-gray-400 text-xs border border-gray-100">
            Nenhum item recente cadastrado.
          </div>
        )}
      </div>

    </div>
  );
}