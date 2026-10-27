
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import {
  MapPin,
  Tag,
  FileText,
  CheckCircle2,
  ArrowLeft,
  Loader2,
  Save,
  ShieldAlert,
  Info,
  Trash2,
  AlertCircle,
} from 'lucide-react';

import { PageSkeleton } from '../components/skeletons';
import { db } from '../config/firebase';
import { doc, getDoc } from 'firebase/firestore';

import { listarCategorias } from '../services/categoriaService';
import { listarLocaisAtivos } from '../services/localService';

import {
  atualizarItem,
  excluirItem,
} from '../services/itemService';

import { useAuth } from '../hooks/useAuth';

export default function EditarItem() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { eAdmin, carregandoAuth } = useAuth();

  // ===================================================
  // ESTADOS
  // ===================================================

  const [categorias, setCategorias] = useState([]);
  const [locais, setLocais] = useState([]);

  const [loading, setLoading] = useState(true);
  const [carregandoSalvar, setCarregandoSalvar] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [podeExcluir, setPodeExcluir] = useState(false);

  const [submitted, setSubmitted] = useState(false);

  const [erro, setErro] = useState('');
  const [erroExclusao, setErroExclusao] = useState('');

  const [statusAtual, setStatusAtual] = useState('disponível');

  const [formData, setFormData] = useState({
    title: '',
    category: '',
    location: '',
    description: '',
    fotoUrl: '',
  });

  // ===================================================
  // CARREGAMENTO
  // ===================================================

  useEffect(() => {
    if (carregandoAuth || !eAdmin) {
      return;
    }

    let ativo = true;

    async function carregarDados() {
      setLoading(true);
      setErro('');
      setErroExclusao('');

      try {
        const [
          dadosCategorias,
          dadosLocais,
          itemSnap,
        ] = await Promise.all([
          listarCategorias(),
          listarLocaisAtivos(),
          getDoc(doc(db, 'itens', id)),
        ]);

        if (!ativo) {
          return;
        }

        if (!itemSnap.exists()) {
          setErro('Item não encontrado no sistema.');
          return;
        }

        const itemData = itemSnap.data();

        setFormData({
          title:
            itemData.titulo ||
            itemData.title ||
            '',

          category:
            itemData.categoriaId ||
            itemData.categoria ||
            '',

          location:
            itemData.localEncontrado ||
            itemData.local ||
            '',

          description:
            itemData.descricao || '',

          fotoUrl:
            itemData.fotoUrl || '',
        });

        setStatusAtual(itemData.status || 'disponível');

        // Apenas itens comprovadamente sem histórico
        // podem ter o botão de exclusão habilitado.
        setPodeExcluir(
          itemData.teveSolicitacoes === false &&
          itemData.solicitacaoAtivaId == null
        );

        const categoriasOrdenadas = [
          ...(dadosCategorias || []),
        ].sort((a, b) => {
          const nomeA =
            a.name ||
            a.nome ||
            a.title ||
            '';

          const nomeB =
            b.name ||
            b.nome ||
            b.title ||
            '';

          return nomeA.localeCompare(
            nomeB,
            'pt-BR',
            { numeric: true }
          );
        });

        const locaisOrdenados = [
          ...(dadosLocais || []),
        ].sort((a, b) => {
          const nomeA =
            a.name ||
            a.nome ||
            a.title ||
            '';

          const nomeB =
            b.name ||
            b.nome ||
            b.title ||
            '';

          return nomeA.localeCompare(
            nomeB,
            'pt-BR',
            { numeric: true }
          );
        });

        setCategorias(categoriasOrdenadas);
        setLocais(locaisOrdenados);

      } catch (error) {
        if (!ativo) {
          return;
        }

        console.error(
          'Erro ao carregar informações para edição:',
          error
        );

        setErro(
          'Não foi possível carregar os dados do item.'
        );

      } finally {
        if (ativo) {
          setLoading(false);
        }
      }
    }

    carregarDados();

    return () => {
      ativo = false;
    };
  }, [id, eAdmin, carregandoAuth]);

  // ===================================================
  // ATUALIZAR FORMULÁRIO
  // ===================================================

  const atualizarCampo = (campo, valor) => {
    setFormData((dadosAnteriores) => ({
      ...dadosAnteriores,
      [campo]: valor,
    }));
  };

  // ===================================================
  // SALVAR ALTERAÇÕES
  // ===================================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!eAdmin) {
      setErro(
        'Você não possui permissão para editar itens.'
      );
      return;
    }

    if (!formData.title.trim()) {
      setErro('Informe o título do item.');
      return;
    }

    if (!formData.category) {
      setErro('Selecione uma categoria.');
      return;
    }

    if (!formData.location) {
      setErro(
        'Selecione o local onde o objeto foi encontrado.'
      );
      return;
    }

    if (excluindo || carregandoSalvar) {
      return;
    }

    setErro('');
    setErroExclusao('');
    setCarregandoSalvar(true);

    try {
      await atualizarItem(id, {
        titulo: formData.title.trim(),
        categoriaId: formData.category,
        localEncontrado: formData.location,
        descricao: formData.description.trim(),
      });

      setSubmitted(true);

      setTimeout(() => {
        navigate(`/item/${id}`);
      }, 1500);

    } catch (error) {
      console.error(
        'Erro ao salvar alterações:',
        error
      );

      if (error?.code === 'permission-denied') {
        setErro(
          'O Firestore recusou esta edição. Verifique as permissões administrativas.'
        );
      } else {
        setErro(
          error?.message ||
          'Não foi possível salvar as alterações.'
        );
      }

    } finally {
      setCarregandoSalvar(false);
    }
  };

  // ===================================================
  // EXCLUSÃO PERMANENTE
  // ===================================================

  const handleExcluir = async () => {
    if (
      !eAdmin ||
      excluindo ||
      carregandoSalvar ||
      !podeExcluir ||
      statusAtual !== 'disponível'
    ) {
      return;
    }

    const confirmou = window.confirm(
      `Deseja excluir permanentemente "${formData.title}"?\n\n` +
      'Esta ação não poderá ser desfeita.'
    );

    if (!confirmou) {
      return;
    }

    setErro('');
    setErroExclusao('');
    setExcluindo(true);

    try {
      await excluirItem(id);

      navigate('/', {
        replace: true,
      });

    } catch (error) {
      // Exibe informações detalhadas no console
      // para identificar em qual etapa ocorreu a falha.
      console.error('Erro ao excluir pertence:', {
        code: error?.code,
        message: error?.message,
        error,
      });

      let mensagem;

      if (error?.code === 'permission-denied') {
        mensagem =
          'O Firebase recusou a operação por falta de permissão. Verifique se as regras do Firestore foram publicadas e se sua conta está autorizada como administradora.';

      } else if (error?.code === 'failed-precondition') {
        mensagem =
          'O Firestore não conseguiu concluir a consulta. Pode ser necessário configurar um índice ou verificar uma condição do banco de dados.';

      } else if (error?.code === 'unavailable') {
        mensagem =
          'O Firebase está temporariamente indisponível. Verifique sua conexão com a internet e tente novamente.';

      } else {
        mensagem =
          error?.message ||
          'Não foi possível excluir o pertence.';
      }

      setErroExclusao(mensagem);

    } finally {
      setExcluindo(false);
    }
  };

  // ===================================================
  // AUTENTICAÇÃO E ESTADOS DA PÁGINA
  // ===================================================

  if (carregandoAuth) {
    return (
      <PageSkeleton mensagem="Verificando acesso..." />
    );
  }

  if (!eAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 space-y-3 max-w-md mx-auto">
        <ShieldAlert
          size={56}
          className="text-amber-600"
        />

        <h2 className="text-lg font-bold text-gray-800">
          Acesso Restrito
        </h2>

        <p className="text-xs text-gray-500">
          Esta área é exclusiva para a administração
          do setor de Achados e Perdidos.
        </p>

        <button
          type="button"
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
      <PageSkeleton mensagem="Carregando informações do item..." />
    );
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 space-y-3">
        <CheckCircle2
          size={64}
          className="text-emerald-600"
        />

        <h2 className="text-xl font-bold text-gray-800">
          Alterações Salvas!
        </h2>

        <p className="text-xs text-gray-500">
          Redirecionando para os detalhes do item...
        </p>
      </div>
    );
  }

  // ===================================================
  // FORMULÁRIO ADMINISTRATIVO
  // ===================================================

  return (
    <div className="space-y-5 pb-20 max-w-2xl mx-auto">

      {/* CABEÇALHO */}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Voltar"
          className="p-2 rounded-xl text-gray-500 bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>

        <div>
          <h2 className="text-base md:text-lg font-bold text-gray-800">
            Editar Pertence (Administração)
          </h2>

          <p className="text-xs text-gray-500">
            Atualize as informações cadastrais do objeto.
          </p>
        </div>
      </div>

      {/* MENSAGEM DE ERRO GERAL */}

      {erro && (
        <div
          role="alert"
          className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs"
        >
          {erro}
        </div>
      )}

      {/* FORMULÁRIO */}

      <form
        onSubmit={handleSubmit}
        className="bg-white p-4 sm:p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4 text-xs md:text-sm"
      >

        {/* STATUS ATUAL */}

        <div className="space-y-2">
          <span className="font-semibold text-gray-800 block">
            Status atual do pertence
          </span>

          <div className="edit-item-status-notice p-3 rounded-xl flex items-center gap-3">
            <Info
              size={17}
              className="shrink-0"
              aria-hidden="true"
            />

            <div>
              <p className="font-semibold capitalize">
                {statusAtual}
              </p>

              <p className="text-xs mt-1 leading-relaxed">
                O status é controlado pelas solicitações
                de retirada e devolução.
              </p>
            </div>
          </div>
        </div>

        {/* TÍTULO */}

        <div className="space-y-1">
          <label
            htmlFor="ed-titulo"
            className="font-semibold text-gray-800"
          >
            Título / Nome
          </label>

          <div className="relative">
            <Tag
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
            />

            <input
              id="ed-titulo"
              type="text"
              required
              maxLength={160}
              value={formData.title}
              onChange={(event) => {
                atualizarCampo(
                  'title',
                  event.target.value
                );
              }}
              className="w-full pl-9 pr-3 py-2.5 bg-white border border-gray-200 rounded-xl outline-none focus:border-indigo-900"
            />
          </div>
        </div>

        {/* CATEGORIA E LOCAL */}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* CATEGORIA */}

          <div className="space-y-1">
            <label
              htmlFor="ed-categoria"
              className="font-semibold text-gray-800"
            >
              Categoria
            </label>

            <select
              id="ed-categoria"
              required
              value={formData.category}
              onChange={(event) => {
                atualizarCampo(
                  'category',
                  event.target.value
                );
              }}
              className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl outline-none focus:border-indigo-900 text-gray-700"
            >
              <option value="">
                Selecione uma categoria...
              </option>

              {categorias.map((cat) => {
                const nomeCat =
                  cat.name ||
                  cat.nome ||
                  cat.title ||
                  '';

                return (
                  <option
                    key={cat.id}
                    value={nomeCat}
                  >
                    {nomeCat}
                  </option>
                );
              })}
            </select>
          </div>

          {/* LOCAL */}

          <div className="space-y-1">
            <label
              htmlFor="ed-local"
              className="font-semibold text-gray-800"
            >
              Local Encontrado
            </label>

            <div className="relative">
              <MapPin
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
              />

              <select
                id="ed-local"
                required
                value={formData.location}
                onChange={(event) => {
                  atualizarCampo(
                    'location',
                    event.target.value
                  );
                }}
                className="w-full pl-9 pr-3 py-2.5 bg-white border border-gray-200 rounded-xl outline-none focus:border-indigo-900 text-gray-700"
              >
                <option value="">
                  Selecione o local...
                </option>

                {locais.map((loc) => {
                  const nomeLocal =
                    loc.name ||
                    loc.nome ||
                    loc.title ||
                    '';

                  return (
                    <option
                      key={loc.id}
                      value={nomeLocal}
                    >
                      {nomeLocal}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
        </div>

        {/* DESCRIÇÃO */}

        <div className="space-y-1">
          <label
            htmlFor="ed-detalhes"
            className="font-semibold text-gray-800"
          >
            Detalhes Adicionais
          </label>

          <div className="relative">
            <FileText
              size={16}
              className="absolute left-3 top-3 text-gray-500"
            />

            <textarea
              id="ed-detalhes"
              rows={4}
              maxLength={3000}
              value={formData.description}
              onChange={(event) => {
                atualizarCampo(
                  'description',
                  event.target.value
                );
              }}
              className="w-full pl-9 pr-3 py-2.5 bg-white border border-gray-200 rounded-xl outline-none focus:border-indigo-900 text-gray-700"
            />
          </div>
        </div>

        {/* FOTO ATUAL */}

        {formData.fotoUrl && (
          <div className="space-y-2">
            <span className="font-semibold text-gray-800 block">
              Fotografia atual
            </span>

            <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl">
              <img
                src={formData.fotoUrl}
                alt={`Fotografia do pertence: ${formData.title}`}
                className="max-h-48 max-w-full object-contain rounded-lg mx-auto"
              />

              <p className="text-[11px] text-gray-500 mt-2 text-center">
                A fotografia existente será mantida.
              </p>
            </div>
          </div>
        )}

        {/* SALVAR ALTERAÇÕES */}

        <button
          type="submit"
          disabled={
            carregandoSalvar ||
            excluindo ||
            !formData.title.trim() ||
            !formData.category ||
            !formData.location
          }
          className="w-full py-3 bg-indigo-900 text-white font-semibold rounded-xl shadow-sm hover:bg-indigo-800 transition disabled:opacity-50 flex justify-center items-center gap-2"
        >
          {carregandoSalvar ? (
            <>
              <Loader2
                size={16}
                className="animate-spin"
                aria-hidden="true"
              />

              <span>
                Salvando Alterações...
              </span>
            </>
          ) : (
            <>
              <Save
                size={16}
                aria-hidden="true"
              />

              <span>Salvar Alterações</span>
            </>
          )}
        </button>

        {/* EXCLUSÃO PERMANENTE */}

        <div className="pt-4 mt-4 border-t border-dashed border-gray-200 space-y-3">
          <p className="text-xs text-gray-500">
            A exclusão é permitida somente quando o
            pertence nunca recebeu solicitações.
            Itens antigos sem histórico verificado
            ficam protegidos.
          </p>

          <button
            type="button"
            onClick={handleExcluir}
            disabled={
              excluindo ||
              carregandoSalvar ||
              !podeExcluir ||
              statusAtual !== 'disponível'
            }
            className="w-full min-h-12 flex items-center justify-center gap-2 rounded-xl border border-red-300 bg-red-50 px-4 py-3 font-semibold text-red-700 hover:bg-red-100 transition disabled:opacity-50 disabled:cursor-not-allowed dark:bg-[#492d31] dark:text-[#ffd6d6] dark:border-[#a96565] dark:hover:bg-[#5a343a]"
          >
            {excluindo ? (
              <Loader2
                size={18}
                className="animate-spin"
                aria-hidden="true"
              />
            ) : (
              <Trash2
                size={18}
                aria-hidden="true"
              />
            )}

            {excluindo
              ? 'Excluindo pertence...'
              : 'Excluir permanentemente'}
          </button>

          {/* ERRO EXIBIDO PRÓXIMO AO BOTÃO */}

          {erroExclusao && (
            <div
              role="alert"
              className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs dark:bg-[#492d31] dark:border-[#a96565] dark:text-[#ffd6d6]"
            >
              <AlertCircle
                size={18}
                className="shrink-0 mt-0.5"
                aria-hidden="true"
              />

              <p className="leading-relaxed">
                {erroExclusao}
              </p>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
