
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';

import {
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';

import {
  User,
  Mail,
  LogOut,
  Shield,
  Clock,
  FileCheck,
  PackagePlus,
  Info,
  Loader2,
  XCircle,
  Users,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';

import { auth, db } from '../config/firebase';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { cancelarSolicitacao } from '../services/solicitacaoService';
import CodigoRetirada from '../components/CodigoRetirada';

// =====================================================
// CONSULTAR SOLICITAÇÕES DO USUÁRIO
// =====================================================

// A função fica fora do componente para que o efeito
// não dependa de uma função recriada a cada renderização.

async function buscarSolicitacoesDoUsuario(uid) {
  const consulta = query(
    collection(db, 'solicitacoesDevolucao'),
    where('usuarioId', '==', uid)
  );

  const snapshot = await getDocs(consulta);

  return snapshot.docs.map((documento) => ({
    id: documento.id,
    ...documento.data(),
  }));
}

// =====================================================
// FORMATAR DATA
// =====================================================

function formatarData(sol) {
  const data =
    sol.dataSolicitacao ||
    sol.criadoEm ||
    sol.data;

  if (data?.seconds) {
    return new Date(
      data.seconds * 1000
    )
      .toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
      .replace('.', '');
  }

  return 'Recente';
}

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

export default function Profile() {
  const { usuario, eAdmin } = useAuth();

  const navigate = useNavigate();
  const toast = useToast();

  const uid = usuario?.uid;

  // ===================================================
  // ESTADOS
  // ===================================================

  const [solicitacoes, setSolicitacoes] = useState([]);

  const [
    carregandoSolicitacoes,
    setCarregandoSolicitacoes,
  ] = useState(true);

  const [processandoId, setProcessandoId] = useState(null);

  const [erro, setErro] = useState(false);

  // ===================================================
  // RECARREGAR SOLICITAÇÕES MANUALMENTE
  // ===================================================

  const carregarSolicitacoes = useCallback(async () => {
    if (!uid || eAdmin) {
      return;
    }

    setCarregandoSolicitacoes(true);
    setErro(false);

    try {
      const lista = await buscarSolicitacoesDoUsuario(uid);

      // Evita apresentar resultados de uma conta anterior
      // caso o usuário tenha trocado de sessão.
      if (auth.currentUser?.uid !== uid) {
        return;
      }

      setSolicitacoes(lista);
    } catch (error) {
      console.error(
        'Erro ao buscar solicitações do usuário:',
        error
      );

      if (auth.currentUser?.uid === uid) {
        setErro(true);
      }
    } finally {
      if (auth.currentUser?.uid === uid) {
        setCarregandoSolicitacoes(false);
      }
    }
  }, [uid, eAdmin]);

  // ===================================================
  // CARREGAMENTO INICIAL
  // ===================================================

  useEffect(() => {
    if (!uid || eAdmin) {
      return;
    }

    let ativo = true;

    // A consulta é assíncrona.
    // As atualizações de estado ocorrem depois
    // da resposta do Firestore, não diretamente
    // no corpo do efeito.

    async function consultar() {
      try {
        const lista = await buscarSolicitacoesDoUsuario(uid);

        if (!ativo) {
          return;
        }

        setSolicitacoes(lista);
        setErro(false);
      } catch (error) {
        if (!ativo) {
          return;
        }

        console.error(
          'Erro ao carregar solicitações do perfil:',
          error
        );

        setErro(true);
      } finally {
        if (ativo) {
          setCarregandoSolicitacoes(false);
        }
      }
    }

    consultar();

    // Evita atualizações de uma consulta anterior
    // quando o componente é desmontado ou o UID muda.
    return () => {
      ativo = false;
    };
  }, [uid, eAdmin]);

  // ===================================================
  // CANCELAR SOLICITAÇÃO
  // ===================================================

  const handleCancelarSolicitacao = async (solicitacaoId) => {
    const confirmou = window.confirm(
      'Deseja realmente cancelar esta reivindicação? ' +
      'O item voltará a ficar disponível para outros alunos.'
    );

    if (!confirmou) {
      return;
    }

    setProcessandoId(solicitacaoId);

    try {
      // A transação cancela sem excluir o histórico.
      await cancelarSolicitacao(solicitacaoId);

      // Atualiza a lista após a confirmação do Firestore.
      await carregarSolicitacoes();

      toast.sucesso(
        'Pedido cancelado. O item voltou a ficar disponível.'
      );
    } catch (error) {
      console.error(
        'Erro ao cancelar solicitação:',
        error
      );

      toast.erro(
        'Não foi possível cancelar o pedido. ' +
        'Verifique sua conexão e tente novamente.'
      );
    } finally {
      setProcessandoId(null);
    }
  };

  // ===================================================
  // SAIR DA CONTA
  // ===================================================

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error(
        'Erro ao encerrar a sessão:',
        error
      );

      toast.erro(
        'Não foi possível sair da conta. Tente novamente.'
      );
    }
  };

  // ===================================================
  // INTERFACE
  // ===================================================

  return (
    <div className="space-y-6 pb-28 sm:pb-10 max-w-4xl mx-auto">

      {/* ============================================== */}
      {/* 1. CARTÃO DO USUÁRIO */}
      {/* ============================================== */}

      <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">

        <div className="flex items-center gap-4 min-w-0 w-full sm:w-auto">

          <div
            className={`w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center shrink-0 border ${
              eAdmin
                ? 'bg-amber-50 border-amber-200'
                : 'bg-indigo-50 border-indigo-200'
            }`}
          >
            {eAdmin ? (
              <Shield
                size={30}
                className="text-amber-700"
              />
            ) : (
              <User
                size={30}
                className="text-indigo-900"
              />
            )}
          </div>

          <div className="min-w-0 flex-1">

            <h2 className="text-base md:text-lg font-bold text-gray-900 truncate">
              {usuario?.nome ||
                usuario?.displayName ||
                'Usuário UEMG'}
            </h2>

            <p className="text-xs text-gray-600 flex items-center gap-1.5 truncate mt-0.5">
              <Mail
                size={13}
                className="shrink-0 text-gray-600"
              />

              {usuario?.email || 'E-mail não informado'}
            </p>

            <span
              className={`inline-flex items-center gap-1 mt-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-lg ${
                eAdmin
                  ? 'bg-amber-100 text-amber-900'
                  : 'bg-indigo-50 text-indigo-800'
              }`}
            >
              {eAdmin
                ? 'Administrador — Campus Divinópolis'
                : 'Estudante — Campus Divinópolis'}
            </span>

          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          aria-label="Sair da Conta"
          title="Sair da Conta"
          className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-100 rounded-xl transition flex items-center justify-center gap-2 shrink-0 cursor-pointer active:scale-[0.98]"
        >
          <LogOut size={16} />
          <span>Sair da Conta</span>
        </button>

      </div>

      {/* ============================================== */}
      {/* 2. PAINEL DO ADMINISTRADOR */}
      {/* ============================================== */}

      {eAdmin ? (
        <div className="bg-amber-50 from-amber-50/80 to-orange-50/50 border border-amber-200/80 p-5 md:p-6 rounded-3xl space-y-4 shadow-xs">

          <div>
            <h3 className="text-xs md:text-sm font-bold text-amber-900 uppercase tracking-wider flex items-center gap-2">
              <Shield
                size={18}
                className="text-amber-700"
              />
              Painel de Gestão da Administração
            </h3>

            <p className="text-xs text-amber-800 mt-1 leading-relaxed">
              Gerencie o cadastro de pertences e consulte
              os registros dos usuários do campus.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">

            <button
              type="button"
              onClick={() => navigate('/registrar-item')}
              className="flex items-center justify-center gap-2 p-3.5 bg-amber-600 text-white font-semibold rounded-xl text-xs md:text-sm hover:bg-amber-700 transition shadow-xs cursor-pointer active:scale-[0.98]"
            >
              <PackagePlus size={18} />
              <span>Cadastrar Novo Pertence</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/gerenciar-usuarios')}
              className="flex items-center justify-center gap-2 p-3.5 bg-indigo-900 text-white font-semibold rounded-xl text-xs md:text-sm hover:bg-indigo-800 transition shadow-xs cursor-pointer active:scale-[0.98]"
            >
              <Users size={18} />
              <span>Gerenciar Usuários</span>
            </button>

          </div>
        </div>
      ) : (

        /* ============================================ */
        /* 3. GUIA RÁPIDO PARA O ESTUDANTE */
        /* ============================================ */

        <div
          className="profile-info-box p-4 sm:p-5 rounded-3xl space-y-2 shadow-xs"
          role="note"
          aria-label="Orientação sobre objetos encontrados"
        >

          <div className="profile-info-heading flex items-center gap-2 font-bold text-xs md:text-sm">
            <Info
              size={18}
              className="profile-info-icon shrink-0"
              aria-hidden="true"
            />

            <span>
              Encontrou algum pertence perdido no campus?
            </span>
          </div>

          <p className="profile-info-description text-xs leading-relaxed">
            Entregue o objeto diretamente no setor de{' '}
            <strong className="font-semibold">
              Achados e Perdidos (Administração)
            </strong>
            . A equipe realizará o registro oficial no sistema
            com foto para que o proprietário possa resgatá-lo.
          </p>

        </div>
      )}

      {/* ============================================== */}
      {/* 4. SOLICITAÇÕES DE RETIRADA */}
      {/* ============================================== */}

      {!eAdmin && (
        <div className="space-y-4">

          <h3 className="text-xs md:text-sm font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
            <Clock
              size={18}
              className="text-indigo-900"
            />

            Minhas Solicitações de Retirada ({solicitacoes.length})
          </h3>

          {/* CARREGAMENTO */}

          {carregandoSolicitacoes ? (
            <div
              className="flex flex-col items-center justify-center py-10 text-gray-600"
              role="status"
              aria-live="polite"
            >
              <Loader2
                className="w-7 h-7 animate-spin text-indigo-900 mb-2"
                aria-hidden="true"
              />

              <p className="text-xs">
                Carregando suas solicitações...
              </p>
            </div>

          ) : erro ? (

            /* ERRO DE CONSULTA */

            <div
              className="bg-rose-50 border border-rose-100 text-rose-700 rounded-3xl p-6 text-center text-xs space-y-2"
              role="alert"
            >
              <AlertCircle className="w-6 h-6 mx-auto text-rose-500" />

              <p className="font-semibold">
                Erro ao carregar solicitações.
              </p>

              <button
                type="button"
                onClick={carregarSolicitacoes}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 text-white rounded-xl font-bold text-xs hover:bg-rose-700 transition cursor-pointer"
              >
                <RotateCcw size={14} />
                Tentar Novamente
              </button>
            </div>

          ) : solicitacoes.length > 0 ? (

            /* LISTA DE SOLICITAÇÕES */

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">

              {solicitacoes.map((sol) => {
                const statusLower = (sol.status || '')
                  .trim()
                  .toLocaleLowerCase('pt-BR');

                const pendente =
                  statusLower === 'pendente' ||
                  statusLower === 'em análise';

                return (
                  <div
                    key={sol.id}
                    className="bg-white p-4.5 rounded-3xl border border-gray-100 shadow-xs space-y-3 flex flex-col justify-between"
                  >

                    <div className="space-y-2">

                      <div className="flex justify-between items-start gap-2">

                        <h4 className="text-xs md:text-sm font-bold text-gray-900 line-clamp-1">
                          {sol.itemTitulo || 'Pertence'}
                        </h4>

                        <span
                          className={`text-xs font-bold px-2.5 py-0.5 rounded-md uppercase shrink-0 ${
                            pendente
                              ? 'bg-amber-100 text-amber-800'
                              : statusLower === 'aprovado' ||
                                  statusLower === 'concluído'
                                ? 'bg-emerald-100 text-emerald-800'
                                : statusLower === 'recusado'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {sol.status || 'Pendente'}
                        </span>

                      </div>

                      <p className="text-xs text-gray-600">
                        Setor de Achados e Perdidos — Administração
                      </p>

                      {/* PEDIDO PENDENTE */}

                      {pendente ? (
                        <div className="space-y-2">

                          <CodigoRetirada codigo={sol.codigo} />

                         <div className="profile-pickup-notice p-3 rounded-2xl text-xs space-y-0.5">

                            <p className="font-semibold">
                              Aguardando conferência presencial.
                            </p>

                            <p className="text-xs">
                              No balcão de atendimento, informe{' '}
                              {sol.codigo
                                ? 'o código acima e '
                                : ''}
                              sua matrícula
                              {sol.numeroCadastro
                                ? ` (${sol.numeroCadastro})`
                                : ''}
                              .
                            </p>

                          </div>
                        </div>

                      ) : statusLower === 'recusado' ? (

                        /* PEDIDO RECUSADO */

                        <div className="bg-rose-50 border border-rose-100 p-3 rounded-2xl text-xs text-rose-900 space-y-0.5">

                          <p className="font-semibold">
                            Pedido recusado.
                          </p>

                          <p className="text-xs text-rose-800">
                            O item voltou à lista. Procure a
                            administração se tiver dúvidas.
                          </p>

                        </div>

                      ) : statusLower === 'cancelado' ? (

                        /* PEDIDO CANCELADO */

                        <div className="bg-gray-100 border border-gray-200 p-3 rounded-2xl text-xs text-gray-800 space-y-0.5">

                          <p className="font-semibold">
                            Solicitação cancelada.
                          </p>

                          <p>
                            Você cancelou esta solicitação.
                            O objeto voltou a ficar disponível
                            para outros usuários.
                          </p>

                        </div>

                      ) : statusLower === 'concluído' ||
                          statusLower === 'aprovado' ? (

                        /* PEDIDO CONCLUÍDO */

                        <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-2xl text-xs text-emerald-900 space-y-0.5">

                          <p className="font-semibold">
                            Item entregue a você.
                          </p>

                          <p className="text-xs text-emerald-800">
                            A devolução foi confirmada
                            pela administração.
                          </p>

                        </div>

                      ) : (

                        /* STATUS DESCONHECIDO */

                        <div className="bg-gray-100 border border-gray-200 p-3 rounded-2xl text-xs text-gray-800">
                          Status da solicitação indisponível.
                          Entre em contato com a administração.
                        </div>

                      )}

                    </div>

                    {/* RODAPÉ DO PEDIDO */}

                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">

                      <span className="text-xs text-gray-600 flex items-center gap-1">
                        <FileCheck size={13} />
                        Registrado em {formatarData(sol)}
                      </span>

                      {pendente && (
                        <button
                          type="button"
                          onClick={() =>
                            handleCancelarSolicitacao(sol.id)
                          }
                          disabled={processandoId === sol.id}
                          className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-3 py-2.5 min-h-11 rounded-xl transition flex items-center gap-1 disabled:opacity-50 cursor-pointer active:scale-95"
                        >
                          {processandoId === sol.id ? (
                            <Loader2
                              size={13}
                              className="animate-spin"
                            />
                          ) : (
                            <XCircle size={14} />
                          )}

                          <span>
                            Cancelar Pedido
                          </span>
                        </button>
                      )}

                    </div>

                  </div>
                );
              })}

            </div>

          ) : (

            /* LISTA VAZIA */

            <div className="bg-white rounded-3xl p-8 text-center space-y-1.5 border border-gray-100 shadow-xs">

              <p className="text-xs md:text-sm text-gray-700 font-bold">
                Você ainda não possui solicitações ativas.
              </p>

              <p className="text-xs text-gray-600 max-w-sm mx-auto">
                Os pertences que você solicitar na vitrine
                aparecerão organizados nesta área para
                acompanhamento.
              </p>

            </div>
          )}

        </div>
      )}

    </div>
  );
}
