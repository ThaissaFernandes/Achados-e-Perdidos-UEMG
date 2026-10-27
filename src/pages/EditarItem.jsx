
import { useState, useEffect } from 'react';

import {
  useParams,
  useNavigate,
} from 'react-router-dom';

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
} from 'lucide-react';

import { PageSkeleton } from '../components/skeletons';

import { db } from '../config/firebase';

import {
  doc,
  getDoc,
} from 'firebase/firestore';

import {
  listarCategorias,
} from '../services/categoriaService';

import {
  listarLocaisAtivos,
} from '../services/localService';

import {
  atualizarItem,
} from '../services/itemService';

import { useAuth } from '../hooks/useAuth';

// =====================================================
// PÁGINA DE EDIÇÃO ADMINISTRATIVA
// =====================================================

export default function EditarItem() {
  const { id } = useParams();

  const navigate = useNavigate();

  const {
    eAdmin,
    carregandoAuth,
  } = useAuth();

  // ===================================================
  // ESTADOS
  // ===================================================

  const [categorias, setCategorias] = useState([]);
  const [locais, setLocais] = useState([]);

  const [loading, setLoading] = useState(true);

  const [
    carregandoSalvar,
    setCarregandoSalvar,
  ] = useState(false);

  const [submitted, setSubmitted] = useState(false);

  const [erro, setErro] = useState('');

  const [statusAtual, setStatusAtual] =
    useState('disponível');

  const [formData, setFormData] = useState({
    title: '',
    category: '',
    location: '',
    description: '',
    fotoUrl: '',
  });

  // ===================================================
  // CARREGAMENTO DOS DADOS
  // ===================================================

  useEffect(() => {
    // Aguarda a autenticação e impede consultas
    // quando o usuário não é administrador.
    //
    // A tela de acesso restrito já é exibida
    // na renderização do componente.
    if (carregandoAuth || !eAdmin) {
      return;
    }

    let ativo = true;

    async function carregarDados() {
      setLoading(true);
      setErro('');

      try {
        const [
          dadosCategorias,
          dadosLocais,
          itemSnap,
        ] = await Promise.all([
          listarCategorias(),
          listarLocaisAtivos(),
          getDoc(
            doc(db, 'itens', id)
          ),
        ]);

        if (!ativo) {
          return;
        }

        if (!itemSnap.exists()) {
          setErro(
            'Item não encontrado no sistema.'
          );

          setLoading(false);
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

        setStatusAtual(
          itemData.status || 'disponível'
        );

        // Ordenar categorias.
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

        // Ordenar locais.
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
  }, [
    id,
    eAdmin,
    carregandoAuth,
  ]);

  // ===================================================
  // ATUALIZAR CAMPO DO FORMULÁRIO
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
      setErro(
        'Informe o título do item.'
      );
      return;
    }

    if (!formData.category) {
      setErro(
        'Selecione uma categoria.'
      );
      return;
    }

    if (!formData.location) {
      setErro(
        'Selecione o local onde o objeto foi encontrado.'
      );
      return;
    }

    setErro('');
    setCarregandoSalvar(true);

    try {
      await atualizarItem(
        id,
        {
          titulo: formData.title.trim(),
          categoriaId: formData.category,
          localEncontrado: formData.location,
          descricao: formData.description.trim(),
        }
      );

      setSubmitted(true);

      // Redireciona após informar o sucesso.
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
  // AUTENTICAÇÃO AINDA CARREGANDO
  // ===================================================

  if (carregandoAuth) {
    return (
      <PageSkeleton mensagem="Verificando acesso..." />
    );
  }

  // ===================================================
  // ACESSO RESTRITO
  // ===================================================

  if (!eAdmin) {
    return (
      <div
        className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 space-y-3 max-w-md mx-auto"
      >
        <ShieldAlert
          size={56}
          className="text-amber-600"
        />

        <h2 className="text-lg font-bold text-gray-800">
          Acesso Restrito
        </h2>

        <p className="text-xs text-gray-500">
          Esta área é exclusiva para
          a administração do setor de
          Achados e Perdidos.
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

  // ===================================================
  // CARREGAMENTO
  // ===================================================

  if (loading) {
    return (
      <PageSkeleton mensagem="Verificando acesso..." />
    );
  }

  // ===================================================
  // SUCESSO
  // ===================================================

  if (submitted) {
    return (
      <div
        className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 space-y-3"
      >
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
  // FORMULÁRIO
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

      {/* MENSAGEM DE ERRO */}

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

        {/* STATUS ATUAL — SOMENTE LEITURA */}

        <div className="space-y-2">
          <span className="font-semibold text-gray-800 block">
            Status atual do pertence
          </span>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2">
            <Info
              size={17}
              className="text-indigo-700 shrink-0"
            />

            <div>
              <p className="font-semibold text-gray-800 capitalize">
                {statusAtual}
              </p>

              <p className="text-[11px] text-gray-500 mt-1">
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
              />

              <span>
                Salvando Alterações...
              </span>
            </>
          ) : (
            <>
              <Save size={16} />

              <span>
                Salvar Alterações
              </span>
            </>
          )}
        </button>

        {/* AVISO SOBRE EXCLUSÃO */}

        <div className="pt-4 mt-4 border-t border-dashed border-gray-200">
          <p className="text-[11px] text-gray-500">
            A exclusão permanente de itens está
            desativada para proteger o histórico
            de solicitações e devoluções.
          </p>
        </div>

      </form>
    </div>
  );
}
