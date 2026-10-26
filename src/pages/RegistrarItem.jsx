import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Camera,
  Image as ImageIcon,
  MapPin,
  Tag,
  FileText,
  CheckCircle2,
  ArrowLeft,
  Loader2,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import { criarItem, uploadFotoItem, TAMANHO_MAXIMO_FOTO_MB } from '../services/itemService';
import { listarCategorias } from '../services/categoriaService';
import { listarLocaisAtivos } from '../services/localService';
import { useAuth } from '../hooks/useAuth';
import FiltroDropdown from '../components/FiltroDropdown';
import CapturaFoto from '../components/CapturaFoto';

const FORM_INICIAL = {
  title: '',
  category: '',
  location: '',
  description: '',
  status: 'disponível',
  imagePreview: null,
};

const nomeDe = (obj) => obj.name || obj.nome || obj.title || '';

export default function RegistrarItem() {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const tituloRef = useRef(null);

  const [categorias, setCategorias] = useState([]);
  const [locais, setLocais] = useState([]);
  const [fileObject, setFileObject] = useState(null);
  const [formData, setFormData] = useState(FORM_INICIAL);

  const [carregando, setCarregando] = useState(false);
  const [idCriado, setIdCriado] = useState(null);
  const [erro, setErro] = useState('');
  const [cameraAberta, setCameraAberta] = useState(false);
  const [faltando, setFaltando] = useState({ category: false, location: false });

  // Carrega opções de categorias e locais do Firestore
  useEffect(() => {
    let isMounted = true;

    async function carregarOpcoes() {
      try {
        const [dadosCategorias, dadosLocais] = await Promise.all([listarCategorias(), listarLocaisAtivos()]);
        const porNome = (a, b) => nomeDe(a).localeCompare(nomeDe(b), 'pt-BR', { numeric: true });

        if (isMounted) {
          setCategorias([...(dadosCategorias || [])].sort(porNome));
          setLocais([...(dadosLocais || [])].sort(porNome));
        }
      } catch (err) {
        console.error('Erro ao carregar dados do banco:', err);
        if (isMounted) setErro('Não foi possível carregar as categorias e locais. Recarregue a página e tente de novo.');
      }
    }

    carregarOpcoes();
    return () => {
      isMounted = false;
    };
  }, []);

  // Limpeza de ObjectURL para evitar memory leaks
  useEffect(() => {
    return () => {
      if (formData.imagePreview) URL.revokeObjectURL(formData.imagePreview);
    };
  }, [formData.imagePreview]);

  // Em celular/tablet o atributo "capture" abre o app de câmera. Em computador ele não faz nada útil,
  // por isso o computador usa a janela de câmera própria (CapturaFoto).
  const usarCapturaNativa = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;

  const fecharCamera = useCallback(() => setCameraAberta(false), []);

  // Valida tipo e tamanho na hora, antes de o admin preencher o resto do formulário
  const aceitarArquivo = (file) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErro('O arquivo escolhido não é uma imagem. Escolha uma foto (JPG, PNG ou similar).');
      return;
    }
    if (file.size > TAMANHO_MAXIMO_FOTO_MB * 1024 * 1024) {
      setErro(`A foto é muito grande. Escolha uma imagem de até ${TAMANHO_MAXIMO_FOTO_MB} MB.`);
      return;
    }

    setErro('');
    setFileObject(file);
    setFormData((prev) => ({ ...prev, imagePreview: URL.createObjectURL(file) }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    e.target.value = ''; // permite escolher o mesmo arquivo de novo
    aceitarArquivo(file);
  };

  const handleFotoDaCamera = (file) => {
    setCameraAberta(false);
    aceitarArquivo(file);
  };

  const handleRemoveImage = () => {
    setFileObject(null);
    setFormData((prev) => ({ ...prev, imagePreview: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');

    const semCategoria = !formData.category;
    const semLocal = !formData.location;
    setFaltando({ category: semCategoria, location: semLocal });
    if (semCategoria || semLocal) {
      setErro('Escolha a categoria e o local onde o pertence foi encontrado.');
      return;
    }

    setCarregando(true);

    try {
      let photoUrl = '';
      if (fileObject) {
        photoUrl = await uploadFotoItem(fileObject);
      }

      const id = await criarItem({
        titulo: formData.title.trim(),
        categoriaId: formData.category,
        localEncontrado: formData.location,
        descricao: formData.description.trim(),
        status: formData.status,
        fotoUrl: photoUrl,
        criadoPor: usuario?.uid || 'admin',
      });

      setIdCriado(id);
    } catch (err) {
      console.error('Erro ao cadastrar pertence:', err);
      setErro(
        err?.message?.includes('imagem') || err?.message?.includes('foto')
          ? err.message
          : 'Não foi possível cadastrar o pertence. Verifique a conexão e tente novamente. Os dados digitados foram mantidos.'
      );
    } finally {
      setCarregando(false);
    }
  };

  // Atalho para cadastrar vários itens em sequência (o balcão costuma receber mais de um por vez)
  const cadastrarOutro = () => {
    setFormData({ ...FORM_INICIAL, category: formData.category, location: formData.location });
    setFileObject(null);
    setIdCriado(null);
    setErro('');
    setTimeout(() => tituloRef.current?.focus(), 0);
  };

  if (idCriado) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 space-y-4 max-w-md mx-auto" role="status">
        <CheckCircle2 size={64} className="text-emerald-600" aria-hidden="true" />
        <h1 className="text-xl font-bold text-gray-800">Pertence cadastrado!</h1>
        <p className="text-sm text-gray-600">O item já aparece no catálogo para os alunos.</p>
        <div className="flex flex-col sm:flex-row gap-2 w-full">
          <button
            onClick={cadastrarOutro}
            className="flex-1 min-h-12 px-4 bg-indigo-900 text-white font-bold rounded-xl hover:bg-indigo-800 transition"
          >
            Cadastrar outro item
          </button>
          <Link
            to={`/item/${idCriado}`}
            className="flex-1 min-h-12 px-4 border border-gray-300 text-gray-800 font-bold rounded-xl hover:bg-gray-50 transition flex items-center justify-center"
          >
            Ver o item
          </Link>
        </div>
        <button onClick={() => navigate('/')} className="min-h-11 text-sm text-indigo-900 font-semibold underline">
          Ir para o início
        </button>
      </div>
    );
  }

  const classeCampo =
    'w-full min-h-11 pl-10 pr-3 py-2.5 bg-gray-50/80 border border-gray-200 rounded-xl outline-hidden focus:bg-white focus:border-indigo-900 focus:ring-2 focus:ring-indigo-900/10 transition-all text-gray-800';

  return (
    <div className="space-y-5 pb-28 sm:pb-10 max-w-2xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Voltar"
          className="p-3 rounded-xl text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer active:scale-95"
        >
          <ArrowLeft size={18} aria-hidden="true" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-gray-800">Registrar pertence (Administração)</h1>
          <p className="text-sm text-gray-600">Cadastre um objeto recebido no balcão institucional.</p>
        </div>
      </div>

      {erro && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-sm flex items-start gap-2" role="alert">
          <AlertCircle size={18} className="shrink-0 text-rose-500 mt-0.5" aria-hidden="true" />
          <span>{erro}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white p-4 sm:p-6 rounded-3xl border border-gray-100 shadow-xs space-y-5 text-sm">
        {/* Status Inicial */}
        <fieldset className="space-y-1.5">
          <legend className="font-semibold text-gray-800 mb-1.5">Situação inicial</legend>
          <div className="grid grid-cols-2 gap-2">
            {[
              { valor: 'disponível', rotulo: 'Disponível no setor', ativa: 'bg-emerald-700 border-emerald-700' },
              { valor: 'em análise', rotulo: 'Em análise', ativa: 'bg-amber-700 border-amber-700' },
            ].map(({ valor, rotulo, ativa }) => (
              <button
                key={valor}
                type="button"
                aria-pressed={formData.status === valor}
                onClick={() => setFormData({ ...formData, status: valor })}
                className={`min-h-12 py-2.5 px-3 rounded-xl font-bold text-sm border transition-all cursor-pointer ${
                  formData.status === valor ? `${ativa} text-white shadow-xs` : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {rotulo}
              </button>
            ))}
          </div>
        </fieldset>

        {/* Foto: câmera ou galeria */}
        <div className="space-y-1.5">
          <span className="font-semibold text-gray-800 block">Foto do pertence (opcional)</span>
          {formData.imagePreview ? (
            <div className="relative rounded-2xl overflow-hidden border border-gray-200 h-44">
              <img src={formData.imagePreview} alt="Pré-visualização da foto do pertence" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={handleRemoveImage}
                aria-label="Remover foto"
                className="absolute top-2 right-2 p-3 bg-rose-600 text-white rounded-xl shadow-md hover:bg-rose-700 transition cursor-pointer"
              >
                <Trash2 size={16} aria-hidden="true" />
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {usarCapturaNativa ? (
                <label className="min-h-24 border-2 border-dashed border-gray-300 rounded-2xl flex flex-col justify-center items-center gap-1.5 cursor-pointer bg-gray-50/50 hover:bg-gray-50 text-gray-700 focus-within:ring-2 focus-within:ring-indigo-700">
                  <Camera size={26} aria-hidden="true" />
                  <span className="font-medium">Tirar foto</span>
                  <input type="file" accept="image/*" capture="environment" onChange={handleImageChange} className="sr-only" />
                </label>
              ) : (
                <button
                  type="button"
                  onClick={() => setCameraAberta(true)}
                  className="min-h-24 border-2 border-dashed border-gray-300 rounded-2xl flex flex-col justify-center items-center gap-1.5 cursor-pointer bg-gray-50/50 hover:bg-gray-50 text-gray-700"
                >
                  <Camera size={26} aria-hidden="true" />
                  <span className="font-medium">Tirar foto</span>
                </button>
              )}
              <label className="min-h-24 border-2 border-dashed border-gray-300 rounded-2xl flex flex-col justify-center items-center gap-1.5 cursor-pointer bg-gray-50/50 hover:bg-gray-50 text-gray-700 focus-within:ring-2 focus-within:ring-indigo-700">
                <ImageIcon size={26} aria-hidden="true" />
                <span className="font-medium">Escolher da galeria</span>
                <input type="file" accept="image/*" onChange={handleImageChange} className="sr-only" />
              </label>
            </div>
          )}
          <p className="text-xs text-gray-600">A foto é reduzida automaticamente para carregar rápido no celular dos alunos.</p>
        </div>

        {/* Título */}
        <div className="space-y-1.5">
          <label htmlFor="reg-titulo" className="font-semibold text-gray-800 block">Título / nome do pertence</label>
          <div className="relative">
            <Tag size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" aria-hidden="true" />
            <input
              id="reg-titulo"
              ref={tituloRef}
              type="text"
              required
              placeholder="Ex.: Caderno espiral Tilibra capa preta"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className={classeCampo}
            />
          </div>
        </div>

        {/* Categoria e Local: mesmo dropdown da tela de busca (Nielsen 4 - Consistência) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <FiltroDropdown
              className="w-full"
              label="Categoria"
              icone={Tag}
              opcoes={[
                { id: '', nome: 'Selecione uma categoria...' },
                ...categorias.map((cat) => ({ id: nomeDe(cat), nome: nomeDe(cat) })),
              ]}
              selecionado={formData.category}
              onSelect={(valor) => {
                setFormData((prev) => ({ ...prev, category: valor }));
                setFaltando((prev) => ({ ...prev, category: false }));
              }}
            />
            {faltando.category && <p className="text-xs text-rose-700 font-medium">Escolha uma categoria.</p>}
          </div>

          <div className="space-y-1">
            <FiltroDropdown
              className="w-full"
              label="Local encontrado"
              icone={MapPin}
              opcoes={[
                { id: '', nome: 'Selecione o local...' },
                ...locais.map((loc) => ({ id: nomeDe(loc), nome: nomeDe(loc) })),
              ]}
              selecionado={formData.location}
              onSelect={(valor) => {
                setFormData((prev) => ({ ...prev, location: valor }));
                setFaltando((prev) => ({ ...prev, location: false }));
              }}
            />
            {faltando.location && <p className="text-xs text-rose-700 font-medium">Escolha o local.</p>}
          </div>
        </div>

        {/* Detalhes */}
        <div className="space-y-1.5">
          <label htmlFor="reg-detalhes" className="font-semibold text-gray-800 block">Detalhes adicionais</label>
          <div className="relative">
            <FileText size={16} className="absolute left-3.5 top-3.5 text-gray-500 pointer-events-none" aria-hidden="true" />
            <textarea
              id="reg-detalhes"
              rows={3}
              placeholder="Ex.: cor, marca, sinais particulares, quem entregou no setor."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className={classeCampo}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={carregando}
          className="w-full min-h-12 py-3 bg-indigo-900 text-white font-bold rounded-xl shadow-xs hover:bg-indigo-800 transition cursor-pointer disabled:opacity-60 active:scale-[0.99] flex justify-center items-center gap-2 mt-2"
        >
          {carregando ? (
            <>
              <Loader2 size={16} className="animate-spin" aria-hidden="true" />
              <span>Enviando foto e salvando...</span>
            </>
          ) : (
            'Confirmar e publicar pertence'
          )}
        </button>
      </form>

      <CapturaFoto aberto={cameraAberta} onFechar={fecharCamera} onCapturar={handleFotoDaCamera} />
    </div>
  );
}