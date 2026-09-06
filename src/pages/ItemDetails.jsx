import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { criarSolicitacaoDevolucao } from '../services/solicitacaoService';
import { ArrowLeft, MapPin, Calendar, ShieldCheck, Loader2, Edit } from 'lucide-react';

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
      // 1. Cria a solicitação no Firestore
      await criarSolicitacaoDevolucao({
        itemId: item.id,
        itemTitulo: item.titulo || item.title || 'Pertence',
        usuarioId: usuario.uid,
        nomeUsuario: usuario.nome || usuario.displayName || 'Aluno(a)',
        numeroCadastro: usuario.numeroCadastro || usuario.matricula || 'Não informado',
        status: 'Pendente'
      });

      // 2. Atualiza o status do item no Firestore para "em análise" para bloquear novas reivindicações
      const itemRef = doc(db, 'itens', item.id);
      await updateDoc(itemRef, { status: 'em análise' });

      setSubmitting(false);
      setIsModalOpen(false);
      setMensagemSucesso(true);
      
      // Atualiza o estado local da tela
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
        <p className="text-xs">Carregando detalhes...</p>
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
    if (data?.toDate) {
      return new Date(data.toDate()).toLocaleDateString('pt-BR');
    }
    if (data?.seconds) {
      return new Date(data.seconds * 1000).toLocaleDateString('pt-BR');
    }
    if (typeof data === 'string') return data;
    return 'Data não cadastrada';
  };

  const statusAtual = (item.status || 'disponível').toLowerCase();

  return (
    <div className="p-4 space-y-4 max-w-md mx-auto pb-20">
      {/* Botão de Voltar */}
      <button 
        onClick={() => navigate(-1)} 
        className="flex items-center gap-1 text-xs font-semibold text-gray-600 hover:text-indigo-900 transition"
      >
        <ArrowLeft size={16} /> Voltar
      </button>

      {/* Imagem do Item */}
      <div className="bg-white rounded-2xl p-2 border border-gray-100 shadow-sm">
        <img
          src={item.fotoUrl || item.imageUrl || 'https://via.placeholder.com/400?text=Sem+Foto'}
          alt={item.titulo || item.title}
          className="w-full h-56 object-cover rounded-xl bg-gray-50"
        />
      </div>

      {/* Bloco de Detalhes */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-3">
        <div className="flex justify-between items-start">
          <h1 className="text-base font-bold text-gray-800">{item.titulo || item.title}</h1>
          
          <span
            className={`px-2.5 py-0.5 text-[10px] font-bold rounded-md uppercase ${
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

        <div className="space-y-2 text-xs text-gray-600">
          <div>
            <span className="font-semibold text-gray-700 block mb-0.5">Descrição:</span>
            <p className="text-gray-500 leading-relaxed">{item.descricao || 'Sem descrição cadastrada.'}</p>
          </div>

          <div className="pt-2 border-t border-gray-100 grid grid-cols-2 gap-2 text-[11px] text-gray-500">
            <span className="flex items-center gap-1 truncate">
              <MapPin size={12} className="text-indigo-900" /> {item.localEncontrado || item.local || 'Não especificado'}
            </span>
            <span className="flex items-center gap-1 truncate">
              <Calendar size={12} className="text-indigo-900" /> {formatarDataRegistro()}
            </span>
          </div>
        </div>

        {/* Feedback de Sucesso */}
        {mensagemSucesso && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl text-xs space-y-1">
            <p className="font-bold">Solicitação enviada com sucesso!</p>
            <p className="text-[11px]">
              A administração analisará a solicitação. Dirija-se ao setor de Achados e Perdidos e apresente seu número de cadastro para conferência.
            </p>
          </div>
        )}

        {/* BOTÃO DE EDIÇÃO - Exclusivo para Administradores */}
        {eAdmin && (
          <div className="pt-1">
            <button
              onClick={() => navigate(`/editar-item/${item.id}`)}
              className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl text-xs shadow-sm transition flex items-center justify-center gap-2"
            >
              <Edit size={16} />
              <span>Editar Item</span>
            </button>
          </div>
        )}

        {/* BOTÃO DE REIVINDICAÇÃO - Exclusivo para Alunos (Usuários Comuns) */}
        {!eAdmin && (
          <div className="pt-1">
            <button
              onClick={() => setIsModalOpen(true)}
              disabled={statusAtual !== 'disponível' || mensagemSucesso}
              className={`w-full py-2.5 rounded-xl font-semibold text-xs text-white transition flex items-center justify-center gap-2 ${
                statusAtual === 'disponível' && !mensagemSucesso
                  ? 'bg-indigo-900 hover:bg-indigo-800 active:scale-[0.98]'
                  : 'bg-gray-300 cursor-not-allowed'
              }`}
            >
              <ShieldCheck size={16} />
              {statusAtual === 'disponível' && !mensagemSucesso ? 'Reivindicar Pertence' : `Item ${item.status}`}
            </button>
          </div>
        )}
      </div>

      {/* Modal de Prevenção de Erros */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-gray-900">Reivindicar este pertence?</h3>
            <p className="text-xs text-gray-600">
              Ao confirmar, um registro de intenção de retirada será enviado com seu número de cadastro para conferência presencial no campus.
            </p>

            <div className="flex gap-2 text-xs font-semibold">
              <button
                onClick={() => setIsModalOpen(false)}
                disabled={submitting}
                className="flex-1 py-2 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50"
              >
                Voltar
              </button>
              <button
                onClick={handleSolicitarDevolucao}
                disabled={submitting}
                className="flex-1 py-2 bg-indigo-900 rounded-xl text-white hover:bg-indigo-800 flex justify-center items-center gap-1"
              >
                {submitting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  'Confirmar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}