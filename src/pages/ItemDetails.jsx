
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import {
  solicitarRetiradaItem,
  ItemIndisponivelError,
} from '../services/solicitacaoService';
import { obterChaveStatus } from '../utils/status';
import StatusBadge from '../components/StatusBadge';
import { ItemDetailsSkeleton } from '../components/skeletons';
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
  CheckCircle2,
  ImageOff,
  Info,
} from 'lucide-react';

function formatarData(data) {
  if (!data) return 'Data não cadastrada';

  try {
    if (typeof data.toDate === 'function') {
      return data.toDate().toLocaleDateString('pt-BR');
    }

    if (typeof data.seconds === 'number') {
      return new Date(data.seconds * 1000).toLocaleDateString('pt-BR');
    }

    if (data instanceof Date) {
      return data.toLocaleDateString('pt-BR');
    }

    if (typeof data === 'string') {
      return data;
    }
  } catch {
    return 'Data não cadastrada';
  }

  return 'Data não cadastrada';
}

function ImagemItem({ url, titulo, ilustrativa = false }) {
  const [urlComErro, setUrlComErro] = useState('');
  const mostrarImagem = Boolean(url && url !== urlComErro);

  return (
    <div className="bg-white dark:bg-[#202c32] rounded-2xl p-2.5 border border-gray-100 dark:border-[#394b53] shadow-sm">
      <div className="relative w-full h-64 sm:h-80 md:h-96 rounded-xl overflow-hidden bg-gray-50 dark:bg-[#283941]">
        {mostrarImagem ? (
          <img
            src={url}
            alt={
              ilustrativa
                ? `Imagem ilustrativa de ${titulo || 'um pertence'}`
                : `Imagem do item: ${titulo || 'pertence encontrado'}`
            }
            decoding="async"
            onError={() => setUrlComErro(url)}
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-3 px-6 text-center text-gray-600 dark:text-[#d5e2e7]">
            <div className="w-20 h-20 rounded-2xl bg-indigo-50 dark:bg-[#382c2b] flex items-center justify-center">
              {url ? (
                <ImageOff
                  size={38}
                  className="text-indigo-900 dark:text-[#f3cdb9]"
                  aria-hidden="true"
                />
              ) : (
                <Package
                  size={38}
                  className="text-indigo-900 dark:text-[#f3cdb9]"
                  aria-hidden="true"
                />
              )}
            </div>

            <div className="space-y-1">
              <p className="font-semibold text-sm text-gray-800 dark:text-white">
                Imagem não disponível
              </p>
              <p className="text-xs max-w-xs leading-relaxed">
                Consulte a descrição e as características do item
                para ajudar na identificação.
              </p>
            </div>
          </div>
        )}

        {mostrarImagem && ilustrativa && (
          <span className="absolute bottom-3 left-3 right-3 sm:right-auto rounded-lg bg-black/75 px-3 py-1.5 text-xs font-semibold text-white">
            Imagem meramente ilustrativa
          </span>
        )}
      </div>
    </div>
  );
}

export default function ItemDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const { usuario, eAdmin } = useAuth();

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erroCarregar, setErroCarregar] = useState(false);
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

      setItem(
        docSnap.exists()
          ? { ...docSnap.data(), id: docSnap.id }
          : null
      );
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

  const voltar = () => {
    if (location.key === 'default') {
      navigate('/buscar');
    } else {
      navigate(-1);
    }
  };

  const fecharModal = useCallback(() => {
    if (submitting) return;

    setIsModalOpen(false);
    setErroSolicitacao('');
  }, [submitting]);

  const handleSolicitarRetirada = async () => {
    if (submitting || !item || !usuario || eAdmin) return;

    if (obterChaveStatus(item.status) !== 'disponivel') {
      setIsModalOpen(false);
      toast.info('Este item não está disponível para retirada.');
      return;
    }

    setSubmitting(true);
    setErroSolicitacao('');

    try {
      const { codigo } = await solicitarRetiradaItem({
        itemId: item.id,
        itemTitulo: item.titulo || item.title || 'Pertence',
        usuarioId: usuario.uid,
        nomeUsuario:
          usuario.nome || usuario.displayName || 'Aluno(a)',
        numeroCadastro:
          usuario.numeroCadastro ||
          usuario.matricula ||
          'Não informado',
      });

      setIsModalOpen(false);
      setCodigoGerado(codigo);
      setMensagemSucesso(true);
      setItem((prev) =>
        prev ? { ...prev, status: 'em análise' } : prev
      );
    } catch (err) {
      console.error('Erro ao solicitar retirada:', err);

      if (err instanceof ItemIndisponivelError) {
        setIsModalOpen(false);

        toast.info(
          'Este item acabou de ser solicitado por outra pessoa e não está mais disponível.'
        );

        await fetchItem();
      } else {
        setErroSolicitacao(
          'Não foi possível registrar seu pedido. Verifique sua conexão e tente novamente.'
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <ItemDetailsSkeleton />;
  }

  if (erroCarregar) {
    return (
      <div
        className="max-w-md mx-auto bg-rose-50 dark:bg-[#40272e] border border-rose-200 dark:border-[#925665] rounded-3xl p-7 sm:p-8 text-center space-y-4"
        role="alert"
      >
        <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-100 dark:bg-[#4d2d36] flex items-center justify-center">
          <AlertCircle
            size={32}
            className="text-rose-700 dark:text-[#ffc2d0]"
            aria-hidden="true"
          />
        </div>

        <div className="space-y-2">
          <h2 className="font-bold text-lg text-rose-900 dark:text-[#ffe2e9]">
            Não foi possível carregar o item
          </h2>

          <p className="text-sm leading-relaxed text-rose-800 dark:text-[#ffd1db]">
            Verifique sua conexão com a internet e tente novamente.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchItem}
          className="inline-flex items-center justify-center gap-2 min-h-11 px-5 rounded-xl bg-rose-700 hover:bg-rose-800 dark:bg-[#a92e4c] dark:hover:bg-[#922440] text-white font-semibold transition"
        >
          <RotateCcw size={17} aria-hidden="true" />
          Tentar novamente
        </button>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="max-w-md mx-auto bg-white dark:bg-[#202c32] border border-gray-100 dark:border-[#394b53] rounded-3xl p-8 text-center space-y-4">
        <Package
          size={42}
          className="mx-auto text-indigo-900 dark:text-[#f3cdb9]"
          aria-hidden="true"
        />

        <h2 className="font-bold text-lg text-gray-900 dark:text-white">
          Item não encontrado
        </h2>

        <p className="text-sm text-gray-600 dark:text-[#d5e2e7]">
          Este objeto pode ter sido removido do catálogo.
        </p>

        <Link
          to="/buscar"
          className="inline-flex items-center justify-center min-h-11 rounded-xl px-5 bg-indigo-900 hover:bg-indigo-800 dark:bg-[#623529] dark:hover:bg-[#784538] !text-white font-semibold text-sm transition"
        >
          Ver catálogo completo
        </Link>
      </div>
    );
  }

  const titulo = item.titulo || item.title || 'Pertence sem título';
  const categoria = item.categoria || item.categoriaId || 'Geral';
  const localEncontrado =
    item.localEncontrado || item.local || 'Não informado';

  const dataEncontrado = formatarData(
    item.dataRegistro || item.dataEncontrado || item.dataCadastro
  );

  const fotoUrl = item.fotoUrl || item.imageUrl || '';

  // O indicador deve existir nos dados para afirmar
  // que a imagem não representa o objeto real.
  const imagemIlustrativa =
    item.imagemIlustrativa === true ||
    item.fotoIlustrativa === true;

  const chaveStatus = obterChaveStatus(item.status);
  const disponivel = chaveStatus === 'disponivel';
  const caminhoAtual = location.pathname + location.search;

  const motivoIndisponivel =
    chaveStatus === 'analise'
      ? 'Já existe uma solicitação de retirada em análise para este item.'
      : chaveStatus === 'devolvido'
        ? 'Este item já foi devolvido ao proprietário.'
        : 'Este item não está disponível para retirada no momento.';

  return (
    <div className="max-w-5xl mx-auto space-y-5 pb-20">
      <nav aria-label="Navegação da página">
        <button
          type="button"
          onClick={voltar}
          className="inline-flex items-center gap-2 min-h-11 pr-4 text-sm font-semibold text-gray-700 dark:text-[#d5e2e7] hover:text-indigo-900 dark:hover:text-[#f3cdb9] transition"
        >
          <ArrowLeft size={18} aria-hidden="true" />
          Voltar
        </button>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-8 items-start">
        <ImagemItem
          url={fotoUrl}
          titulo={titulo}
          ilustrativa={imagemIlustrativa}
        />

        <div className="bg-white dark:bg-[#202c32] rounded-2xl p-5 md:p-7 border border-gray-100 dark:border-[#394b53] shadow-sm space-y-6">
          <header className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-50 dark:bg-[#382c2b] text-indigo-900 dark:text-[#f3cdb9] text-xs font-bold uppercase tracking-wide">
                <Tag size={13} aria-hidden="true" />
                {categoria}
              </span>

              <StatusBadge
                status={item.status || 'disponível'}
                className="text-xs! px-2.5! py-1!"
              />
            </div>

            <h1 className="text-xl md:text-2xl font-bold leading-tight text-gray-900 dark:text-white">
              {titulo}
            </h1>
          </header>

          <section
            className="space-y-2"
            aria-labelledby="descricao-item"
          >
            <h2
              id="descricao-item"
              className="text-sm font-bold text-gray-800 dark:text-[#f2f6f7]"
            >
              Descrição do objeto
            </h2>

            <p className="text-sm leading-relaxed p-4 rounded-xl bg-gray-50 dark:bg-[#172229] border border-gray-100 dark:border-[#394b53] text-gray-700 dark:text-[#d5e2e7] whitespace-pre-wrap break-words">
              {item.descricao || 'Sem descrição cadastrada.'}
            </p>
          </section>

          <section
            className="grid grid-cols-1 sm:grid-cols-2 gap-3"
            aria-label="Informações do item"
          >
            <div className="rounded-xl bg-gray-50 dark:bg-[#172229] border border-gray-100 dark:border-[#394b53] p-3.5 flex items-start gap-3">
              <MapPin
                size={19}
                className="text-indigo-900 dark:text-[#f3cdb9] shrink-0 mt-0.5"
                aria-hidden="true"
              />

              <div className="min-w-0 space-y-1">
                <p className="text-xs font-semibold text-gray-600 dark:text-[#b6cbd4]">
                  Local encontrado
                </p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white break-words">
                  {localEncontrado}
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-gray-50 dark:bg-[#172229] border border-gray-100 dark:border-[#394b53] p-3.5 flex items-start gap-3">
              <Calendar
                size={19}
                className="text-indigo-900 dark:text-[#f3cdb9] shrink-0 mt-0.5"
                aria-hidden="true"
              />

              <div className="min-w-0 space-y-1">
                <p className="text-xs font-semibold text-gray-600 dark:text-[#b6cbd4]">
                  Data do registro
                </p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {dataEncontrado}
                </p>
              </div>
            </div>
          </section>

          <section
            className="rounded-xl p-4 border border-indigo-200 dark:border-[#75534b] bg-indigo-50 dark:bg-[#382c2b] flex gap-3"
            aria-labelledby="como-retirar"
          >
            <Building2
              size={21}
              className="shrink-0 mt-0.5 text-indigo-900 dark:text-[#f3cdb9]"
              aria-hidden="true"
            />

            <div className="space-y-2">
              <h2
                id="como-retirar"
                className="text-sm font-bold text-indigo-900 dark:text-[#ffe3d2]"
              >
                Como funciona a retirada?
              </h2>

              <p className="text-sm leading-relaxed text-indigo-800 dark:text-[#f1d4c6]">
                A retirada é presencial, no setor de Achados e
                Perdidos da Administração do Campus.
              </p>

              <p className="text-sm leading-relaxed text-indigo-800 dark:text-[#f1d4c6]">
                Após solicitar o item, você receberá um código.
                Apresente esse código e sua matrícula no balcão.
              </p>
            </div>
          </section>

          {mensagemSucesso && (
            <section
              className="rounded-xl border border-emerald-200 dark:border-[#4f8569] bg-emerald-50 dark:bg-[#19382e] p-4 space-y-3"
              role="status"
              aria-live="polite"
            >
              <div className="flex items-start gap-2.5">
                <CheckCircle2
                  size={21}
                  className="shrink-0 text-emerald-800 dark:text-[#b6efce]"
                  aria-hidden="true"
                />

                <div className="space-y-1">
                  <h2 className="font-bold text-sm text-emerald-900 dark:text-[#d3ffe5]">
                    Solicitação registrada com sucesso!
                  </h2>

                  <p className="text-sm leading-relaxed text-emerald-800 dark:text-[#c4f4d9]">
                    Seu pedido foi registrado e está em análise.
                    Guarde o código de retirada abaixo.
                  </p>
                </div>
              </div>

              <CodigoRetirada codigo={codigoGerado} />

              <p className="text-sm leading-relaxed text-emerald-800 dark:text-[#c4f4d9]">
                Quando for realizar a retirada, apresente
                este código e sua matrícula. Você também poderá
                consultar ou cancelar o pedido no seu perfil.
              </p>

              <Link
                to="/perfil"
                className="inline-flex items-center gap-2 min-h-11 font-bold text-sm text-emerald-900 dark:!text-[#d3ffe5] underline underline-offset-4"
              >
                <ClipboardList size={17} aria-hidden="true" />
                Ver meus pedidos
              </Link>
            </section>
          )}

          {eAdmin && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => navigate(`/editar-item/${item.id}`)}
                className="w-full min-h-12 px-4 py-3 rounded-xl bg-amber-700 hover:bg-amber-800 dark:bg-[#956124] dark:hover:bg-[#7d501c] !text-white font-semibold text-sm shadow-sm transition inline-flex items-center justify-center gap-2"
              >
                <Edit size={17} aria-hidden="true" />
                Editar pertence
              </button>
            </div>
          )}

          {!eAdmin && !usuario && (
            <div className="space-y-3">
              <Link
                to="/login"
                state={{ from: caminhoAtual }}
                className="w-full min-h-12 px-4 py-3 rounded-xl bg-indigo-900 hover:bg-indigo-800 dark:bg-[#623529] dark:hover:bg-[#784538] !text-white font-semibold text-sm shadow-sm transition inline-flex items-center justify-center gap-2 text-center"
              >
                <LogIn size={18} aria-hidden="true" />
                Entrar para solicitar a retirada
              </Link>

              <p className="text-xs text-center text-gray-600 dark:text-[#d5e2e7]">
                Ainda não tem uma conta?{' '}
                <Link
                  to="/cadastro"
                  state={{ from: caminhoAtual }}
                  className="font-bold text-indigo-900 dark:text-[#f3cdb9] underline underline-offset-2"
                >
                  Cadastre-se
                </Link>
              </p>
            </div>
          )}

          {!eAdmin && usuario?.perfilIncompleto && (
            <div className="space-y-3">
              <div className="rounded-xl flex items-start gap-2.5 p-3 bg-amber-50 dark:bg-[#40351d] border border-amber-200 dark:border-[#886d3a]">
                <Info
                  size={18}
                  className="shrink-0 text-amber-800 dark:text-[#ffe2a3]"
                  aria-hidden="true"
                />
                <p className="text-sm text-amber-900 dark:text-[#ffe2a3]">
                  Para solicitar a retirada, você precisa
                  informar sua matrícula.
                </p>
              </div>

              <Link
                to="/completar-cadastro"
                state={{ from: caminhoAtual }}
                className="w-full min-h-12 px-4 py-3 bg-amber-700 hover:bg-amber-800 dark:bg-[#956124] dark:hover:bg-[#7d501c] !text-white font-semibold text-sm rounded-xl transition flex items-center justify-center gap-2"
              >
                <ClipboardList size={18} aria-hidden="true" />
                Completar cadastro
              </Link>
            </div>
          )}

          {!eAdmin && usuario && !usuario.perfilIncompleto && (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                disabled={!disponivel || mensagemSucesso}
                className={`w-full min-h-12 px-4 py-3.5 rounded-xl font-semibold text-sm !text-white transition inline-flex items-center justify-center gap-2 ${
                  disponivel && !mensagemSucesso
                    ? 'bg-indigo-900 hover:bg-indigo-800 dark:bg-[#623529] dark:hover:bg-[#784538] active:scale-[0.99] shadow-sm'
                    : 'bg-gray-500 dark:bg-[#52636c] cursor-not-allowed'
                }`}
              >
                {disponivel && !mensagemSucesso ? (
                  <>
                    <ShieldCheck size={18} aria-hidden="true" />
                    Esse item é meu — solicitar retirada
                  </>
                ) : mensagemSucesso ? (
                  <>
                    <CheckCircle2 size={18} aria-hidden="true" />
                    Solicitação registrada
                  </>
                ) : (
                  <>
                    <Info size={18} aria-hidden="true" />
                    Item indisponível
                  </>
                )}
              </button>

              {!disponivel && !mensagemSucesso && (
                <p className="text-sm text-center text-gray-600 dark:text-[#d5e2e7] leading-relaxed">
                  {motivoIndisponivel}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <Modal
        aberto={isModalOpen}
        onFechar={fecharModal}
        titulo="Confirmar pedido de retirada?"
        descricaoId="modal-descricao"
        travarFechamento={submitting}
      >
        <div id="modal-descricao" className="space-y-3">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white">
            {titulo}
          </h3>

          <div className="rounded-xl bg-gray-50 dark:bg-[#172229] border border-gray-100 dark:border-[#394b53] p-4">
            <p className="text-sm leading-relaxed text-gray-700 dark:text-[#d5e2e7]">
              Ao confirmar, o item passará para o status
              de análise e uma solicitação será vinculada
              à sua matrícula.
            </p>

            <p className="text-sm leading-relaxed text-gray-700 dark:text-[#d5e2e7] mt-3">
              Você receberá um código para apresentar,
              junto da matrícula, no setor de Achados e Perdidos.
            </p>
          </div>

          <p className="text-xs leading-relaxed text-gray-600 dark:text-[#b6cbd4]">
            Se mudar de ideia, você poderá cancelar
            sua solicitação pelo Perfil.
          </p>
        </div>

        {erroSolicitacao && (
          <div
            className="rounded-xl p-3 border border-rose-200 dark:border-[#925665] bg-rose-50 dark:bg-[#40272e] flex items-start gap-2.5"
            role="alert"
          >
            <AlertCircle
              size={18}
              className="shrink-0 mt-0.5 text-rose-700 dark:text-[#ffc2d0]"
              aria-hidden="true"
            />

            <span className="text-sm leading-relaxed text-rose-800 dark:text-[#ffd1db]">
              {erroSolicitacao}
            </span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <button
            type="button"
            onClick={fecharModal}
            disabled={submitting}
            className="flex-1 min-h-12 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-[#52636c] text-gray-800 dark:text-[#eef5f8] bg-white dark:bg-[#202c32] hover:bg-gray-50 dark:hover:bg-[#2b3a42] font-semibold text-sm transition disabled:opacity-60"
          >
            Voltar
          </button>

          <button
            type="button"
            onClick={handleSolicitarRetirada}
            disabled={submitting}
            className="flex-1 min-h-12 px-4 py-2.5 rounded-xl bg-indigo-900 hover:bg-indigo-800 dark:bg-[#623529] dark:hover:bg-[#784538] !text-white font-semibold text-sm transition disabled:opacity-60 inline-flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2
                  size={17}
                  className="animate-spin"
                  aria-hidden="true"
                />
                Registrando...
              </>
            ) : (
              <>
                <ShieldCheck size={17} aria-hidden="true" />
                Confirmar pedido
              </>
            )}
          </button>
        </div>
      </Modal>
    </div>
  );
}
