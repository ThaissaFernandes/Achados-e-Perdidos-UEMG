import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/useToast';
import { solicitarRetiradaItem, ItemIndisponivelError } from '../services/solicitacaoService';
import { obterChaveStatus } from '../utils/status';
import { METODO_LOGIN } from '../services/usuarioService';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import CodigoRetirada from '../components/CodigoRetirada';
import {
  ArrowLeft,
  MapPin,
  Calendar,
  ShieldCheck,
  Loader2,
  Edit,
  Tag,
  Package,
  LogIn,
  AlertCircle,
  RotateCcw,
  Building2,
  ClipboardList,
} from 'lucide-react';

export default function ItemDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const { usuario, eAdmin } = useAuth();

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erroCarregar, setErroCarregar] = useState(false);
  const [imgErro, setImgErro] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [erroSolicitacao, setErroSolicitacao] = useState('');
  const [mensagemSucesso, setMensagemSucesso] = useState(false);
  const [codigoGerado, setCodigoGerado] = useState('');

  const fetchItem = useCallback(async () => {
    setLoading(true);
    setErroCarregar(false);
    try {
      const docSnap = await getDoc(doc(db, 'itens', id));
      setItem(docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null);
    } catch (err) {
      console.error('Erro ao buscar item:', err);
      setErroCarregar(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchItem();
  }, [fetchItem]);

  // Se a pessoa abriu o link direto (sem histórico), "voltar" leva ao catálogo em vez de sair do app
  const voltar = () => {
    if (location.key === 'default') navigate('/buscar');
    else navigate(-1);
  };

  const fecharModal = useCallback(() => {
    setIsModalOpen(false);
    setErroSolicitacao('');
  }, []);

  const handleSolicitarRetirada = async () => {
    setSubmitting(true);
    setErroSolicitacao('');
    try {
      const { codigo } = await solicitarRetiradaItem({
        itemId: item.id,
        itemTitulo: item.titulo || item.title || 'Pertence',
        usuarioId: usuario.uid,
        nomeUsuario: usuario.nome || usuario.displayName || 'Aluno(a)',
        numeroCadastro: usuario.numeroCadastro || usuario.matricula || 'Não informado',
      });

      setIsModalOpen(false);
      setCodigoGerado(codigo);
      setMensagemSucesso(true);
      setItem((prev) => ({ ...prev, status: 'em análise' }));
    } catch (err) {
      console.error('Erro ao solicitar retirada:', err);
      if (err instanceof ItemIndisponivelError) {
        // Outra pessoa foi mais rápida: atualiza a tela e explica, em vez de mostrar um erro genérico
        setIsModalOpen(false);
        toast.info('Este item acabou de ser solicitado por outra pessoa e não está mais disponível.');
        fetchItem();
      } else {
        setErroSolicitacao('Não foi possível registrar seu pedido agora. Verifique sua conexão e tente novamente.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-600" role="status">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-900 mb-2" aria-hidden="true" />
        <p className="text-sm">Carregando detalhes do pertence...</p>
      </div>
    );
  }

  // Falha de rede/serviço: diferente de "item não existe"
  if (erroCarregar) {
    return (
      <div className="bg-rose-50 border border-rose-100 text-rose-800 rounded-3xl p-8 text-center space-y-3 max-w-md mx-auto" role="alert">
        <AlertCircle className="w-8 h-8 mx-auto text-rose-500" aria-hidden="true" />
        <p className="font-bold">Não foi possível carregar este pertence.</p>
        <p className="text-sm text-rose-700">Verifique sua conexão com a internet e tente novamente.</p>
        <button
          onClick={fetchItem}
          className="inline-flex items-center gap-1.5 px-4 min-h-11 bg-rose-600 text-white rounded-xl text-sm font-bold shadow-xs hover:bg-rose-700 transition"
        >
          <RotateCcw size={16} aria-hidden="true" /> Tentar novamente
        </button>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="p-8 text-center space-y-3 max-w-md mx-auto">
        <p className="text-sm text-gray-700">Este objeto não foi encontrado. Ele pode ter sido removido do catálogo.</p>
        <Link to="/buscar" className="inline-flex items-center min-h-11 text-sm font-bold text-indigo-900 underline">
          Ver o catálogo completo
        </Link>
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

  const chaveStatus = obterChaveStatus(item.status);
  const disponivel = chaveStatus === 'disponivel';
  const nomeCategoria = item.categoria || item.categoriaId || 'Geral';
  const titulo = item.titulo || item.title;
  const fotoUrl = item.fotoUrl || item.imageUrl;
  const caminhoAtual = location.pathname + location.search;

  // Mensagem que explica o porquê de o botão de solicitar não estar disponível (Nielsen 1)
  const motivoIndisponivel =
    chaveStatus === 'analise'
      ? 'Já existe um pedido de retirada em análise para este item.'
      : chaveStatus === 'devolvido'
      ? 'Este item já foi devolvido ao dono.'
      : 'Este item não está disponível no momento.';

  return (
    <div className="space-y-4 max-w-5xl mx-auto pb-20">
      <button
        onClick={voltar}
        className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 hover:text-indigo-900 transition min-h-11 pr-3"
      >
        <ArrowLeft size={18} aria-hidden="true" /> Voltar
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 items-start">
        {/* Imagem do Item */}
        <div className="bg-white rounded-2xl p-2.5 border border-gray-100 shadow-xs">
          {fotoUrl && !imgErro ? (
            <img
              src={fotoUrl}
              alt={titulo ? `Foto de ${titulo}` : 'Foto do pertence'}
              onError={() => setImgErro(true)}
              className="w-full h-64 sm:h-80 md:h-96 object-cover rounded-xl bg-gray-50"
            />
          ) : (
            <div className="w-full h-64 sm:h-80 md:h-96 rounded-xl bg-gray-50 flex flex-col items-center justify-center text-gray-600 gap-2">
              <Package size={48} className="text-indigo-900/40" aria-hidden="true" />
              <p className="text-sm">Este item não tem foto</p>
            </div>
          )}
        </div>

        {/* Painel de Detalhes e Ação */}
        <div className="bg-white p-5 md:p-7 rounded-2xl border border-gray-100 shadow-xs space-y-5">
          <div>
            <div className="flex justify-between items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-bold rounded-md bg-indigo-50 text-indigo-900 uppercase tracking-wider">
                <Tag size={12} aria-hidden="true" /> {nomeCategoria}
              </span>
              <StatusBadge status={item.status || 'disponível'} className="text-xs! px-2.5! py-1!" />
            </div>

            <h1 className="text-xl md:text-2xl font-bold text-gray-900 leading-tight">{titulo}</h1>
          </div>

          <div className="space-y-3 text-sm text-gray-700">
            <div>
              <span className="font-semibold text-gray-800 block mb-1">Descrição do objeto</span>
              <p className="text-gray-700 leading-relaxed bg-gray-50/80 p-3.5 rounded-xl border border-gray-100/80">
                {item.descricao || 'Sem descrição cadastrada.'}
              </p>
            </div>

            <div className="pt-3 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-600">
              <span className="flex items-center gap-1.5">
                <MapPin size={16} className="text-indigo-900 shrink-0" aria-hidden="true" />
                <span>
                  <strong className="text-gray-800">Encontrado em:</strong> {item.localEncontrado || item.local || 'Não especificado'}
                </span>
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar size={16} className="text-indigo-900 shrink-0" aria-hidden="true" />
                <span>
                  <strong className="text-gray-800">Data:</strong> {formatarDataRegistro()}
                </span>
              </span>
            </div>
          </div>

          {/* Onde retirar: informação essencial, sempre visível (inclusive no celular) */}
          <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-3.5 flex gap-3 text-sm text-indigo-900">
            <Building2 size={20} className="shrink-0 text-indigo-800 mt-0.5" aria-hidden="true" />
            <div className="space-y-0.5">
              <p className="font-semibold">Como retirar</p>
              <p className="text-indigo-800">
                A retirada é presencial, no setor de Achados e Perdidos (Administração do Campus). Ao solicitar, o sistema gera um código de retirada. Informe o código e sua matrícula no balcão.
              </p>
            </div>
          </div>

          {/* Feedback de sucesso, com o código de retirada em destaque */}
          {mensagemSucesso && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-4 rounded-xl text-sm space-y-3" role="status">
              <p className="font-bold">Pedido registrado! A administração já foi avisada.</p>
              <CodigoRetirada codigo={codigoGerado} />
              <p className="text-emerald-800">
                No setor de Achados e Perdidos, informe este <strong>código</strong> e sua <strong>matrícula</strong>. Você
                também encontra o código a qualquer momento no seu Perfil. Se mudar de ideia, pode cancelar o pedido lá.
              </p>
              <Link to="/perfil" className="inline-flex items-center gap-1.5 min-h-11 font-bold text-emerald-900 underline">
                <ClipboardList size={16} aria-hidden="true" /> Ver meus pedidos
              </Link>
            </div>
          )}

          {/* Ação - Administrador */}
          {eAdmin && (
            <div className="pt-2">
              <button
                onClick={() => navigate(`/editar-item/${item.id}`)}
                className="w-full min-h-12 py-3 bg-amber-700 hover:bg-amber-800 text-white font-semibold rounded-xl text-sm shadow-xs transition flex items-center justify-center gap-2"
              >
                <Edit size={16} aria-hidden="true" />
                <span>Editar pertence (Administração)</span>
              </button>
            </div>
          )}

          {/* Ação - Visitante: login só é pedido aqui, na hora de solicitar */}
          {!eAdmin && !usuario && (
            <div className="pt-2 space-y-2">
              <Link
                to="/login"
                state={{ from: caminhoAtual }}
                className="w-full min-h-12 py-3 bg-indigo-900 hover:bg-indigo-800 text-white font-semibold rounded-xl text-sm shadow-xs transition flex items-center justify-center gap-2"
              >
                <LogIn size={18} aria-hidden="true" />
                {METODO_LOGIN === 'microsoft' ? 'Entrar com Microsoft para solicitar a retirada' : 'Entrar para solicitar a retirada'}
              </Link>
              <p className="text-xs text-gray-600 text-center">
                {METODO_LOGIN === 'microsoft' ? (
                  'Use sua conta institucional da UEMG.'
                ) : (
                  <>
                    Não tem conta?{' '}
                    <Link to="/cadastro" state={{ from: caminhoAtual }} className="font-bold text-indigo-900 underline">
                      Cadastre-se
                    </Link>
                  </>
                )}
              </p>
            </div>
          )}

          {/* Ação - Entrou com a Microsoft, mas falta informar a matrícula */}
          {!eAdmin && usuario?.perfilIncompleto && (
            <div className="pt-2 space-y-2">
              <Link
                to="/completar-cadastro"
                state={{ from: caminhoAtual }}
                className="w-full min-h-12 py-3 bg-amber-700 hover:bg-amber-800 text-white font-semibold rounded-xl text-sm shadow-xs transition flex items-center justify-center gap-2"
              >
                <ClipboardList size={18} aria-hidden="true" />
                Informar matrícula para solicitar
              </Link>
              <p className="text-xs text-gray-600 text-center">É preciso concluir o cadastro antes de solicitar um item.</p>
            </div>
          )}

          {/* Ação - Aluno logado */}
          {!eAdmin && usuario && !usuario.perfilIncompleto && (
            <div className="pt-2 space-y-2">
              <button
                onClick={() => setIsModalOpen(true)}
                disabled={!disponivel || mensagemSucesso}
                className={`w-full min-h-12 py-3.5 rounded-xl font-semibold text-sm text-white transition flex items-center justify-center gap-2 ${
                  disponivel && !mensagemSucesso
                    ? 'bg-indigo-900 hover:bg-indigo-800 active:scale-[0.98] shadow-xs'
                    : 'bg-gray-500 cursor-not-allowed'
                }`}
              >
                <ShieldCheck size={18} aria-hidden="true" />
                {disponivel && !mensagemSucesso ? 'Esse item é meu — solicitar retirada' : 'Retirada já solicitada'}
              </button>
              {!disponivel && !mensagemSucesso && (
                <p className="text-sm text-gray-700 text-center">{motivoIndisponivel}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal de confirmação (acessível: Esc, foco preso, clique fora) */}
      <Modal aberto={isModalOpen} onFechar={fecharModal} titulo="Confirmar pedido de retirada?" descricaoId="modal-descricao" travarFechamento={submitting}>
        <div id="modal-descricao" className="space-y-3">
          <p className="text-sm font-semibold text-gray-900">{titulo}</p>
          <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 p-3 rounded-xl border border-gray-100">
            Seu pedido ficará associado à sua matrícula e o item passará para "em análise". O sistema vai gerar um
            código de retirada, e a administração será avisada. Você deverá ir ao setor de Achados e Perdidos e informar o
            código e sua matrícula.
          </p>
          <p className="text-xs text-gray-600">Mudou de ideia depois? Você pode cancelar o pedido na aba Perfil.</p>
        </div>

        {erroSolicitacao && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm flex items-start gap-2" role="alert">
            <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-600" aria-hidden="true" />
            <span>{erroSolicitacao}</span>
          </div>
        )}

        <div className="flex gap-2 text-sm font-semibold pt-1">
          <button
            onClick={fecharModal}
            disabled={submitting}
            className="flex-1 min-h-12 py-2.5 border border-gray-300 rounded-xl text-gray-800 hover:bg-gray-50 transition disabled:opacity-60"
          >
            Voltar
          </button>
          <button
            onClick={handleSolicitarRetirada}
            disabled={submitting}
            className="flex-1 min-h-12 py-2.5 bg-indigo-900 rounded-xl text-white hover:bg-indigo-800 flex justify-center items-center gap-1.5 shadow-xs transition disabled:opacity-60"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" aria-label="Enviando" /> : 'Confirmar pedido'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
