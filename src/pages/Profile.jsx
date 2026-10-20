import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { collection, query, where, getDocs, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { 
  User, Mail, LogOut, Shield, Clock, FileCheck, 
  PackagePlus, Info, Loader2, XCircle, Users 
} from 'lucide-react';
import { auth, db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';

export default function Profile() {
  const { usuario, eAdmin } = useAuth();
  const navigate = useNavigate();
  
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [carregandoSolicitacoes, setCarregandoSolicitacoes] = useState(true);
  const [processandoId, setProcessandoId] = useState(null);

  // Busca as solicitações reais do usuário no Firestore
  useEffect(() => {
    async function carregarSolicitacoes() {
      if (!usuario?.uid) {
        setCarregandoSolicitacoes(false);
        return;
      }

      try {
        const q = query(
          collection(db, 'solicitacoesDevolucao'),
          where('usuarioId', '==', usuario.uid)
        );
        const querySnapshot = await getDocs(q);
        const lista = querySnapshot.docs.map(docSnap => ({
          id: docSnap.id,
          ...docSnap.data()
        }));
        setSolicitacoes(lista);
      } catch (err) {
        console.error("Erro ao buscar solicitações do usuário:", err);
      } finally {
        setCarregandoSolicitacoes(false);
      }
    }

    carregarSolicitacoes();
  }, [usuario]);

  // Função para cancelar a reivindicação e liberar o item de volta
  const handleCancelarSolicitacao = async (solicitacaoId, itemId) => {
    if (!window.confirm("Deseja realmente cancelar esta reivindicação? O item voltará a ficar disponível para outros alunos.")) {
      return;
    }

    setProcessandoId(solicitacaoId);
    try {
      // 1. Remove a solicitação
      await deleteDoc(doc(db, 'solicitacoesDevolucao', solicitacaoId));

      // 2. Retorna o status do item para 'disponível'
      if (itemId) {
        const itemRef = doc(db, 'itens', itemId);
        await updateDoc(itemRef, { status: 'disponível' });
      }

      // 3. Atualiza a lista na UI
      setSolicitacoes(prev => prev.filter(sol => sol.id !== solicitacaoId));
    } catch (err) {
      console.error("Erro ao cancelar solicitação:", err);
      alert("Não foi possível cancelar a solicitação. Tente novamente.");
    } finally {
      setProcessandoId(null);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error("Erro ao encerrar a sessão:", error);
    }
  };

  return (
    <div className="space-y-6 pb-20 max-w-4xl mx-auto">
      
      {/* 1. Cartão do Usuário */}
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0 w-full sm:w-auto">
          <div className={`w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center shrink-0 border ${
            eAdmin ? 'bg-amber-50 border-amber-200' : 'bg-indigo-50 border-indigo-200'
          }`}>
            {eAdmin ? (
              <Shield size={30} className="text-amber-700" />
            ) : (
              <User size={30} className="text-indigo-900" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base md:text-lg font-bold text-gray-900 truncate">
              {usuario?.nome || usuario?.displayName || 'Usuário UEMG'}
            </h2>
            <p className="text-xs text-gray-500 flex items-center gap-1.5 truncate mt-0.5">
              <Mail size={13} className="shrink-0 text-gray-400" /> {usuario?.email || 'usuario@aluno.uemg.br'}
            </p>
            <span className={`inline-flex items-center gap-1 mt-1.5 text-[10px] md:text-xs font-semibold px-2.5 py-0.5 rounded-md ${
              eAdmin ? 'bg-amber-100 text-amber-900' : 'bg-indigo-50 text-indigo-800'
            }`}>
              {eAdmin ? 'Administrador — Campus Divinópolis' : 'Estudante — Campus Divinópolis'}
            </span>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-100 rounded-xl transition flex items-center justify-center gap-2 shrink-0 active:scale-[0.98]"
          title="Sair da Conta"
        >
          <LogOut size={16} />
          <span>Sair da Conta</span>
        </button>
      </div>

      {/* 2. PAINEL DO ADMINISTRADOR */}
      {eAdmin ? (
        <div className="bg-gradient-to-br from-amber-50/80 to-orange-50/50 border border-amber-200/80 p-5 md:p-6 rounded-2xl space-y-4 shadow-xs">
          <div>
            <h3 className="text-xs md:text-sm font-bold text-amber-900 uppercase tracking-wider flex items-center gap-2">
              <Shield size={18} className="text-amber-700" />
              Painel de Gestão da Administração
            </h3>
            <p className="text-xs text-amber-800 mt-1 leading-relaxed">
              Gerencie o cadastro de pertences e controle as permissões dos administradores do campus.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <button 
              onClick={() => navigate('/registrar-item')}
              className="flex items-center justify-center gap-2 p-3.5 bg-amber-600 text-white font-semibold rounded-xl text-xs md:text-sm hover:bg-amber-700 transition shadow-xs active:scale-[0.98]"
            >
              <PackagePlus size={18} />
              <span>Cadastrar Novo Pertence</span>
            </button>

            <button 
              onClick={() => navigate('/gerenciar-usuarios')}
              className="flex items-center justify-center gap-2 p-3.5 bg-indigo-900 text-white font-semibold rounded-xl text-xs md:text-sm hover:bg-indigo-800 transition shadow-xs active:scale-[0.98]"
            >
              <Users size={18} />
              <span>Gerenciar Administradores</span>
            </button>
          </div>
        </div>
      ) : (
        /* 3. GUIA RÁPIDA PARA O ESTUDANTE */
        <div className="bg-blue-50/80 border border-blue-100 p-4 rounded-2xl space-y-2 shadow-xs">
          <div className="flex items-center gap-2 text-blue-900 font-bold text-xs md:text-sm">
            <Info size={18} className="text-blue-700 shrink-0" />
            <span>Encontrou algum pertence perdido no campus?</span>
          </div>
          <p className="text-xs text-blue-800 leading-relaxed">
            Entregue o objeto diretamente no setor de <strong className="font-semibold">Achados e Perdidos (Administração)</strong>. A equipe realizará o registro oficial no sistema com foto para que o proprietário possa resgatá-lo.
          </p>
        </div>
      )}

      {/* 4. SEÇÃO DE SOLICITAÇÕES DE RETIRADA (Exclusivo Aluno) */}
      {!eAdmin && (
        <div className="space-y-4">
          <h3 className="text-xs md:text-sm font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
            <Clock size={18} className="text-indigo-900" />
            Minhas Solicitações de Retirada ({solicitacoes.length})
          </h3>

          {carregandoSolicitacoes ? (
            <div className="flex flex-col items-center justify-center py-10 text-gray-400">
              <Loader2 className="w-7 h-7 animate-spin text-indigo-900 mb-2" />
              <p className="text-xs">Carregando suas solicitações...</p>
            </div>
          ) : solicitacoes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {solicitacoes.map(sol => {
                const statusLower = (sol.status || '').toLowerCase();
                return (
                  <div key={sol.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs space-y-3 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex justify-between items-start gap-2">
                        <h4 className="text-xs md:text-sm font-bold text-gray-900 line-clamp-1">{sol.itemTitulo || 'Pertence'}</h4>
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-md uppercase shrink-0 ${
                          statusLower === 'pendente' 
                            ? 'bg-amber-100 text-amber-800' 
                            : statusLower === 'aprovado' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {sol.status || 'Pendente'}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500">Setor de Achados e Perdidos — Administração</p>

                      <div className="bg-indigo-50/50 border border-indigo-100 p-3 rounded-xl text-xs text-indigo-900 space-y-0.5">
                        <p className="font-semibold">Aguardando conferência presencial.</p>
                        <p className="text-[11px] text-indigo-700">
                          Apresente sua matrícula e e-mail institucional no balcão de atendimento.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                      <span className="text-[10px] text-gray-400 flex items-center gap-1">
                        <FileCheck size={13} /> Registrado
                      </span>

                      <button
                        onClick={() => handleCancelarSolicitacao(sol.id, sol.itemId)}
                        disabled={processandoId === sol.id}
                        className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2.5 py-1 rounded-lg transition flex items-center gap-1 disabled:opacity-50"
                      >
                        {processandoId === sol.id ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <XCircle size={14} />
                        )}
                        <span>Cancelar Pedido</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-8 text-center space-y-1.5 border border-gray-100 shadow-xs">
              <p className="text-xs md:text-sm text-gray-700 font-bold">Você ainda não possui solicitações ativas.</p>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">
                Os pertences que você solicitar na vitrine aparecerão organizados nesta área para acompanhamento.
              </p>
            </div>
          )}
        </div>
      )}

    </div>
  );
}