import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { criarSolicitacaoDevolucao } from '../services/solicitacaoService';
import { ArrowLeft, MapPin, Calendar, ShieldCheck, Loader2, Edit, Tag } from 'lucide-react';

export default function ItemDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { usuario, eAdmin } = useAuth();

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState(false);

  useEffect(() => {
    const fetchItem = async () => {
      try {
        const docRef = doc(db, 'itens', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setItem({ id: docSnap.id, ...docSnap.data() });
        }
        setLoading(false);
      } catch (err) {
        console.error('Erro ao buscar item:', err);
        setLoading(false);
      }
    };
    fetchItem();
  }, [id]);

  const handleSolicitarDevolucao = async () => {
    if (!usuario) {
      navigate('/login');
      return;
    }

    setSubmitting(true);
    try {
      await criarSolicitacaoDevolucao({
        itemId: item.id,
        itemTitulo: item.titulo || item.title || 'Pertence',
        usuarioId: usuario.uid,
        nomeUsuario: usuario.nome || usuario.displayName || 'Aluno(a)',
        numeroCadastro: usuario.numeroCadastro || usuario.matricula || 'Não informado',
        status: 'Pendente'
      });

      const itemRef = doc(db, 'itens', item.id);
      await updateDoc(itemRef, { status: 'em análise' });

      setSubmitting(false);
      setIsModalOpen(false);
      setMensagemSucesso(true);
      setItem((prev) => ({ ...prev, status: 'em análise' }));
    } catch (err) {
      console.error("Erro ao solicitar devolução:", err);
      setSubmitting(false);
      alert('Ocorreu um erro ao processar sua solicitação.');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-900 mb-2" />
        <p className="text-xs">Carregando detalhes do pertence...</p>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="p-8 text-center space-y-3 max-w-md mx-auto">
        <p className="text-xs text-gray-500">Objeto não encontrado ou removido.</p>
        <button onClick={() => navigate('/')} className="text-xs font-bold text-indigo-900 underline">
          Voltar para a Home
        </button>
      </div>
    );
  }

  const formatarDataRegistro = () => {
    const data = item.dataRegistro || item.dataEncontrado || item.dataCadastro;
    if (data?.toDate) return new Date(data.toDate()).toLocaleDateString('pt-BR');
    if (data?.seconds) return new Date(data.seconds * 1000).toLocaleDateString('pt-BR');
    if (typeof data === 'string') return data;
    return 'Data não cadastrada';
  };

  const statusAtual = (item.status || 'disponível').toLowerCase();
  const nomeCategoria = item.categoria || item.categoriaId || 'Geral';

  return (
    <div className="space-y-4 max-w-5xl mx-auto pb-20">
      {/* Botão de Voltar */}
      <button 
        onClick={() => navigate(-1)} 
        className="flex items-center gap-1.5 text-xs md:text-sm font-semibold text-gray-600 hover:text-indigo-900 transition"
      >
        <ArrowLeft size={16} /> Voltar para a navegação
      </button>

      {/* Grid Responsivo: Mobile = 1 Coluna | Tablet/Notebook = 2 Colunas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 items-start">
        
        {/* Imagem do Item com Efeito de Moldura */}
        <div className="bg-white rounded-2xl p-2.5 border border-gray-100 shadow-xs hover:shadow-md transition-shadow">
          <img
            src={item.fotoUrl || item.imageUrl || 'https://via.placeholder.com/400?text=Sem+Foto'}
            alt={item.titulo || item.title}
            className="w-full h-64 sm:h-80 md:h-96 object-cover rounded-xl bg-gray-50"
          />
        </div>

        {/* Painel de Detalhes e Painel de Ação */}
        <div className="bg-white p-5 md:p-7 rounded-2xl border border-gray-100 shadow-xs space-y-5">
          <div>
            {/* Tag de Categoria e Status */}
            <div className="flex justify-between items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] md:text-xs font-bold rounded-md bg-indigo-50 text-indigo-900 uppercase tracking-wider">
                <Tag size={12} /> {nomeCategoria}
              </span>

              <span
                className={`px-2.5 py-1 text-[10px] md:text-xs font-bold rounded-md uppercase shrink-0 ${
                  statusAtual.includes('disponível') || statusAtual.includes('disponivel')
                    ? 'bg-emerald-100 text-emerald-800'
                    : statusAtual.includes('análise') || statusAtual.includes('analise')
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {item.status || 'Disponível'}
              </span>
            </div>

            <h1 className="text-base md:text-2xl font-bold text-gray-900 leading-tight">
              {item.titulo || item.title}
            </h1>
          </div>

          {/* Informações detalhadas */}
          <div className="space-y-3 text-xs md:text-sm text-gray-600">
            <div>
              <span className="font-semibold text-gray-700 block mb-1">Descrição do Objeto:</span>
              <p className="text-gray-600 leading-relaxed bg-gray-50/80 p-3.5 rounded-xl border border-gray-100/80">
                {item.descricao || 'Sem descrição cadastrada.'}
              </p>
            </div>

            <div className="pt-3 border-t border-gray-100 grid grid-cols-2 gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1.5 truncate">
                <MapPin size={15} className="text-indigo-900 shrink-0" /> 
                <strong className="text-gray-700">Local:</strong> {item.localEncontrado || item.local || 'Não especificado'}
              </span>
              <span className="flex items-center gap-1.5 truncate">
                <Calendar size={15} className="text-indigo-900 shrink-0" /> 
                <strong className="text-gray-700">Data:</strong> {formatarDataRegistro()}
              </span>
            </div>
          </div>

          {/* Feedback de Sucesso */}
          {mensagemSucesso && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl text-xs md:text-sm space-y-1">
              <p className="font-bold">Solicitação registrada com sucesso!</p>
              <p className="text-[11px] md:text-xs text-emerald-700">
                A administração analisará a solicitação. Dirija-se ao setor de Achados e Perdidos e apresente seu número de cadastro/matrícula para conferência.
              </p>
            </div>
          )}

          {/* Botão de Edição - Administrador */}
          {eAdmin && (
            <div className="pt-2">
              <button
                onClick={() => navigate(`/editar-item/${item.id}`)}
                className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl text-xs md:text-sm shadow-xs transition flex items-center justify-center gap-2"
              >
                <Edit size={16} />
                <span>Editar Pertence (Administração)</span>
              </button>
            </div>
          )}

          {/* Botão de Reivindicação - Aluno */}
          {!eAdmin && (
            <div className="pt-2">
              <button
                onClick={() => setIsModalOpen(true)}
                disabled={statusAtual !== 'disponível' || mensagemSucesso}
                className={`w-full py-3.5 rounded-xl font-semibold text-xs md:text-sm text-white transition flex items-center justify-center gap-2 ${
                  statusAtual === 'disponível' && !mensagemSucesso
                    ? 'bg-indigo-900 hover:bg-indigo-800 active:scale-[0.98] shadow-xs'
                    : 'bg-gray-300 cursor-not-allowed'
                }`}
              >
                <ShieldCheck size={18} />
                {statusAtual === 'disponível' && !mensagemSucesso ? 'Reivindicar Este Pertence' : `Item ${item.status}`}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal Reivindicar com Efeito Glassmorphism */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4">
            <h3 className="text-sm md:text-base font-bold text-gray-900">Confirmar intenção de retirada?</h3>
            <p className="text-xs text-gray-600 leading-relaxed bg-gray-50 p-3 rounded-xl border border-gray-100">
              Ao confirmar, um registro de intenção de retirada será associado ao seu número de cadastro para conferência presencial no setor.
            </p>

            <div className="flex gap-2 text-xs md:text-sm font-semibold pt-1">
              <button
                onClick={() => setIsModalOpen(false)}
                disabled={submitting}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 transition"
              >
                Voltar
              </button>
              <button
                onClick={handleSolicitarDevolucao}
                disabled={submitting}
                className="flex-1 py-2.5 bg-indigo-900 rounded-xl text-white hover:bg-indigo-800 flex justify-center items-center gap-1.5 shadow-xs transition"
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}