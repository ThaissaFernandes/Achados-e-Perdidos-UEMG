import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { collection, query, where, getDocs, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { 
  User, Mail, LogOut, Shield, Clock, FileCheck, 
  PackagePlus, MapPinPlus, Info, Loader2, XCircle 
} from 'lucide-react';
import { auth, db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';

export default function Profile() {
  const { usuario } = useAuth();
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
          collection(db, 'solicitacoesDevolucao'), // Nome da coleção onde as solicitações são salvas
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
      // 1. Remove o documento da solicitação no Firestore
      await deleteDoc(doc(db, 'solicitacoes', solicitacaoId));

      // 2. Se houver o ID do item vinculado, retorna o status dele para 'disponível'
      if (itemId) {
        const itemRef = doc(db, 'itens', itemId);
        await updateDoc(itemRef, { status: 'disponível' });
      }

      // 3. Atualiza o estado local removendo a solicitação cancelada da tela
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

  const isAdmin = usuario?.tipo === 'admin';

  return (
    <div className="space-y-5 pb-20 max-w-md mx-auto">
      
      {/* 1. Cartão do Usuário */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 border ${
            isAdmin ? 'bg-amber-50 border-amber-200' : 'bg-indigo-100 border-indigo-200'
          }`}>
            {isAdmin ? (
              <Shield size={28} className="text-amber-700" />
            ) : (
              <User size={28} className="text-indigo-900" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-bold text-gray-900 truncate">
              {usuario?.nome || 'Usuário UEMG'}
            </h2>
            <p className="text-xs text-gray-500 flex items-center gap-1 truncate">
              <Mail size={12} /> {usuario?.email || 'usuario@aluno.uemg.br'}
            </p>
            <span className={`inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-md ${
              isAdmin ? 'bg-amber-100 text-amber-800' : 'bg-indigo-50 text-indigo-700'
            }`}>
              {isAdmin ? 'Administrador — Campus Divinópolis' : 'Estudante — Campus Divinópolis'}
            </span>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="p-2.5 text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors shrink-0"
          title="Sair da Conta"
        >
          <LogOut size={18} />
        </button>
      </div>

      {/* 2. PAINEL DO ADMINISTRADOR */}
      {isAdmin ? (
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 p-4 rounded-2xl space-y-3">
          <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
            <Shield size={16} className="text-amber-700" />
            Painel de Gestão da Administração
          </h3>
          <p className="text-[11px] text-amber-800">
            Cadastre pertences entregues no setor ou gerencie as opções do sistema.
          </p>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button 
              onClick={() => navigate('/registrar-item')}
              className="flex items-center justify-center gap-1.5 p-3 bg-amber-600 text-white font-semibold rounded-xl text-xs hover:bg-amber-700 transition shadow-sm col-span-2 active:scale-[0.98]"
            >
              <PackagePlus size={16} />
              Cadastrar Novo Pertence
            </button>
          </div>
        </div>
      ) : (
        /* 3. GUIA RÁPIDA PARA O ESTUDANTE */
        <div className="bg-blue-50 border border-blue-100 p-3.5 rounded-2xl space-y-1.5">
          <div className="flex items-center gap-1.5 text-blue-900 font-bold text-xs">
            <Info size={16} className="text-blue-700" />
            Encontrou algum pertence perdido no campus?
          </div>
          <p className="text-[11px] text-blue-800 leading-relaxed">
            Entregue o objeto diretamente na <strong className="font-semibold">Administração do Campus</strong>. A equipe responsável fará o cadastro oficial no sistema para que o dono possa resgatá-lo.
          </p>
        </div>
      )}

      {/* 4. SEÇÃO DE SOLICITAÇÕES DE RETIRADA (Exclusivo Aluno) */}
      {!isAdmin && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
            <Clock size={16} className="text-indigo-600" />
            Minhas Solicitações de Retirada ({solicitacoes.length})
          </h3>

          {carregandoSolicitacoes ? (
            <div className="flex justify-center py-6 text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-900" />
            </div>
          ) : solicitacoes.length > 0 ? (
            solicitacoes.map(sol => {
              const statusLower = (sol.status || '').toLowerCase();
              return (
                <div key={sol.id} className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-sm space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-xs font-bold text-gray-900">{sol.itemTitulo || 'Pertence'}</h4>
                      <p className="text-[11px] text-gray-500 mt-0.5">Administração — Setor de Achados e Perdidos</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                      statusLower === 'pendente' 
                        ? 'bg-amber-100 text-amber-800' 
                        : statusLower === 'aprovado' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {sol.status || 'Pendente'}
                    </span>
                  </div>

                  <div className="bg-indigo-50/50 border border-indigo-100 p-2.5 rounded-xl text-[11px] text-indigo-900 space-y-0.5">
                    <p className="font-semibold">Aguardando conferência presencial.</p>
                    <p className="text-[10px] text-indigo-700">
                      Dirija-se ao balcão e apresente sua matrícula e e-mail institucional.
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-gray-50">
                    <span className="text-[10px] text-gray-400 flex items-center gap-1">
                      <FileCheck size={12} /> Solicitação registrada
                    </span>

                    {/* Botão de Cancelamento da Reivindicação */}
                    <button
                      onClick={() => handleCancelarSolicitacao(sol.id, sol.itemId)}
                      disabled={processandoId === sol.id}
                      className="text-[11px] font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 px-2.5 py-1 rounded-lg transition flex items-center gap-1 disabled:opacity-50"
                    >
                      {processandoId === sol.id ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <XCircle size={13} />
                      )}
                      <span>Cancelar Pedido</span>
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="bg-white rounded-2xl p-6 text-center space-y-2 border border-gray-100 shadow-sm">
              <p className="text-xs text-gray-600 font-semibold">Você ainda não possui solicitações de retirada.</p>
              <p className="text-[11px] text-gray-400">
                Os itens que você reivindicar na tela inicial aparecerão listados aqui automaticamente.
              </p>
            </div>
          )}
        </div>
      )}

    </div>
  );
}