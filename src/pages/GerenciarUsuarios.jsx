
import {
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';

import { useNavigate } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';

import {
  ShieldCheck,
  ShieldAlert,
  Search,
  ArrowLeft,
  IdCard,
  Users,
  RefreshCw,
  LockKeyhole,
  AlertTriangle,
  CheckCircle2,
  X,
} from 'lucide-react';

import { db } from '../config/firebase';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { PageSkeleton } from '../components/skeletons';

// =====================================================
// FUNÇÕES AUXILIARES
// =====================================================

function obterNome(usuario) {
  return String(
    usuario.nome ||
    usuario.displayName ||
    'Usuário sem nome'
  );
}

function obterMatricula(usuario) {
  return String(
    usuario.numeroCadastro ||
    usuario.matricula ||
    ''
  ).trim();
}

// Apenas normaliza os números para comparação.
// Não altera os documentos do Firestore.
function normalizarMatricula(numero) {
  const digitos = String(numero || '').replace(/\D/g, '');

  if (!digitos) return '';

  return digitos.replace(/^0+/, '') || '0';
}

// Consulta compartilhada pelo carregamento inicial
// e pelo botão de atualização manual.
async function buscarUsuariosNoFirestore() {
  const snapshot = await getDocs(
    collection(db, 'usuarios')
  );

  const lista = snapshot.docs.map((documento) => ({
    id: documento.id,
    ...documento.data(),
  }));

  lista.sort((a, b) =>
    obterNome(a).localeCompare(
      obterNome(b),
      'pt-BR',
      { sensitivity: 'base' }
    )
  );

  return lista;
}

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

export default function GerenciarUsuarios() {
  const navigate = useNavigate();
  const toast = useToast();

  const {
    usuario: adminAtual,
    eAdmin,
    carregandoAuth,
  } = useAuth();

  // ===================================================
  // ESTADOS
  // ===================================================

  const [usuarios, setUsuarios] = useState([]);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [resultadoMatriculas, setResultadoMatriculas] =
    useState(null);

  // ===================================================
  // ATUALIZAÇÃO MANUAL
  // ===================================================

  const carregarUsuarios = useCallback(async () => {
    if (!eAdmin) return;

    setLoading(true);
    setErro('');

    try {
      const lista = await buscarUsuariosNoFirestore();

      setUsuarios(lista);
      setResultadoMatriculas(null);
    } catch (error) {
      console.error(
        'Erro ao carregar usuários:',
        error
      );

      setErro(
        'Não foi possível consultar os usuários. Verifique sua autorização administrativa.'
      );

      toast?.erro?.('Falha ao carregar os usuários.');
    } finally {
      setLoading(false);
    }
  }, [eAdmin, toast]);

  // ===================================================
  // CARREGAMENTO INICIAL
  // ===================================================

  useEffect(() => {
    if (carregandoAuth || !eAdmin) {
      return;
    }

    let ativo = true;

    async function consultarUsuarios() {
      try {
        const lista = await buscarUsuariosNoFirestore();

        if (!ativo) return;

        setUsuarios(lista);
        setResultadoMatriculas(null);
        setErro('');
      } catch (error) {
        if (!ativo) return;

        console.error(
          'Erro ao carregar usuários:',
          error
        );

        setErro(
          'Não foi possível consultar os usuários. Verifique sua autorização administrativa.'
        );
      } finally {
        if (ativo) {
          setLoading(false);
        }
      }
    }

    consultarUsuarios();

    return () => {
      ativo = false;
    };
  }, [carregandoAuth, eAdmin]);

  // ===================================================
  // FILTRAR USUÁRIOS
  // ===================================================

  const usuariosFiltrados = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase('pt-BR');

    if (!termo) {
      return usuarios;
    }

    return usuarios.filter((usuario) => {
      const nome = obterNome(usuario)
        .toLocaleLowerCase('pt-BR');

      const email = String(usuario.email || '')
        .toLocaleLowerCase('pt-BR');

      const matricula = obterMatricula(usuario)
        .toLocaleLowerCase('pt-BR');

      return (
        nome.includes(termo) ||
        email.includes(termo) ||
        matricula.includes(termo)
      );
    });
  }, [usuarios, busca]);

  // ===================================================
  // VERIFICAÇÃO DE MATRÍCULAS
  // ===================================================

  // Esta verificação é somente de leitura.
  // Não cria, atualiza ou exclui documentos.
  // Não substitui as regras do Firestore.

  const verificarMatriculas = () => {
    const grupos = new Map();
    const semNumero = [];
    const numerosInvalidos = [];

    for (const usuario of usuarios) {
      const numeroOriginal = obterMatricula(usuario);

      if (!numeroOriginal) {
        semNumero.push(usuario);
        continue;
      }

      const chave = normalizarMatricula(numeroOriginal);

      if (!/^[1-9][0-9]{3,19}$/.test(chave)) {
        numerosInvalidos.push({
          ...usuario,
          numeroOriginal,
        });
        continue;
      }

      if (!grupos.has(chave)) {
        grupos.set(chave, []);
      }

      grupos.get(chave).push(usuario);
    }

    const conflitos = [];

    for (const [chave, contas] of grupos) {
      if (contas.length > 1) {
        conflitos.push({
          chave,
          contas,
        });
      }
    }

    conflitos.sort((a, b) =>
      a.chave.localeCompare(
        b.chave,
        'pt-BR',
        { numeric: true }
      )
    );

    setResultadoMatriculas({
      totalUsuarios: usuarios.length,
      numerosDistintos: grupos.size,
      semNumero,
      numerosInvalidos,
      conflitos,
    });
  };

  // A autorização real utiliza a coleção
  // administradores/{uid}, verificada no AuthProvider.
  // Não consideramos o campo eAdmin de outros perfis
  // uma confirmação de autorização administrativa.

  const ehMinhaConta = (usuario) =>
    usuario.id === adminAtual?.uid;

  // ===================================================
  // CARREGANDO AUTENTICAÇÃO
  // ===================================================

  if (carregandoAuth) {
    return <PageSkeleton mensagem="Verificando acesso..." />;
  }

  // ===================================================
  // ACESSO RESTRITO
  // ===================================================

  if (!eAdmin) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6 space-y-4 max-w-md mx-auto">
        <ShieldAlert
          size={56}
          className="text-amber-600"
          aria-hidden="true"
        />

        <h2 className="text-xl font-bold text-gray-800">
          Acesso restrito
        </h2>

        <p className="text-sm text-gray-500">
          Esta página é exclusiva para a administração
          do setor de Achados e Perdidos.
        </p>

        <button
          type="button"
          onClick={() => navigate('/')}
          className="px-5 py-3 min-h-11 bg-indigo-900 text-white rounded-xl font-semibold text-sm hover:bg-indigo-800 transition"
        >
          Voltar para a página inicial
        </button>
      </div>
    );
  }

  // ===================================================
  // CARREGAMENTO INICIAL DA LISTA
  // ===================================================

  if (loading && usuarios.length === 0) {
    return <PageSkeleton mensagem="Verificando acesso..." />;
  }

  // ===================================================
  // INTERFACE PRINCIPAL
  // ===================================================

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-20">

      {/* BOTÃO VOLTAR */}

      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-xs font-semibold text-gray-600 hover:text-indigo-900 transition"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Voltar
      </button>

      {/* CABEÇALHO */}

      <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Users
                size={20}
                className="text-indigo-900"
                aria-hidden="true"
              />

              <h1 className="text-lg md:text-2xl font-bold text-gray-900">
                Gerenciamento de Usuários
              </h1>
            </div>

            <p className="text-xs md:text-sm text-gray-500">
              Consulte os cadastros e verifique possíveis
              inconsistências nas matrículas.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="bg-amber-50 border border-amber-200 text-amber-900 px-3 py-2.5 rounded-xl text-xs flex items-center gap-2">
              <ShieldCheck
                size={16}
                className="text-amber-700"
                aria-hidden="true"
              />

              <span className="font-semibold">
                Área administrativa
              </span>
            </div>

            <button
              type="button"
              onClick={carregarUsuarios}
              disabled={loading}
              className="admin-users-refresh min-h-11 px-4 py-2.5 rounded-xl text-xs font-semibold border flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw
                size={16}
                aria-hidden="true"
                className={loading ? 'animate-spin' : ''}
              />

              Atualizar
            </button>
          </div>
        </div>
      </div>

      {/* AVISO DE SEGURANÇA */}

      <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50 border border-amber-200">
        <LockKeyhole
          size={19}
          className="text-amber-800 shrink-0 mt-0.5"
          aria-hidden="true"
        />

        <div className="space-y-1">
          <h2 className="text-sm font-bold text-amber-900">
            Proteção das contas
          </h2>

          <p className="text-xs text-amber-900 leading-relaxed">
            A promoção de administradores e a exclusão
            de contas estão temporariamente desativadas
            nesta página. Essas operações exigem um
            procedimento administrativo seguro e não
            podem ser feitas alterando apenas o perfil
            do usuário.
          </p>
        </div>
      </div>

      {/* ESTATÍSTICAS */}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500 text-xs font-medium">
            <Users size={16} aria-hidden="true" />
            Contas cadastradas
          </div>

          <p className="text-2xl font-bold text-indigo-900 mt-2">
            {usuarios.length}
          </p>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 text-gray-500 text-xs font-medium">
            <IdCard size={16} aria-hidden="true" />
            Contas com matrícula
          </div>

          <p className="text-2xl font-bold text-indigo-900 mt-2">
            {usuarios.filter((usuario) =>
              Boolean(obterMatricula(usuario))
            ).length}
          </p>
        </div>
      </div>

      {/* PESQUISA */}

      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <label
          htmlFor="busca-usuarios"
          className="block text-xs font-semibold text-gray-700 mb-2"
        >
          Pesquisar usuários
        </label>

        <div className="relative">
          <Search
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
            aria-hidden="true"
          />

          <input
            id="busca-usuarios"
            type="search"
            placeholder="Buscar por nome, e-mail ou matrícula..."
            value={busca}
            onChange={(event) =>
              setBusca(event.target.value)
            }
            className="w-full min-h-11 pl-10 pr-4 py-2.5 text-xs md:text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-indigo-900 focus:bg-white transition"
          />
        </div>
      </div>

      {/* VERIFICAÇÃO DE MATRÍCULAS */}

      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <IdCard
                size={18}
                className="text-indigo-900"
                aria-hidden="true"
              />

              Verificação de matrículas
            </h2>

            <p className="text-xs text-gray-500 mt-1">
              Identifique matrículas ausentes, inválidas
              ou repetidas entre os perfis.
            </p>
          </div>

          <button
            type="button"
            onClick={verificarMatriculas}
            disabled={loading || usuarios.length === 0}
            className="min-h-11 px-4 py-2.5 bg-indigo-900 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 hover:bg-indigo-800 transition disabled:opacity-50"
          >
            <IdCard size={16} aria-hidden="true" />
            Verificar matrículas
          </button>
        </div>

        <p className="text-[11px] text-gray-500">
          Esta verificação não modifica o banco de dados
          nem valida matrículas junto à UEMG. Também não
          confirma se existe uma reserva correspondente
          na coleção de matrículas.
        </p>
      </div>

      {/* ERRO DE CARREGAMENTO */}

      {erro && (
        <div
          role="alert"
          className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-700 text-xs"
        >
          {erro}
        </div>
      )}

      {/* LISTA DE USUÁRIOS */}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="divide-y divide-gray-100">
          {usuariosFiltrados.length > 0 ? (
            usuariosFiltrados.map((usuario) => {
              const propriaConta = ehMinhaConta(usuario);

              return (
                <div
                  key={usuario.id}
                  className="admin-users-row p-4 md:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-full bg-indigo-100 text-indigo-900 font-bold flex items-center justify-center shrink-0">
                      {obterNome(usuario)
                        .charAt(0)
                        .toUpperCase()}
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-xs md:text-sm font-bold text-gray-800 break-words">
                          {obterNome(usuario)}
                        </p>

                        {propriaConta && (
                          <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 text-[10px] font-bold px-2 py-1 rounded-md">
                            <ShieldCheck
                              size={12}
                              aria-hidden="true"
                            />

                            Minha conta admin
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-gray-500 break-all">
                        {usuario.email ||
                          'E-mail não informado'}
                      </p>

                      <p className="text-[11px] text-gray-500">
                        Matrícula:{' '}
                        <span className="font-medium text-gray-700">
                          {obterMatricula(usuario) ||
                            'Não informada'}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <LockKeyhole
                      size={16}
                      className="text-gray-400"
                      aria-hidden="true"
                    />

                    <span className="text-[11px] font-medium text-gray-500">
                      Alterações administrativas protegidas
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center space-y-2">
              <Search
                size={28}
                className="text-gray-300 mx-auto"
                aria-hidden="true"
              />

              <p className="text-xs text-gray-500">
                Nenhum usuário encontrado.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* MODAL DE VERIFICAÇÃO DE MATRÍCULAS */}

      {resultadoMatriculas && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={() => setResultadoMatriculas(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-verificacao"
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto p-5 space-y-4"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2
                  id="titulo-verificacao"
                  className="text-base font-bold text-gray-900"
                >
                  Verificação de matrículas
                </h2>

                <p className="text-xs text-gray-500 mt-1">
                  Análise local dos perfis cadastrados.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setResultadoMatriculas(null)
                }
                aria-label="Fechar verificação"
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            {/* RESUMO */}

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
                <p className="text-[11px] text-gray-500">
                  Contas analisadas
                </p>

                <p className="text-xl font-bold text-gray-900">
                  {resultadoMatriculas.totalUsuarios}
                </p>
              </div>

              <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
                <p className="text-[11px] text-gray-500">
                  Matrículas distintas
                </p>

                <p className="text-xl font-bold text-gray-900">
                  {resultadoMatriculas.numerosDistintos}
                </p>
              </div>

              <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
                <p className="text-[11px] text-gray-500">
                  Sem matrícula
                </p>

                <p className="text-xl font-bold text-gray-900">
                  {resultadoMatriculas.semNumero.length}
                </p>
              </div>

              <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
                <p className="text-[11px] text-gray-500">
                  Matrículas repetidas
                </p>

                <p className="text-xl font-bold text-gray-900">
                  {resultadoMatriculas.conflitos.length}
                </p>
              </div>
            </div>

            {/* RESULTADO SEM INCONSISTÊNCIAS */}

            {resultadoMatriculas.conflitos.length === 0 &&
              resultadoMatriculas.semNumero.length === 0 &&
              resultadoMatriculas.numerosInvalidos.length === 0 && (
                <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                  <CheckCircle2
                    size={19}
                    className="text-emerald-700 shrink-0"
                    aria-hidden="true"
                  />

                  <p className="text-xs text-emerald-900">
                    Nenhuma duplicidade ou matrícula
                    inválida foi identificada nos perfis
                    consultados.
                  </p>
                </div>
              )}

            {/* MATRÍCULAS DUPLICADAS */}

            {resultadoMatriculas.conflitos.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-rose-800 flex items-center gap-2">
                  <AlertTriangle
                    size={17}
                    aria-hidden="true"
                  />
                  Matrículas duplicadas
                </h3>

                {resultadoMatriculas.conflitos.map(
                  (conflito) => (
                    <div
                      key={conflito.chave}
                      className="rounded-xl bg-rose-50 border border-rose-200 p-3 space-y-2"
                    >
                      <p className="text-xs font-bold text-rose-900">
                        Número: {conflito.chave}
                      </p>

                      {conflito.contas.map((conta) => (
                        <div
                          key={conta.id}
                          className="text-xs text-rose-900"
                        >
                          {obterNome(conta)}
                          {' — '}
                          {conta.email || 'Sem e-mail'}
                        </div>
                      ))}
                    </div>
                  )
                )}
              </div>
            )}

            {/* CONTAS SEM MATRÍCULA */}

            {resultadoMatriculas.semNumero.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-amber-900">
                  Contas sem matrícula
                </h3>

                {resultadoMatriculas.semNumero.map(
                  (conta) => (
                    <p
                      key={conta.id}
                      className="text-xs text-gray-700 bg-amber-50 border border-amber-100 rounded-lg p-2"
                    >
                      {obterNome(conta)}
                      {' — '}
                      {conta.email || 'Sem e-mail'}
                    </p>
                  )
                )}
              </div>
            )}

            {/* MATRÍCULAS INVÁLIDAS */}

            {resultadoMatriculas.numerosInvalidos.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-amber-900">
                  Matrículas fora do formato esperado
                </h3>

                {resultadoMatriculas.numerosInvalidos.map(
                  (conta) => (
                    <p
                      key={conta.id}
                      className="text-xs text-gray-700 bg-amber-50 border border-amber-100 rounded-lg p-2"
                    >
                      {obterNome(conta)}
                      {' — '}
                      {conta.numeroOriginal}
                    </p>
                  )
                )}
              </div>
            )}

            <p className="text-[11px] text-gray-500">
              Nenhum registro foi alterado. A verificação
              não consulta a coleção de reservas de
              matrículas.
            </p>

            <button
              type="button"
              onClick={() =>
                setResultadoMatriculas(null)
              }
              className="w-full min-h-11 py-2.5 bg-indigo-900 text-white rounded-xl text-xs font-bold hover:bg-indigo-800 transition"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
