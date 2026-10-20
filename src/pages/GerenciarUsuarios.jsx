import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import CriarAdminModal from '../components/CriarAdminModal';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Search, 
  UserCheck, 
  UserX, 
  UserPlus, 
  Loader2, 
  ArrowLeft,
  Trash2
} from 'lucide-react';

export default function GerenciarUsuarios() {
  const navigate = useNavigate();
  
  const { eAdmin, usuario: adminAtual, carregando, loading: authLoading } = useAuth();
  const emCarregamentoAuth = carregando || authLoading;

  const [usuarios, setUsuarios] = useState([]);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);
  const [processandoId, setProcessandoId] = useState(null);
  const [modalAdminAberto, setModalAdminAberto] = useState(false);

  // Redireciona APENAS após terminar de carregar a autenticação e confirmar que NÃO é admin
  useEffect(() => {
    if (!emCarregamentoAuth && !eAdmin) {
      navigate('/');
    }
  }, [eAdmin, emCarregamentoAuth, navigate]);

  // Função para carregar os utilizadores do Firestore
  const carregarUsuarios = useCallback(async () => {
    try {
      setLoading(true);
      const querySnapshot = await getDocs(collection(db, 'usuarios'));
      const lista = querySnapshot.docs.map((d) => ({
        id: d.id,
        ...d.data()
      }));
      setUsuarios(lista);
    } catch (err) {
      console.error('Erro ao buscar utilizadores:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!emCarregamentoAuth && eAdmin) {
      carregarUsuarios();
    }
  }, [carregarUsuarios, emCarregamentoAuth, eAdmin]);

  // Função para alternar o status de Administrador
  const toggleStatusAdmin = async (targetUserId, eAdminAtual) => {
    if (targetUserId === adminAtual?.uid) {
      alert('Não pode revogar o seu próprio acesso de administrador por aqui.');
      return;
    }

    setProcessandoId(targetUserId);
    const novoStatus = !eAdminAtual;

    try {
      const userRef = doc(db, 'usuarios', targetUserId);
      await updateDoc(userRef, { 
        eAdmin: novoStatus,
        tipo: novoStatus ? 'admin' : 'usuario'
      });

      setUsuarios((prev) =>
        prev.map((u) => (
          u.id === targetUserId 
            ? { ...u, eAdmin: novoStatus, tipo: novoStatus ? 'admin' : 'usuario' } 
            : u
        ))
      );
    } catch (err) {
      console.error('Erro ao atualizar permissão:', err);
      alert('Erro ao atualizar permissão do utilizador.');
    } finally {
      setProcessandoId(null);
    }
  };

  // Função para excluir utilizador do Firestore
  const excluirUsuario = async (targetUserId, nomeUsuario) => {
    if (targetUserId === adminAtual?.uid) {
      alert('Não pode excluir a sua própria conta de administrador.');
      return;
    }

    const confirmacao = window.confirm(
      `Tem a certeza de que deseja excluir permanentemente o utilizador "${nomeUsuario || 'Sem nome'}"?\n\nEsta ação removerá os dados do utilizador do sistema.`
    );

    if (!confirmacao) return;

    setProcessandoId(targetUserId);

    try {
      // Remove o documento da coleção "usuarios" no Firestore
      await deleteDoc(doc(db, 'usuarios', targetUserId));

      // Atualiza a lista local removendo o utilizador
      setUsuarios((prev) => prev.filter((u) => u.id !== targetUserId));
      alert('Utilizador eliminado com sucesso!');
    } catch (err) {
      console.error('Erro ao excluir utilizador:', err);
      alert('Erro ao excluir o utilizador do sistema.');
    } finally {
      setProcessandoId(null);
    }
  };

  // Filtro de busca por Nome, E-mail ou Matrícula
  const usuariosFiltrados = usuarios.filter((u) => {
    const termo = busca.toLowerCase();
    const nome = (u.nome || u.displayName || '').toLowerCase();
    const email = (u.email || '').toLowerCase();
    const matricula = (u.matricula || u.numeroCadastro || '').toLowerCase();
    return nome.includes(termo) || email.includes(termo) || matricula.includes(termo);
  });

  if (emCarregamentoAuth) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-900 mb-2" />
        <p className="text-xs">A verificar permissões de acesso...</p>
      </div>
    );
  }

  if (loading && usuarios.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-900 mb-2" />
        <p className="text-xs">A carregar lista de utilizadores...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-20">
      
      {/* Botão de Voltar */}
      <div>
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-indigo-900 transition mb-2 cursor-pointer"
        >
          <ArrowLeft size={16} /> Voltar
        </button>
      </div>

      {/* Cabeçalho com Ações */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-gray-100 shadow-xs">
        <div>
          <h1 className="text-lg md:text-2xl font-bold text-gray-900">
            Gestão de Administradores
          </h1>
          <p className="text-xs md:text-sm text-gray-500 mt-0.5">
            Cadastre novos gestores, altere permissões ou remova utilizadores do sistema
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="bg-amber-50 border border-amber-200 text-amber-900 px-3 py-2 rounded-xl text-xs flex items-center gap-2">
            <ShieldAlert size={16} className="text-amber-700 shrink-0" />
            <span className="font-semibold">Setor Administrativo</span>
          </div>

          {/* Botão de Abrir Modal para Criar Admin */}
          <button
            onClick={() => setModalAdminAberto(true)}
            className="bg-indigo-900 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-indigo-800 transition shadow-xs cursor-pointer active:scale-[0.98]"
          >
            <UserPlus size={16} />
            <span>Novo Admin</span>
          </button>
        </div>
      </div>

      {/* Barra de Pesquisa */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
        <div className="relative">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar utilizador por nome, e-mail ou matrícula..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-xs md:text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-900 focus:bg-white transition"
          />
        </div>
      </div>

      {/* Lista de Utilizadores */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
        <div className="divide-y divide-gray-100">
          {usuariosFiltrados.length > 0 ? (
            usuariosFiltrados.map((u) => {
              const eProprioAdmin = u.id === adminAtual?.uid;

              return (
                <div
                  key={u.id}
                  className="p-4 md:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50/50 transition"
                >
                  {/* Informações do Utilizador */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-900 font-bold flex items-center justify-center text-sm shrink-0">
                      {(u.nome || u.email || 'U').charAt(0).toUpperCase()}
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <p className="text-xs md:text-sm font-bold text-gray-800">
                          {u.nome || u.displayName || 'Utilizador Sem Nome'}
                        </p>
                        {u.eAdmin ? (
                          <span className="bg-amber-100 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase flex items-center gap-1">
                            <ShieldCheck size={12} className="text-amber-700" /> Admin
                          </span>
                        ) : (
                          <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase">
                            Aluno
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">{u.email}</p>
                      {(u.matricula || u.numeroCadastro) && (
                        <p className="text-[11px] text-gray-400">
                          Matrícula: {u.matricula || u.numeroCadastro}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Ações: Promover / Revogar e Excluir */}
                  <div className="flex items-center gap-2">
                    {eProprioAdmin ? (
                      <span className="text-[11px] font-medium text-gray-400 italic px-3 py-1.5">
                        Sua Conta Atual
                      </span>
                    ) : (
                      <>
                        <button
                          onClick={() => toggleStatusAdmin(u.id, u.eAdmin)}
                          disabled={processandoId === u.id}
                          className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                            u.eAdmin
                              ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                              : 'bg-indigo-900 text-white hover:bg-indigo-800 shadow-xs'
                          }`}
                        >
                          {processandoId === u.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : u.eAdmin ? (
                            <>
                              <UserX size={14} /> Revogar Admin
                            </>
                          ) : (
                            <>
                              <UserCheck size={14} /> Promover a Admin
                            </>
                          )}
                        </button>

                        {/* Botão de Excluir Utilizador */}
                        <button
                          onClick={() => excluirUsuario(u.id, u.nome || u.displayName)}
                          disabled={processandoId === u.id}
                          title="Excluir utilizador"
                          className="p-2 rounded-xl text-xs font-semibold bg-gray-100 text-gray-600 hover:bg-rose-100 hover:text-rose-700 transition cursor-pointer border border-gray-200 active:scale-95"
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-xs text-gray-400">
              Nenhum utilizador encontrado para a busca informada.
            </div>
          )}
        </div>
      </div>

      {/* Modal para Cadastro Direto de Administradores */}
      <CriarAdminModal
        isOpen={modalAdminAberto}
        onClose={() => setModalAdminAberto(false)}
        onSucesso={carregarUsuarios}
      />

    </div>
  );
}