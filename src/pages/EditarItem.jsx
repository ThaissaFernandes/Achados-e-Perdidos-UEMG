import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapPin, Tag, FileText, CheckCircle2, ArrowLeft, Loader2, Save, ShieldAlert, Trash2, AlertTriangle } from 'lucide-react';
import { db } from '../config/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { listarCategorias } from '../services/categoriaService';
import { listarLocaisAtivos } from '../services/localService';
import { excluirItem } from '../services/itemService';
import { useAuth } from '../context/AuthContext';

export default function EditarItem() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { eAdmin, carregandoAuth } = useAuth();

  const [categorias, setCategorias] = useState([]);
  const [locais, setLocais] = useState([]);
  const [loading, setLoading] = useState(true);
  const [carregandoSalvar, setCarregandoSalvar] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [erro, setErro] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    category: '',
    location: '',
    description: '',
    status: 'disponível',
    fotoUrl: ''
  });

  useEffect(() => {
    if (!carregandoAuth && !eAdmin) {
      setLoading(false);
      return;
    }

    async function carregarDados() {
      try {
        const [dadosCategorias, dadosLocais, itemSnap] = await Promise.all([
          listarCategorias(),
          listarLocaisAtivos(),
          getDoc(doc(db, 'itens', id))
        ]);

        if (itemSnap.exists()) {
          const itemData = itemSnap.data();
          setFormData({
            title: itemData.titulo || itemData.title || '',
            category: itemData.categoriaId || itemData.categoria || '',
            location: itemData.localEncontrado || itemData.local || '',
            description: itemData.descricao || '',
            status: (itemData.status || 'disponível').toLowerCase(),
            fotoUrl: itemData.fotoUrl || ''
          });
        } else {
          setErro('Item não encontrado no sistema.');
        }

        const catOrdenadas = (dadosCategorias || []).sort((a, b) => {
          const nA = a.name || a.nome || a.title || '';
          const nB = b.name || b.nome || b.title || '';
          return nA.localeCompare(nB, 'pt-BR', { numeric: true });
        });

        const locOrdenados = (dadosLocais || []).sort((a, b) => {
          const nA = a.name || a.nome || a.title || '';
          const nB = b.name || b.nome || b.title || '';
          return nA.localeCompare(nB, 'pt-BR', { numeric: true });
        });

        setCategorias(catOrdenadas);
        setLocais(locOrdenados);
      } catch (err) {
        console.error("Erro ao carregar dados para edição:", err);
        setErro('Erro ao carregar informações.');
      } finally {
        setLoading(false);
      }
    }

    if (eAdmin) {
      carregarDados();
    }
  }, [id, eAdmin, carregandoAuth]);

  if (!carregandoAuth && !eAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 space-y-3 max-w-md mx-auto">
        <ShieldAlert size={56} className="text-amber-600" />
        <h2 className="text-lg font-bold text-gray-800">Acesso Restrito</h2>
        <p className="text-xs text-gray-500">
          Esta área é exclusiva para a administração do setor de Achados e Perdidos.
        </p>
        <button
          onClick={() => navigate('/')}
          className="mt-2 px-4 py-2 bg-indigo-900 text-white rounded-xl text-xs font-semibold"
        >
          Voltar para a Página Inicial
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-500">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-900 mb-2" />
        <p className="text-xs">Carregando dados do pertence...</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 space-y-3">
        <CheckCircle2 size={64} className="text-emerald-600 animate-bounce" />
        <h2 className="text-xl font-bold text-gray-800">Alterações Salvas!</h2>
        <p className="text-xs text-gray-500">Redirecionando para os detalhes do item...</p>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');
    setCarregandoSalvar(true);

    try {
      const itemRef = doc(db, 'itens', id);
      // Padronizado com os campos corretos em português utilizados no restante do sistema
      await updateDoc(itemRef, {
        titulo: formData.title.trim(),
        categoriaId: formData.category,
        localEncontrado: formData.location,
        descricao: formData.description.trim(),
        status: formData.status.toLowerCase()
      });

      setSubmitted(true);
      setTimeout(() => {
        navigate(`/item/${id}`);
      }, 1500);
    } catch (err) {
      console.error("Erro ao salvar alterações:", err);
      setErro('Falha ao atualizar o item. Tente novamente.');
    } finally {
      setCarregandoSalvar(false);
    }
  };

  const handleExcluirDefinitivo = async () => {
    setDeleting(true);
    try {
      await excluirItem(id);
      navigate('/');
    } catch (err) {
      console.error("Erro ao excluir item:", err);
      setDeleting(false);
      setIsDeleteModalOpen(false);
      setErro('Erro ao tentar excluir o item.');
    }
  };

  return (
    <div className="space-y-5 pb-20 max-w-md mx-auto p-4">
      <div className="flex items-center gap-2">
        <button 
          onClick={() => navigate(-1)} 
          className="p-1.5 rounded-xl text-gray-500 bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h2 className="text-base font-bold text-gray-800">Editar Pertence (Administração)</h2>
          <p className="text-[11px] text-gray-500">Atualize o status ou características do objeto</p>
        </div>
      </div>

      {erro && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs">
          {erro}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Status do Pertence */}
        <div className="space-y-1">
          <label className="font-semibold text-gray-700">Status do Pertence</label>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, status: 'disponível' })}
              className={`py-2 px-2 rounded-xl font-bold border text-[11px] transition-all ${
                formData.status === 'disponível'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-white text-gray-600 border-gray-200'
              }`}
            >
              Disponível
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, status: 'em análise' })}
              className={`py-2 px-2 rounded-xl font-bold border text-[11px] transition-all ${
                formData.status === 'em análise'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                  : 'bg-white text-gray-600 border-gray-200'
              }`}
            >
              Em Análise
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, status: 'devolvido' })}
              className={`py-2 px-2 rounded-xl font-bold border text-[11px] transition-all ${
                formData.status === 'devolvido'
                  ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                  : 'bg-white text-gray-600 border-gray-200'
              }`}
            >
              Devolvido
            </button>
          </div>
        </div>

        {/* Título */}
        <div className="space-y-1">
          <label className="font-semibold text-gray-700">Título / Nome</label>
          <div className="relative">
            <Tag size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full pl-9 pr-3 py-2.5 bg-white border border-gray-200 rounded-xl outline-none focus:border-indigo-900"
            />
          </div>
        </div>

        {/* Categoria */}
        <div className="space-y-1">
          <label className="font-semibold text-gray-700">Categoria</label>
          <select
            required
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl outline-none focus:border-indigo-900 text-gray-700"
          >
            <option value="">Selecione uma categoria...</option>
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

        {/* Local Encontrado */}
        <div className="space-y-1">
          <label className="font-semibold text-gray-700">Local Encontrado</label>
          <div className="relative">
            <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <select
              required
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full pl-9 pr-3 py-2.5 bg-white border border-gray-200 rounded-xl outline-none focus:border-indigo-900 text-gray-700"
            >
              <option value="">Selecione o local...</option>
              {locais.map((loc) => {
                const nomeLocal = loc.name || loc.nome || loc.title;
                return (
                  <option key={loc.id} value={nomeLocal}>
                    {nomeLocal}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* Detalhes */}
        <div className="space-y-1">
          <label className="font-semibold text-gray-700">Detalhes Adicionais</label>
          <div className="relative">
            <FileText size={16} className="absolute left-3 top-3 text-gray-400" />
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full pl-9 pr-3 py-2.5 bg-white border border-gray-200 rounded-xl outline-none focus:border-indigo-900 text-gray-700"
            />
          </div>
        </div>

        {/* Salvar Alterações */}
        <button
          type="submit"
          disabled={carregandoSalvar}
          className="w-full py-3 bg-indigo-900 text-white font-semibold rounded-xl shadow-sm hover:bg-indigo-800 transition disabled:opacity-50 flex justify-center items-center gap-2"
        >
          {carregandoSalvar ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>Salvando Alterações...</span>
            </>
          ) : (
            <>
              <Save size={16} />
              <span>Salvar Alterações</span>
            </>
          )}
        </button>
      </form>

      {/* Seção de Zona de Perigo */}
      <div className="pt-6 mt-6 border-t border-dashed border-gray-200 space-y-2">
        <div>
          <h4 className="text-xs font-bold text-gray-700">Zona de Perigo</h4>
          <p className="text-[11px] text-gray-400">Ações irreversíveis para este registro</p>
        </div>

        <button
          type="button"
          onClick={() => setIsDeleteModalOpen(true)}
          className="w-full py-2.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-semibold rounded-xl transition flex justify-center items-center gap-2 text-xs shadow-xs active:scale-[0.98]"
        >
          <Trash2 size={16} className="text-red-600" />
          <span>Excluir Este Registro do Sistema</span>
        </button>
      </div>

      {/* Modal de Confirmação de Exclusão Crítica */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-2.5 text-red-600">
              <div className="p-2.5 bg-red-100 rounded-xl">
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Excluir Pertence?</h3>
                <p className="text-[10px] text-gray-500">Esta ação não pode ser desfeita</p>
              </div>
            </div>
            
            <p className="text-xs text-gray-600 leading-relaxed bg-gray-50 p-3 rounded-xl border border-gray-100">
              Você está prestes a remover permanentemente o registro <strong className="text-gray-900">"{formData.title || 'deste item'}"</strong> do banco de dados e da nuvem.
            </p>

            <div className="flex gap-2 pt-1 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={deleting}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExcluirDefinitivo}
                disabled={deleting}
                className="flex-1 py-2.5 bg-red-600 rounded-xl text-white hover:bg-red-700 transition flex justify-center items-center gap-1.5 shadow-sm"
              >
                {deleting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Excluindo...</span>
                  </>
                ) : (
                  <span>Sim, Excluir</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}